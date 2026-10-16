import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Part } from '../../lib/types';
import { API, authFetch, fmtDate, money, useToast } from '../../lib/admin';
import {
  downloadInvoicePdf, fetchInvoices, fetchParts, invoiceLink, invoiceShareMessage, isEmail, readError, toIso,
  type Invoice, type InvoiceStatus,
} from '../../lib/invoices';
import { ConfirmDialog, Modal, Toast } from '../../components/AdminUI';
import InvoiceEditor, { Totals } from '../../components/InvoiceEditor';
import SharePanel from '../../components/SharePanel';
import { useBusiness } from '../../lib/business';
import '../../styles/admin.css';
import { usePageTitle } from '../../lib/usePageTitle';

/* ================================ types ================================ */
type Tab = 'all' | 'new';
type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';
type DateFilter = 'all' | '7' | '30' | 'month';
type PendingAction = { kind: 'paid' | 'unpaid' | 'void'; inv: Invoice };

const STATUS_CLASS: Record<InvoiceStatus, string> = { Unpaid: 'unpaid', Paid: 'paid', Void: 'void', Refunded: 'refunded' };
function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`adm-badge ${STATUS_CLASS[status] ?? 'void'}`}>{status}</span>;
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="adm-detail-item"><span>{label}</span><strong>{children}</strong></div>;
}

function Loading({ label }: { label: string }) {
  return <div className="adm-loading"><span className="adm-spinner" /><span>{label}</span></div>;
}

// share options for one invoice
function InvoiceShare({ inv, notify, extra }: { inv: Invoice; notify: (t: string, e?: boolean) => void; extra?: ReactNode }) {
  const { name: businessName } = useBusiness();
  return (
    <SharePanel
      link={invoiceLink(inv.publicToken)}
      title={`Invoice ${inv.number}`}
      message={invoiceShareMessage(inv, businessName)}
      emailTo={isEmail(inv.customerContact) ? inv.customerContact!.trim() : null}
      emailSubject={`Invoice ${inv.number} — ${businessName}`}
      signOff={businessName}
      onDownload={() => downloadInvoicePdf(inv)}
      notify={notify}
      extra={extra}
    />
  );
}

