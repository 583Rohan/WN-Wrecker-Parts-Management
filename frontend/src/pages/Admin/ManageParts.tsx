import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import type { Part } from '../../lib/types';

const API = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = 'wnwrecker_admin_token';

type PartForm = {
  name: string;
  make: string;
  model: string;
  year: string;
  condition: string;
  price: string;
  status: string;
  description: string;
};

const emptyForm: PartForm = {
  name: '',
  make: '',
  model: '',
  year: '',
  condition: 'Used',
  price: '',
  status: 'In Stock',
  description: '',
};

const styles = `
  .mp-page {
    --mp-navy: #0d1930;
    --mp-navy-2: #15243c;
    --mp-orange: #f7a411;
    --mp-orange-2: #ffc04c;
    --mp-ink: #111827;
    --mp-muted: #64748b;
    --mp-border: #dfe5ec;
    --mp-bg: #f3f6f9;
    min-height: calc(100vh - 74px);
    padding: 42px clamp(20px, 4vw, 64px) 72px;
    color: var(--mp-ink);
    background:
      radial-gradient(circle at 90% 0%, rgba(247, 164, 17, 0.10), transparent 27%),
      var(--mp-bg);
    font-family: Inter, Arial, sans-serif;
  }
  .mp-shell { width: min(1320px, 100%); margin: 0 auto; }
  .mp-heading { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 26px; }
  .mp-eyebrow { margin: 0 0 7px; color: #b87100; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.19em; text-transform: uppercase; }
  .mp-heading h1 { margin: 0; color: var(--mp-navy); font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1; letter-spacing: -0.045em; }
  .mp-heading-copy { max-width: 600px; margin: 10px 0 0; color: var(--mp-muted); font-size: 0.94rem; line-height: 1.6; }
  .mp-primary,
  .mp-secondary,
  .mp-icon-button {
    border: 0;
    border-radius: 9px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease;
  }
  .mp-primary { min-height: 46px; padding: 0 20px; color: #111827; background: var(--mp-orange); }
  .mp-primary:hover:not(:disabled) { transform: translateY(-2px); background: var(--mp-orange-2); }
  .mp-primary:disabled { cursor: not-allowed; opacity: 0.6; }
  .mp-secondary { min-height: 44px; padding: 0 17px; color: var(--mp-navy); border: 1px solid #cbd5e1; background: #fff; }
  .mp-secondary:hover { border-color: var(--mp-orange); background: #fffaf0; }
  .mp-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 22px; }
  .mp-stat { position: relative; overflow: hidden; padding: 19px 20px; border: 1px solid var(--mp-border); border-radius: 13px; background: #fff; box-shadow: 0 8px 25px rgba(13, 25, 48, 0.05); }
  .mp-stat::after { content: ''; position: absolute; right: -18px; bottom: -24px; width: 76px; height: 76px; border-radius: 50%; background: rgba(247, 164, 17, 0.11); }
  .mp-stat span { color: var(--mp-muted); font-size: 0.73rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .mp-stat strong { display: block; margin-top: 8px; color: var(--mp-navy); font-size: 1.7rem; }
  .mp-panel { border: 1px solid var(--mp-border); border-radius: 16px; background: #fff; box-shadow: 0 18px 42px rgba(13, 25, 48, 0.07); }
  .mp-form-panel { margin-bottom: 24px; overflow: hidden; }
  .mp-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 22px 24px; color: #fff; background: linear-gradient(112deg, var(--mp-navy), #162844); }
  .mp-panel-header h2 { margin: 0; font-size: 1.18rem; }
  .mp-panel-header p { margin: 5px 0 0; color: #aebbd0; font-size: 0.79rem; }
  .mp-edit-label { padding: 7px 10px; border: 1px solid rgba(247, 164, 17, 0.5); border-radius: 999px; color: var(--mp-orange-2); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .mp-form { padding: 24px; }
  .mp-form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 17px; }
  .mp-field { display: grid; gap: 7px; }
  .mp-field-wide { grid-column: 1 / -1; }
  .mp-field label { color: #334155; font-size: 0.78rem; font-weight: 800; }
  .mp-required { color: #d97706; }
  .mp-input {
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    box-sizing: border-box;
    border: 1px solid #d5dde7;
    border-radius: 8px;
    outline: none;
    color: var(--mp-ink);
    background: #fbfcfe;
    font: inherit;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }
  textarea.mp-input { min-height: 94px; resize: vertical; }
  .mp-input:focus { border-color: var(--mp-orange); background: #fff; box-shadow: 0 0 0 4px rgba(247, 164, 17, 0.14); }
  .mp-input.mp-invalid { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08); }
  .mp-error { color: #b91c1c; font-size: 0.7rem; }
  .mp-photo-zone {
    min-height: 128px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 18px;
    border: 1.5px dashed #b9c4d2;
    border-radius: 11px;
    background: #f8fafc;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease;
  }
  .mp-photo-zone:hover, .mp-photo-zone.is-dragging { border-color: var(--mp-orange); background: #fff9eb; }
  .mp-photo-preview { width: 128px; height: 92px; flex: 0 0 auto; object-fit: cover; border-radius: 8px; box-shadow: 0 5px 14px rgba(15, 23, 42, 0.18); }
  .mp-photo-icon { width: 47px; height: 47px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; color: var(--mp-navy); background: #e8edf4; font-size: 1.3rem; }
  .mp-photo-copy strong { display: block; color: var(--mp-navy); font-size: 0.87rem; }
  .mp-photo-copy span { display: block; margin-top: 5px; color: var(--mp-muted); font-size: 0.74rem; }
  .mp-form-actions { margin-top: 22px; display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
  .mp-form-note { margin-left: auto; color: var(--mp-muted); font-size: 0.72rem; }
  .mp-inventory { overflow: hidden; }
  .mp-inventory-top { padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; gap: 20px; border-bottom: 1px solid var(--mp-border); }
  .mp-inventory-top h2 { margin: 0; color: var(--mp-navy); font-size: 1.22rem; }
  .mp-inventory-top p { margin: 5px 0 0; color: var(--mp-muted); font-size: 0.76rem; }
  .mp-tools { display: flex; gap: 10px; }
  .mp-search { width: min(300px, 40vw); }
  .mp-filter { width: 145px; }
  .mp-table-wrap { overflow-x: auto; }
  .mp-table { width: 100%; border-collapse: collapse; }
  .mp-table th { padding: 13px 18px; text-align: left; color: #607089; background: #f4f7fa; font-size: 0.68rem; letter-spacing: 0.09em; text-transform: uppercase; }
  .mp-table td { padding: 15px 18px; border-top: 1px solid #edf0f4; vertical-align: middle; font-size: 0.83rem; }
  .mp-table tbody tr { transition: background 150ms ease; }
  .mp-table tbody tr:hover { background: #fffaf0; }
  .mp-thumb { width: 68px; height: 49px; object-fit: cover; border-radius: 7px; border: 1px solid #e2e8f0; background: #eef2f6; }
  .mp-no-photo { width: 68px; height: 49px; display: grid; place-items: center; border-radius: 7px; color: #94a3b8; background: #eef2f6; font-size: 0.63rem; }
  .mp-part-name { color: var(--mp-navy); font-weight: 800; }
  .mp-car { color: var(--mp-muted); white-space: nowrap; }
  .mp-price { color: #cf7800; font-size: 0.94rem; font-weight: 900; }
  .mp-badge { display: inline-flex; padding: 6px 9px; border-radius: 999px; font-size: 0.66rem; font-weight: 900; }
  .mp-badge-stock { color: #08733b; background: #dcfce7; }
  .mp-badge-sold { color: #a61b1b; background: #fee2e2; }
  .mp-actions { display: flex; align-items: center; gap: 7px; }
  .mp-icon-button { min-height: 34px; padding: 0 11px; color: #334155; border: 1px solid #d7dee8; background: #fff; font-size: 0.7rem; }
  .mp-icon-button:hover { color: var(--mp-navy); border-color: var(--mp-orange); background: #fff8e8; }
  .mp-icon-button.mp-danger:hover { color: #b91c1c; border-color: #f1a2a2; background: #fff1f1; }
  .mp-empty { padding: 60px 24px; text-align: center; color: var(--mp-muted); }
  .mp-empty strong { display: block; margin-bottom: 7px; color: var(--mp-navy); font-size: 1rem; }
  .mp-loading { padding: 54px 24px; display: grid; place-items: center; gap: 12px; color: var(--mp-muted); font-size: 0.8rem; }
  .mp-spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: var(--mp-orange); border-radius: 50%; animation: mp-spin 700ms linear infinite; }
  @keyframes mp-spin { to { transform: rotate(360deg); } }
  .mp-toast { position: fixed; z-index: 100; right: 24px; bottom: 24px; max-width: 380px; padding: 14px 17px; display: flex; align-items: center; gap: 11px; border-radius: 10px; color: #fff; background: var(--mp-navy); box-shadow: 0 16px 45px rgba(0,0,0,0.25); animation: mp-toast-in 220ms ease-out; }
  .mp-toast.is-error { background: #991b1b; }
  .mp-toast-mark { width: 24px; height: 24px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; color: #111; background: var(--mp-orange); font-weight: 900; }
  .mp-toast.is-error .mp-toast-mark { color: #991b1b; background: #fff; }
  @keyframes mp-toast-in { from { opacity: 0; transform: translateY(12px); } }
  @media (max-width: 980px) {
    .mp-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mp-inventory-top { align-items: stretch; flex-direction: column; }
    .mp-search { width: 100%; }
  }
  @media (max-width: 640px) {
    .mp-page { padding: 28px 14px 52px; }
    .mp-heading { align-items: stretch; flex-direction: column; }
    .mp-heading .mp-primary { width: 100%; }
    .mp-form-grid, .mp-stats { grid-template-columns: 1fr; }
    .mp-form, .mp-panel-header, .mp-inventory-top { padding: 18px; }
    .mp-tools { flex-direction: column; }
    .mp-search, .mp-filter { width: 100%; }
    .mp-photo-zone { align-items: flex-start; flex-direction: column; }
    .mp-photo-preview { width: 100%; height: 170px; }
    .mp-form-note { width: 100%; margin-left: 0; }
  }
`;

