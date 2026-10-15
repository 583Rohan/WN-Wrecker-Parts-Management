import type { Part } from './types';
import { API, authFetch, money } from './admin';

// Shared invoice types + helpers (used by the Invoices page and the Chats "Send invoice" popup)

export type InvoiceStatus = 'Unpaid' | 'Paid' | 'Void' | 'Refunded';

export type InvoiceItem = {
  id: number;
  partId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Invoice = {
  id: number;
  number: string;
  title: string | null;
  customerName: string;
  customerContact: string | null;
  notes: string | null;
  conversationId: number | null;
  subtotal: number;
  gst: number;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  publicToken: string | null;
  items: InvoiceItem[];
};

export const forSale = (p: Part) => (p.status || '').trim().toLowerCase() === 'in stock';
export const partLabel = (p: Part) => `${p.name} — ${p.make} ${p.model} ${p.year}`;
export const isEmail = (s?: string | null) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const invoiceLink = (token?: string | null, download = false) =>
  token ? `${API}/api/invoices/p/${token}/pdf${download ? '?download=true' : ''}` : '';
// businessName comes from useBusiness() (appsettings.json → "Business")
export const invoiceShareMessage = (inv: Invoice, businessName: string) =>
  `Hi ${inv.customerName}, here is your invoice ${inv.number} from ${businessName} for ${money(Number(inv.total))} (incl. GST).`;
export const partIdsOf = (inv: Invoice) => inv.items.filter(i => i.partId !== null).map(i => i.partId as number);

// GST-inclusive maths: the price already includes GST, GST = total / 11
export function gstSplit(total: number) {
  const t = Math.round(total * 100) / 100;
  const gst = Math.round((t / 11) * 100) / 100;
  return { total: t, gst, subtotal: Math.round((t - gst) * 100) / 100 };
}

// part id -> number of the unpaid invoice it's already on
export function heldByMap(invoices: Invoice[]) {
  const m = new Map<number, string>();
  invoices.filter(i => i.status === 'Unpaid').forEach(i => partIdsOf(i).forEach(pid => { if (!m.has(pid)) m.set(pid, i.number); }));
  return m;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await authFetch(`${API}/api/admin/invoices`);
  if (!res.ok) throw new Error('Could not load invoices.');
  return res.json();
}

export async function fetchParts(): Promise<Part[]> {
  const res = await fetch(`${API}/api/parts`);
  if (!res.ok) throw new Error('Could not load parts.');
  return res.json();
}

// pulls a readable message out of an error response
export async function readError(res: Response, fallback: string) {
  try {
    const text = await res.text();
    if (!text) return fallback;
    try {
      const data = JSON.parse(text);
      return typeof data === 'string' ? data : data.message || data.title || fallback;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

// downloads a file from an admin-only endpoint (needs the login token, so a plain link won't work)
export async function downloadAuthed(url: string, filename: string) {
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Could not download the file.');
  const blobUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export const downloadInvoicePdf = (inv: Invoice) =>
  downloadAuthed(`${API}/api/admin/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);

// backend sends UTC without a 'Z'
export function toIso(iso?: string | null) {
  if (!iso) return '';
  return /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
}
