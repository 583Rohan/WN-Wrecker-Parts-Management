import { Link, NavLink, Outlet } from 'react-router-dom';
import ChatWidget from './ChatWidget';
import { useCart } from '../lib/cart';
import SiteFooter from "./SiteFooter";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--accent)' : undefined,
  fontWeight: isActive ? 700 : 400,
});

export default function CustomerLayout() {
  const { count } = useCart();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">WN<span>Wrecker</span></Link>
          <nav className="nav-links">
            <NavLink to="/" end style={linkStyle}>Home</NavLink>
            <NavLink to="/parts" style={linkStyle}>Shop</NavLink>
            <NavLink to="/finder" style={linkStyle}>Car Finder</NavLink>
            <NavLink to="/about" style={linkStyle}>About</NavLink>
            <NavLink to="/contact" style={linkStyle}>Contact</NavLink>
            <Link to="/cart" className="btn btn-sm">Cart ({count})</Link>
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}><Outlet /></main>
     <SiteFooter />
      <ChatWidget />
    </div>
  );
}