/* ---------- compact invoice list, tap a row to expand (one at a time) ---------- */
function InvoiceList({ invoices, expandedId, onToggle, actions }: {
  invoices: Invoice[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  actions: (inv: Invoice) => ReactNode;
}) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-list">
        <thead>
          <tr><th>Invoice</th><th>Total</th><th>Status</th><th className="adm-chevron-cell"><span className="adm-sr">Expand</span></th></tr>
        </thead>
        <tbody>
          {invoices.map(inv => {
            const open = expandedId === inv.id;
            const cancelled = inv.status === 'Void' || inv.status === 'Refunded';
            return (
              <Fragment key={inv.id}>
                <tr
                  className={`adm-row${open ? ' open' : ''}`}
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => onToggle(inv.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(inv.id); } }}
                >
                  <td>
                    <div className="adm-strong">{inv.title || inv.customerName}</div>
                    <div className="adm-sub">{inv.number}{inv.title ? ` · ${inv.customerName}` : ''} · {fmtDate(inv.createdAt)} · {inv.items.length} item{inv.items.length === 1 ? '' : 's'}</div>
                  </td>
                  <td><span className={cancelled ? 'adm-strike' : 'adm-price'}>{money(Number(inv.total))}</span></td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td className="adm-chevron-cell"><span className={`adm-chevron${open ? ' open' : ''}`} aria-hidden="true">▾</span></td>
                </tr>
                {open && (
                  <tr className="adm-detail-row">
                    <td colSpan={4}>
                      <div className="adm-detail split">
                        <div className="adm-info-list">
                          <DetailItem label="Invoice">{inv.number}</DetailItem>
                          {inv.title && <DetailItem label="Title">{inv.title}</DetailItem>}
                          <DetailItem label="Customer">{inv.customerName}</DetailItem>
                          <DetailItem label="Contact">{inv.customerContact || '—'}</DetailItem>
                          <DetailItem label="Created">{fmtDate(inv.createdAt, true)}</DetailItem>
                          {inv.paidAt && <DetailItem label="Paid">{fmtDate(inv.paidAt, true)}</DetailItem>}
                          {inv.cancelledAt && <DetailItem label={inv.status === 'Refunded' ? 'Refunded' : 'Voided'}>{fmtDate(inv.cancelledAt, true)}</DetailItem>}
                          {inv.conversationId && <DetailItem label="From chat">#{inv.conversationId}</DetailItem>}
                        </div>
                        <div className="adm-detail-main">
                          <table className="adm-lines">
                            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Amount</th></tr></thead>
                            <tbody>
                              {inv.items.map(it => (
                                <tr key={it.id}>
                                  <td>{it.description}{it.partId !== null && <> <span className="adm-tag">stock part</span></>}</td>
                                  <td className="num">{it.quantity}</td>
                                  <td className="num">{money(Number(it.unitPrice))}</td>
                                  <td className="num">{money(Number(it.lineTotal))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Totals subtotal={Number(inv.subtotal)} gst={Number(inv.gst)} total={Number(inv.total)} />
                          {inv.notes && (
                            <div className="adm-detail-desc">
                              <span>Notes</span>
                              <p>{inv.notes}</p>
                            </div>
                          )}
                          <div className="adm-detail-actions">{actions(inv)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================ page ================================ */
export default function Invoices() {
  usePageTitle('Admin · Invoices');
  // dashboard links: ?tab=new, ?status=Unpaid, ?open=<invoice id>
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(window.location.search).get('tab') === 'new' ? 'new' : 'all'));
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const { toast, notify } = useToast();

  // list filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus>(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    return s === 'Unpaid' || s === 'Paid' || s === 'Void' || s === 'Refunded' ? s : 'All';
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [expandedId, setExpandedId] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('open')) || null);
  const toggleRow = (id: number) => setExpandedId(cur => (cur === id ? null : id));
  const goTab = (t: Tab) => { setTab(t); setExpandedId(null); };

  // popups
  const [created, setCreated] = useState<Invoice | null>(null);
  const [sharing, setSharing] = useState<Invoice | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [refunding, setRefunding] = useState<Invoice | null>(null);
  const [choices, setChoices] = useState<Record<number, 'stock' | 'writeoff'>>({});
  const [acting, setActing] = useState(false);

  /* ---------- loading ---------- */
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchInvoices(), fetchParts()])
      .then(([inv, p]) => { if (!cancelled) { setInvoices(inv); setParts(p); } })
      .catch(e => { if (!cancelled) notify(e instanceof Error ? e.message : 'Could not load invoices.', true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify]);

  // when opened from the dashboard (?open=…), scroll the opened invoice into view once loaded
  useEffect(() => {
    if (!loading) document.querySelector('.adm-row.open')?.scrollIntoView({ block: 'center' });
  }, [loading]);

  const reload = useCallback(async () => {
    try {
      const [inv, p] = await Promise.all([fetchInvoices(), fetchParts()]);
      setInvoices(inv);
      setParts(p);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not refresh.', true);
    }
  }, [notify]);

  /* ---------- derived data ---------- */
  const stats = useMemo(() => {
    const now = new Date();
    const sum = (list: Invoice[]) => list.reduce((s, i) => s + Number(i.total || 0), 0);
    const unpaid = invoices.filter(i => i.status === 'Unpaid');
    const paid = invoices.filter(i => i.status === 'Paid');
    const paidThisMonth = paid.filter(i => {
      const d = new Date(toIso(i.paidAt));
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const oldest = [...unpaid].sort((a, b) => a.id - b.id)[0] ?? null;
    const oldestDays = oldest ? Math.max(0, Math.floor((now.getTime() - new Date(toIso(oldest.createdAt)).getTime()) / 86_400_000)) : 0;
    return {
      oldest,
      oldestDays,
      total: invoices.length,
      unpaidCount: unpaid.length,
      unpaidSum: sum(unpaid),
      paidCount: paid.length,
      paidSum: sum(paid),
      monthSum: sum(paidThisMonth),
      cancelled: invoices.filter(i => i.status === 'Void' || i.status === 'Refunded').length,
    };
  }, [invoices]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = new Date();
    const list = invoices.filter(inv => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const d = new Date(toIso(inv.createdAt));
        if (dateFilter === 'month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (now.getTime() - d.getTime() > Number(dateFilter) * 86_400_000) return false;
      }
      if (!term) return true;
      const haystack = `${inv.number} ${inv.title ?? ''} ${inv.customerName} ${inv.customerContact ?? ''} ${inv.items.map(i => i.description).join(' ')}`.toLowerCase();
      return haystack.includes(term);
    });
    switch (sort) {
      case 'oldest': list.sort((a, b) => a.id - b.id); break;
      case 'amount-high': list.sort((a, b) => Number(b.total) - Number(a.total)); break;
      case 'amount-low': list.sort((a, b) => Number(a.total) - Number(b.total)); break;
      default: list.sort((a, b) => b.id - a.id);
    }
    return list;
  }, [invoices, query, statusFilter, dateFilter, sort]);

  const filtersActive = query.trim() !== '' || statusFilter !== 'All' || dateFilter !== 'all' || sort !== 'newest';
  const clearFilters = () => { setQuery(''); setStatusFilter('All'); setDateFilter('all'); setSort('newest'); };

  /* ---------- after the New invoice form creates one ---------- */
  const handleCreated = async (inv: Invoice) => {
    await reload();
    setEditorKey(k => k + 1);
    setTab('all');
    setExpandedId(inv.id);
    setCreated(inv);
  };

  /* ---------- status changes ---------- */
  const runAction = async (inv: Invoice, path: string, body: unknown, success: string) => {
    setActing(true);
    try {
      const res = await authFetch(`${API}/api/admin/invoices/${inv.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) throw new Error(await readError(res, 'That action failed.'));
      notify(success);
      setPending(null);
      setRefunding(null);
      setCreated(null);
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', true);
    } finally {
      setActing(false);
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    const { kind, inv } = pending;
    if (kind === 'paid') void runAction(inv, 'paid', null, `${inv.number} marked as paid.`);
    if (kind === 'unpaid') void runAction(inv, 'unpaid', null, `${inv.number} moved back to unpaid.`);
    if (kind === 'void') void runAction(inv, 'void', null, `${inv.number} voided.`);
  };

  // parts on the invoice that still exist (deleted ones can't be restocked or written off)
  const refundParts = refunding
    ? refunding.items.filter(i => i.partId !== null && parts.some(p => p.id === i.partId))
    : [];
  const allChosen = refundParts.every(i => choices[i.partId as number]);

  const openRefund = (inv: Invoice) => { setRefunding(inv); setChoices({}); };
  const confirmRefund = () => {
    if (!refunding || !allChosen) return;
    const restock = refundParts.map(i => i.partId as number).filter(pid => choices[pid] === 'stock');
    const off = refundParts.length - restock.length;
    const bits = [restock.length ? `${restock.length} back in stock` : '', off ? `${off} written off` : ''].filter(Boolean).join(', ');
    void runAction(refunding, 'refund', { restockPartIds: restock }, `${refunding.number} refunded${bits ? ` · ${bits}` : ''}.`);
  };

  const rowActions = (inv: Invoice) => (
    <>
      {inv.status === 'Unpaid' && <button type="button" className="adm-btn primary" onClick={() => setPending({ kind: 'paid', inv })}>Mark as paid</button>}
      <button type="button" className={`adm-btn${inv.status === 'Unpaid' ? '' : ' primary'}`} onClick={() => setSharing(inv)}>Share</button>
      <button type="button" className="adm-btn" onClick={() => { downloadInvoicePdf(inv).catch(e => notify(e instanceof Error ? e.message : 'Download failed.', true)); }}>Download PDF</button>
      {inv.status === 'Paid' && <button type="button" className="adm-btn" onClick={() => setPending({ kind: 'unpaid', inv })}>Mark unpaid</button>}
      {inv.status === 'Unpaid' && <button type="button" className="adm-btn ghost-danger" onClick={() => setPending({ kind: 'void', inv })}>Void</button>}
      {inv.status === 'Paid' && <button type="button" className="adm-btn ghost-danger" onClick={() => openRefund(inv)}>Refund &amp; void</button>}
    </>
  );

  const partNames = (inv: Invoice) => inv.items.filter(i => i.partId !== null).map(i => i.description);

  /* ================================ render ================================ */
  return (
    <div className="adm">
      <header className="adm-header">
        <div>
          <p className="adm-eyebrow">Billing</p>
          <h1>Invoices</h1>
          <p>Create GST-inclusive tax invoices, share them with customers and track payment.</p>
        </div>
      </header>

      <nav className="adm-tabs" role="tablist" aria-label="Invoice sections">
        <button type="button" role="tab" aria-selected={tab === 'all'} className={`adm-tab${tab === 'all' ? ' active' : ''}`} onClick={() => goTab('all')}>
          All invoices <span className="adm-tab-count">{stats.total}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'new'} className={`adm-tab${tab === 'new' ? ' active' : ''}`} onClick={() => goTab('new')}>
          New invoice
        </button>
      </nav>

      {/* ---------------- ALL INVOICES ---------------- */}
      {tab === 'all' && (
        <>
          <section className="adm-stats" aria-label="Invoice summary">
            <div className="adm-stat"><span>Outstanding</span><strong>{money(stats.unpaidSum)}</strong><small>{stats.unpaidCount} unpaid invoice{stats.unpaidCount === 1 ? '' : 's'}</small></div>
            <div className="adm-stat"><span>Collected</span><strong>{money(stats.paidSum)}</strong><small>{money(stats.monthSum)} this month · {stats.paidCount} paid</small></div>
            <div className="adm-stat">
              <span>Oldest unpaid</span>
              <strong>{stats.oldest ? `${stats.oldestDays} day${stats.oldestDays === 1 ? '' : 's'}` : '—'}</strong>
              <small>{stats.oldest ? `${stats.oldest.number} · ${stats.oldest.customerName}` : 'nothing to chase up'}</small>
            </div>
            <div className="adm-stat"><span>All invoices</span><strong>{stats.total}</strong><small>{stats.cancelled} voided / refunded</small></div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h2>Invoice history</h2>
                <p>{visible.length} of {invoices.length} invoices shown · tap an invoice to see details</p>
              </div>
            </div>

            <div className="adm-filters">
              <input className="adm-input" aria-label="Search invoices" placeholder="Search title, number, customer, item…" value={query} onChange={e => setQuery(e.target.value)} />
              <select className="adm-input" aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'All' | InvoiceStatus)}>
                <option value="All">All statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Void">Void</option>
                <option value="Refunded">Refunded</option>
              </select>
              <select className="adm-input" aria-label="Filter by date" value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}>
                <option value="all">Any date</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="month">This month</option>
              </select>
              <select className="adm-input" aria-label="Sort invoices" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount: high → low</option>
                <option value="amount-low">Amount: low → high</option>
              </select>
              <button type="button" className="adm-btn" onClick={clearFilters} disabled={!filtersActive}>Clear</button>
            </div>

            {loading ? (
              <Loading label="Loading invoices…" />
            ) : visible.length === 0 ? (
              <div className="adm-empty">
                {invoices.length === 0 ? (
                  <>
                    <strong>No invoices yet</strong>
                    <p>Create your first invoice for a customer.</p>
                    <button type="button" className="adm-btn primary" onClick={() => goTab('new')}>＋ New invoice</button>
                  </>
                ) : (
                  <>
                    <strong>No invoices match these filters</strong>
                    <p>Try a different search or clear the filters.</p>
                    <button type="button" className="adm-btn" onClick={clearFilters}>Clear filters</button>
                  </>
                )}
              </div>
            ) : (
              <InvoiceList invoices={visible} expandedId={expandedId} onToggle={toggleRow} actions={rowActions} />
            )}
          </section>
        </>
      )}

      {/* ---------------- NEW INVOICE ---------------- */}
      {tab === 'new' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h2>New invoice</h2>
              <p>Prices include GST. Creating an invoice doesn't change stock — parts are marked sold when it's paid.</p>
            </div>
          </div>
          <div className="adm-panel-body">
            <InvoiceEditor
              key={editorKey}
              parts={parts}
              invoices={invoices}
              notify={notify}
              onCreated={handleCreated}
              onCancel={() => goTab('all')}
              cancelLabel="Back to all invoices"
            />
          </div>
        </section>
      )}

      {/* ---------------- INVOICE CREATED ---------------- */}
      {created && (
        <Modal
          wide
          title="Invoice created"
          subtitle="What would you like to do with it?"
          onClose={() => setCreated(null)}
          footer={<button type="button" className="adm-btn" onClick={() => setCreated(null)}>Done</button>}
        >
          <div className="adm-success">
            <span className="adm-success-mark">✓</span>
            <div>
              <strong>{created.number} · {created.title || created.customerName}</strong>
              <span className="adm-muted" style={{ fontSize: '.82rem' }}>{money(Number(created.total))} incl. {money(Number(created.gst))} GST · Unpaid</span>
            </div>
          </div>
          <p className="adm-hint" style={{ marginBottom: 16 }}>Nothing in the shop changes until you mark it paid.</p>
          <InvoiceShare
            inv={created}
            notify={notify}
            extra={
              <button type="button" className="adm-share-opt" onClick={() => setPending({ kind: 'paid', inv: created })}>
                <span className="adm-share-ico">$</span>
                <div><strong>Mark as paid now</strong><span>Customer paid on the spot</span></div>
              </button>
            }
          />
        </Modal>
      )}

      {/* ---------------- SHARE ---------------- */}
      {sharing && (
        <Modal
          wide
          title={`Share ${sharing.number}`}
          subtitle={`${sharing.customerName} · ${money(Number(sharing.total))} · ${sharing.status}`}
          onClose={() => setSharing(null)}
          footer={<button type="button" className="adm-btn" onClick={() => setSharing(null)}>Close</button>}
        >
          <InvoiceShare inv={sharing} notify={notify} />
          <p className="adm-hint">The link always shows the invoice's latest status (paid, void…). Anyone with the link can view this one invoice — nothing else.</p>
        </Modal>
      )}

      {/* ---------------- PAID / UNPAID / VOID CONFIRMATION ---------------- */}
      {pending && (
        <ConfirmDialog
          danger={pending.kind === 'void'}
          busy={acting}
          title={pending.kind === 'paid' ? `Mark ${pending.inv.number} as paid?` : pending.kind === 'unpaid' ? `Move ${pending.inv.number} back to unpaid?` : `Void ${pending.inv.number}?`}
          confirmLabel={pending.kind === 'paid' ? 'Mark as paid' : pending.kind === 'unpaid' ? 'Mark unpaid' : 'Void invoice'}
          message={
            pending.kind === 'paid' ? (
              partNames(pending.inv).length
                ? <>These parts will be marked <strong>Sold</strong> and removed from the shop: {partNames(pending.inv).join(', ')}.</>
                : <>This invoice has no stock parts, so nothing in the shop changes.</>
            ) : pending.kind === 'unpaid' ? (
              partNames(pending.inv).length
                ? <>Its parts will go back on sale in the shop: {partNames(pending.inv).join(', ')}.</>
                : <>The invoice will show as unpaid again.</>
            ) : (
              <>The invoice stays on record marked <strong>VOID</strong> and can't be reopened. Its parts stay in stock.</>
            )
          }
          onCancel={() => { if (!acting) setPending(null); }}
          onConfirm={confirmPending}
        />
      )}

      {/* ---------------- REFUND & VOID ---------------- */}
      {refunding && (
        <Modal
          title={`Refund & void ${refunding.number}?`}
          subtitle={`${refunding.customerName} · ${money(Number(refunding.total))}`}
          onClose={() => { if (!acting) setRefunding(null); }}
          footer={
            <>
              <button type="button" className="adm-btn" onClick={() => setRefunding(null)} disabled={acting}>Cancel</button>
              <button type="button" className="adm-btn danger" onClick={confirmRefund} disabled={acting || !allChosen}>{acting ? 'Working…' : 'Refund & void'}</button>
            </>
          }
        >
          <div className="adm-callout danger">The invoice will be marked <strong>REFUNDED</strong> and can't be reopened. Make sure you've actually returned the money.</div>
          {refundParts.length > 0 ? (
            <>
              <p className="adm-hint" style={{ margin: '16px 0 10px' }}>
                What happens to each part? <strong>Back in stock</strong> puts it on sale again. <strong>Write off</strong> takes it out of the shop
                without counting it as sold (e.g. it came back damaged) — you can still relist it later.
              </p>
              {refundParts.map(it => {
                const pid = it.partId as number;
                const choice = choices[pid];
                const set = (c: 'stock' | 'writeoff') => setChoices(cs => ({ ...cs, [pid]: c }));
                return (
                  <div key={it.id} className={`adm-check${choice ? ' on' : ''}`}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="adm-strong">{it.description}</div>
                      <div className="adm-sub">{choice === 'stock' ? 'Goes back on sale' : choice === 'writeoff' ? 'Hidden from the shop, not counted as sold' : 'Choose one'}</div>
                    </div>
                    <div className="adm-seg" role="group" aria-label={`What to do with ${it.description}`}>
                      <button type="button" className={choice === 'stock' ? 'on' : ''} onClick={() => set('stock')}>Back in stock</button>
                      <button type="button" className={choice === 'writeoff' ? 'on danger' : ''} onClick={() => set('writeoff')}>Write off</button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="adm-hint" style={{ marginTop: 14 }}>This invoice has no stock parts, so nothing in the shop changes.</p>
          )}
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}
