import { useEffect, useState } from 'react';
import type { Part } from '../lib/types';
import PartCard from '../components/PartCard';

const API = import.meta.env.VITE_API_URL;

export default function Parts() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [make, setMake] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(`${API}/api/vehicles/makes`).then(r => (r.ok ? r.json() : [])).then(setMakes).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (make) params.set('make', make);
    fetch(`${API}/api/parts?${params.toString()}`).then(r => (r.ok ? r.json() : [])).then((d: Part[]) => setParts(d)).catch(() => {}).finally(() => setLoading(false));
  }, [search, make]);

  return (
    <div className="section">
      <div className="container">
        <h2>Shop all parts</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <input className="input" style={{ maxWidth: 280 }} placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ maxWidth: 200 }} value={make} onChange={e => setMake(e.target.value)}>
            <option value="">All makes</option>{makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {loading ? <p className="muted">Loading…</p>
          : parts.length === 0 ? <p className="muted">No parts match your search.</p>
          : <div className="grid">{parts.map(p => <PartCard key={p.id} part={p} />)}</div>}
      </div>
    </div>
  );
}