import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Part } from '../../lib/types';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

type Line = { partId: number | null; description: string; quantity: number; unitPrice: number };
type InvoiceSummary = { id: number; number: string; customerName: string; customerContact: string | null; total: number; createdAt: string; itemCount: number };

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => {
  if (!iso) return '';
  const norm = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(norm);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const styles = `
  .iv-eyebrow { color:#b87100; font-size:.72rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; margin:0 0 6px; }
  .iv-head h1 { margin:0 0 22px; color:#0d1930; font-size:2rem; letter-spacing:-.03em; }
  .iv-panel { border:1px solid #dfe5ec; border-radius:14px; background:#fff; box-shadow:0 10px 30px rgba(13,25,48,.05); margin-bottom:22px; }
  .iv-panel-head { padding:16px 20px; border-bottom:1px solid #eef2f6; }
  .iv-panel-head h2 { margin:0; color:#0d1930; font-size:1.1rem; }
  .iv-body { padding:20px; }
  .iv-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:16px; }
  .iv-field { display:grid; gap:6px; }
  .iv-field label { color:#334155; font-size:.78rem; font-weight:800; }
  .iv-input { width:100%; min-height:42px; padding:9px 11px; box-sizing:border-box; border:1px solid #d5dde7; border-radius:8px; background:#fbfcfe; font:inherit; }
  .iv-input:focus { outline:none; border-color:#f7a411; background:#fff; box-shadow:0 0 0 3px rgba(247,164,17,.14); }
  textarea.iv-input { min-height:64px; resize:vertical; }
  .iv-add { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .iv-btn { padding:9px 15px; border-radius:8px; font-weight:800; font-size:.83rem; cursor:pointer; border:1px solid #cbd5e1; background:#fff; color:#0d1930; }
  .iv-btn:hover { border-color:#f7a411; background:#fffaf0; }
  .iv-btn.primary { background:#f7a411; border-color:#f7a411; color:#111827; }
  .iv-btn.primary:disabled { opacity:.6; cursor:not-allowed; }
  .iv-table { width:100%; border-collapse:collapse; }
  .iv-table th { padding:9px 10px; text-align:left; color:#607089; background:#f4f7fa; font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; }
  .iv-table td { padding:8px 10px; border-top:1px solid #edf0f4; font-size:.85rem; vertical-align:middle; }
  .iv-line-input { width:100%; min-height:36px; padding:6px 9px; box-sizing:border-box; border:1px solid #d5dde7; border-radius:6px; background:#fff; font:inherit; }
  .iv-num { width:90px; }
  .iv-remove { color:#b91c1c; border:1px solid #f1a2a2; background:#fff; border-radius:6px; padding:5px 9px; cursor:pointer; font-size:.75rem; font-weight:700; }
  .iv-totals { margin-top:16px; display:flex; justify-content:flex-end; }
  .iv-totals div { min-width:230px; }
  .iv-totals .row { display:flex; justify-content:space-between; padding:3px 0; font-size:.9rem; color:#334155; }
  .iv-totals .grand { border-top:2px solid #0d1930; margin-top:6px; padding-top:8px; font-size:1.1rem; font-weight:900; color:#0d1930; }
  .iv-save-row { margin-top:18px; display:flex; align-items:center; gap:12px; }
  .iv-amt { color:#cf7800; font-weight:900; }
  .iv-empty { padding:28px 20px; color:#94a3b8; }
  .iv-toast { position:fixed; z-index:100; right:24px; bottom:24px; max-width:360px; padding:13px 16px; border-radius:10px; color:#fff; background:#0d1930; box-shadow:0 16px 45px rgba(0,0,0,.25); }
  .iv-toast.err { background:#991b1b; }
`;

export default function Invoices() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId');

  const [parts, setParts] = useState<Part[]>([]);
  const [history, setHistory] = useState<InvoiceSummary[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; err: boolean } | null>(null);

  const notify = useCallback((text: string, err = false) => setMessage({ text, err }), []);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(null), 3800); return () => clearTimeout(t); }, [message]);

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
    return fetch(url, { ...options, headers });
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await authFetch(`${API}/api/admin/invoices`);
    if (res.ok) setHistory(await res.json());
  }, [authFetch]);

  useEffect(() => {
    fetch(`${API}/api/parts`).then(r => (r.ok ? r.json() : [])).then(setParts).catch(() => {});
    void loadHistory();
  }, [loadHistory]);

  // prefill from a chat enquiry
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const res = await authFetch(`${API}/api/admin/chats/${conversationId}`);
      if (!res.ok) return;
      const convo = await res.json();
      setCustomerName(convo.customerName || '');
      setCustomerContact(convo.customerContact || '');
      const newLines: Line[] = [];
      for (const p of convo.parts || []) {
        const pr = await fetch(`${API}/api/parts/${p.partId}`);
        if (pr.ok) {
          const part = await pr.json();
          newLines.push({ partId: part.id, description: `${part.name} — ${part.make} ${part.model} ${part.year}`, quantity: 1, unitPrice: Number(part.price) });
        }
      }
      if (newLines.length) setLines(newLines);
    })();
  }, [conversationId, authFetch]);

  const addPartLine = (p: Part) => setLines(ls => [...ls, { partId: p.id, description: `${p.name} — ${p.make} ${p.model} ${p.year}`, quantity: 1, unitPrice: Number(p.price) }]);
  const addCustomLine = () => setLines(ls => [...ls, { partId: null, description: '', quantity: 1, unitPrice: 0 }]);
  const updateLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [lines]);
  const gst = useMemo(() => Math.round(subtotal * 0.1 * 100) / 100, [subtotal]);
  const total = subtotal + gst;

  const downloadPdf = async (id: number, number: string) => {
    const res = await authFetch(`${API}/api/admin/invoices/${id}/pdf`);
    if (!res.ok) { notify('Could not download the PDF.', true); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${number}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!customerName.trim()) { notify('Customer name is required.', true); return; }
    if (lines.length === 0) { notify('Add at least one item.', true); return; }
    if (lines.some(l => !l.description.trim())) { notify('Every line needs a description.', true); return; }
    setSaving(true);
    try {
      const body = {
        customerName: customerName.trim(),
        customerContact: customerContact.trim() || null,
        notes: notes.trim() || null,
        conversationId: conversationId ? Number(conversationId) : null,
        items: lines.map(l => ({ partId: l.partId, description: l.description.trim(), quantity: l.quantity, unitPrice: l.unitPrice })),
      };
      const res = await authFetch(`${API}/api/admin/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('The invoice could not be saved.');
      const data = await res.json();
      notify(`Invoice ${data.number} created.`);
      setCustomerName(''); setCustomerContact(''); setNotes(''); setLines([]);
      await loadHistory();
      await downloadPdf(data.id, data.number);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="iv-head">
        <p className="iv-eyebrow">Billing</p>
        <h1>Invoices</h1>
      </div>

      <section className="iv-panel">
        <div className="iv-panel-head"><h2>Create an invoice</h2></div>
        <div className="iv-body">
          <div className="iv-grid">
            <div className="iv-field"><label>Customer name *</label><input className="iv-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. John Smith" /></div>
            <div className="iv-field"><label>Contact (email / phone)</label><input className="iv-input" value={customerContact} onChange={e => setCustomerContact(e.target.value)} placeholder="optional" /></div>
            <div className="iv-field" style={{ gridColumn: '1 / -1' }}><label>Notes</label><textarea className="iv-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. pickup Friday, payment on collection" /></div>
          </div>

          <div className="iv-add">
            <select className="iv-input" style={{ maxWidth: 360 }} value="" onChange={e => { const p = parts.find(x => x.id === Number(e.target.value)); if (p) addPartLine(p); e.currentTarget.value = ''; }}>
              <option value="">＋ Add a part…</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.make} {p.model} {p.year} ({money(Number(p.price))})</option>)}
            </select>
            <button type="button" className="iv-btn" onClick={addCustomLine}>＋ Add custom line</button>
          </div>

          {lines.length > 0 && (
            <table className="iv-table">
              <thead><tr><th>Description</th><th style={{ width: 90 }}>Qty</th><th style={{ width: 130 }}>Unit price</th><th style={{ width: 120 }}>Amount</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td><input className="iv-line-input" value={l.description} onChange={e => updateLine(i, { description: e.target.value })} placeholder="Item description" /></td>
                    <td><input className="iv-line-input iv-num" type="number" min={1} value={l.quantity} onChange={e => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></td>
                    <td><input className="iv-line-input iv-num" type="number" min={0} step="0.01" value={l.unitPrice} onChange={e => updateLine(i, { unitPrice: Number(e.target.value) || 0 })} /></td>
                    <td><span className="iv-amt">{money(l.unitPrice * l.quantity)}</span></td>
                    <td><button type="button" className="iv-remove" onClick={() => removeLine(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="iv-totals">
            <div>
              <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="row"><span>GST (10%)</span><span>{money(gst)}</span></div>
              <div className="row grand"><span>Total</span><span>{money(total)}</span></div>
            </div>
          </div>

          <div className="iv-save-row">
            <button className="iv-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create invoice & download PDF'}</button>
            {conversationId && <span className="muted" style={{ fontSize: '.8rem' }}>Prefilled from chat #{conversationId}</span>}
          </div>
        </div>
      </section>

      <section className="iv-panel">
        <div className="iv-panel-head"><h2>Invoice history</h2></div>
        {history.length === 0 ? (
          <div className="iv-empty">No invoices yet.</div>
        ) : (
          <table className="iv-table">
            <thead><tr><th>Number</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {history.map(inv => (
                <tr key={inv.id}>
                  <td><strong>{inv.number}</strong></td>
                  <td>{inv.customerName}</td>
                  <td>{inv.itemCount}</td>
                  <td><span className="iv-amt">{money(inv.total)}</span></td>
                  <td>{fmtDate(inv.createdAt)}</td>
                  <td><button className="iv-btn" onClick={() => downloadPdf(inv.id, inv.number)}>PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {message && <div className={`iv-toast${message.err ? ' err' : ''}`}>{message.text}</div>}
    </>
  );
}