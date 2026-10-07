import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

export default function AdminLayout() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!res.ok) { setError('Invalid username or password.'); return; }
      const data = await res.json();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  };
  const logout = () => { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--hero)' }}>
        <div className="card card-body" style={{ width: 320 }}>
          <h2 style={{ marginTop: 0 }}>Admin login</h2>
          {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <div className="field"><label className="label">Username</label><input className="input" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className="field"><label className="label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') login(); }} /></div>
          <button className="btn" style={{ width: '100%' }} onClick={login}>Log in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/admin" className="brand">WN<span>Wrecker</span> Admin</Link>
          <nav className="nav-links">
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/parts">Manage Parts</Link>
            <Link to="/admin/chats">Chats</Link>
            <Link to="/admin/invoices">Invoices</Link>
            <button className="btn btn-sm" onClick={logout}>Log out</button>
          </nav>
        </div>
      </header>
      <main className="container" style={{ padding: '28px 20px' }}><Outlet /></main>
    </div>
  );
}