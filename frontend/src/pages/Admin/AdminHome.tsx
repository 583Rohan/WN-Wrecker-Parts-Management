import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API, authFetch, fmtDate, money, useToast } from '../../lib/admin';
import { toIso } from '../../lib/invoices';
import { Toast } from '../../components/AdminUI';
import { startPolling } from '../../lib/poll';
import '../../styles/admin.css';
import { usePageTitle } from '../../lib/usePageTitle';

/* ================================ types ================================ */
type InvoiceStatus = 'Unpaid' | 'Paid' | 'Void' | 'Refunded';

type Stats = {
  parts: { total: number; inStock: number; sold: number; writtenOff: number; inventoryValue: number; makes: number };
  chats: { open: number; needsReply: number; waiting: number; closed: number };
  invoices: {
    total: number;
    unpaidCount: number;
    outstanding: number;
    oldestUnpaidDays: number | null;
    oldestUnpaidNumber: string | null;
    paidCount: number;
    collected: number;
    collectedThisMonth: number;
    paidThisMonth: number;
  };
  salesByMonth: { month: string; label: string; total: number; count: number }[];
  chatsNeedingReply: { id: number; reference: string | null; customerName: string | null; lastMessageAt: string; lastMessage: string | null; parts: number }[];
  recentInvoices: { id: number; number: string; title: string | null; customerName: string; total: number; status: InvoiceStatus; createdAt: string }[];
};

