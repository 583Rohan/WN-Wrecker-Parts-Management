import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { API } from '../lib/api';
import PartCard, { PartCardSkeleton } from '../components/PartCard';

const getJson = <T,>(url: string, fallback: T): Promise<T> =>
  fetch(url).then(r => (r.ok ? r.json() : fallback)).catch(() => fallback);

export default function Finder() {
  usePageTitle('Car Finder');
  const [searchParams] = useSearchParams();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [make, setMake] = useState(() => searchParams.get('make') ?? '');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [parts, setParts] = useState<Part[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getJson<string[]>(`${API}/api/vehicles/makes`, []).then(setMakes); }, []);

  useEffect(() => {
    if (!make) return;
    let alive = true;
    getJson<string[]>(`${API}/api/vehicles/models?make=${encodeURIComponent(make)}`, []).then(m => { if (alive) setModels(m); });
    return () => { alive = false; };
  }, [make]);

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
    const params = new URLSearchParams({ make, inStock: 'true' });
    if (model) params.set('model', model);
    if (year) params.set('year', year);
    setLoading(true);
    setParts(await getJson<Part[]>(`${API}/api/parts?${params.toString()}`, []));
    setLoading(false);
  };

  const vehicle = [make, model, year].filter(Boolean).join(' ');

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <h1>Parts for your car</h1>
          <p>Pick your make, then narrow it down by model and year if you like.</p>

          <div className="glass finder-controls" role="group" aria-label="Choose your vehicle">
            <div>
              <label className="label" htmlFor="finder-make">Make</label>
              <select id="finder-make" className="input" value={make} onChange={e => chooseMake(e.target.value)}>
                <option value="">Choose a make</option>
                {/* keep a pre-selected make visible even before the list loads */}
                {make && !makes.includes(make) && <option value={make}>{make}</option>}
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="finder-model">Model</label>
              <select id="finder-model" className="input" value={model} onChange={e => chooseModel(e.target.value)} disabled={!make}>
                <option value="">Any model</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="finder-year">Year</label>
              <select id="finder-year" className="input" value={year} onChange={e => setYear(e.target.value)} disabled={!model}>
                <option value="">Any year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn" onClick={() => void findParts()} disabled={!make || loading}>{loading ? 'Searching…' : 'Find parts'}</button>
          </div>
        </div>
      </section>

      <div className="page-body">
        <section aria-live="polite">
          {loading ? (
            <div className="grid" aria-label="Searching">{Array.from({ length: 4 }, (_, i) => <PartCardSkeleton key={i} />)}</div>
          ) : parts === null ? (
            <div className="state"><span className="state-icon">⌕</span><h3>Choose your car</h3><p>Select a make above to see the parts we have in stock for it.</p></div>
          ) : parts.length === 0 ? (
            <div className="state"><span className="state-icon">!</span><h3>Nothing in stock for {vehicle}</h3><p>We may still be able to find one. Send us a request and we'll check current and upcoming stock.</p><Link className="btn" to="/contact#request">Request a part</Link></div>
          ) : (
            <>
              <h2 className="section-title">{parts.length} {parts.length === 1 ? 'part' : 'parts'} for {vehicle}</h2>
              <div className="grid">{parts.map(p => <PartCard key={p.id} part={p} />)}</div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
