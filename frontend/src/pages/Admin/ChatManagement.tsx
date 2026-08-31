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
type Enquiry = { conversationId: number; customer: string | null; status: string; updatedAt: string };
type PartGroup = { partId: number; partName: string; partStatus: string; enquiryCount: number; enquiries: Enquiry[] };

export default function ChatManagement() {
  const [view, setView] = useState<'recent' | 'byPart'>('recent');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [groups, setGroups] = useState<PartGroup[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [reply, setReply] = useState('');

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
    return fetch(url, { ...options, headers }).then(res => {
      if (res.status === 401) { localStorage.removeItem(ADMIN_TOKEN_KEY); window.location.reload(); }
      return res;
    });
  }, []);

  // recent list
  useEffect(() => {
    if (view !== 'recent') return;
    const load = async () => {
      const res = await authFetch(`${API}/api/admin/chats`);
      if (res.ok) setChats(await res.json());
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [view, authFetch]);

  // grouped-by-part list
  useEffect(() => {
    if (view !== 'byPart') return;
    const load = async () => {
      const res = await authFetch(`${API}/api/admin/chats/by-part`);
      if (res.ok) setGroups(await res.json());
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [view, authFetch]);

  // selected conversation
  useEffect(() => {
    if (selectedId == null) { setDetail(null); return; }
    const load = async () => {
      const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
      if (res.ok) setDetail(await res.json());
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [selectedId, authFetch]);

  const toggleGroup = (partId: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId); else next.add(partId);
      return next;
    });
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || selectedId == null) return;
    setReply('');
    await authFetch(`${API}/api/admin/chats/${selectedId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
    if (res.ok) setDetail(await res.json());
  };

  const changeStatus = async (partId: number, status: string) => {
    if (selectedId == null) return;
    await authFetch(`${API}/api/admin/chats/${selectedId}/parts/${partId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const res = await authFetch(`${API}/api/admin/chats/${selectedId}`);
    if (res.ok) setDetail(await res.json());
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Chat Management</h1>
      <div style={{ display: 'flex', height: '72vh', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
        <div style={listPane}>
          <div style={toggleRow}>
            <button onClick={() => setView('recent')} style={toggleBtn(view === 'recent')}>Recent</button>
            <button onClick={() => setView('byPart')} style={toggleBtn(view === 'byPart')}>By product</button>
          </div>

          {view === 'recent' && (
            chats.length === 0
              ? <p style={{ padding: 12, color: '#888' }}>No conversations yet.</p>
              : chats.map(c => (
                <div key={c.id} onClick={() => setSelectedId(c.id)} style={listItem(c.id === selectedId)}>
                  <strong>{c.customerName || `Customer #${c.id}`}</strong>
                  <div style={{ fontSize: 13, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessage || 'No messages yet'}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {c.parts.length > 0 ? c.parts.map(p => p.name).join(', ') : 'General enquiry'}
                  </div>
                </div>
              ))
          )}

          {view === 'byPart' && (
            groups.length === 0
              ? <p style={{ padding: 12, color: '#888' }}>No product enquiries yet.</p>
              : groups.map(g => {
                const isCollapsed = collapsed.has(g.partId);
                return (
                  <div key={g.partId}>
                    <div style={groupHeader} onClick={() => toggleGroup(g.partId)}>
                      <span>{isCollapsed ? '▸' : '▾'} {g.partName}</span>
                      <span style={{ fontWeight: 400, fontSize: 12 }}>({g.enquiryCount}) · {g.partStatus}</span>
                    </div>
                    {!isCollapsed && g.enquiries.map(e => (
                      <div key={e.conversationId} onClick={() => setSelectedId(e.conversationId)}
                           style={listItem(e.conversationId === selectedId)}>
                        <strong>{e.customer || `Customer #${e.conversationId}`}</strong>
                        <div style={{ fontSize: 12, color: '#888' }}>{e.status}</div>
                      </div>
                    ))}
                  </div>
                );
              })
          )}
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
                    {m.sender === 'bot' && <div style={{ fontSize: 11, color: '#7c3aed' }}>Bot</div>}
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

const listPane: CSSProperties = { width: 280, borderRight: '1px solid #ddd', overflowY: 'auto' };
const detailPane: CSSProperties = { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const msgArea: CSSProperties = { flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 12 };
const toggleRow: CSSProperties = { display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid #eee' };
const toggleBtn = (active: boolean): CSSProperties => ({
  flex: 1, padding: 6, cursor: 'pointer', borderRadius: 6, fontSize: 13,
  border: '1px solid #2563eb', background: active ? '#2563eb' : 'white', color: active ? 'white' : '#2563eb',
});
const groupHeader: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px', background: '#334155', color: 'white',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', userSelect: 'none',
};
const listItem = (active: boolean): CSSProperties => ({
  padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer',
  background: active ? '#e8f0fe' : 'white',
});
const msgBubble = (sender: string): CSSProperties => ({
  display: 'inline-block', padding: '6px 10px', borderRadius: 10, maxWidth: '75%',
  background: sender === 'admin' ? '#2563eb' : sender === 'bot' ? '#ede9fe' : '#e5e7eb',
  color: sender === 'admin' ? 'white' : '#111', fontSize: 14, textAlign: 'left',
});