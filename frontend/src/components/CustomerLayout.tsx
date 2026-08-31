import { type CSSProperties } from 'react';
import { Link, Outlet } from 'react-router-dom';
import ChatWidget from './ChatWidget';

export default function CustomerLayout() {
  return (
    <div>
      <nav style={navStyle}>
        <Link to="/" style={{ ...linkStyle, fontWeight: 700 }}>WN Wrecker</Link>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/parts" style={linkStyle}>Shop</Link>
          <Link to="/finder" style={linkStyle}>Car Finder</Link>
          <Link to="/about" style={linkStyle}>About</Link>
          <Link to="/contact" style={linkStyle}>Contact</Link>
          <Link to="/cart" style={linkStyle}>Cart</Link>
        </div>
      </nav>
      <main style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}

const navStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 20px', background: '#111', color: 'white', fontFamily: 'sans-serif',
};
const linkStyle: CSSProperties = { color: 'white', textDecoration: 'none' };