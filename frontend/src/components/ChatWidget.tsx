import { useEffect, useRef, useState, type CSSProperties } from 'react';

const API = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'wnwrecker_chat_token';

type ChatMessage = { sender: string; text: string; sentAt: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // load the conversation, and keep polling for new messages while open
  useEffect(() => {
    if (!open || !token) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/api/chat/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch { /* ignore transient errors */ }
    };

    load();                              // load immediately
    const id = setInterval(load, 4000);  // then re-check every 4s
    return () => clearInterval(id);      // stop when closed/unmounted
  }, [open, token]);

  // auto-scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    let activeToken = token;

    // first message? create the conversation and remember its token
    if (!activeToken) {
      const res = await fetch(`${API}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: null, contact: null }),
      });
      const data = await res.json();
      activeToken = data.token as string;
      localStorage.setItem(TOKEN_KEY, activeToken);
      setToken(activeToken);
    }

    // show it right away (optimistic), then send
    setMessages(prev => [...prev, { sender: 'customer', text, sentAt: new Date().toISOString() }]);
    await fetch(`${API}/api/chat/${activeToken}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
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
      <div style={messagesStyle}>
        {messages.length === 0 && <p style={{ color: '#888' }}>Ask us about a part!</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === 'customer' ? 'right' : 'left' }}>
            <span style={msgStyle(m.sender)}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={inputRowStyle}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Type a message..."
          style={inputStyle}
        />
        <button onClick={send} style={sendBtnStyle}>Send</button>
      </div>
    </div>
  );
}

// ---- inline styles (kept in one file for now) ----
const bubbleStyle: CSSProperties = {
  position: 'fixed', bottom: 20, right: 20, width: 60, height: 60, borderRadius: '50%',
  border: 'none', background: '#2563eb', color: 'white', fontSize: 26, cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};
const panelStyle: CSSProperties = {
  position: 'fixed', bottom: 20, right: 20, width: 340, height: 460, background: 'white',
  color: '#111', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif',
};
const headerStyle: CSSProperties = {
  background: '#2563eb', color: 'white', padding: '12px 16px', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', fontWeight: 600,
};
const closeBtnStyle: CSSProperties = {
  background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer',
};
const messagesStyle: CSSProperties = {
  flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
};
const inputRowStyle: CSSProperties = {
  display: 'flex', borderTop: '1px solid #eee', padding: 8, gap: 8,
};
const inputStyle: CSSProperties = {
  flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
};
const sendBtnStyle: CSSProperties = {
  background: '#2563eb', color: 'white', border: 'none', borderRadius: 6,
  padding: '8px 14px', cursor: 'pointer',
};
const msgStyle = (sender: string): CSSProperties => ({
  display: 'inline-block', padding: '8px 12px', borderRadius: 12,
  background: sender === 'customer' ? '#2563eb' : '#e5e7eb',
  color: sender === 'customer' ? 'white' : '#111', maxWidth: '75%', textAlign: 'left', fontSize: 14,
});