/* ================================ helpers ================================ */
function timeAgo(iso: string) {
  const d = new Date(toIso(iso));
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'yesterday';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const STATUS_CLASS: Record<InvoiceStatus, string> = { Unpaid: 'unpaid', Paid: 'paid', Void: 'void', Refunded: 'refunded' };

async function fetchStats(): Promise<Stats> {
  const res = await authFetch(`${API}/api/admin/stats`);
  if (!res.ok) throw new Error('Could not load the dashboard.');
  return res.json();
}

/* ================================ page ================================ */
export default function AdminHome() {
  usePageTitle('Admin · Dashboard');
  const navigate = useNavigate();
  const { toast, notify } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // load now, then refresh every 30 seconds so the numbers stay current
  useEffect(() => {
    let alive = true;
    const stop = startPolling(() =>
      fetchStats()
        .then(d => { if (alive) { setStats(d); setFailed(false); setUpdatedAt(new Date()); } })
        .catch(() => { if (alive) setFailed(true); }), 30000);
    return () => { alive = false; stop(); };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setStats(await fetchStats());
      setFailed(false);
      setUpdatedAt(new Date());
    } catch {
      notify('Could not refresh the dashboard.', true);
    } finally {
      setRefreshing(false);
    }
  };

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const maxSale = stats ? Math.max(1, ...stats.salesByMonth.map(m => m.total)) : 1;
  const thisMonth = stats?.salesByMonth[stats.salesByMonth.length - 1]?.month;
  const partPct = (n: number) => (stats && stats.parts.total ? Math.round((n / stats.parts.total) * 100) : 0);

  /* ================================ render ================================ */
  return (
    <div className="adm">
      <header className="adm-header">
        <div>
          <p className="adm-eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p>{greeting()} — here's what needs your attention. <span className="adm-muted">{today}</span></p>
        </div>
        <div className="adm-dash-refresh">
          {updatedAt && <span>Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
          <button type="button" className="adm-btn sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>
      </header>

      {!stats ? (
        failed ? (
          <section className="adm-panel">
            <div className="adm-empty">
              <strong>The dashboard couldn't load</strong>
              <p>Check that the API is running, then try again.</p>
              <button type="button" className="adm-btn primary" onClick={() => void refresh()}>Try again</button>
            </div>
          </section>
        ) : (
          <div className="adm-loading"><span className="adm-spinner" /><span>Loading dashboard…</span></div>
        )
      ) : (
        <>
          {/* ---------------- needs attention ---------------- */}
          <section className="adm-attn" aria-label="Needs attention">
            <Link to="/admin/chats" className={`adm-attn-card${stats.chats.needsReply ? ' alert' : ' ok'}`}>
              <span className="adm-attn-icon" aria-hidden="true">💬</span>
              <div>
                <strong>{stats.chats.needsReply ? plural(stats.chats.needsReply, 'chat') + ' need a reply' : 'All chats answered'}</strong>
                <span>{stats.chats.needsReply ? 'Customers are waiting on you' : `${plural(stats.chats.waiting, 'chat')} waiting on the customer`}</span>
              </div>
              <span className="adm-attn-go">Open chats →</span>
            </Link>
            <Link to="/admin/invoices?status=Unpaid" className={`adm-attn-card${stats.invoices.unpaidCount ? ' warn' : ' ok'}`}>
              <span className="adm-attn-icon" aria-hidden="true">🧾</span>
              <div>
                <strong>{stats.invoices.unpaidCount ? `${money(stats.invoices.outstanding)} outstanding` : 'No unpaid invoices'}</strong>
                <span>
                  {stats.invoices.unpaidCount
                    ? `${plural(stats.invoices.unpaidCount, 'unpaid invoice')}${stats.invoices.oldestUnpaidDays !== null ? ` · oldest ${plural(stats.invoices.oldestUnpaidDays, 'day')} (${stats.invoices.oldestUnpaidNumber})` : ''}`
                    : 'Everything has been paid'}
                </span>
              </div>
              <span className="adm-attn-go">View unpaid →</span>
            </Link>
          </section>

          {/* ---------------- quick actions ---------------- */}
          <div className="adm-quick">
            <Link to="/admin/parts?tab=add" className="adm-btn primary">＋ Add a part</Link>
            <Link to="/admin/invoices?tab=new" className="adm-btn">＋ New invoice</Link>
            <Link to="/admin/chats" className="adm-btn">Open chats</Link>
            <Link to="/admin/parts" className="adm-btn">Manage parts</Link>
          </div>

          {/* ---------------- key numbers ---------------- */}
          <section className="adm-stats" aria-label="Key numbers">
            <div className="adm-stat"><span>Collected this month</span><strong>{money(stats.invoices.collectedThisMonth)}</strong><small>{plural(stats.invoices.paidThisMonth, 'paid invoice')}</small></div>
            <div className="adm-stat"><span>Collected all time</span><strong>{money(stats.invoices.collected)}</strong><small>{plural(stats.invoices.paidCount, 'paid invoice')}</small></div>
            <div className="adm-stat"><span>Active listings</span><strong>{stats.parts.inStock}</strong><small>{money(stats.parts.inventoryValue)} on sale · {plural(stats.parts.makes, 'make')}</small></div>
            <div className="adm-stat"><span>Open chats</span><strong>{stats.chats.open}</strong><small>{stats.chats.needsReply} need reply · {stats.chats.waiting} waiting</small></div>
          </section>

          {/* ---------------- lists ---------------- */}
          <div className="adm-dash-grid">
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Chats needing a reply</h2>
                  <p>Newest first · tap one to open it</p>
                </div>
                <Link to="/admin/chats" className="adm-link">All chats →</Link>
              </div>
              {stats.chatsNeedingReply.length === 0 ? (
                <div className="adm-empty adm-empty-sm"><strong>You're all caught up</strong><p>No customer is waiting for a reply.</p></div>
              ) : (
                <div className="adm-dash-list">
                  {stats.chatsNeedingReply.map(c => (
                    <button key={c.id} type="button" className="adm-dash-row needs" onClick={() => navigate(`/admin/chats?open=${c.id}`)}>
                      <span className="adm-dot on" aria-hidden="true" />
                      <span className="adm-dash-main">
                        <strong>{c.customerName?.trim() || `Guest ${c.reference ?? ''}`}</strong>
                        <span>{c.lastMessage || 'No messages yet'}</span>
                      </span>
                      <span className="adm-dash-side">
                        <small>{timeAgo(c.lastMessageAt)}</small>
                        {c.parts > 0 && <span className="adm-tag">{plural(c.parts, 'part')}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Recent invoices</h2>
                  <p>Latest {stats.recentInvoices.length} · tap one to open it</p>
                </div>
                <Link to="/admin/invoices" className="adm-link">All invoices →</Link>
              </div>
              {stats.recentInvoices.length === 0 ? (
                <div className="adm-empty adm-empty-sm"><strong>No invoices yet</strong><p>Create one from Invoices or a chat.</p></div>
              ) : (
                <div className="adm-dash-list">
                  {stats.recentInvoices.map(i => (
                    <button key={i.id} type="button" className="adm-dash-row" onClick={() => navigate(`/admin/invoices?open=${i.id}`)}>
                      <span className="adm-dash-main">
                        <strong>{i.title || i.customerName}</strong>
                        <span>{i.number}{i.title ? ` · ${i.customerName}` : ''} · {fmtDate(i.createdAt)}</span>
                      </span>
                      <span className="adm-dash-side">
                        <span className={i.status === 'Void' || i.status === 'Refunded' ? 'adm-strike' : 'adm-price'}>{money(Number(i.total))}</span>
                        <span className={`adm-badge ${STATUS_CLASS[i.status] ?? 'void'}`}>{i.status}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ---------------- sales + inventory ---------------- */}
          <div className="adm-dash-grid">
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Sales — last 6 months</h2>
                  <p>Paid invoices, incl. GST, by the month they were paid</p>
                </div>
              </div>
              <div className="adm-chart" role="img" aria-label="Paid sales for the last six months">
                {stats.salesByMonth.map(m => (
                  <div key={m.month} className={`adm-chart-col${m.month === thisMonth ? ' current' : ''}`} title={`${m.label}: ${money(m.total)} from ${plural(m.count, 'invoice')}`}>
                    <span className="adm-chart-val">{m.total ? money(m.total) : '—'}</span>
                    <div className="adm-chart-track"><div className="adm-chart-bar" style={{ height: `${Math.max(m.total ? 4 : 0, (m.total / maxSale) * 100)}%` }} /></div>
                    <span className="adm-chart-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Inventory</h2>
                  <p>{plural(stats.parts.total, 'part')} in the system</p>
                </div>
                <Link to="/admin/parts" className="adm-link">Manage parts →</Link>
              </div>
              <div className="adm-panel-body">
                <div className="adm-meter" aria-hidden="true">
                  <span className="stock" style={{ width: `${partPct(stats.parts.inStock)}%` }} />
                  <span className="sold" style={{ width: `${partPct(stats.parts.sold)}%` }} />
                  <span className="off" style={{ width: `${partPct(stats.parts.writtenOff)}%` }} />
                </div>
                <div className="adm-legend">
                  <div><i className="stock" /> In stock <strong>{stats.parts.inStock}</strong></div>
                  <div><i className="sold" /> Sold <strong>{stats.parts.sold}</strong></div>
                  <div><i className="off" /> Written off <strong>{stats.parts.writtenOff}</strong></div>
                </div>
                <div className="adm-dash-facts">
                  <div><span>Listing value</span><strong>{money(stats.parts.inventoryValue)}</strong></div>
                  <div><span>Vehicle makes in stock</span><strong>{stats.parts.makes}</strong></div>
                  <div><span>Closed chats</span><strong>{stats.chats.closed}</strong></div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      <Toast toast={toast} />
    </div>
  );
}