export default function ManageParts() {
  const [parts, setParts] = useState<Part[]>([]);
  const [form, setForm] = useState<PartForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof PartForm, string>>>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((text: string, error = false) => {
    setMessage({ text, error });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3800);
    return () => window.clearTimeout(timer);
  }, [message]);

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`);
    return fetch(url, { ...options, headers });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/parts`);
      if (!response.ok) throw new Error('Unable to load the parts inventory.');
      setParts(await response.json());
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to load parts.', true);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const stats = useMemo(() => ({
    total: parts.length,
    stock: parts.filter(part => part.status === 'In Stock').length,
    sold: parts.filter(part => part.status === 'Sold').length,
    makes: new Set(parts.map(part => part.make.trim().toLowerCase()).filter(Boolean)).size,
  }), [parts]);

  const visibleParts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return parts.filter(part => {
      const matchesStatus = statusFilter === 'All' || part.status === statusFilter;
      const haystack = `${part.name} ${part.make} ${part.model} ${part.year}`.toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [parts, query, statusFilter]);

  const setField = (key: keyof PartForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm(current => ({ ...current, [key]: event.target.value }));
    if (errors[key]) setErrors(current => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof PartForm, string>> = {};
    const currentYear = new Date().getFullYear() + 1;
    const numericYear = Number(form.year);
    const numericPrice = Number(form.price);
    if (!form.name.trim()) next.name = 'Enter the part name.';
    if (!form.make.trim()) next.make = 'Enter the vehicle make.';
    if (!form.model.trim()) next.model = 'Enter the vehicle model.';
    if (!form.year || numericYear < 1900 || numericYear > currentYear) next.year = `Enter a year from 1900 to ${currentYear}.`;
    if (!form.price || numericPrice < 0) next.price = 'Enter a valid price.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setPhotoFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file.', true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('The photo must be smaller than 8 MB.', true);
      return;
    }
    setPhotoFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    choosePhoto(event.dataTransfer.files?.[0]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      notify('Please correct the highlighted fields.', true);
      return;
    }

    const body = {
      name: form.name.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      condition: form.condition,
      price: Number(form.price),
      status: form.status,
      description: form.description.trim(),
    };

    setSaving(true);
    try {
      let targetId = editingId;
      if (editingId !== null) {
        const response = await authFetch(`${API}/api/parts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingId }),
        });
        if (!response.ok) throw new Error('The part could not be updated.');
      } else {
        const response = await authFetch(`${API}/api/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('The part could not be created.');
        const created = await response.json();
        targetId = created.id;
      }

      if (photoFile && targetId !== null) {
        const photoData = new FormData();
        photoData.append('file', photoFile);
        const response = await authFetch(`${API}/api/parts/${targetId}/photo`, {
          method: 'POST',
          body: photoData,
        });
        if (!response.ok) throw new Error('The part was saved, but its photo could not be uploaded.');
      }

      notify(editingId !== null ? 'Part updated successfully.' : 'Part added successfully.');
      resetForm();
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Something went wrong while saving.', true);
    } finally {
      setSaving(false);
    }
  };

  const edit = (part: Part) => {
    setEditingId(part.id);
    setForm({
      name: part.name,
      make: part.make,
      model: part.model,
      year: String(part.year),
      condition: part.condition,
      price: String(part.price),
      status: part.status,
      description: part.description || '',
    });
    setPhotoFile(null);
    setErrors({});
    formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const remove = async (part: Part) => {
    if (!window.confirm(`Delete “${part.name}” permanently?`)) return;
    setDeletingId(part.id);
    try {
      const response = await authFetch(`${API}/api/parts/${part.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('The part could not be deleted.');
      notify('Part deleted successfully.');
      if (editingId === part.id) resetForm();
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to delete the part.', true);
    } finally {
      setDeletingId(null);
    }
  };

  const uploadPhoto = async (id: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file.', true);
      return;
    }
    setUploadingId(id);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await authFetch(`${API}/api/parts/${id}/photo`, { method: 'POST', body: data });
      if (!response.ok) throw new Error('The photo could not be uploaded.');
      notify('Photo uploaded successfully.');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to upload the photo.', true);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <main className="mp-page">
        <div className="mp-shell">
          <header className="mp-heading">
            <div>
              <p className="mp-eyebrow">Inventory control</p>
              <h1>Manage parts</h1>
              <p className="mp-heading-copy">Add, update and organise the parts shown to WN Wrecker customers.</p>
            </div>
            <button className="mp-primary" type="button" onClick={() => {
              resetForm();
              formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}>＋ Add new part</button>
          </header>

          <section className="mp-stats" aria-label="Inventory summary">
            <article className="mp-stat"><span>Total parts</span><strong>{stats.total}</strong></article>
            <article className="mp-stat"><span>In stock</span><strong>{stats.stock}</strong></article>
            <article className="mp-stat"><span>Sold</span><strong>{stats.sold}</strong></article>
            <article className="mp-stat"><span>Vehicle makes</span><strong>{stats.makes}</strong></article>
          </section>

          <section className="mp-panel mp-form-panel" ref={formPanelRef}>
            <header className="mp-panel-header">
              <div>
                <h2>{editingId !== null ? 'Edit inventory item' : 'Add an inventory item'}</h2>
                <p>Fields marked with an asterisk are required.</p>
              </div>
              {editingId !== null && <span className="mp-edit-label">Editing #{editingId}</span>}
            </header>

            <form className="mp-form" onSubmit={submit} noValidate>
              <div className="mp-form-grid">
                <div className="mp-field">
                  <label htmlFor="part-name">Part name <span className="mp-required">*</span></label>
                  <input id="part-name" className={`mp-input${errors.name ? ' mp-invalid' : ''}`} placeholder="e.g. Front bumper" value={form.name} onChange={setField('name')} />
                  {errors.name && <span className="mp-error">{errors.name}</span>}
                </div>
                <div className="mp-field">
                  <label htmlFor="part-make">Make <span className="mp-required">*</span></label>
                  <input id="part-make" className={`mp-input${errors.make ? ' mp-invalid' : ''}`} placeholder="e.g. Toyota" value={form.make} onChange={setField('make')} />
                  {errors.make && <span className="mp-error">{errors.make}</span>}
                </div>
                <div className="mp-field">
                  <label htmlFor="part-model">Model <span className="mp-required">*</span></label>
                  <input id="part-model" className={`mp-input${errors.model ? ' mp-invalid' : ''}`} placeholder="e.g. Camry" value={form.model} onChange={setField('model')} />
                  {errors.model && <span className="mp-error">{errors.model}</span>}
                </div>
                <div className="mp-field">
                  <label htmlFor="part-year">Year <span className="mp-required">*</span></label>
                  <input id="part-year" className={`mp-input${errors.year ? ' mp-invalid' : ''}`} type="number" min="1900" max={new Date().getFullYear() + 1} placeholder="e.g. 2024" value={form.year} onChange={setField('year')} />
                  {errors.year && <span className="mp-error">{errors.year}</span>}
                </div>
                <div className="mp-field">
                  <label htmlFor="part-condition">Condition</label>
                  <select id="part-condition" className="mp-input" value={form.condition} onChange={setField('condition')}>
                    <option>Used</option><option>Reconditioned</option><option>New</option><option>For parts</option>
                  </select>
                </div>
                <div className="mp-field">
                  <label htmlFor="part-price">Price ($) <span className="mp-required">*</span></label>
                  <input id="part-price" className={`mp-input${errors.price ? ' mp-invalid' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={setField('price')} />
                  {errors.price && <span className="mp-error">{errors.price}</span>}
                </div>
                <div className="mp-field">
                  <label htmlFor="part-status">Status</label>
                  <select id="part-status" className="mp-input" value={form.status} onChange={setField('status')}>
                    <option>In Stock</option><option>Sold</option>
                  </select>
                </div>
                <div className="mp-field mp-field-wide">
                  <label htmlFor="part-description">Description</label>
                  <textarea id="part-description" className="mp-input" placeholder="Add condition notes, compatibility details or other useful information…" value={form.description} onChange={setField('description')} />
                </div>
                <div className="mp-field mp-field-wide">
                  <label>Part photo</label>
                  <div
                    className={`mp-photo-zone${dragging ? ' is-dragging' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
                    onDragOver={event => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                  >
                    {photoPreview ? <img className="mp-photo-preview" src={photoPreview} alt="Selected part preview" /> : <span className="mp-photo-icon">▧</span>}
                    <div className="mp-photo-copy">
                      <strong>{photoFile ? photoFile.name : 'Drop a photo here or click to browse'}</strong>
                      <span>PNG, JPG or WEBP up to 8 MB. {editingId !== null && 'Leave empty to keep the current photo.'}</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={event => choosePhoto(event.target.files?.[0])} />
                  </div>
                </div>
              </div>

              <div className="mp-form-actions">
                <button className="mp-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId !== null ? 'Save changes' : 'Add part'}</button>
                {editingId !== null && <button className="mp-secondary" type="button" onClick={resetForm}>Cancel editing</button>}
                {photoFile && <button className="mp-secondary" type="button" onClick={() => setPhotoFile(null)}>Remove selected photo</button>}
                <span className="mp-form-note">Changes are saved to the live parts inventory.</span>
              </div>
            </form>
          </section>

          <section className="mp-panel mp-inventory">
            <header className="mp-inventory-top">
              <div><h2>Parts inventory</h2><p>{visibleParts.length} of {parts.length} items displayed</p></div>
              <div className="mp-tools">
                <input className="mp-input mp-search" aria-label="Search inventory" placeholder="Search name, make, model or year…" value={query} onChange={event => setQuery(event.target.value)} />
                <select className="mp-input mp-filter" aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  <option>All</option><option>In Stock</option><option>Sold</option>
                </select>
              </div>
            </header>

            {loading ? (
              <div className="mp-loading"><span className="mp-spinner" /><span>Loading inventory…</span></div>
            ) : visibleParts.length === 0 ? (
              <div className="mp-empty"><strong>No matching parts found</strong><span>Try another search or add a new inventory item.</span></div>
            ) : (
              <div className="mp-table-wrap">
                <table className="mp-table">
                  <thead><tr><th>Photo</th><th>Part</th><th>Vehicle</th><th>Condition</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{visibleParts.map(part => (
                    <tr key={part.id}>
                      <td>{part.photoUrl ? <img className="mp-thumb" src={part.photoUrl} alt={`${part.name} part`} /> : <span className="mp-no-photo">No photo</span>}</td>
                      <td><span className="mp-part-name">{part.name}</span></td>
                      <td><span className="mp-car">{part.make} {part.model} · {part.year}</span></td>
                      <td>{part.condition}</td>
                      <td><span className="mp-price">${Number(part.price).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span></td>
                      <td><span className={`mp-badge ${part.status === 'Sold' ? 'mp-badge-sold' : 'mp-badge-stock'}`}>{part.status}</span></td>
                      <td><div className="mp-actions">
                        <button className="mp-icon-button" type="button" onClick={() => edit(part)}>Edit</button>
                        <label className="mp-icon-button" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {uploadingId === part.id ? 'Uploading…' : 'Photo'}
                          <input type="file" accept="image/*" hidden disabled={uploadingId === part.id} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadPhoto(part.id, file); event.target.value = ''; }} />
                        </label>
                        <button className="mp-icon-button mp-danger" type="button" disabled={deletingId === part.id} onClick={() => void remove(part)}>{deletingId === part.id ? 'Deleting…' : 'Delete'}</button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {message && (
        <div className={`mp-toast${message.error ? ' is-error' : ''}`} role="status">
          <span className="mp-toast-mark">{message.error ? '!' : '✓'}</span>
          <span>{message.text}</span>
        </div>
      )}
    </>
  );
}
