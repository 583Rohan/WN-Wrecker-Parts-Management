import { Link } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { enquireAboutParts } from '../lib/chat';

export default function Cart() {
  const { items, removeFromCart, clearCart } = useCart();
  const enquire = () => enquireAboutParts(items.map(i => ({ id: i.id, label: `${i.name} — ${i.make} ${i.model} ${i.year}` })));
  return (
    <div className="section">
      <div className="container">
        <h2>Your cart</h2>
        {items.length === 0 ? (
          <p className="muted">Your cart is empty. <Link to="/parts">Browse parts →</Link></p>
        ) : (
          <>
            <table className="table" style={{ marginBottom: 20 }}>
              <thead><tr><th>Part</th><th>Car</th><th>Price</th><th></th></tr></thead>
              <tbody>{items.map(i => (
                <tr key={i.id}>
                  <td>{i.name}</td><td className="muted">{i.make} {i.model} {i.year}</td><td className="price">${i.price}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => removeFromCart(i.id)}>Remove</button></td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" onClick={enquire}>Enquire about these ({items.length})</button>
              <button className="btn btn-outline" onClick={clearCart}>Clear cart</button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Enquiring opens a chat with our team about your selected parts — no account needed.</p>
          </>
        )}
      </div>
    </div>
  );
}