import { useCallback, useEffect, useState, type CSSProperties } from 'react';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';
const STATUSES = ['New', 'In Discussion', 'Reserved', 'Awaiting Pickup', 'Sold', 'Closed'];

type PartRef = { partId: number; name: string; status: string };
type ChatSummary = {
  id: number; customerName: string | null; customerContact: string | null;
  createdAt: string; lastMessageAt: string; messageCount: number;
  lastMessage: string | null; parts: PartRef[];
};
type Msg = { sender: string; text: string; sentAt: string };
type ChatDetail = {
  id: number; customerName: string | null; customerContact: string | null;
  createdAt: string; messages: Msg[]; parts: PartRef[];
};

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [reply, setReply] = useState('');

  // fetch helper that adds the Bearer token and logs out on 401
  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers }).then(res => {
      if (res.status === 401) { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); }
      return res;
    });
  }, [token]);

  // load + poll the conversation list
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const res = await authFetch(`${API}/api/admin/chats`);
      if (res.ok) setChats(await res.json());
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [token, authFetch]);

  // load + poll the selected conversation
  useEffect(() => {
    if (!token || selectedId == null) { setDetail(null); return; }
    const load = async () => {
      const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
      if (res.ok) setDetail(await res.json());
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token, selectedId, authFetch]);

  const login = async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setError('Invalid username or password.'); return; }
      const data = await res.json();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setSelectedId(null);
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || selectedId == null) return;
    setReply('');
    await authFetch(`${API}/api/admin/chats/${selectedId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
    if (res.ok) setDetail(await res.json());
  };

  const changeStatus = async (partId: number, status: string) => {
    if (selectedId == null) return;
    await authFetch(`${API}/api/admin/chats/${selectedId}/parts/${partId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
    if (res.ok) setDetail(await res.json());
  };

  if (!token) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 320 }}>
        <h1>Admin Login</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={username} onChange={e => setUsername(e.target.value)}
                 placeholder="Username" style={{ padding: 8 }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') login(); }}
                 placeholder="Password" style={{ padding: 8 }} />
          <button onClick={login} style={{ padding: 8 }}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={headerBar}>
        <h2 style={{ margin: 0 }}>WN Wrecker — Chat Admin</h2>
        <button onClick={logout} style={{ padding: 8 }}>Log out</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={listPane}>
          {chats.length === 0 && <p style={{ padding: 12, color: '#888' }}>No conversations yet.</p>}
          {chats.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} style={listItem(c.id === selectedId)}>
              <strong>{c.customerName || `Customer #${c.id}`}</strong>
              <div style={{ fontSize: 13, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.lastMessage || 'No messages yet'}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {c.parts.length > 0 ? c.parts.map(p => p.name).join(', ') : 'General enquiry'}
              </div>
            </div>
          ))}
        </div>

        <div style={detailPane}>
          {!detail && <p style={{ color: '#888' }}>Select a conversation on the left.</p>}
          {detail && (
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>{detail.customerName || `Customer #${detail.id}`}</strong>
                {detail.customerContact && <span style={{ color: '#666' }}> — {detail.customerContact}</span>}
              </div>

              {detail.parts.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {detail.parts.map(p => (
                    <div key={p.partId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span>{p.name}</span>
                      <select value={p.status} onChange={e => changeStatus(p.partId, e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div style={msgArea}>
                {detail.messages.map((m, i) => (
                  <div key={i} style={{ textAlign: m.sender === 'admin' ? 'right' : 'left', marginBottom: 6 }}>
                    <span style={msgBubble(m.sender)}>{m.text}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={reply} onChange={e => setReply(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
                       placeholder="Type a reply..." style={{ flex: 1, padding: 8 }} />
                <button onClick={sendReply} style={{ padding: '8px 16px' }}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const headerBar: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 16px', borderBottom: '1px solid #ddd', background: '#f8f8f8',
};
const listPane: CSSProperties = { width: 280, borderRight: '1px solid #ddd', overflowY: 'auto' };
const detailPane: CSSProperties = { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const msgArea: CSSProperties = { flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 12 };
const listItem = (active: boolean): CSSProperties => ({
  padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer',
  background: active ? '#e8f0fe' : 'white',
});
const msgBubble = (sender: string): CSSProperties => ({
  display: 'inline-block', padding: '6px 10px', borderRadius: 10, maxWidth: '75%',
  background: sender === 'admin' ? '#2563eb' : '#e5e7eb',
  color: sender === 'admin' ? 'white' : '#111', fontSize: 14, textAlign: 'left',
});