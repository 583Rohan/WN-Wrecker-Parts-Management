import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Part } from '../lib/types';
import { money } from '../lib/format';
import { statusLabel } from '../lib/parts';

// The part's photo, or a "No photo" placeholder when it has none (or the image fails to load).
export function PartPhoto({ part, className = '' }: { part: Pick<Part, 'name' | 'make' | 'model' | 'photoUrl'>; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`photo ${className}`}>
      {part.photoUrl && !broken ? (
        <img src={part.photoUrl} alt={`${part.name} for ${part.make} ${part.model}`} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="photo-empty">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" /><path d="m4 17 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          No photo yet
        </div>
      )}
    </div>
  );
}

export default function PartCard({ part }: { part: Part }) {
  return (
    <Link to={`/parts/${part.id}`} className="card">
      <PartPhoto part={part} />
      <div className="card-body">
        <h3>{part.name}</h3>
        <div className="card-meta">{part.year} {part.make} {part.model}</div>
        <div className="card-foot">
          <span className="price">{money(part.price)}<span className="gst">incl. GST</span></span>
          <span className={`badge ${part.status === 'Sold' ? 'badge-sold' : 'badge-stock'}`}>{statusLabel(part.status)}</span>
        </div>
      </div>
    </Link>
  );
}

// Placeholder card shown while parts are loading.
export function PartCardSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      <div className="photo skeleton" style={{ borderRadius: 0 }} />
      <div className="card-body">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line short" style={{ height: 20 }} />
      </div>
    </div>
  );
}
