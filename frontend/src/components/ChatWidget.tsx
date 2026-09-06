import { useEffect, useRef, useState, type CSSProperties } from 'react';

const API = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'wnwrecker_chat_token';

type ChatMessage = { sender: string; text: string; sentAt: string };

function fmtTime(iso: string) {
  if (!iso) return '';
  // backend sends UTC without a 'Z' — add one so it isn't read as local time
  const norm = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(norm);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [faqs, setFaqs] = useState<string[]>([]);
  const [botOptions, setBotOptions] = useState<string[]>([]);
  const [handedOff, setHandedOff] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // let other pages open the widget ("Ask about this part" / cart enquiry)
  useEffect(() => {
    const openHandler = () => { setToken(localStorage.getItem(TOKEN_KEY)); setOpen(true); };
    window.addEventListener('wn-open-chat', openHandler);
    return () => window.removeEventListener('wn-open-chat', openHandler);
  }, []);

  useEffect(() => {
    if (!open || faqs.length > 0) return;
    fetch(`${API}/api/chat/faqs`).then(res => (res.ok ? res.json() : [])).then((d: string[]) => setFaqs(d)).catch(() => {});
  }, [open, faqs.length]);

  useEffect(() => {
    if (!open || !token) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/chat/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
        setHandedOff(!!data.handedOff);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [open, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ensureToken = async (): Promise<string> => {
    if (token) return token;
    const res = await fetch(`${API}/api/chat/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: null, contact: null }) });
    const data = await res.json();
    const t = data.token as string;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    return t;
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text) return;
    if (!preset) setInput('');
    setBotOptions([]); setShowSuggestions(false);
    const t = await ensureToken();
    setMessages(prev => [...prev, { sender: 'customer', text, sentAt: new Date().toISOString() }]);
    const res = await fetch(`${API}/api/chat/${t}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (res.ok) {
      const data = await res.json();
      setHandedOff(!!data.handedOff);
      setBotOptions(data.options ?? []);
      if (data.botReply) setMessages(prev => [...prev, { sender: 'bot', text: data.botReply as string, sentAt: new Date().toISOString() }]);
    }
  };

  const requestHuman = async () => {
    const t = await ensureToken();
    await fetch(`${API}/api/chat/${t}/human`, { method: 'POST' });
    setHandedOff(true); setBotOptions([]); setShowSuggestions(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} style={bubbleStyle}>💬</button>;

  const lastCustomer = messages.map(m => m.sender).lastIndexOf('customer');

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>Chat with us</span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>—</button>
      </div>
      <div style={subBar}>
        {handedOff ? <span style={{ color: '#059669' }}>● Connected to our team</span>
          : <button onClick={requestHuman} style={humanBtn}>🙋 Talk to a human</button>}
      </div>
      <div style={messagesStyle}>
        {messages.length === 0 && (
          <div>
            <p style={{ color: '#888' }}>Hi! Ask us anything, or tap a question:</p>
            <div style={chipRow}>{faqs.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === 'customer' ? 'right' : 'left' }}>
            {m.sender !== 'customer' && <div style={senderLabel}>{m.sender === 'bot' ? 'Bot' : 'WN Wrecker'}</div>}
            <span style={msgStyle(m.sender)}>{m.text}</span>
            <div style={metaStyle(m.sender)}>
              {fmtTime(m.sentAt)}{m.sender === 'customer' && i === lastCustomer ? ' · Delivered' : ''}
            </div>
          </div>
        ))}
        {botOptions.length > 0 && <div style={chipRow}>{botOptions.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}</div>}
        <div ref={bottomRef} />
      </div>
      {!handedOff && (
        <div style={suggestBar}>
          <button onClick={() => setShowSuggestions(s => !s)} style={suggestToggleBtn}>💡 Suggested questions {showSuggestions ? '▾' : '▸'}</button>
          {showSuggestions && <div style={{ ...chipRow, marginTop: 6 }}>{faqs.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}</div>}
        </div>
      )}
      <div style={inputRowStyle}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Type a message..." style={inputStyle} />
        <button onClick={() => send()} style={sendBtnStyle}>Send</button>
      </div>
    </div>
  );
}

const bubbleStyle: CSSProperties = { position: 'fixed', bottom: 20, right: 20, width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#0f172a', color: 'white', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' };
const panelStyle: CSSProperties = { position: 'fixed', bottom: 20, right: 20, width: 340, height: 490, background: 'white', color: '#111', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' };
const headerStyle: CSSProperties = { background: '#0f172a', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 };
const subBar: CSSProperties = { padding: '6px 12px', borderBottom: '1px solid #eee', fontSize: 12 };
const humanBtn: CSSProperties = { border: '1px solid #f59e0b', background: 'white', color: '#b45309', borderRadius: 12, padding: '3px 10px', fontSize: 12, cursor: 'pointer' };
const closeBtnStyle: CSSProperties = { background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' };
const messagesStyle: CSSProperties = { flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 };
const chipRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const suggestBar: CSSProperties = { padding: '6px 10px', borderTop: '1px solid #eee' };
const suggestToggleBtn: CSSProperties = { border: 'none', background: 'transparent', color: '#b45309', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 };
const inputRowStyle: CSSProperties = { display: 'flex', borderTop: '1px solid #eee', padding: 8, gap: 8, alignItems: 'center' };
const inputStyle: CSSProperties = { flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 };
const sendBtnStyle: CSSProperties = { background: '#f59e0b', color: '#1a1300', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 };
const chipStyle: CSSProperties = { border: '1px solid #f59e0b', background: 'white', color: '#b45309', borderRadius: 14, padding: '4px 10px', fontSize: 12, cursor: 'pointer' };
const senderLabel: CSSProperties = { fontSize: 11, color: '#7c3aed', marginBottom: 2 };
const metaStyle = (sender: string): CSSProperties => ({ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: sender === 'customer' ? 'right' : 'left' });
const msgStyle = (sender: string): CSSProperties => ({ display: 'inline-block', padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', background: sender === 'customer' ? '#0f172a' : sender === 'bot' ? '#ede9fe' : '#e5e7eb', color: sender === 'customer' ? 'white' : '#111', maxWidth: '78%', textAlign: 'left', fontSize: 14 });