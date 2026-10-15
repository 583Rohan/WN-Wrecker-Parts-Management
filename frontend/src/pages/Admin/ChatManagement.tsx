import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Part } from '../../lib/types';
import { API, authFetch, fmtDate, money, useToast } from '../../lib/admin';
import {
  downloadAuthed, fetchInvoices, fetchParts, invoiceLink, isEmail, readError, toIso,
  type Invoice,
} from '../../lib/invoices';
import { ConfirmDialog, Modal, Toast } from '../../components/AdminUI';
import InvoiceEditor from '../../components/InvoiceEditor';
import SharePanel from '../../components/SharePanel';
import { useBusiness } from '../../lib/business';
import { startPolling } from '../../lib/poll';
import '../../styles/admin.css';

/* ================================ types ================================ */
type ChatStatus = 'Needs reply' | 'Waiting on customer' | 'Closed';
type ChatPart = { partId: number; name: string; vehicle: string; price: number; status: string };
type ChatInvoice = { number: string; title: string | null; total: number; status: string; publicToken: string | null };
type ChatMsg = { id: number; sender: string; text: string; sentAt: string; kind: string; invoice: ChatInvoice | null };

type ChatSummary = {
  id: number;
  reference: string | null;
  customerName: string | null;
  customerContact: string | null;
  status: ChatStatus;
  needsReply: boolean;
  closed: boolean;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: { text: string; sender: string } | null;
  searchText?: string;
  parts: ChatPart[];
};
type ChatDetail = Omit<ChatSummary, 'messageCount' | 'lastMessage' | 'searchText'> & {
  handedOff: boolean;
  transcriptToken: string | null;
  messages: ChatMsg[];
};

type Tab = 'active' | 'closed';
type Filter = 'all' | 'Needs reply' | 'Waiting on customer';
type View = 'list' | 'product';

/* ================================ helpers ================================ */
const displayName = (c: { customerName: string | null; reference: string | null }) =>
  c.customerName?.trim() || `Guest ${c.reference ?? ''}`.trim();

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

