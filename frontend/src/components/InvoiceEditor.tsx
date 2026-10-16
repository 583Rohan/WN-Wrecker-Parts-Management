import { useMemo, useState, type FormEvent } from 'react';
import type { Part } from '../lib/types';
import { API } from '../lib/api';
import { authFetch } from '../lib/admin';
import { money } from '../lib/format';
import { isForSale } from '../lib/parts';
import { gstSplit, heldByMap, partLabel, readError, type Invoice } from '../lib/invoices';
import { Modal, SafeImg } from './AdminUI';

// The "new invoice" form. Used on the Invoices page (New invoice tab) and in the
// Chats page "Send invoice" popup. It creates the invoice and hands it back via onCreated.

type DraftLine = { key: number; partId: number | null; description: string; quantity: string; unitPrice: string };
type Conflict = { id: number; number: string; customerName: string; parts: string[] };

let lineSeq = 0;
const newLine = (patch: Partial<DraftLine> = {}): DraftLine =>
  ({ key: ++lineSeq, partId: null, description: '', quantity: '1', unitPrice: '', ...patch });
const partLine = (p: Part) => newLine({ partId: p.id, description: partLabel(p), unitPrice: String(p.price) });

export function Totals({ subtotal, gst, total }: { subtotal: number; gst: number; total: number }) {
  return (
    <div className="adm-totals">
      <div><span>Subtotal (excl. GST)</span><span>{money(subtotal)}</span></div>
      <div><span>GST included</span><span>{money(gst)}</span></div>
      <div className="grand"><span>Total (incl. GST)</span><span>{money(total)}</span></div>
    </div>
  );
}

