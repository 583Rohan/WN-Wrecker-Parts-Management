import { useCallback, useEffect, useState } from 'react';

// Shared helpers for every admin page
export const API = import.meta.env.VITE_API_URL;
export const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

// fetch that adds the admin JWT, and logs out automatically if the token has expired
export function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
  // give up after 20s so a stuck request can't block the page forever
  return fetch(url, { signal: AbortSignal.timeout(20000), ...options, headers }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      try { sessionStorage.setItem('wnwrecker_admin_expired', '1'); } catch { /* ignore */ }   // login page explains why
      window.location.reload();
    }
    return res;
  });
}

export { money } from './format';   // one price format for the whole site

// backend sends UTC without a 'Z' — add one so it isn't read as local time
export function fmtDate(iso?: string | null, withTime = false) {
  if (!iso) return '';
  const norm = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  const d = new Date(norm);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : date;
}

// auto-dismissing toast messages (no click needed)
export type ToastState = { text: string; error: boolean } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  return { toast, notify };
}