const timeOnly = (iso: string) => new Date(toIso(iso)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const STATUS_CLASS: Record<ChatStatus, string> = {
  'Needs reply': 'needs',
  'Waiting on customer': 'waiting',
  Closed: 'void',
};
function ChatBadge({ status }: { status: ChatStatus }) {
  return <span className={`adm-badge chat-${STATUS_CLASS[status] ?? 'void'}`}>{status}</span>;
}

const partBadge = (status: string) => {
  const s = status.trim().toLowerCase();
  if (s === 'sold') return <span className="adm-badge sold">Sold</span>;
  if (s === 'written off') return <span className="adm-badge void">Written off</span>;
  return <span className="adm-badge stock">In stock</span>;
};

// tell the admin nav to refresh its "needs reply" badge
const pingNav = () => window.dispatchEvent(new Event('wn-chats-changed'));

/* ================================ page ================================ */
export default function ChatManagement() {
  const { toast, notify } = useToast();
  const { name: businessName } = useBusiness();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('list');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ?open=<chat id> opens that chat straight away (used by the dashboard)
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('open')) || null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  // popups
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'existing' | 'new'>('existing');
  const [invoiceData, setInvoiceData] = useState<{ invoices: Invoice[]; parts: Part[] } | null>(null);
  const [pickedInvoice, setPickedInvoice] = useState<number | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState('');

  /* ---------- loading (polls so new messages show up on their own) ---------- */
  const loadList = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/admin/chats`);
      if (res.ok) setChats(await res.json());
    } catch { /* keep the last list if a poll fails */ }
  }, []);

  // chat list: refresh every 8s (never overlapping, paused while the tab is hidden)
  useEffect(() => {
    let alive = true;
    const stop = startPolling(async () => { await loadList(); if (alive) setLoading(false); }, 8000);
    return () => { alive = false; stop(); };
  }, [loadList]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const res = await authFetch(`${API}/api/admin/chats/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore a failed poll */ }
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    let alive = true;
    // open conversation: refresh every 4s (never overlapping, paused while the tab is hidden)
    const stop = startPolling(() =>
      authFetch(`${API}/api/admin/chats/${selectedId}`)
        .then(r => (r.ok ? r.json() : null))
        .then((d: ChatDetail | null) => { if (alive && d) setDetail(d); }), 4000);
    return () => { alive = false; stop(); };
  }, [selectedId]);

  const current = detail && detail.id === selectedId ? detail : null;

  // keep the newest message in view
  const msgCount = current?.messages.length ?? 0;
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgCount, selectedId]);

  const refreshAll = async () => {
    await Promise.all([loadList(), selectedId != null ? loadDetail(selectedId) : Promise.resolve()]);
    pingNav();
  };

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const active = chats.filter(c => !c.closed);
    return {
      active: active.length,
      closed: chats.length - active.length,
      needs: active.filter(c => c.status === 'Needs reply').length,
      waiting: active.filter(c => c.status === 'Waiting on customer').length,
    };
  }, [chats]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return chats
      .filter(c => (tab === 'closed' ? c.closed : !c.closed))
      .filter(c => tab === 'closed' || filter === 'all' || c.status === filter)
      .filter(c => {
        if (!term) return true;
        const hay = `${c.customerName ?? ''} ${c.customerContact ?? ''} ${c.reference ?? ''} ${c.lastMessage?.text ?? ''} ${c.searchText ?? ''} ${c.parts.map(p => `${p.name} ${p.vehicle}`).join(' ')}`;
        return hay.toLowerCase().includes(term);
      })
      // needs-reply chats float to the top, then newest activity first
      .sort((a, b) => Number(b.needsReply) - Number(a.needsReply) || toIso(b.lastMessageAt).localeCompare(toIso(a.lastMessageAt)));
  }, [chats, tab, filter, query]);

  // "By product": active chats grouped under each part they asked about (a chat can appear under several parts)
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; part: ChatPart | null; chats: ChatSummary[] }>();
    for (const c of visible) {
      const targets = c.parts.length ? c.parts : [null];
      for (const p of targets) {
        const key = p ? `p${p.partId}` : 'none';
        if (!map.has(key)) map.set(key, { key, part: p, chats: [] });
        map.get(key)!.chats.push(c);
      }
    }
    const latest = (g: { chats: ChatSummary[] }) => g.chats.reduce((m, c) => (toIso(c.lastMessageAt) > m ? toIso(c.lastMessageAt) : m), '');
    const needs = (g: { chats: ChatSummary[] }) => g.chats.filter(c => c.needsReply).length;
    return [...map.values()].sort((a, b) =>
      Number(a.key === 'none') - Number(b.key === 'none') ||
      Number(needs(b) > 0) - Number(needs(a) > 0) ||
      latest(b).localeCompare(latest(a)));
  }, [visible]);

  const toggleGroup = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  /* ---------- actions ---------- */
  const select = (id: number) => { setSelectedId(id); setReply(''); };

  const sendReply = async () => {
    if (!current || !reply.trim()) return;
    setSending(true);
    try {
      const res = await authFetch(`${API}/api/admin/chats/${current.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply.trim() }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Message not sent.'));
      setReply('');
      await refreshAll();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Message not sent.', true);
    } finally {
      setSending(false);
    }
  };

  const onReplyKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); }
  };

  const post = async (path: string, success: string) => {
    if (!current) return;
    setBusy(true);
    try {
      const res = await authFetch(`${API}/api/admin/chats/${current.id}/${path}`, { method: 'POST' });
      if (!res.ok) throw new Error(await readError(res, 'That action failed.'));
      notify(success);
      setConfirmClose(false);
      await refreshAll();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', true);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- send invoice ---------- */
  const openInvoicePopup = async () => {
    setInvoiceOpen(true);
    setInvoiceMode('existing');
    setPickedInvoice(null);
    setInvoiceQuery('');
    setInvoiceData(null);
    try {
      const [invoices, parts] = await Promise.all([fetchInvoices(), fetchParts()]);
      setInvoiceData({ invoices, parts });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load invoices.', true);
    }
  };

  const sendInvoice = async (invoiceId: number, number: string) => {
    if (!current) return;
    setBusy(true);
    try {
      const res = await authFetch(`${API}/api/admin/chats/${current.id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      if (!res.ok) throw new Error(await readError(res, 'The invoice could not be sent.'));
      notify(`${number} sent to the chat.`);
      setInvoiceOpen(false);
      await refreshAll();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', true);
    } finally {
      setBusy(false);
    }
  };

  const invoiceChoices = useMemo(() => {
    if (!invoiceData || !current) return [];
    const term = invoiceQuery.trim().toLowerCase();
    return invoiceData.invoices
      .filter(i => i.status === 'Unpaid' || i.status === 'Paid')
      .filter(i => !term || `${i.number} ${i.title ?? ''} ${i.customerName} ${i.customerContact ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) =>
        Number(b.conversationId === current.id) - Number(a.conversationId === current.id) ||
        Number(b.status === 'Unpaid') - Number(a.status === 'Unpaid') ||
        b.id - a.id);
  }, [invoiceData, invoiceQuery, current]);

  const transcriptLink = current?.transcriptToken ? `${API}/api/chat/transcript/${current.transcriptToken}/pdf` : '';

  /* ================================ render ================================ */
  return (
    <div className="adm">
      <header className="adm-header">
        <div>
          <p className="adm-eyebrow">Customers</p>
          <h1>Chats</h1>
          <p>Reply to customers, send invoices and keep a record of every conversation.</p>
        </div>
      </header>

      <nav className="adm-tabs" role="tablist" aria-label="Chat sections">
        <button type="button" role="tab" aria-selected={tab === 'active'} className={`adm-tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          Active <span className="adm-tab-count">{counts.active}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'closed'} className={`adm-tab${tab === 'closed' ? ' active' : ''}`} onClick={() => setTab('closed')}>
          Closed <span className="adm-tab-count">{counts.closed}</span>
        </button>
      </nav>

      {tab === 'active' && (
        <section className="adm-stats" aria-label="Chat summary">
          <button type="button" className={`adm-stat adm-stat-btn alert${filter === 'Needs reply' ? ' on' : ''}`} onClick={() => setFilter(f => (f === 'Needs reply' ? 'all' : 'Needs reply'))}>
            <span>Needs reply</span><strong>{counts.needs}</strong><small>customers waiting on you</small>
          </button>
          <button type="button" className={`adm-stat adm-stat-btn${filter === 'Waiting on customer' ? ' on' : ''}`} onClick={() => setFilter(f => (f === 'Waiting on customer' ? 'all' : 'Waiting on customer'))}>
            <span>Waiting on customer</span><strong>{counts.waiting}</strong><small>you replied last</small>
          </button>
          <button type="button" className="adm-stat adm-stat-btn" onClick={() => setTab('closed')}>
            <span>Closed</span><strong>{counts.closed}</strong><small>kept as a record</small>
          </button>
        </section>
      )}

      <section className={`adm-panel adm-chat${current ? ' show-detail' : ''}`}>
        {/* ---------------- LIST ---------------- */}
        <aside className="adm-chat-list">
          <div className="adm-chat-search">
            <input className="adm-input" aria-label="Search chats" placeholder="Search name, reference, part, message…" value={query} onChange={e => setQuery(e.target.value)} />
            {tab === 'active' && (
              <div className="adm-chips">
                {(['all', 'Needs reply', 'Waiting on customer'] as Filter[]).map(f => (
                  <button key={f} type="button" className={`adm-chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                    {f === 'all' ? 'All' : f === 'Waiting on customer' ? 'Waiting' : f}
                    {f === 'Needs reply' && counts.needs > 0 && <span className="adm-chip-count">{counts.needs}</span>}
                  </button>
                ))}
              </div>
            )}
            {tab === 'active' && (
              <div className="adm-seg adm-seg-wide" role="tablist" aria-label="Chat view">
                <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>All chats</button>
                <button type="button" className={view === 'product' ? 'on' : ''} onClick={() => setView('product')}>By product</button>
              </div>
            )}
          </div>

          <div className="adm-chat-items">
            {loading ? (
              <div className="adm-loading"><span className="adm-spinner" /><span>Loading chats…</span></div>
            ) : visible.length === 0 ? (
              <div className="adm-empty">
                <strong>{query || filter !== 'all' ? 'No chats match' : tab === 'closed' ? 'No closed chats' : 'No active chats'}</strong>
                <p>{query || filter !== 'all' ? 'Try a different search or filter.' : 'New customer chats show up here automatically.'}</p>
              </div>
            ) : tab === 'active' && view === 'product' ? (
              groups.map(g => {
                const open = !collapsed.has(g.key);
                const needs = g.chats.filter(c => c.needsReply).length;
                return (
                  <div key={g.key} className="adm-group">
                    <button type="button" className="adm-group-head" onClick={() => toggleGroup(g.key)} aria-expanded={open}>
                      <span className={`adm-chevron${open ? ' open' : ''}`} aria-hidden="true">▾</span>
                      <span className="adm-group-title">
                        <strong>{g.part ? g.part.name : 'General enquiries'}</strong>
                        <small>{g.part ? `${g.part.vehicle} · ${money(Number(g.part.price))}` : 'no part attached'}</small>
                      </span>
                      {g.part && partBadge(g.part.status)}
                      <span className="adm-tag">{g.chats.length} chat{g.chats.length === 1 ? '' : 's'}</span>
                      {needs > 0 && <span className="adm-chip-count">{needs}</span>}
                    </button>
                    {open && g.chats.map(c => (
                      <button
                        key={`${g.key}-${c.id}`}
                        type="button"
                        className={`adm-chat-item sub${c.needsReply ? ' needs' : ''}${selectedId === c.id ? ' selected' : ''}`}
                        onClick={() => select(c.id)}
                      >
                        <span className={`adm-dot${c.needsReply ? ' on' : ''}`} aria-hidden="true" />
                        <span className="adm-chat-item-main">
                          <span className="adm-chat-item-top">
                            <strong>{displayName(c)}</strong>
                            <small>{timeAgo(c.lastMessageAt)}</small>
                          </span>
                          <span className="adm-chat-item-meta"><ChatBadge status={c.status} /></span>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              visible.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`adm-chat-item${c.needsReply ? ' needs' : ''}${selectedId === c.id ? ' selected' : ''}`}
                  onClick={() => select(c.id)}
                >
                  <span className={`adm-dot${c.needsReply ? ' on' : ''}`} aria-hidden="true" />
                  <span className="adm-chat-item-main">
                    <span className="adm-chat-item-top">
                      <strong>{displayName(c)}</strong>
                      <small>{timeAgo(c.lastMessageAt)}</small>
                    </span>
                    <span className="adm-chat-item-preview">
                      {c.lastMessage ? `${c.lastMessage.sender === 'admin' ? 'You: ' : c.lastMessage.sender === 'bot' ? 'Bot: ' : ''}${c.lastMessage.text}` : 'No messages yet'}
                    </span>
                    <span className="adm-chat-item-meta">
                      <ChatBadge status={c.status} />
                      {c.parts.length > 0 && <span className="adm-tag">{c.parts.length} part{c.parts.length === 1 ? '' : 's'}</span>}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ---------------- CONVERSATION ---------------- */}
        <div className="adm-chat-detail">
          {!current ? (
            <div className="adm-empty adm-chat-placeholder">
              <strong>{selectedId ? 'Loading…' : 'Select a chat'}</strong>
              <p>{selectedId ? '' : 'Pick a conversation on the left to read and reply.'}</p>
            </div>
          ) : (
            <>
              <div className="adm-chat-head">
                <button type="button" className="adm-btn sm adm-chat-back" onClick={() => setSelectedId(null)}>← Chats</button>
                <div className="adm-chat-who">
                  <strong>{displayName(current)}</strong>
                  <span>
                    {current.reference && <>Ref {current.reference} · </>}
                    {current.customerContact ? current.customerContact : 'no contact details'} · started {fmtDate(current.createdAt)}
                  </span>
                </div>
                <ChatBadge status={current.status} />
                <div className="adm-chat-actions">
                  {!current.closed && <button type="button" className="adm-btn primary sm" onClick={() => void openInvoicePopup()}>Send invoice</button>}
                  <button type="button" className="adm-btn sm" onClick={() => setShareOpen(true)}>Transcript</button>
                  {!current.closed && <button type="button" className="adm-btn sm ghost-danger" onClick={() => setConfirmClose(true)}>Close chat</button>}
                  {current.closed && current.closedBy === 'admin' && (
                    <button type="button" className="adm-btn sm" onClick={() => void post('reopen', 'Chat reopened.')} disabled={busy}>Reopen</button>
                  )}
                </div>
              </div>

              {current.parts.length > 0 && (
                <div className="adm-chat-parts">
                  {current.parts.map(p => (
                    <div key={p.partId} className="adm-chat-part">
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.vehicle} · {money(Number(p.price))}</span>
                      </div>
                      {partBadge(p.status)}
                    </div>
                  ))}
                </div>
              )}

              <div className="adm-chat-messages" ref={messagesRef}>
                {current.messages.length === 0 && <p className="adm-muted" style={{ textAlign: 'center' }}>No messages yet.</p>}
                {current.messages.map(m => {
                  if (m.sender === 'system') {
                    return <div key={m.id} className="adm-msg-system">{m.text} · {timeOnly(m.sentAt)}</div>;
                  }
                  const mine = m.sender === 'admin';
                  return (
                    <div key={m.id} className={`adm-msg ${mine ? 'mine' : m.sender === 'bot' ? 'bot' : 'theirs'}`}>
                      <div className="adm-msg-label">{mine ? 'You' : m.sender === 'bot' ? 'Bot' : displayName(current)}</div>
                      {m.kind === 'invoice' && m.invoice ? (
                        <div className="adm-msg-invoice">
                          <div>
                            <strong>Invoice {m.invoice.number}</strong>
                            {m.invoice.title && <span>{m.invoice.title}</span>}
                            <span>{money(Number(m.invoice.total))} incl. GST · {m.invoice.status}</span>
                          </div>
                          <a className="adm-btn sm" href={invoiceLink(m.invoice.publicToken)} target="_blank" rel="noreferrer">Open</a>
                        </div>
                      ) : (
                        <div className="adm-msg-bubble">{m.text}</div>
                      )}
                      <div className="adm-msg-time">{timeOnly(m.sentAt)}</div>
                    </div>
                  );
                })}
              </div>

              {current.closed ? (
                <div className="adm-chat-closed">
                  <strong>This chat is closed</strong>
                  <span>
                    Closed by {current.closedBy === 'customer' ? 'the customer' : 'you'}{current.closedAt ? ` on ${fmtDate(current.closedAt, true)}` : ''}.
                    {current.closedBy === 'customer' ? ' It can\'t be reopened.' : ' You can reopen it from the top.'} Closed chats are deleted automatically after 7 days.
                  </span>
                </div>
              ) : (
                <div className="adm-chat-composer">
                  <textarea
                    className="adm-input"
                    aria-label="Reply"
                    placeholder={current.handedOff ? 'Type a reply… (Enter to send, Shift+Enter for a new line)' : 'Reply to take over from the bot…'}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={onReplyKey}
                    rows={2}
                  />
                  <button type="button" className="adm-btn primary" onClick={() => void sendReply()} disabled={sending || !reply.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------------- CLOSE CONFIRMATION ---------------- */}
      {confirmClose && current && (
        <ConfirmDialog
          danger
          busy={busy}
          title="Close this chat?"
          confirmLabel="Close chat"
          message={<>The customer won't be able to send more messages. The chat stays readable as a record, and you can reopen it later.</>}
          onCancel={() => { if (!busy) setConfirmClose(false); }}
          onConfirm={() => void post('close', 'Chat closed.')}
        />
      )}

      {/* ---------------- TRANSCRIPT SHARE ---------------- */}
      {shareOpen && current && (
        <Modal
          wide
          title="Share chat transcript"
          subtitle={`${displayName(current)}${current.reference ? ` · ${current.reference}` : ''} · the whole conversation as a PDF`}
          onClose={() => setShareOpen(false)}
          footer={<button type="button" className="adm-btn" onClick={() => setShareOpen(false)}>Close</button>}
        >
          <SharePanel
            link={transcriptLink}
            title={`Chat transcript ${current.reference ?? ''}`}
            message={`Hi ${current.customerName?.trim() || 'there'}, here's a copy of our chat${current.reference ? ` (reference ${current.reference})` : ''} with ${businessName}.`}
            emailTo={isEmail(current.customerContact) ? current.customerContact!.trim() : null}
            emailSubject={`Your chat with ${businessName}${current.reference ? ` — ${current.reference}` : ''}`}
            signOff={businessName}
            onDownload={() => downloadAuthed(`${API}/api/admin/chats/${current.id}/transcript`, `Chat-${current.reference ?? current.id}.pdf`)}
            notify={notify}
          />
          <p className="adm-hint">The link always shows the latest version of the chat. Anyone with the link can read this one conversation — nothing else.</p>
        </Modal>
      )}

      {/* ---------------- SEND INVOICE ---------------- */}
      {invoiceOpen && current && (
        <Modal
          wide
          title="Send an invoice"
          subtitle={`To ${displayName(current)} — it appears in their chat with View and Download buttons.`}
          onClose={() => { if (!busy) setInvoiceOpen(false); }}
          footer={invoiceMode === 'existing' ? (
            <>
              <button type="button" className="adm-btn" onClick={() => setInvoiceOpen(false)} disabled={busy}>Cancel</button>
              <button
                type="button"
                className="adm-btn primary"
                disabled={busy || pickedInvoice == null}
                onClick={() => {
                  const inv = invoiceChoices.find(i => i.id === pickedInvoice);
                  if (inv) void sendInvoice(inv.id, inv.number);
                }}
              >
                {busy ? 'Sending…' : 'Send to chat'}
              </button>
            </>
          ) : undefined}
        >
          <div className="adm-seg adm-seg-wide" role="tablist" aria-label="Invoice source">
            <button type="button" className={invoiceMode === 'existing' ? 'on' : ''} onClick={() => setInvoiceMode('existing')}>Pick an existing invoice</button>
            <button type="button" className={invoiceMode === 'new' ? 'on' : ''} onClick={() => setInvoiceMode('new')}>Create a new one</button>
          </div>

          {!invoiceData ? (
            <div className="adm-loading"><span className="adm-spinner" /><span>Loading…</span></div>
          ) : invoiceMode === 'existing' ? (
            <>
              <input className="adm-input" style={{ marginTop: 14 }} aria-label="Search invoices" placeholder="Search number, title, customer…" value={invoiceQuery} onChange={e => setInvoiceQuery(e.target.value)} />
              <div className="adm-pick-list">
                {invoiceChoices.length === 0 ? (
                  <div className="adm-empty" style={{ padding: 28 }}>
                    <strong>No invoices to send</strong>
                    <p>Only unpaid and paid invoices can be sent. Create a new one instead.</p>
                    <button type="button" className="adm-btn primary" onClick={() => setInvoiceMode('new')}>Create a new invoice</button>
                  </div>
                ) : invoiceChoices.map(i => (
                  <button key={i.id} type="button" className={`adm-pick${pickedInvoice === i.id ? ' on' : ''}`} onClick={() => setPickedInvoice(i.id)}>
                    <span className="adm-pick-radio" aria-hidden="true" />
                    <span className="adm-pick-main">
                      <strong>{i.number} · {i.title || i.customerName}</strong>
                      <span>{i.title ? `${i.customerName} · ` : ''}{fmtDate(i.createdAt)} · {i.items.length} item{i.items.length === 1 ? '' : 's'}</span>
                    </span>
                    {i.conversationId === current.id && <span className="adm-tag">this chat</span>}
                    <span className={`adm-badge ${i.status === 'Paid' ? 'paid' : 'unpaid'}`}>{i.status}</span>
                    <span className="adm-price">{money(Number(i.total))}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 6 }}>
              <InvoiceEditor
                parts={invoiceData.parts}
                invoices={invoiceData.invoices}
                notify={notify}
                conversationId={current.id}
                initialName={current.customerName ?? ''}
                initialContact={current.customerContact ?? ''}
                initialPartIds={current.parts.map(p => p.partId)}
                submitLabel="Create & send to chat"
                onCreated={inv => sendInvoice(inv.id, inv.number)}
                onCancel={() => setInvoiceOpen(false)}
              />
            </div>
          )}
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}
