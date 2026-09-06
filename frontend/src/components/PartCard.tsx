import { Link } from 'react-router-dom';
import type { Part } from '../lib/types';

export default function PartCard({ part }: { part: Part }) {
  return (
    <Link to={`/parts/${part.id}`} className="card">
      <div className="card-img" style={part.photoUrl ? { backgroundImage: `url(${part.photoUrl})` } : undefined}>
        {!part.photoUrl && 'No photo'}
      </div>
      <div className="card-body">
        <h3>{part.name}</h3>
        <div className="muted" style={{ fontSize: 13 }}>{part.make} {part.model} · {part.year}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span className="price">${part.price}</span>
          <span className={`badge ${part.status === 'Sold' ? 'badge-sold' : 'badge-stock'}`}>{part.status}</span>
        </div>
      </div>
    </Link>
  );
}