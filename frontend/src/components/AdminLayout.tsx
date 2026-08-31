import { useState, type CSSProperties } from 'react';
import { Link, Outlet } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

export default function AdminLayout() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const logout = () => { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); };

  if (!token) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 320 }}>
        <h1>Admin Login</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={{ padding: 8 }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') login(); }} placeholder="Password" style={{ padding: 8 }} />
          <button onClick={login} style={{ padding: 8 }}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <strong>WN Wrecker Admin</strong>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/admin" style={linkStyle}>Home</Link>
          <Link to="/admin/parts" style={linkStyle}>Manage Parts</Link>
          <Link to="/admin/chats" style={linkStyle}>Chats</Link>
          <button onClick={logout} style={{ padding: 6 }}>Log out</button>
        </div>
      </nav>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

const navStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 20px', background: '#1e293b', color: 'white',
};
const linkStyle: CSSProperties = { color: 'white', textDecoration: 'none' };