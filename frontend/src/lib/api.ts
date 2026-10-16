// Base address of the WnWrecker API (set in frontend/.env as VITE_API_URL).
export const API = import.meta.env.VITE_API_URL;

// The customer link for an invoice PDF (opens in the browser, or downloads with download = true).
export const invoicePdfUrl = (token?: string | null, download = false) =>
  token ? `${API}/api/invoices/p/${token}/pdf${download ? '?download=true' : ''}` : '';
