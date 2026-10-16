import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import ChatWidget from './ChatWidget';
import SiteFooter from './SiteFooter';
import { useCart } from '../lib/cart';
import { useScrolled } from '../lib/useScrolled';

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--accent)' : undefined,
  fontWeight: isActive ? 700 : 400,
});

export default function CustomerLayout() {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>WN<span>Wrecker</span></Link>
          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          {/* on phones this becomes a drop-down menu; tapping any link closes it */}
          <nav className={`nav-links${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
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
