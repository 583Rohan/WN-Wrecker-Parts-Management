import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { startPolling } from '../lib/poll';
import { useScrolled } from '../lib/useScrolled';
import { useScrollToTop } from '../lib/useScrollToTop';
import { API } from '../lib/api';
import { ConfirmDialog } from './AdminUI';
import AdminLogin from './AdminLogin';
import '../styles/admin.css';

const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--accent)' : undefined,
  fontWeight: isActive ? 700 : 400,
});

export default function AdminLayout() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [needsReply, setNeedsReply] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  useScrollToTop();

  // badge on "Chats" = customers waiting for a reply (refreshes every 15s, or right after a reply)
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = () =>
      fetch(`${API}/api/admin/chats/summary`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (alive && d) setNeedsReply(d.needsReply ?? 0); })
        .catch(() => { /* ignore */ });
    const stop = startPolling(load, 15000);
    const onChange = () => { void load(); };
    window.addEventListener('wn-chats-changed', onChange);
    return () => { alive = false; stop(); window.removeEventListener('wn-chats-changed', onChange); };
  }, [token]);

  const logout = () => { localStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); setConfirmLogout(false); };
  const onLogin = (t: string) => { localStorage.setItem(ADMIN_TOKEN_KEY, t); setToken(t); };

  if (!token) return <AdminLogin onLogin={onLogin} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link to="/admin" className="brand" onClick={() => setMenuOpen(false)}>WN<span>Wrecker</span> Admin</Link>
          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          {/* on phones this becomes a drop-down menu; tapping any link closes it */}
          <nav className={`nav-links${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
            <NavLink to="/admin" end style={linkStyle}>Dashboard</NavLink>
            <NavLink to="/admin/parts" style={linkStyle}>Manage Parts</NavLink>
            <NavLink to="/admin/chats" style={linkStyle}>
              Chats{needsReply > 0 && <span className="adm-nav-badge" title={`${needsReply} chat${needsReply === 1 ? '' : 's'} need a reply`}>{needsReply}</span>}
            </NavLink>
            <NavLink to="/admin/invoices" style={linkStyle}>Invoices</NavLink>
            <button className="btn btn-sm" onClick={() => setConfirmLogout(true)}>Log out</button>
          </nav>
        </div>
      </header>
      <main className="container" style={{ padding: '28px 20px' }}><Outlet /></main>

      {confirmLogout && (
        <ConfirmDialog
          title="Log out?"
          message="You'll need your password to get back into the admin area."
          confirmLabel="Log out"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={logout}
        />
      )}
    </div>
  );
}
