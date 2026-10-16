import { useEffect, useState } from 'react';
import { API } from './api';

// Business details (name, address, phone, email, hours, ABN) live in one place, the "Business"
// section of the API's appsettings.json. The site loads them once from /api/business.
type Business = { name: string; abn: string; address: string; phone: string; email: string; hours: string };

const FALLBACK: Business = { name: 'WN Wrecker', abn: '', address: '', phone: '', email: '', hours: '' };

let cached: Business | null = null;
let pending: Promise<Business> | null = null;

function loadBusiness(): Promise<Business> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(`${API}/api/business`)
      .then(res => (res.ok ? res.json() : FALLBACK))
      .then((b: Partial<Business>) => (cached = { ...FALLBACK, ...b }))
      .catch(() => { pending = null; return FALLBACK; });
  }
  return pending;
}

export function useBusiness(): Business {
  const [business, setBusiness] = useState<Business>(cached ?? FALLBACK);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    loadBusiness().then(b => { if (alive) setBusiness(b); });
    return () => { alive = false; };
  }, []);
  return business;
}

// "tel:" link only when the phone number has real digits (not a placeholder like "[phone]")
export const phoneHref = (phone: string) => (/\d/.test(phone) ? `tel:${phone.replace(/[^\d+]/g, '')}` : '');
