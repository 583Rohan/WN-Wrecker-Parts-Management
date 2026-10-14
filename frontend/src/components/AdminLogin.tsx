import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import '../styles/admin.css';

const API = import.meta.env.VITE_API_URL;
export const SESSION_EXPIRED_KEY = 'wnwrecker_admin_expired';

// Admin sign-in screen (shown by AdminLayout when nobody is logged in)
export default function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // set by authFetch when a login runs out, so we can explain why they're back here
  const [expired] = useState(() => {
    try {
      const flag = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return flag;
    } catch {
      return false;
    }
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 401 || res.status === 400) { setError('Incorrect username or password.'); return; }
      if (!res.ok) { setError('The server had a problem. Please try again.'); return; }
      const data = await res.json();
      onLogin(data.token);
    } catch {
      setError("Can't reach the server. Check that the API is running, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm adm-login">
      <section className="adm-login-main">
        <form className="adm-login-card" onSubmit={e => void submit(e)} noValidate>
          <div className="adm-login-logo">WN<span>Wrecker</span> Admin</div>
          <h1>Sign in</h1>
          <p className="adm-login-sub">Staff only. Use your admin username and password.</p>

          {expired && !error && <div className="adm-callout" role="status">Your session expired. Please sign in again.</div>}
          {error && <div className="adm-callout danger" role="alert">{error}</div>}

          <div className="adm-field">
            <label htmlFor="login-user">Username</label>
            <input
              id="login-user"
              className="adm-input"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="adm-field">
            <label htmlFor="login-pass">Password</label>
            <div className="adm-pass">
              <input
                id="login-pass"
                className="adm-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" className="adm-pass-toggle" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="adm-btn primary adm-login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <Link to="/" className="adm-login-back">← Back to the shop</Link>
        </form>
      </section>
    </div>
  );
}
