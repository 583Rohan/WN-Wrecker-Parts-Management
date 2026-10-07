import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

type Stats = {
  parts: { total: number; inStock: number; sold: number; inventoryValue: number; makes: number };
  chats: { total: number; active: number; needHuman: number };
  invoices: { count: number; revenue: number };
  recentChats: { id: number; customer: string | null; handedOff: boolean; archived: boolean; lastMessageAt: string; lastMessage: string | null }[];
  recentInvoices: { id: number; number: string; customerName: string; total: number; createdAt: string }[];
};

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => {
  if (!iso) return '';
  const norm = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(norm);
  return isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

const styles = `
  .db-eyebrow { color:#b87100; font-size:.72rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; margin:0 0 6px; }
  .db-head h1 { margin:0; color:#0d1930; font-size:2rem; letter-spacing:-.03em; }
  .db-head p { margin:8px 0 22px; color:#64748b; font-size:.9rem; }
  .db-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(175px,1fr)); gap:14px; margin-bottom:22px; }
  .db-stat { position:relative; overflow:hidden; padding:18px 20px; border:1px solid #dfe5ec; border-radius:13px; background:#fff; box-shadow:0 8px 25px rgba(13,25,48,.05); }
  .db-stat::after { content:''; position:absolute; right:-18px; bottom:-24px; width:72px; height:72px; border-radius:50%; background:rgba(247,164,17,.1); }
  .db-stat span { color:#64748b; font-size:.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
  .db-stat strong { display:block; margin-top:7px; color:#0d1930; font-size:1.7rem; }
  .db-stat small { color:#94a3b8; font-size:.72rem; }
  .db-stat.alert strong { color:#b91c1c; }
  .db-actions { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:26px; }
  .db-btn { padding:10px 16px; border-radius:9px; font-weight:800; font-size:.85rem; cursor:pointer; border:1px solid #cbd5e1; background:#fff; color:#0d1930; }
  .db-btn:hover { border-color:#f7a411; background:#fffaf0; }
  .db-btn.primary { background:#f7a411; border-color:#f7a411; color:#111827; }
  .db-btn.primary:hover { background:#ffc04c; }
  .db-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:18px; }
  .db-panel { border:1px solid #dfe5ec; border-radius:14px; background:#fff; overflow:hidden; box-shadow:0 10px 30px rgba(13,25,48,.05); }
  .db-panel-head { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid #eef2f6; }
  .db-panel-head h2 { margin:0; font-size:1.02rem; color:#0d1930; }
  .db-panel-head a { color:#b87100; font-size:.78rem; font-weight:700; }
  .db-row { display:flex; justify-content:space-between; gap:12px; padding:12px 18px; border-bottom:1px solid #f1f4f8; }
  .db-row:last-child { border-bottom:0; }
  .db-row .main { min-width:0; }
  .db-row .main strong { display:block; color:#0d1930; font-size:.88rem; }
  .db-row .main span { display:block; color:#64748b; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:260px; }
  .db-row .side { text-align:right; white-space:nowrap; }
  .db-pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:.66rem; font-weight:800; }
  .db-pill.human { background:#fef3c7; color:#92400e; }
  .db-pill.bot { background:#ede9fe; color:#6d28d9; }
  .db-pill.archived { background:#e2e8f0; color:#475569; }
  .db-empty { padding:24px 18px; color:#94a3b8; font-size:.85rem; }
  .db-amt { color:#cf7800; font-weight:900; }
`;

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
    return fetch(url, { ...options, headers });
  }, []);

  useEffect(() => {
    authFetch(`${API}/api/admin/stats`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load dashboard.'))))
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [authFetch]);

  return (
    <>
      <style>{styles}</style>
      <div className="db-head">
        <p className="db-eyebrow">Overview</p>
        <h1>Admin dashboard</h1>
        <p>A snapshot of your inventory, enquiries and invoices.</p>
      </div>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!stats ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="db-stats">
            <div className="db-stat"><span>In stock</span><strong>{stats.parts.inStock}</strong><small>of {stats.parts.total} parts</small></div>
            <div className="db-stat"><span>Sold</span><strong>{stats.parts.sold}</strong></div>
            <div className="db-stat"><span>Inventory value</span><strong>{money(stats.parts.inventoryValue)}</strong></div>
            <div className={`db-stat${stats.chats.needHuman > 0 ? ' alert' : ''}`}><span>Needs reply</span><strong>{stats.chats.needHuman}</strong><small>active enquiries</small></div>
            <div className="db-stat"><span>Active chats</span><strong>{stats.chats.active}</strong></div>
            <div className="db-stat"><span>Invoices</span><strong>{stats.invoices.count}</strong></div>
            <div className="db-stat"><span>Revenue (incl GST)</span><strong>{money(stats.invoices.revenue)}</strong></div>
          </div>

          <div className="db-actions">
            <Link to="/admin/parts" className="db-btn">Manage parts</Link>
            <Link to="/admin/chats" className="db-btn">Chat management</Link>
            <Link to="/admin/invoices" className="db-btn primary">＋ New invoice</Link>
          </div>

          <div className="db-cols">
            <div className="db-panel">
              <div className="db-panel-head"><h2>Recent enquiries</h2><Link to="/admin/chats">View all →</Link></div>
              {stats.recentChats.length === 0 ? (
                <div className="db-empty">No enquiries yet.</div>
              ) : (
                stats.recentChats.map(c => (
                  <div className="db-row" key={c.id}>
                    <div className="main">
                      <strong>{c.customer || `Customer #${c.id}`}</strong>
                      <span>{c.lastMessage || 'No messages yet'}</span>
                    </div>
                    <div className="side">
                      {c.archived ? <span className="db-pill archived">Archived</span>
                        : c.handedOff ? <span className="db-pill human">Needs reply</span>
                        : <span className="db-pill bot">Bot</span>}
                      <div style={{ color: '#94a3b8', fontSize: '.72rem', marginTop: 4 }}>{fmtDate(c.lastMessageAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="db-panel">
              <div className="db-panel-head"><h2>Recent invoices</h2><Link to="/admin/invoices">View all →</Link></div>
              {stats.recentInvoices.length === 0 ? (
                <div className="db-empty">No invoices yet.</div>
              ) : (
                stats.recentInvoices.map(i => (
                  <div className="db-row" key={i.id}>
                    <div className="main">
                      <strong>{i.number}</strong>
                      <span>{i.customerName}</span>
                    </div>
                    <div className="side">
                      <div className="db-amt">{money(i.total)}</div>
                      <div style={{ color: '#94a3b8', fontSize: '.72rem', marginTop: 4 }}>{fmtDate(i.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}