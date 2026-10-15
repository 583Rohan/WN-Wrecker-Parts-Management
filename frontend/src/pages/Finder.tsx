import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import PartCard from '../components/PartCard';

const API = import.meta.env.VITE_API_URL;

const getJson = <T,>(url: string, fallback: T): Promise<T> =>
  fetch(url).then(r => (r.ok ? r.json() : fallback)).catch(() => fallback);

export default function Finder() {
  const [searchParams] = useSearchParams();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [make, setMake] = useState(() => searchParams.get('make') ?? '');   // ?make=Toyota pre-selects the make
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [parts, setParts] = useState<Part[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getJson<string[]>(`${API}/api/vehicles/makes`, []).then(setMakes); }, []);

  // models for the chosen make
  useEffect(() => {
    if (!make) return;
    let alive = true;
    getJson<string[]>(`${API}/api/vehicles/models?make=${encodeURIComponent(make)}`, []).then(m => { if (alive) setModels(m); });
    return () => { alive = false; };
  }, [make]);

  // years for the chosen make + model
  useEffect(() => {
    if (!make || !model) return;
    let alive = true;
    getJson<number[]>(`${API}/api/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`, []).then(y => { if (alive) setYears(y); });
    return () => { alive = false; };
  }, [make, model]);

  // changing a dropdown clears the ones after it
  const chooseMake = (value: string) => { setMake(value); setModel(''); setYear(''); setModels([]); setYears([]); setParts(null); };
  const chooseModel = (value: string) => { setModel(value); setYear(''); setYears([]); setParts(null); };

  const findParts = async () => {
    const params = new URLSearchParams({ make, inStock: 'true' });   // only parts customers can buy
    if (model) params.set('model', model);
    if (year) params.set('year', year);
    setLoading(true);
    setParts(await getJson<Part[]>(`${API}/api/parts?${params.toString()}`, []));
    setLoading(false);
  };

  return (
    <div>
      <section className="hero" style={{ padding: '48px 0' }}>
        <div className="container">
          <h1 style={{ fontSize: 32 }}>Find parts for your car</h1>
          <p>Pick your make, model and year.</p>
          <div className="finder-controls">
            <select className="input" aria-label="Make" value={make} onChange={e => chooseMake(e.target.value)}>
              <option value="">Make</option>
              {/* keep a pre-selected make visible even before the list loads */}
              {make && !makes.includes(make) && <option value={make}>{make}</option>}
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input" aria-label="Model" value={model} onChange={e => chooseModel(e.target.value)} disabled={!make}>
              <option value="">Model (any)</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input" aria-label="Year" value={year} onChange={e => setYear(e.target.value)} disabled={!model}>
              <option value="">Year (any)</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn" onClick={() => void findParts()} disabled={!make || loading}>{loading ? 'Searching…' : 'Find parts'}</button>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {parts === null ? <p className="muted">Choose your car above to see matching parts.</p>
            : parts.length === 0 ? <p className="muted">No parts in stock for that selection right now. Message us and we'll check for you.</p>
            : <><h2>Matching parts</h2><div className="grid">{parts.map(p => <PartCard key={p.id} part={p} />)}</div></>}
        </div>
      </section>
    </div>
  );
}
