import { useEffect, useState } from 'react';

type CartItem = { id: number; name: string; make: string; model: string; year: number; price: number; photoUrl?: string | null };
const KEY = 'wnwrecker_cart';
const EVT = 'wn-cart-changed';

function read(): CartItem[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function write(items: CartItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent(EVT)); }

export function addToCart(item: CartItem) { const items = read(); if (!items.some(i => i.id === item.id)) { items.push(item); write(items); } }
export function removeFromCart(id: number) { write(read().filter(i => i.id !== id)); }
export function clearCart() { write([]); }

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(read());
  useEffect(() => {
    const update = () => setItems(read());
    window.addEventListener(EVT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVT, update); window.removeEventListener('storage', update); };
  }, []);
  return { items, count: items.length, addToCart, removeFromCart, clearCart };
}