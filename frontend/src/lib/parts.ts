import type { Part } from './types';

// only "In Stock" parts can be bought (Sold and Written off are hidden from customers)
export const isForSale = (p: Pick<Part, 'status'>) => (p.status || '').trim().toLowerCase() === 'in stock';

export const statusLabel = (status: string) => {
  const s = (status || '').trim().toLowerCase();
  if (s === 'in stock') return 'In stock';
  if (s === 'sold') return 'Sold';
  return 'Unavailable';
};
