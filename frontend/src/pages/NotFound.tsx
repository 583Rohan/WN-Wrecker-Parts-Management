import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="section">
      <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 64, margin: 0, color: 'var(--accent)' }}>404</h1>
        <p className="muted">That page doesn't exist.</p>
        <Link to="/" className="btn">Go home</Link>
      </div>
    </div>
  );
}