import { useCallback, useEffect, useState } from 'react';
import type { Part } from '../../lib/types';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';
const empty = { name: '', make: '', model: '', year: '', condition: 'Used', price: '', status: 'In Stock', description: '' };

export default function ManageParts() {
  const [parts, setParts] = useState<Part[]>([]);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
    return fetch(url, { ...options, headers });
  }, []);

  const load = useCallback(() => { fetch(`${API}/api/parts`).then(r => (r.ok ? r.json() : [])).then(setParts).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    const body = { name: form.name, make: form.make, model: form.model, year: Number(form.year) || 0, condition: form.condition, price: Number(form.price) || 0, status: form.status, description: form.description };
    let targetId = editingId;
    if (editingId) {
      await authFetch(`${API}/api/parts/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editingId }) });
      setMsg('Part updated.');
    } else {
      const res = await authFetch(`${API}/api/parts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const created = await res.json();
      targetId = created.id;
      setMsg('Part created.');
    }
    if (photoFile && targetId) {
      const fd = new FormData(); fd.append('file', photoFile);
      await authFetch(`${API}/api/parts/${targetId}/photo`, { method: 'POST', body: fd });
    }
    setForm(empty); setEditingId(null); setPhotoFile(null); load();
  };

  const edit = (p: Part) => {
    setEditingId(p.id);
    setForm({ name: p.name, make: p.make, model: p.model, year: String(p.year), condition: p.condition, price: String(p.price), status: p.status, description: p.description || '' });
    setPhotoFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const del = async (id: number) => { if (!window.confirm('Delete this part?')) return; await authFetch(`${API}/api/parts/${id}`, { method: 'DELETE' }); load(); };
  const uploadPhoto = async (id: number, file: File) => { const fd = new FormData(); fd.append('file', file); await authFetch(`${API}/api/parts/${id}/photo`, { method: 'POST', body: fd }); setMsg('Photo uploaded.'); load(); };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Manage parts</h1>
      <div className="card card-body" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit part' : 'Add a part'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
          <div className="field"><label className="label">Name</label><input className="input" value={form.name} onChange={set('name')} /></div>
          <div className="field"><label className="label">Make</label><input className="input" value={form.make} onChange={set('make')} /></div>
          <div className="field"><label className="label">Model</label><input className="input" value={form.model} onChange={set('model')} /></div>
          <div className="field"><label className="label">Year</label><input className="input" type="number" value={form.year} onChange={set('year')} /></div>
          <div className="field"><label className="label">Condition</label><input className="input" value={form.condition} onChange={set('condition')} /></div>
          <div className="field"><label className="label">Price ($)</label><input className="input" type="number" value={form.price} onChange={set('price')} /></div>
          <div className="field"><label className="label">Status</label><select className="input" value={form.status} onChange={set('status')}><option>In Stock</option><option>Sold</option></select></div>
        </div>
        <div className="field"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></div>
        <div className="field"><label className="label">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
          {photoFile && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{photoFile.name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" onClick={submit}>{editingId ? 'Save changes' : 'Add part'}</button>
          {editingId && <button className="btn btn-outline" onClick={() => { setEditingId(null); setForm(empty); setPhotoFile(null); }}>Cancel</button>}
          {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Photo</th><th>Name</th><th>Car</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{parts.map(p => (
          <tr key={p.id}>
            <td>{p.photoUrl ? <img src={p.photoUrl} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <span className="muted" style={{ fontSize: 12 }}>—</span>}</td>
            <td>{p.name}</td><td className="muted">{p.make} {p.model} {p.year}</td><td className="price">${p.price}</td>
            <td><span className={`badge ${p.status === 'Sold' ? 'badge-sold' : 'badge-stock'}`}>{p.status}</span></td>
            <td><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => edit(p)}>Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => del(p.id)}>Delete</button>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>Photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(p.id, f); }} /></label>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}