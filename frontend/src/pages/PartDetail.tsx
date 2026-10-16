import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import { addToCart } from '../lib/cart';
import { enquireAboutParts, openChat } from '../lib/chat';
import { isForSale, statusLabel } from '../lib/parts';
import { money } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import { API } from '../lib/api';
import { PartPhoto } from '../components/PartCard';

// keyed by id so moving from one part to another starts with fresh state
export default function PartDetailRoute() {
  const { id } = useParams();
  return <PartDetail key={id} id={id} />;
}

function PartDetail({ id }: { id?: string }) {
  const [part, setPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);
  usePageTitle(part ? `${part.name} — ${part.make} ${part.model}` : notFound ? 'Part not found' : 'Part');

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/parts/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then((p: Part | null) => { if (!alive) return; if (p) setPart(p); else setNotFound(true); })
      .catch(() => { if (alive) setNotFound(true); });
    return () => { alive = false; };
  }, [id]);

  const hero = (
    <section className="page-hero">
      <div className="page-hero-inner">
        <Link to="/parts" className="back-link">← Back to shop</Link>
        <p className="eyebrow">{part ? `${part.year} ${part.make} ${part.model}` : 'Part details'}</p>
        {part && <h1>{part.name}</h1>}
      </div>
    </section>
  );

  if (notFound) {
    return (
      <>
        {hero}
        <div className="page-body">
          <div className="state">
            <span className="state-icon">?</span>
            <h3>Part not found</h3>
            <p>It may have been sold or removed. Have a look at what's in stock, or ask us to find one.</p>
            <Link to="/parts" className="btn">Browse parts</Link>
          </div>
        </div>
      </>
    );
  }

  if (!part) {
    return (
      <>
        {hero}
        <div className="page-body">
          <div className="pd-grid" aria-label="Loading part">
            <div className="photo pd-photo skeleton" />
            <div className="panel">
              <div className="skeleton skeleton-line short tall" />
              <div className="skeleton skeleton-line pd-skeleton-price" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-line short" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const available = isForSale(part);
  const add = () => { addToCart({ id: part.id, name: part.name, make: part.make, model: part.model, year: part.year, price: part.price, photoUrl: part.photoUrl }); setAdded(true); };
  const enquire = () => enquireAboutParts([{ id: part.id, label: `${part.name} — ${part.make} ${part.model} ${part.year}` }]);

  return (
    <>
      {hero}
      <div className="page-body">
        <div className="pd-grid">
          <PartPhoto part={part} className="pd-photo" />
          <div className="panel">
            <span className={`badge ${available ? 'badge-stock' : 'badge-sold'}`}>{statusLabel(part.status)}</span>
            <div className="pd-price">
              <span className="price price-lg">{money(part.price)}</span>
              <span className="gst">incl. GST</span>
            </div>
            <dl className="spec-list">
              <dt>Make</dt><dd>{part.make}</dd>
              <dt>Model</dt><dd>{part.model}</dd>
              <dt>Year</dt><dd>{part.year}</dd>
              <dt>Condition</dt><dd>{part.condition}</dd>
            </dl>
            {part.description && <p className="muted pd-description">{part.description}</p>}

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
    </>
  );
}
