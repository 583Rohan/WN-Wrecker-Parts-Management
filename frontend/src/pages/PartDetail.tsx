import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import { addToCart } from '../lib/cart';
import { enquireAboutParts, openChat } from '../lib/chat';
import { isForSale, statusLabel } from '../lib/parts';

const API = import.meta.env.VITE_API_URL;

export default function PartDetail() {
  const { id } = useParams();
  const [part, setPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/parts/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then((p: Part | null) => { if (!alive) return; if (p) setPart(p); else setNotFound(true); })
      .catch(() => { if (alive) setNotFound(true); });
    return () => { alive = false; };
  }, [id]);

  if (notFound) return <div className="section"><div className="container"><h2>Part not found</h2><p className="muted">It may have been sold or removed.</p><Link to="/parts" className="btn btn-outline">Back to shop</Link></div></div>;
  if (!part) return <div className="section"><div className="container"><p className="muted">Loading…</p></div></div>;

  const available = isForSale(part);
  const add = () => { addToCart({ id: part.id, name: part.name, make: part.make, model: part.model, year: part.year, price: part.price, photoUrl: part.photoUrl }); setAdded(true); };
  const enquire = () => enquireAboutParts([{ id: part.id, label: `${part.name} — ${part.make} ${part.model} ${part.year}` }]);

  return (
    <div className="section">
      <div className="container">
        <Link to="/parts" className="muted" style={{ fontSize: 14 }}>← Back to shop</Link>
        <div className="pd-grid">
          <div className="card-img pd-photo" style={part.photoUrl ? { backgroundImage: `url(${part.photoUrl})` } : undefined}>
            {!part.photoUrl && 'No photo'}
          </div>
          <div>
            <h1 style={{ margin: '0 0 8px' }}>{part.name}</h1>
            <span className={`badge ${available ? 'badge-stock' : 'badge-sold'}`}>{statusLabel(part.status)}</span>
            <div className="price" style={{ fontSize: 30, margin: '16px 0' }}>${part.price}</div>
            <table style={{ fontSize: 14, marginBottom: 20 }}><tbody>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Make</td><td>{part.make}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Model</td><td>{part.model}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Year</td><td>{part.year}</td></tr>
              <tr><td className="muted" style={{ padding: '2px 16px 2px 0' }}>Condition</td><td>{part.condition}</td></tr>
            </tbody></table>
            {part.description && <p style={{ marginBottom: 20 }}>{part.description}</p>}

            {available ? (
              <div className="pd-actions">
                <button className="btn" onClick={add} disabled={added}>{added ? 'Added to cart ✓' : 'Add to cart'}</button>
                {added && <Link to="/cart" className="btn btn-outline">View cart</Link>}
                <button className="btn btn-outline" onClick={enquire}>Ask about this part</button>
              </div>
            ) : (
              <>
                <div className="pd-unavailable">This part is no longer available. Ask us and we'll check for another one.</div>
                <div className="pd-actions">
                  <Link to="/parts" className="btn">Browse other parts</Link>
                  <button className="btn btn-outline" onClick={openChat}>Message us</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
