import { useCallback, useEffect, useState } from 'react';

export const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';
export const SESSION_EXPIRED_KEY = 'wnwrecker_admin_expired';   // tells the login page why the admin was signed out

// fetch with the admin login token; an expired token signs the admin out
export function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
  return fetch(url, { signal: AbortSignal.timeout(20000), ...options, headers }).then(res => {   // 20s limit so a stuck request can't hang the page
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      try { sessionStorage.setItem(SESSION_EXPIRED_KEY, '1'); } catch { /* storage blocked */ }
      window.location.reload();
    }
    return res;
  });
}

// toast message that disappears on its own after a few seconds
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
