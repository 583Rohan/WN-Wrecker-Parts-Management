// Prices: "$250" for whole dollars, "$22.73" when there are cents.
export const money = (n: number | string | null | undefined) => {
  const value = Math.round(Number(n || 0) * 100) / 100;
  const cents = Number.isInteger(value) ? 0 : 2;
  return '$' + value.toLocaleString('en-AU', { minimumFractionDigits: cents, maximumFractionDigits: cents });
};

// The API sends UTC times without a 'Z', which browsers would read as local time.
function parseApiDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

export function fmtTime(iso?: string | null) {
  const d = parseApiDate(iso);
  return d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

export function fmtDate(iso?: string | null, withTime = false) {
  const d = parseApiDate(iso);
  if (!d) return '';
  const date = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${fmtTime(iso)}` : date;
}

export function timeAgo(iso?: string | null) {
  const d = parseApiDate(iso);
  if (!d) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'yesterday';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export const isEmail = (s?: string | null) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// milliseconds since 1970 for an API time (0 when missing), handy for sorting and date maths
export const apiTime = (iso?: string | null) => parseApiDate(iso)?.getTime() ?? 0;
