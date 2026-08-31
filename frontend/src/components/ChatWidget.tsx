import { useEffect, useRef, useState, type CSSProperties } from 'react';

const API = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'wnwrecker_chat_token';

type ChatMessage = { sender: string; text: string; sentAt: string };

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

  useEffect(() => {
    if (!open || faqs.length > 0) return;
    fetch(`${API}/api/chat/faqs`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: string[]) => setFaqs(data))
      .catch(() => {});
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
    const res = await fetch(`${API}/api/chat/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null, contact: null }),
    });
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
    setBotOptions([]);
    setShowSuggestions(false);

    const t = await ensureToken();
    setMessages(prev => [...prev, { sender: 'customer', text, sentAt: new Date().toISOString() }]);

    const res = await fetch(`${API}/api/chat/${t}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      setHandedOff(!!data.handedOff);
      setBotOptions(data.options ?? []);
      if (data.botReply) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.botReply as string, sentAt: new Date().toISOString() }]);
      }
    }
  };

  const requestHuman = async () => {
    const t = await ensureToken();
    await fetch(`${API}/api/chat/${t}/human`, { method: 'POST' });
    setHandedOff(true);
    setBotOptions([]);
    setShowSuggestions(false);
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} style={bubbleStyle}>💬</button>;
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>Chat with us</span>
        <button onClick={() => setOpen(false)} style={closeBtnStyle}>—</button>
      </div>

      <div style={subBar}>
        {handedOff
          ? <span style={{ color: '#059669' }}>● Connected to our team</span>
          : <button onClick={requestHuman} style={humanBtn}>🙋 Talk to a human</button>}
      </div>

      <div style={messagesStyle}>
        {messages.length === 0 && (
          <div>
            <p style={{ color: '#888' }}>Hi! Ask us anything, or tap a question:</p>
            <div style={chipRow}>
              {faqs.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === 'customer' ? 'right' : 'left' }}>
            {m.sender === 'bot' && <div style={botLabel}>Bot</div>}
            <span style={msgStyle(m.sender)}>{m.text}</span>
          </div>
        ))}
        {botOptions.length > 0 && (
          <div style={chipRow}>
            {botOptions.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!handedOff && (
        <div style={suggestBar}>
          <button onClick={() => setShowSuggestions(s => !s)} style={suggestToggleBtn}>
            💡 Suggested questions {showSuggestions ? '▾' : '▸'}
          </button>
          {showSuggestions && (
            <div style={{ ...chipRow, marginTop: 6 }}>
              {faqs.map((q, i) => <button key={i} onClick={() => send(q)} style={chipStyle}>{q}</button>)}
            </div>
          )}
        </div>
      )}

      <div style={inputRowStyle}>
        <input value={input} onChange={e => setInput(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') send(); }}
               placeholder="Type a message..." style={inputStyle} />
        <button onClick={() => send()} style={sendBtnStyle}>Send</button>
      </div>
    </div>
  );
}

const bubbleStyle: CSSProperties = {
  position: 'fixed', bottom: 20, right: 20, width: 60, height: 60, borderRadius: '50%',
  border: 'none', background: '#2563eb', color: 'white', fontSize: 26, cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};
const panelStyle: CSSProperties = {
  position: 'fixed', bottom: 20, right: 20, width: 340, height: 480, background: 'white',
  color: '#111', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif',
};
const headerStyle: CSSProperties = {
  background: '#2563eb', color: 'white', padding: '12px 16px', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', fontWeight: 600,
};
const subBar: CSSProperties = { padding: '6px 12px', borderBottom: '1px solid #eee', fontSize: 12 };
const humanBtn: CSSProperties = {
  border: '1px solid #2563eb', background: 'white', color: '#2563eb',
  borderRadius: 12, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
};
const closeBtnStyle: CSSProperties = {
  background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer',
};
const messagesStyle: CSSProperties = {
  flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
};
const chipRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const suggestBar: CSSProperties = { padding: '6px 10px', borderTop: '1px solid #eee' };
const suggestToggleBtn: CSSProperties = {
  border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, padding: 0,
};
const inputRowStyle: CSSProperties = {
  display: 'flex', borderTop: '1px solid #eee', padding: 8, gap: 8, alignItems: 'center',
};
const inputStyle: CSSProperties = {
  flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
};
const sendBtnStyle: CSSProperties = {
  background: '#2563eb', color: 'white', border: 'none', borderRadius: 6,
  padding: '8px 14px', cursor: 'pointer',
};
const chipStyle: CSSProperties = {
  border: '1px solid #2563eb', background: 'white', color: '#2563eb',
  borderRadius: 14, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
};
const botLabel: CSSProperties = { fontSize: 11, color: '#7c3aed', marginBottom: 2 };
const msgStyle = (sender: string): CSSProperties => ({
  display: 'inline-block', padding: '8px 12px', borderRadius: 12,
  background: sender === 'customer' ? '#2563eb' : sender === 'bot' ? '#ede9fe' : '#e5e7eb',
  color: sender === 'customer' ? 'white' : '#111', maxWidth: '75%', textAlign: 'left', fontSize: 14,
});