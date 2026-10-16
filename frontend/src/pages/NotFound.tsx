import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="not-found">
      <strong>404</strong>
      <h1 className="section-title" style={{ marginTop: 12 }}>Page not found</h1>
      <p className="muted" style={{ margin: '0 0 22px' }}>That page doesn't exist or has moved.</p>
      <div className="pd-actions" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn">Go home</Link>
        <Link to="/parts" className="btn btn-outline">Browse parts</Link>
      </div>
    </div>
  );
}
