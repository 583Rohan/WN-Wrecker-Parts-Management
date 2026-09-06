import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import { addToCart } from '../lib/cart';
import { enquireAboutParts } from '../lib/chat';

const API = import.meta.env.VITE_API_URL;

export default function PartDetail() {
  const { id } = useParams();
  const [part, setPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/parts/${id}`).then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); }).then(setPart).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <div className="section"><div className="container"><h2>Part not found</h2><Link to="/parts" className="btn btn-outline">Back to shop</Link></div></div>;
  if (!part) return <div className="section"><div className="container"><p className="muted">Loading…</p></div></div>;

  const add = () => { addToCart({ id: part.id, name: part.name, make: part.make, model: part.model, year: part.year, price: part.price, photoUrl: part.photoUrl }); setAdded(true); };
  const enquire = () => enquireAboutParts([{ id: part.id, label: `${part.name} — ${part.make} ${part.model} ${part.year}` }]);

  return (
    <div className="section">
      <div className="container">
        <Link to="/parts" className="muted" style={{ fontSize: 14 }}>← Back to shop</Link>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 16, alignItems: 'start' }}>
          <div className="card-img" style={{ height: 360, borderRadius: 'var(--radius)', ...(part.photoUrl ? { backgroundImage: `url(${part.photoUrl})` } : {}) }}>
            {!part.photoUrl && 'No photo'}
          </div>
          <div>
            <h1 style={{ margin: '0 0 8px' }}>{part.name}</h1>
            <span className={`badge ${part.status === 'Sold' ? 'badge-sold' : 'badge-stock'}`}>{part.status}</span>
            <div className="price" style={{ fontSize: 30, margin: '16px 0' }}>${part.price}</div>
            <table style={{ fontSize: 14, marginBottom: 20 }}><tbody>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Make</td><td>{part.make}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Model</td><td>{part.model}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Year</td><td>{part.year}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Condition</td><td>{part.condition}</td></tr>
            </tbody></table>
            {part.description && <p style={{ marginBottom: 20 }}>{part.description}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" onClick={add}>{added ? 'Added ✓' : 'Add to cart'}</button>
              <button className="btn btn-outline" onClick={enquire}>Ask about this part</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}