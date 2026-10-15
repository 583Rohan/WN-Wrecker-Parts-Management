import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clearChatSession, getChatSession, rejoinConversation, startConversation } from '../lib/chat';
import { startPolling } from '../lib/poll';
import '../styles/chat-widget.css';

const API = import.meta.env.VITE_API_URL;

type ChatInvoice = { number: string; title: string | null; total: number; status: string; publicToken: string | null };
type ChatMessage = { id?: number; sender: string; text: string; sentAt: string; kind?: string; invoice?: ChatInvoice | null };
type ChatData = {
  reference: string | null;
  handedOff: boolean;
  closed: boolean;
  closedBy: string | null;
  name: string | null;
  contact: string | null;
  messages: ChatMessage[];
};

const emptyChat: ChatData = { reference: null, handedOff: false, closed: false, closedBy: null, name: null, contact: null, messages: [] };

function fmtTime(iso: string) {
  if (!iso) return '';
  // backend sends UTC without a 'Z' — add one so it isn't read as local time
  const norm = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(norm);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const invoiceUrl = (token: string | null, download = false) =>
  token ? `${API}/api/invoices/p/${token}/pdf${download ? '?download=true' : ''}` : '#';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => getChatSession().token);
  const [chat, setChat] = useState<ChatData>(() => ({ ...emptyChat, reference: getChatSession().reference }));
  const [input, setInput] = useState('');
  const [faqs, setFaqs] = useState<string[]>([]);
  const [botOptions, setBotOptions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // rejoin with a reference code
  const [rejoinOpen, setRejoinOpen] = useState(false);
  const [rejoinCode, setRejoinCode] = useState('');

  // optional name / contact card (shown when a person joins)
  const [askDetails, setAskDetails] = useState(false);       // opened by "Talk to a person"
  const [detailsDone, setDetailsDone] = useState(false);     // saved or skipped this session
  const [detailName, setDetailName] = useState('');
  const [detailContact, setDetailContact] = useState('');

  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // other pages open the widget ("Ask about this part" / cart enquiry)
  useEffect(() => {
    const openHandler = () => {
      const s = getChatSession();
      setToken(s.token);
      setChat(c => ({ ...c, reference: s.reference ?? c.reference }));
      setOpen(true);
    };
    window.addEventListener('wn-open-chat', openHandler);
    return () => window.removeEventListener('wn-open-chat', openHandler);
  }, []);

  useEffect(() => {
    if (!open || faqs.length > 0) return;
    fetch(`${API}/api/chat/faqs`).then(res => (res.ok ? res.json() : [])).then((d: string[]) => setFaqs(d)).catch(() => {});
  }, [open, faqs.length]);

  // keep the conversation fresh while the widget is open
  useEffect(() => {
    if (!open || !token) return;
    let alive = true;
    const load = () =>
      fetch(`${API}/api/chat/${token}`, { signal: AbortSignal.timeout(15000) })
        .then(res => {
          if (res.status === 404) { clearChatSession(); if (alive) { setToken(null); setChat(emptyChat); } return null; }
          return res.ok ? res.json() : null;
        })
        .then(data => {
          if (!alive || !data) return;
          setChat({
            reference: data.reference ?? null,
            handedOff: !!data.handedOff,
            closed: !!data.closed,
            closedBy: data.closedBy ?? null,
            name: data.name ?? null,
            contact: data.contact ?? null,
            messages: data.messages ?? [],
          });
        })
        .catch(() => { /* offline for a moment — try again next time */ });
    // refresh every 3s while the chat is open (never overlapping, paused while the tab is hidden)
    const stop = startPolling(load, 3000);
    return () => { alive = false; stop(); };
  }, [open, token]);

  const msgCount = chat.messages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgCount, askDetails, open]);

  const reload = async (t: string) => {
    const res = await fetch(`${API}/api/chat/${t}`);
    if (!res.ok) return;
    const data = await res.json();
    setChat({
      reference: data.reference ?? null, handedOff: !!data.handedOff, closed: !!data.closed, closedBy: data.closedBy ?? null,
      name: data.name ?? null, contact: data.contact ?? null, messages: data.messages ?? [],
    });
  };

  const ensureToken = async (): Promise<string> => {
    if (token) return token;
    const s = await startConversation();
    setToken(s.token);
    setChat(c => ({ ...c, reference: s.reference }));
    return s.token;
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || chat.closed) return;
    if (!preset) setInput('');
    setBotOptions([]); setShowSuggestions(false); setError('');
    try {
      const t = await ensureToken();
      setChat(c => ({ ...c, messages: [...c.messages, { sender: 'customer', text, sentAt: new Date().toISOString() }] }));
      const res = await fetch(`${API}/api/chat/${t}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (res.ok) {
        const data = await res.json();
        setBotOptions(data.options ?? []);
      } else {
        setError('Message not sent. Please try again.');
      }
      await reload(t);
    } catch {
      setError('Message not sent. Please check your connection.');
    }
  };

  // "Talk to a person": ask for optional details first, then hand over
  const connectToPerson = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const t = await ensureToken();
      if (detailName.trim() || detailContact.trim()) {
        await fetch(`${API}/api/chat/${t}/details`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: detailName.trim() || null, contact: detailContact.trim() || null }),
        });
      }
      if (!chat.handedOff) await fetch(`${API}/api/chat/${t}/human`, { method: 'POST' });
      setAskDetails(false); setDetailsDone(true); setBotOptions([]); setShowSuggestions(false);
      await reload(t);
    } catch {
      setError('Could not connect you. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const rejoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejoinCode.trim()) return;
    setBusy(true); setError('');
    try {
      const s = await rejoinConversation(rejoinCode);
      setToken(s.token);
      setChat(c => ({ ...c, reference: s.reference }));
      setRejoinOpen(false); setRejoinCode('');
      await reload(s.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rejoin the chat.');
    } finally {
      setBusy(false);
    }
  };

  const closeChat = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/chat/${token}/close`, { method: 'POST' });
      setConfirmClose(false);
      await reload(token);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    clearChatSession();
    setToken(null); setChat(emptyChat); setBotOptions([]); setInput('');
    setAskDetails(false); setDetailsDone(false); setDetailName(''); setDetailContact(''); setError('');
  };

  const copyRef = async () => {
    if (!chat.reference) return;
    try {
      await navigator.clipboard.writeText(chat.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  if (!open) {
    return (
      <button type="button" className="cw-bubble" onClick={() => setOpen(true)} aria-label="Open chat">
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z" /></svg>
      </button>
    );
  }

  const hasChat = !!token;
  const showDetailsCard = !chat.closed && (askDetails || (chat.handedOff && !chat.name && !detailsDone));
  const statusText = chat.closed ? 'Chat closed' : chat.handedOff ? 'Connected to our team' : 'Assistant · instant answers';
  const lastCustomer = chat.messages.map(m => m.sender).lastIndexOf('customer');
  const transcriptUrl = token ? `${API}/api/chat/${token}/transcript` : '#';

  return (
    <div className="cw-panel" role="dialog" aria-label="Chat with WN Wrecker">
      <div className="cw-header">
        <div>
          <strong>WN Wrecker</strong>
          <span><i className={`cw-status-dot${chat.closed ? ' off' : chat.handedOff ? ' live' : ''}`} />{statusText}</span>
        </div>
        <button type="button" className="cw-icon" onClick={() => setOpen(false)} aria-label="Minimise chat">—</button>
      </div>

      {hasChat && (
        <div className="cw-bar">
          {chat.reference && (
            <button type="button" className="cw-ref" onClick={() => void copyRef()} title="Copy your reference code">
              Ref <b>{chat.reference}</b> <span>{copied ? 'Copied ✓' : 'Copy'}</span>
            </button>
          )}
          <div className="cw-bar-actions">
            <a className="cw-link" href={transcriptUrl} target="_blank" rel="noreferrer">Download chat</a>
            {!chat.closed && <button type="button" className="cw-link danger" onClick={() => setConfirmClose(true)}>Close chat</button>}
          </div>
        </div>
      )}

      <div className="cw-messages">
        {!hasChat && (
          <div className="cw-welcome">
            <p className="cw-hello">Hi there 👋 Ask us anything about parts, or tap a question:</p>
            <div className="cw-chips">{faqs.map((q, i) => <button type="button" key={i} onClick={() => void send(q)} className="cw-chip">{q}</button>)}</div>
            <button type="button" className="cw-person" onClick={() => setAskDetails(true)}>🙋 Talk to a person</button>

            <div className="cw-rejoin">
              {!rejoinOpen ? (
                <button type="button" className="cw-link" onClick={() => setRejoinOpen(true)}>Have a reference code? Rejoin your chat</button>
              ) : (
                <form onSubmit={e => void rejoin(e)}>
                  <label htmlFor="cw-code">Reference code</label>
                  <div className="cw-row">
                    <input id="cw-code" className="cw-input" placeholder="e.g. WN-7F3K2" value={rejoinCode} onChange={e => setRejoinCode(e.target.value)} autoFocus />
                    <button type="submit" className="cw-btn" disabled={busy || !rejoinCode.trim()}>Rejoin</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {hasChat && chat.reference && (
          <div className="cw-note">Save your reference <b>{chat.reference}</b> — you can use it to come back to this chat after closing the tab.</div>
        )}

        {chat.messages.map((m, i) => {
          if (m.sender === 'system') return <div key={m.id ?? i} className="cw-system">{m.text}</div>;
          const mine = m.sender === 'customer';
          return (
            <div key={m.id ?? `t${i}`} className={`cw-msg ${mine ? 'mine' : m.sender}`}>
              {!mine && <div className="cw-label">{m.sender === 'bot' ? 'Assistant' : 'WN Wrecker'}</div>}
              {m.kind === 'invoice' && m.invoice ? (
                <div className="cw-invoice">
                  <div className="cw-invoice-top">
                    <span className="cw-invoice-icon">🧾</span>
                    <div>
                      <strong>Invoice {m.invoice.number}</strong>
                      {m.invoice.title && <span>{m.invoice.title}</span>}
                    </div>
                  </div>
                  <div className="cw-invoice-total">
                    {money(Number(m.invoice.total))} <small>incl. GST</small>
                    <em className={`cw-inv-status ${m.invoice.status.toLowerCase()}`}>{m.invoice.status}</em>
                  </div>
                  <div className="cw-row">
                    <a className="cw-btn ghost" href={invoiceUrl(m.invoice.publicToken)} target="_blank" rel="noreferrer">View</a>
                    <a className="cw-btn" href={invoiceUrl(m.invoice.publicToken, true)} target="_blank" rel="noreferrer">Download</a>
                  </div>
                </div>
              ) : (
                <span className="cw-bubble-text">{m.text}</span>
              )}
              <div className="cw-meta">{fmtTime(m.sentAt)}{mine && i === lastCustomer ? ' · Delivered' : ''}</div>
            </div>
          );
        })}

        {botOptions.length > 0 && !chat.closed && (
          <div className="cw-chips">{botOptions.map((q, i) => <button type="button" key={i} onClick={() => void send(q)} className="cw-chip">{q}</button>)}</div>
        )}

        {showDetailsCard && (
          <form className="cw-card" onSubmit={e => void connectToPerson(e)}>
            <strong>{chat.handedOff ? 'Who are we chatting with?' : 'Connect to our team'}</strong>
            <p>Optional — leave your name and an email or phone so we can send your quote or invoice.</p>
            <input className="cw-input" placeholder="Your name" value={detailName} onChange={e => setDetailName(e.target.value)} />
            <input className="cw-input" placeholder="Email or phone" value={detailContact} onChange={e => setDetailContact(e.target.value)} />
            <div className="cw-row">
              <button type="submit" className="cw-btn" disabled={busy}>{chat.handedOff ? 'Save' : 'Connect me'}</button>
              <button
                type="button"
                className="cw-btn ghost"
                disabled={busy}
                onClick={() => {
                  if (chat.handedOff) { setAskDetails(false); setDetailsDone(true); }
                  else { setDetailName(''); setDetailContact(''); void connectToPerson(); }
                }}
              >
                {chat.handedOff ? 'Skip' : 'Skip & connect'}
              </button>
            </div>
          </form>
        )}

        {error && <div className="cw-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {chat.closed ? (
        <div className="cw-closed">
          <strong>This chat is closed</strong>
          <span>{chat.closedBy === 'customer' ? 'You closed this chat.' : 'Our team closed this chat.'} Closed chats are deleted after 7 days — download a copy to keep it.</span>
          <div className="cw-row">
            <a className="cw-btn" href={transcriptUrl} target="_blank" rel="noreferrer">Download chat (PDF)</a>
            <button type="button" className="cw-btn ghost" onClick={newChat}>Start a new chat</button>
          </div>
        </div>
      ) : (
        <>
          {hasChat && !chat.handedOff && (
            <div className="cw-suggest">
              <button type="button" onClick={() => setShowSuggestions(s => !s)} className="cw-link">💡 Suggested questions {showSuggestions ? '▾' : '▸'}</button>
              {!askDetails && <button type="button" onClick={() => setAskDetails(true)} className="cw-link">🙋 Talk to a person</button>}
              {showSuggestions && <div className="cw-chips" style={{ marginTop: 6, width: '100%' }}>{faqs.map((q, i) => <button type="button" key={i} onClick={() => void send(q)} className="cw-chip">{q}</button>)}</div>}
            </div>
          )}
          <form className="cw-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" className="cw-input" aria-label="Message" />
            <button type="submit" className="cw-btn" disabled={!input.trim()}>Send</button>
          </form>
        </>
      )}

      {confirmClose && (
        <div className="cw-overlay">
          <div className="cw-confirm">
            <strong>Close this chat?</strong>
            <p>You won't be able to send more messages in it. You can still download a copy of the whole chat afterwards.</p>
            <div className="cw-row">
              <button type="button" className="cw-btn ghost" onClick={() => setConfirmClose(false)} disabled={busy}>Cancel</button>
              <button type="button" className="cw-btn danger" onClick={() => void closeChat()} disabled={busy}>{busy ? 'Closing…' : 'Close chat'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
