import { useEffect, useState } from 'react';
import type { Part } from '../lib/types';
import PartCard from '../components/PartCard';

const API = import.meta.env.VITE_API_URL;

export default function Finder() {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [parts, setParts] = useState<Part[] | null>(null);

  useEffect(() => { fetch(`${API}/api/vehicles/makes`).then(r => (r.ok ? r.json() : [])).then(setMakes).catch(() => {}); }, []);
  useEffect(() => {
    setModel(''); setYear(''); setModels([]); setYears([]);
    if (make) fetch(`${API}/api/vehicles/models?make=${encodeURIComponent(make)}`).then(r => (r.ok ? r.json() : [])).then(setModels).catch(() => {});
  }, [make]);
  useEffect(() => {
    setYear(''); setYears([]);
    if (make && model) fetch(`${API}/api/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`).then(r => (r.ok ? r.json() : [])).then(setYears).catch(() => {});
  }, [make, model]);

  const findParts = () => {
    const params = new URLSearchParams({ make });
    if (model) params.set('model', model);
    if (year) params.set('year', year);
    fetch(`${API}/api/parts?${params.toString()}`).then(r => (r.ok ? r.json() : [])).then(setParts).catch(() => {});
  };

  return (
    <div>
      <section className="hero" style={{ padding: '48px 0' }}>
        <div className="container">
          <h1 style={{ fontSize: 32 }}>Find parts for your car</h1>
          <p>Pick your make, model and year.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select className="input" style={{ maxWidth: 200 }} value={make} onChange={e => setMake(e.target.value)}><option value="">Make</option>{makes.map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select className="input" style={{ maxWidth: 200 }} value={model} onChange={e => setModel(e.target.value)} disabled={!make}><option value="">Model</option>{models.map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select className="input" style={{ maxWidth: 140 }} value={year} onChange={e => setYear(e.target.value)} disabled={!model}><option value="">Year</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <button className="btn" onClick={findParts} disabled={!make}>Find parts</button>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {parts === null ? <p className="muted">Choose your car above to see matching parts.</p>
            : parts.length === 0 ? <p className="muted">No parts found for that selection.</p>
            : <><h2>Matching parts</h2><div className="grid">{parts.map(p => <PartCard key={p.id} part={p} />)}</div></>}
        </div>
      </section>
    </div>
  );
}