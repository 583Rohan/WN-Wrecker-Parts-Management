import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Part } from '../lib/types';
import { useCart } from '../lib/cart';
import { enquireAboutParts } from '../lib/chat';
import { isForSale } from '../lib/parts';

const API = import.meta.env.VITE_API_URL;

export default function Cart() {
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
  const available = items.filter(i => isAvailable(i.id));
  const unavailable = items.filter(i => !isAvailable(i.id));

  const enquire = () => enquireAboutParts(available.map(i => ({ id: i.id, label: `${i.name} — ${i.make} ${i.model} ${i.year}` })));
  const removeUnavailable = () => unavailable.forEach(i => removeFromCart(i.id));

  return (
    <div className="section">
      <div className="container">
        <h2>Your cart</h2>
        {items.length === 0 ? (
          <p className="muted">Your cart is empty. <Link to="/parts">Browse parts →</Link></p>
        ) : (
          <>
            {unavailable.length > 0 && (
              <div className="notice err">
                {unavailable.length === 1 ? 'One part in your cart is' : `${unavailable.length} parts in your cart are`} no longer available.{' '}
                <button className="btn btn-outline btn-sm" onClick={removeUnavailable}>Remove {unavailable.length === 1 ? 'it' : 'them'}</button>
              </div>
            )}
            <table className="table cart-table" style={{ marginBottom: 20 }}>
              <thead><tr><th>Part</th><th>Car</th><th>Price</th><th></th></tr></thead>
              <tbody>{items.map(i => {
                const ok = isAvailable(i.id);
                const price = stock?.get(i.id)?.price ?? i.price;   // show today's price
                return (
                  <tr key={i.id} className={ok ? '' : 'cart-row-off'}>
                    <td>
                      <Link to={`/parts/${i.id}`}><strong>{i.name}</strong></Link>
                      {!ok && <> <span className="badge badge-sold">No longer available</span></>}
                    </td>
                    <td className="muted">{i.make} {i.model} {i.year}</td>
                    <td className="price">${price}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => removeFromCart(i.id)}>Remove</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div className="cart-actions">
              <button className="btn" onClick={enquire} disabled={available.length === 0}>Enquire about {available.length === 1 ? 'this part' : `these ${available.length} parts`}</button>
              <button className="btn btn-outline" onClick={clearCart}>Clear cart</button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Enquiring opens a chat with our team about your selected parts — no account needed.</p>
          </>
        )}
      </div>
    </div>
  );
}