// Searchable picker for in-stock parts
function PartPicker({ parts, takenIds, heldBy, onPick }: {
  parts: Part[];
  takenIds: Set<number>;
  heldBy: Map<number, string>;
  onPick: (p: Part) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return parts
      .filter(p => isForSale(p) && !takenIds.has(p.id))
      .filter(p => !term || `${p.name} ${p.make} ${p.model} ${p.year}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [parts, takenIds, query]);

  const pick = (p: Part) => { onPick(p); setQuery(''); };

  return (
    <div className="adm-picker">
      <input
        className="adm-input"
        aria-label="Search in-stock parts"
        placeholder="＋ Add a part from stock — search name, make, model…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); if (results[0]) pick(results[0]); }
          if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
        }}
      />
      {open && (
        <div className="adm-picker-menu" role="listbox">
          {results.length === 0 ? (
            <div className="adm-picker-empty">No in-stock parts match.</div>
          ) : (
            results.map(p => (
              <button key={p.id} type="button" className="adm-picker-item" onMouseDown={e => { e.preventDefault(); pick(p); }}>
                <SafeImg src={p.photoUrl} className="adm-thumb" fallbackClass="adm-nophoto" />
                <div className="adm-picker-main">
                  <div className="adm-strong">{p.name}</div>
                  <div className="adm-sub">{p.make} {p.model} · {p.year}</div>
                </div>
                <div className="adm-picker-side">
                  <span className="adm-price">{money(Number(p.price))}</span>
                  {heldBy.get(p.id) && <span className="adm-badge unpaid">on {heldBy.get(p.id)}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function InvoiceEditor({
  parts, invoices, notify, onCreated, onCancel, cancelLabel = 'Cancel', submitLabel = 'Create invoice',
  conversationId = null, initialName = '', initialContact = '', initialPartIds = [],
}: {
  parts: Part[];
  invoices: Invoice[];                       // used to warn when a part is already on an unpaid invoice
  notify: (text: string, error?: boolean) => void;
  onCreated: (inv: Invoice) => void | Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  conversationId?: number | null;            // links the invoice to a chat
  initialName?: string;
  initialContact?: string;
  initialPartIds?: number[];                 // e.g. the parts the customer asked about in the chat
}) {
  const startLines = () => parts.filter(p => initialPartIds.includes(p.id) && isForSale(p)).map(partLine);

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState(initialName);
  const [customerContact, setCustomerContact] = useState(initialContact);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>(startLines);
  const [tried, setTried] = useState(false);
  const [creating, setCreating] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);

  const heldBy = useMemo(() => heldByMap(invoices), [invoices]);
  const takenIds = useMemo(() => new Set(lines.filter(l => l.partId !== null).map(l => l.partId as number)), [lines]);

  const lineAmount = (l: DraftLine) => (Number(l.unitPrice) || 0) * (Math.max(1, Math.floor(Number(l.quantity) || 1)));
  const totals = useMemo(() => gstSplit(lines.reduce((s, l) => s + lineAmount(l), 0)), [lines]);

  const addPart = (p: Part) => setLines(ls => [...ls, partLine(p)]);
  const addCustom = () => setLines(ls => [...ls, newLine()]);
  const updateLine = (key: number, patch: Partial<DraftLine>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) => setLines(ls => ls.filter(l => l.key !== key));

  const priceBad = (l: DraftLine) => l.unitPrice === '' || Number.isNaN(Number(l.unitPrice)) || Number(l.unitPrice) < 0;
  const lineInvalid = (l: DraftLine) => !l.description.trim() || priceBad(l);
  const nameInvalid = !customerName.trim();

  const reset = () => {
    setTitle(''); setCustomerName(initialName); setCustomerContact(initialContact); setNotes('');
    setLines(startLines()); setTried(false);
  };

  const create = async (replaceConflicts: boolean) => {
    setCreating(true);
    try {
      const res = await authFetch(`${API}/api/admin/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          customerName: customerName.trim(),
          customerContact: customerContact.trim() || null,
          notes: notes.trim() || null,
          conversationId,
          replaceConflicts,
          items: lines.map(l => ({
            partId: l.partId,
            description: l.description.trim(),
            quantity: l.partId !== null ? 1 : Math.max(1, Math.floor(Number(l.quantity) || 1)),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
        return;
      }
      if (!res.ok) throw new Error(await readError(res, 'The invoice could not be created.'));
      const inv: Invoice = await res.json();
      setConflicts(null);
      reset();
      await onCreated(inv);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', true);
    } finally {
      setCreating(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (nameInvalid) { notify('Enter the customer name.', true); return; }
    if (lines.length === 0) { notify('Add at least one item.', true); return; }
    if (lines.some(lineInvalid)) { notify('Every item needs a description and a valid price.', true); return; }
    void create(false);
  };

  return (
    <form onSubmit={submit} noValidate>
      <h3 className="adm-section-title">Details</h3>
      <div className="adm-form-grid two">
        <div className="adm-field adm-wide">
          <label htmlFor="inv-title">Invoice title</label>
          <input id="inv-title" className="adm-input" maxLength={100} placeholder="Optional — e.g. Camry front bumper & headlights" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="inv-name">Customer name <span className="adm-req">*</span></label>
          <input id="inv-name" className={`adm-input${tried && nameInvalid ? ' invalid' : ''}`} placeholder="e.g. John Smith" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          {tried && nameInvalid && <span className="adm-error">Enter the customer name.</span>}
        </div>
        <div className="adm-field">
          <label htmlFor="inv-contact">Email or phone</label>
          <input id="inv-contact" className="adm-input" placeholder="Used when sharing the invoice" value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
        </div>
      </div>

      <h3 className="adm-section-title">Items</h3>
      <div className="adm-line-tools">
        <PartPicker parts={parts} takenIds={takenIds} heldBy={heldBy} onPick={addPart} />
        <button type="button" className="adm-btn" onClick={addCustom}>＋ Custom line</button>
      </div>

      {lines.length === 0 ? (
        <div className="adm-lines-empty">No items yet. Search for a part above, or add a custom line (e.g. labour, freight).</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-lines edit">
            <thead>
              <tr><th>Description</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 140 }}>Unit price (incl. GST)</th><th className="num" style={{ width: 110 }}>Amount</th><th style={{ width: 44 }} /></tr>
            </thead>
            <tbody>
              {lines.map(l => {
                const bad = tried && lineInvalid(l);
                const held = l.partId !== null ? heldBy.get(l.partId) : undefined;
                return (
                  <tr key={l.key}>
                    <td>
                      <input
                        className={`adm-input sm${bad && !l.description.trim() ? ' invalid' : ''}`}
                        aria-label="Item description"
                        placeholder="Item description"
                        value={l.description}
                        onChange={e => updateLine(l.key, { description: e.target.value })}
                      />
                      {(l.partId !== null || held) && (
                        <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {l.partId !== null && <span className="adm-tag">stock part #{l.partId}</span>}
                          {held && <span className="adm-badge unpaid">already on {held}</span>}
                        </div>
                      )}
                    </td>
                    <td data-label="Qty">
                      {l.partId !== null ? (
                        <span className="adm-muted" title="Each stock part is a single item">1</span>
                      ) : (
                        <input className="adm-input sm" aria-label="Quantity" type="number" min={1} step={1} value={l.quantity} onChange={e => updateLine(l.key, { quantity: e.target.value })} />
                      )}
                    </td>
                    <td data-label="Unit price (incl. GST)">
                      <input
                        className={`adm-input sm${bad && priceBad(l) ? ' invalid' : ''}`}
                        aria-label="Unit price including GST"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={l.unitPrice}
                        onChange={e => updateLine(l.key, { unitPrice: e.target.value })}
                      />
                    </td>
                    <td className="num"><span className="adm-price">{money(lineAmount(l))}</span></td>
                    <td><button type="button" className="adm-icon-btn" aria-label="Remove item" onClick={() => removeLine(l.key)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Totals subtotal={totals.subtotal} gst={totals.gst} total={totals.total} />

      <h3 className="adm-section-title">Notes</h3>
      <div className="adm-field">
        <label htmlFor="inv-notes" className="adm-sr">Notes</label>
        <textarea id="inv-notes" className="adm-input" placeholder="Optional — e.g. pickup Friday, payment on collection" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="adm-form-actions">
        <button type="submit" className="adm-btn primary" disabled={creating}>{creating ? 'Creating…' : submitLabel}</button>
        <button type="button" className="adm-btn" onClick={reset} disabled={creating}>Reset form</button>
        {onCancel && <button type="button" className="adm-btn" onClick={onCancel} disabled={creating}>{cancelLabel}</button>}
        <span className="adm-note">Total {money(totals.total)} incl. {money(totals.gst)} GST</span>
      </div>

      {conflicts && (
        <Modal
          title="Part already on another invoice"
          subtitle="A part can only be on one unpaid invoice at a time."
          onClose={() => { if (!creating) setConflicts(null); }}
          footer={
            <>
              <button type="button" className="adm-btn" onClick={() => setConflicts(null)} disabled={creating}>Go back</button>
              <button type="button" className="adm-btn primary" onClick={() => void create(true)} disabled={creating}>
                {creating ? 'Creating…' : conflicts.length === 1 ? `Void ${conflicts[0].number} & create` : 'Void old invoices & create'}
              </button>
            </>
          }
        >
          {conflicts.map(c => (
            <div key={c.id} className="adm-callout">
              <strong>{c.number}</strong> for {c.customerName} already includes: {c.parts.join(', ')}.
            </div>
          ))}
          <p className="adm-hint">If you continue, {conflicts.length === 1 ? 'that invoice' : 'those invoices'} will be voided (kept on record) and this new one created.</p>
        </Modal>
      )}
    </form>
  );
}
