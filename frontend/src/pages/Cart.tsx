import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Part } from '../lib/types';
import { useCart } from '../lib/cart';
import { enquireAboutParts } from '../lib/chat';
import { isForSale } from '../lib/parts';
import { money } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import { PartPhoto } from '../components/PartCard';

const API = import.meta.env.VITE_API_URL;

export default function Cart() {
  usePageTitle('Your cart');
  const { items, removeFromCart, clearCart } = useCart();
  // current stock status of every part, so sold or removed parts are flagged
  const [stock, setStock] = useState<Map<number, Part> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/parts`)
      .then(r => (r.ok ? r.json() : []))
      .then((parts: Part[]) => { if (alive) setStock(new Map(parts.map(p => [p.id, p]))); })
      .catch(() => { /* if the check fails, treat everything as available */ });
    return () => { alive = false; };
  }, []);

  const isAvailable = (id: number) => {
    if (!stock) return true;
    const p = stock.get(id);
    return !!p && isForSale(p);
  };
  const priceOf = (id: number, saved: number) => stock?.get(id)?.price ?? saved;   // today's price
  const available = items.filter(i => isAvailable(i.id));
  const unavailable = items.filter(i => !isAvailable(i.id));
  const total = available.reduce((sum, i) => sum + Number(priceOf(i.id, i.price)), 0);

  const enquire = () => enquireAboutParts(available.map(i => ({ id: i.id, label: `${i.name} — ${i.make} ${i.model} ${i.year}` })));
  const removeUnavailable = () => unavailable.forEach(i => removeFromCart(i.id));

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <h1>Your cart</h1>
          <p>Send the parts you picked to our team in one chat — no account or payment needed online.</p>
        </div>
      </section>

      <div className="page-body">
        {items.length === 0 ? (
          <div className="state">
            <span className="state-icon">⌕</span>
            <h3>Your cart is empty</h3>
            <p>Add parts from the shop, then enquire about them all at once.</p>
            <Link to="/parts" className="btn">Browse parts</Link>
          </div>
        ) : (
          <div className="panel">
            {unavailable.length > 0 && (
              <div className="notice err">
                {unavailable.length === 1 ? 'One part in your cart is' : `${unavailable.length} parts in your cart are`} no longer available.{' '}
                <button className="btn btn-outline btn-sm" onClick={removeUnavailable}>Remove {unavailable.length === 1 ? 'it' : 'them'}</button>
              </div>
            )}
            <table className="table cart-table">
              <thead><tr><th>Part</th><th>Vehicle</th><th>Price</th><th><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>{items.map(i => {
                const ok = isAvailable(i.id);
                return (
                  <tr key={i.id} className={ok ? '' : 'cart-row-off'}>
                    <td>
                      <Link to={`/parts/${i.id}`} className="cart-part">
                        <PartPhoto part={i} className="cart-thumb" />
                        <span>
                          <strong>{i.name}</strong>
                          {!ok && <> <span className="badge badge-sold">No longer available</span></>}
                        </span>
                      </Link>
                    </td>
                    <td className="muted">{i.make} {i.model} {i.year}</td>
                    <td className="price">{money(priceOf(i.id, i.price))}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => removeFromCart(i.id)}>Remove</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div className="cart-total">
              <span className="muted">Total for available parts</span>
              <span><span className="price price-lg">{money(total)}</span><span className="gst" style={{ textAlign: 'right' }}>incl. GST</span></span>
            </div>
            <div className="cart-actions">
              <button className="btn" onClick={enquire} disabled={available.length === 0}>Enquire about {available.length === 1 ? 'this part' : `these ${available.length} parts`}</button>
              <button className="btn btn-outline" onClick={clearCart}>Clear cart</button>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: '12px 0 0' }}>Enquiring opens a chat with our team about your selected parts — no account needed.</p>
          </div>
        )}
      </div>
    </>
  );
}
