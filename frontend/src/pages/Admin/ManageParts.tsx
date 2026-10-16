import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { Part } from '../../lib/types';
import { API } from '../../lib/api';
import { authFetch, useToast } from '../../lib/admin';
import { fmtDate, money } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { ConfirmDialog, Modal, SafeImg, Toast } from '../../components/AdminUI';
import '../../styles/admin.css';

type Tab = 'all' | 'add' | 'sold';
type SortKey = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name';

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
type FormErrors = Partial<Record<keyof PartForm, string>>;

const CONDITIONS = ['Used', 'Reconditioned', 'New', 'For parts'];
const emptyForm: PartForm = { name: '', make: '', model: '', year: '', condition: 'Used', price: '', status: 'In Stock', description: '' };

// a part is In Stock (in the shop), Sold, or Written off (refunded but not resellable — hidden, not counted as sold)
type PartStatus = 'In Stock' | 'Sold' | 'Written off';
const statusOf = (p: Part): PartStatus => {
  const s = (p.status || '').trim().toLowerCase();
  if (s === 'sold') return 'Sold';
  if (s === 'written off') return 'Written off';
  return 'In Stock';
};
const isActive = (p: Part) => statusOf(p) === 'In Stock';
const STATUS_LABEL: Record<PartStatus, string> = { 'In Stock': 'In stock', Sold: 'Sold', 'Written off': 'Written off' };
const STATUS_BADGE: Record<PartStatus, string> = { 'In Stock': 'stock', Sold: 'sold', 'Written off': 'void' };

// keep an unusual existing condition (e.g. "Used - Good") selectable
const conditionOptions = (current: string) =>
  current && !CONDITIONS.includes(current) ? [current, ...CONDITIONS] : CONDITIONS;

const toForm = (p: Part): PartForm => ({
  name: p.name,
  make: p.make,
  model: p.model,
  year: String(p.year),
  condition: p.condition || 'Used',
  price: String(p.price),
  status: statusOf(p),
  description: p.description || '',
});

function validate(f: PartForm): FormErrors {
  const e: FormErrors = {};
  const maxYear = new Date().getFullYear() + 1;
  const year = Number(f.year);
  const price = Number(f.price);
  if (!f.name.trim()) e.name = 'Enter the part name.';
  if (!f.make.trim()) e.make = 'Enter the vehicle make.';
  if (!f.model.trim()) e.model = 'Enter the vehicle model.';
  if (!f.year || year < 1900 || year > maxYear) e.year = `Year must be 1900–${maxYear}.`;
  if (f.price === '' || Number.isNaN(price) || price < 0) e.price = 'Enter a valid price.';
  return e;
}

const toBody = (f: PartForm, id?: number) => ({
  ...(id !== undefined ? { id } : {}),
  name: f.name.trim(),
  make: f.make.trim(),
  model: f.model.trim(),
  year: Number(f.year),
  condition: f.condition,
  price: Number(f.price),
  status: f.status,
  description: f.description.trim(),
});

async function fetchParts(): Promise<Part[]> {
  const res = await fetch(`${API}/api/parts`);
  if (!res.ok) throw new Error('Could not load the parts inventory.');
  return res.json();
}

async function uploadPhoto(id: number, file: File) {
  const data = new FormData();
  data.append('file', file);
  const res = await authFetch(`${API}/api/parts/${id}/photo`, { method: 'POST', body: data });
  if (!res.ok) throw new Error('Photo upload failed.');
}

// Shared form fields (used by "Add part" and the Edit popup)
function PartFields({ form, errors, onChange, idPrefix, showStatus }: {
  form: PartForm;
  errors: FormErrors;
  onChange: (key: keyof PartForm, value: string) => void;
  idPrefix: string;
  showStatus?: boolean;
}) {
  const bind = (key: keyof PartForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(key, e.target.value);
  const cls = (key: keyof PartForm) => `adm-input${errors[key] ? ' invalid' : ''}`;

  return (
    <div className="adm-form-grid">
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-name`}>Part name <span className="adm-req">*</span></label>
        <input id={`${idPrefix}-name`} className={cls('name')} placeholder="e.g. Front bumper" value={form.name} onChange={bind('name')} />
        {errors.name && <span className="adm-error">{errors.name}</span>}
      </div>
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-make`}>Make <span className="adm-req">*</span></label>
        <input id={`${idPrefix}-make`} className={cls('make')} placeholder="e.g. Toyota" value={form.make} onChange={bind('make')} />
        {errors.make && <span className="adm-error">{errors.make}</span>}
      </div>
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-model`}>Model <span className="adm-req">*</span></label>
        <input id={`${idPrefix}-model`} className={cls('model')} placeholder="e.g. Camry" value={form.model} onChange={bind('model')} />
        {errors.model && <span className="adm-error">{errors.model}</span>}
      </div>
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-year`}>Year <span className="adm-req">*</span></label>
        <input id={`${idPrefix}-year`} className={cls('year')} type="number" min="1900" placeholder="e.g. 2015" value={form.year} onChange={bind('year')} />
        {errors.year && <span className="adm-error">{errors.year}</span>}
      </div>
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-condition`}>Condition</label>
        <select id={`${idPrefix}-condition`} className="adm-input" value={form.condition} onChange={bind('condition')}>
          {conditionOptions(form.condition).map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="adm-field">
        <label htmlFor={`${idPrefix}-price`}>Price (incl. GST) <span className="adm-req">*</span></label>
        <input id={`${idPrefix}-price`} className={cls('price')} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={bind('price')} />
        {errors.price && <span className="adm-error">{errors.price}</span>}
      </div>
      {showStatus && (
        <div className="adm-field">
          <label htmlFor={`${idPrefix}-status`}>Status</label>
          <select id={`${idPrefix}-status`} className="adm-input" value={form.status} onChange={bind('status')}>
            <option value="In Stock">In stock</option>
            <option value="Sold">Sold</option>
            <option value="Written off">Written off</option>
          </select>
        </div>
      )}
      <div className="adm-field adm-wide">
        <label htmlFor={`${idPrefix}-description`}>Description</label>
        <textarea id={`${idPrefix}-description`} className="adm-input" placeholder="Condition notes, compatibility, anything useful…" value={form.description} onChange={bind('description')} />
      </div>
    </div>
  );
}

// Drag & drop photo picker with preview
function PhotoPicker({ file, onFile, onError, currentUrl, hint }: {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (message: string) => void;
  currentUrl?: string | null;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [currentFailed, setCurrentFailed] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { onError('Please choose an image file.'); return; }
    if (f.size > 8 * 1024 * 1024) { onError('The photo must be smaller than 8 MB.'); return; }
    onFile(f);
  };

  const liveCurrent = currentFailed ? '' : currentUrl || '';
  const shown = preview || liveCurrent;

  return (
    <div>
      <div
        className={`adm-photo-zone${drag ? ' drag' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
      >
        {shown
          ? <img className="adm-photo-preview" src={shown} alt="Part preview" onError={() => { if (!preview) setCurrentFailed(true); }} />
          : <span className="adm-photo-icon">▧</span>}
        <div>
          <strong>{file ? file.name : liveCurrent ? 'Click or drop an image to replace the photo' : 'Drop a photo here or click to browse'}</strong>
          <span>{hint ?? 'PNG, JPG or WEBP up to 8 MB.'}</span>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {file && <button type="button" className="adm-btn sm" style={{ marginTop: 8 }} onClick={() => onFile(null)}>Remove selected photo</button>}
    </div>
  );
}


function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="adm-detail-item"><span>{label}</span><strong>{children}</strong></div>;
}

// Compact list: tap a row to expand its full details (one at a time)
function PartList({ parts, expandedId, onToggle, actions, priceLabel = 'Price' }: {
  parts: Part[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  actions: (p: Part) => ReactNode;
  priceLabel?: string;
}) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-list">
        <thead>
          <tr><th>Part</th><th>{priceLabel}</th><th>Status</th><th className="adm-chevron-cell"><span className="adm-sr">Expand</span></th></tr>
        </thead>
        <tbody>
          {parts.map(p => {
            const open = expandedId === p.id;
            return (
              <Fragment key={p.id}>
                <tr
                  className={`adm-row${open ? ' open' : ''}`}
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => onToggle(p.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(p.id); } }}
                >
                  <td>
                    <div className="adm-part-cell">
                      <SafeImg key={p.photoUrl ?? 'none'} src={p.photoUrl} className="adm-thumb" fallbackClass="adm-nophoto" />
                      <div>
                        <div className="adm-strong">{p.name}</div>
                        <div className="adm-sub">{p.make} {p.model} · {p.year}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="adm-price">{money(Number(p.price))}</span></td>
                  <td><span className={`adm-badge ${STATUS_BADGE[statusOf(p)]}`}>{STATUS_LABEL[statusOf(p)]}</span></td>
                  <td className="adm-chevron-cell"><span className={`adm-chevron${open ? ' open' : ''}`} aria-hidden="true">▾</span></td>
                </tr>
                {open && (
                  <tr className="adm-detail-row">
                    <td colSpan={4}>
                      <div className="adm-detail">
                        <SafeImg key={`big-${p.photoUrl ?? 'none'}`} src={p.photoUrl} className="adm-detail-photo" fallbackClass="adm-detail-nophoto" alt={p.name} />
                        <div className="adm-detail-main">
                          <div className="adm-detail-grid">
                            <DetailItem label="Make">{p.make}</DetailItem>
                            <DetailItem label="Model">{p.model}</DetailItem>
                            <DetailItem label="Year">{p.year}</DetailItem>
                            <DetailItem label="Condition">{p.condition || '—'}</DetailItem>
                            <DetailItem label="Price (incl. GST)">{money(Number(p.price))}</DetailItem>
                            <DetailItem label="Status">{STATUS_LABEL[statusOf(p)]}</DetailItem>
                            <DetailItem label="Part ID">#{p.id}</DetailItem>
                            <DetailItem label="Added">{fmtDate(p.createdAt) || '—'}</DetailItem>
                          </div>
                          <div className="adm-detail-desc">
                            <span>Description</span>
                            <p>{p.description?.trim() ? p.description : 'No description added.'}</p>
                          </div>
                          <div className="adm-detail-actions">{actions(p)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return <div className="adm-loading"><span className="adm-spinner" /><span>{label}</span></div>;
}

export default function ManageParts() {
  usePageTitle('Admin · Manage parts');
  // ?tab=add opens the Add part tab directly (used by the dashboard's quick action)
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(window.location.search).get('tab') === 'add' ? 'add' : 'all'));
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, notify } = useToast();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [makeFilter, setMakeFilter] = useState('All');
  const [sort, setSort] = useState<SortKey>('newest');
  const [soldQuery, setSoldQuery] = useState('');
  const [soldType, setSoldType] = useState<'All' | PartStatus>('All');

  const [addForm, setAddForm] = useState<PartForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<FormErrors>({});
  const [addPhoto, setAddPhoto] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Part | null>(null);
  const [editForm, setEditForm] = useState<PartForm>(emptyForm);
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [toDelete, setToDelete] = useState<Part | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [relisting, setRelisting] = useState<Part | null>(null);
  const [relistForm, setRelistForm] = useState({ price: '', condition: 'Used', description: '' });
  const [relistError, setRelistError] = useState('');
  const [savingRelist, setSavingRelist] = useState(false);

  // which part row is expanded (only one at a time)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const toggleRow = (id: number) => setExpandedId(cur => (cur === id ? null : id));
  const goTab = (t: Tab) => { setTab(t); setExpandedId(null); };

  useEffect(() => {
    let cancelled = false;
    fetchParts()
      .then(data => { if (!cancelled) setParts(data); })
      .catch(e => { if (!cancelled) notify(e instanceof Error ? e.message : 'Could not load parts.', true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify]);

  // refresh after an add / edit / delete / relist
  const load = useCallback(async () => {
    try {
      setParts(await fetchParts());
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load parts.', true);
    }
  }, [notify]);

  const stats = useMemo(() => {
    const active = parts.filter(isActive);
    const sold = parts.filter(p => statusOf(p) === 'Sold').length;
    return {
      total: parts.length,
      active: active.length,
      sold,
      writtenOff: parts.length - active.length - sold,
      offSale: parts.length - active.length,
      value: active.reduce((sum, p) => sum + Number(p.price || 0), 0),
      makes: new Set(parts.map(p => p.make.trim().toLowerCase()).filter(Boolean)).size,
    };
  }, [parts]);

  const makeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    parts.forEach(p => {
      const key = p.make.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, p.make.trim());
    });
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [parts]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = parts.filter(p => {
      if (statusFilter !== 'All' && statusOf(p) !== statusFilter) return false;
      if (makeFilter !== 'All' && p.make.trim().toLowerCase() !== makeFilter.toLowerCase()) return false;
      const haystack = `${p.name} ${p.make} ${p.model} ${p.year} ${p.condition}`.toLowerCase();
      return !term || haystack.includes(term);
    });
    switch (sort) {
      case 'oldest': list.sort((a, b) => a.id - b.id); break;
      case 'price-low': list.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price-high': list.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list.sort((a, b) => b.id - a.id);
    }
    return list;
  }, [parts, query, statusFilter, makeFilter, sort]);

  const soldParts = useMemo(() => {
    const term = soldQuery.trim().toLowerCase();
    return parts
      .filter(p => !isActive(p))
      .filter(p => soldType === 'All' || statusOf(p) === soldType)
      .filter(p => !term || `${p.name} ${p.make} ${p.model} ${p.year}`.toLowerCase().includes(term))
      .sort((a, b) => b.id - a.id);
  }, [parts, soldQuery, soldType]);

  const filtersActive = query.trim() !== '' || statusFilter !== 'All' || makeFilter !== 'All' || sort !== 'newest';
  const clearFilters = () => { setQuery(''); setStatusFilter('All'); setMakeFilter('All'); setSort('newest'); };

  const resetAdd = () => { setAddForm(emptyForm); setAddErrors({}); setAddPhoto(null); };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(addForm);
    setAddErrors(errs);
    if (Object.keys(errs).length) { notify('Please fix the highlighted fields.', true); return; }
    setAdding(true);
    try {
      const res = await authFetch(`${API}/api/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody({ ...addForm, status: 'In Stock' })),
      });
      if (!res.ok) throw new Error('The part could not be added.');
      const created: Part = await res.json();
      let photoFailed = false;
      if (addPhoto) {
        try { await uploadPhoto(created.id, addPhoto); } catch { photoFailed = true; }
      }
      notify(photoFailed ? `“${created.name}” added, but the photo upload failed.` : `“${created.name}” added to the listing.`, photoFailed);
      resetAdd();
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong.', true);
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (p: Part) => { setEditing(p); setEditForm(toForm(p)); setEditErrors({}); setEditPhoto(null); };
  const closeEdit = useCallback(() => { if (!savingEdit) setEditing(null); }, [savingEdit]);

  const saveEdit = async () => {
    if (!editing) return;
    const errs = validate(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingEdit(true);
    try {
      const res = await authFetch(`${API}/api/parts/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(editForm, editing.id)),
      });
      if (!res.ok) throw new Error('Changes could not be saved.');
      let photoFailed = false;
      if (editPhoto) {
        try { await uploadPhoto(editing.id, editPhoto); } catch { photoFailed = true; }
      }
      notify(photoFailed ? 'Changes saved, but the photo upload failed.' : `“${editForm.name.trim()}” updated.`, photoFailed);
      setEditing(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong.', true);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await authFetch(`${API}/api/parts/${toDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('The part could not be deleted.');
      notify(`“${toDelete.name}” deleted.`);
      setToDelete(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong.', true);
    } finally {
      setDeleting(false);
    }
  };

  const openRelist = (p: Part) => {
    setRelisting(p);
    setRelistForm({ price: String(p.price), condition: p.condition || 'Used', description: p.description || '' });
    setRelistError('');
  };
  const closeRelist = useCallback(() => { if (!savingRelist) setRelisting(null); }, [savingRelist]);

  const confirmRelist = async () => {
    if (!relisting) return;
    const price = Number(relistForm.price);
    if (relistForm.price === '' || Number.isNaN(price) || price < 0) { setRelistError('Enter a valid price.'); return; }
    setSavingRelist(true);
    try {
      const form: PartForm = {
        ...toForm(relisting),
        price: relistForm.price,
        condition: relistForm.condition,
        description: relistForm.description,
        status: 'In Stock',
      };
      const res = await authFetch(`${API}/api/parts/${relisting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(form, relisting.id)),
      });
      if (!res.ok) throw new Error('The part could not be relisted.');
      notify(`“${relisting.name}” is live in the shop again.`);
      setRelisting(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong.', true);
    } finally {
      setSavingRelist(false);
    }
  };

  // Buttons shown inside an expanded row
  const rowActions = (p: Part) => (
    <>
      {!isActive(p) && <button type="button" className="adm-btn primary" onClick={() => openRelist(p)}>Relist</button>}
      <button type="button" className={`adm-btn${isActive(p) ? ' primary' : ''}`} onClick={() => openEdit(p)}>Edit</button>
      <button type="button" className="adm-btn ghost-danger" onClick={() => setToDelete(p)}>Delete</button>
    </>
  );

  return (
    <div className="adm">
      <header className="adm-header">
        <div>
          <p className="adm-eyebrow">Inventory</p>
          <h1>Manage parts</h1>
          <p>Add, edit and organise the parts customers see in the shop.</p>
        </div>
      </header>

      <nav className="adm-tabs" role="tablist" aria-label="Manage parts sections">
        <button type="button" role="tab" aria-selected={tab === 'all'} className={`adm-tab${tab === 'all' ? ' active' : ''}`} onClick={() => goTab('all')}>
          All parts <span className="adm-tab-count">{stats.total}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'add'} className={`adm-tab${tab === 'add' ? ' active' : ''}`} onClick={() => goTab('add')}>
          Add part
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sold'} className={`adm-tab${tab === 'sold' ? ' active' : ''}`} onClick={() => goTab('sold')}>
          Sold &amp; written off <span className="adm-tab-count">{stats.offSale}</span>
        </button>
      </nav>

      {tab === 'all' && (
        <>
          <section className={`adm-stats${loading ? ' loading' : ''}`} aria-label="Inventory summary" aria-busy={loading}>
            <div className="adm-stat"><span>Total parts</span><strong>{stats.total}</strong><small>in the system</small></div>
            <div className="adm-stat"><span>Active listings</span><strong>{stats.active}</strong><small>visible to customers</small></div>
            <div className="adm-stat"><span>Sold</span><strong>{stats.sold}</strong><small>{stats.writtenOff ? `+ ${stats.writtenOff} written off` : 'can be relisted'}</small></div>
            <div className="adm-stat"><span>Vehicle makes</span><strong>{stats.makes}</strong><small>different makes in stock</small></div>
            <div className="adm-stat"><span>Listing value</span><strong>{money(stats.value)}</strong><small>active parts, incl. GST</small></div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h2>Parts inventory</h2>
                <p>{visible.length} of {parts.length} parts shown · tap a part to see details</p>
              </div>
            </div>

            <div className="adm-filters">
              <input className="adm-input" aria-label="Search parts" placeholder="Search name, make, model, year…" value={query} onChange={e => setQuery(e.target.value)} />
              <select className="adm-input" aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All statuses</option>
                <option value="In Stock">In stock</option>
                <option value="Sold">Sold</option>
                <option value="Written off">Written off</option>
              </select>
              <select className="adm-input" aria-label="Filter by make" value={makeFilter} onChange={e => setMakeFilter(e.target.value)}>
                <option value="All">All makes</option>
                {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="adm-input" aria-label="Sort parts" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price-low">Price: low → high</option>
                <option value="price-high">Price: high → low</option>
                <option value="name">Name A–Z</option>
              </select>
              <button type="button" className="adm-btn" onClick={clearFilters} disabled={!filtersActive}>Clear</button>
            </div>

            {loading ? (
              <Loading label="Loading inventory…" />
            ) : visible.length === 0 ? (
              <div className="adm-empty">
                {parts.length === 0 ? (
                  <>
                    <strong>No parts yet</strong>
                    <p>Add your first part to start building the shop.</p>
                    <button type="button" className="adm-btn primary" onClick={() => goTab('add')}>＋ Add a part</button>
                  </>
                ) : (
                  <>
                    <strong>No parts match these filters</strong>
                    <p>Try a different search or clear the filters.</p>
                    <button type="button" className="adm-btn" onClick={clearFilters}>Clear filters</button>
                  </>
                )}
              </div>
            ) : (
              <PartList parts={visible} expandedId={expandedId} onToggle={toggleRow} actions={rowActions} />
            )}
          </section>
        </>
      )}

      {tab === 'add' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h2>Add a part</h2>
              <p>Fields marked * are required. The part goes live in the shop as soon as it's added.</p>
            </div>
          </div>
          <form className="adm-panel-body" onSubmit={submitAdd} noValidate>
            <PartFields
              form={addForm}
              errors={addErrors}
              idPrefix="add"
              onChange={(key, value) => {
                setAddForm(f => ({ ...f, [key]: value }));
                if (addErrors[key]) setAddErrors(er => ({ ...er, [key]: undefined }));
              }}
            />
            <div className="adm-field" style={{ marginTop: 14 }}>
              <label>Photo</label>
              <PhotoPicker file={addPhoto} onFile={setAddPhoto} onError={m => notify(m, true)} />
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn primary" disabled={adding}>{adding ? 'Adding…' : 'Add part'}</button>
              <button type="button" className="adm-btn" onClick={resetAdd} disabled={adding}>Reset form</button>
              <button type="button" className="adm-btn" onClick={() => goTab('all')} disabled={adding}>Back to all parts</button>
            </div>
          </form>
        </section>
      )}

      {tab === 'sold' && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h2>Sold &amp; written off</h2>
              <p>Not in the shop. Got another one, or a written-off part was fixed? Relist it to make it live again.</p>
            </div>
          </div>
          <div className="adm-filters three">
            <input className="adm-input" aria-label="Search sold and written-off parts" placeholder="Search parts…" value={soldQuery} onChange={e => setSoldQuery(e.target.value)} />
            <select className="adm-input" aria-label="Filter by status" value={soldType} onChange={e => setSoldType(e.target.value as 'All' | PartStatus)}>
              <option value="All">Sold &amp; written off</option>
              <option value="Sold">Sold only</option>
              <option value="Written off">Written off only</option>
            </select>
            <button type="button" className="adm-btn" onClick={() => { setSoldQuery(''); setSoldType('All'); }} disabled={!soldQuery && soldType === 'All'}>Clear</button>
          </div>

          {loading ? (
            <Loading label="Loading parts…" />
          ) : soldParts.length === 0 ? (
            <div className="adm-empty">
              <strong>{soldQuery || soldType !== 'All' ? 'No parts match' : 'Nothing here yet'}</strong>
              <p>{soldQuery || soldType !== 'All' ? 'Try a different search or filter.' : 'Parts sold through a paid invoice, or written off after a refund, appear here.'}</p>
            </div>
          ) : (
            <PartList parts={soldParts} expandedId={expandedId} onToggle={toggleRow} actions={rowActions} priceLabel="Last price" />
          )}
        </section>
      )}

      {editing && (
        <Modal
          wide
          title="Edit part"
          subtitle={`${editing.name} · #${editing.id}`}
          onClose={closeEdit}
          footer={
            <>
              <button type="button" className="adm-btn" onClick={closeEdit} disabled={savingEdit}>Cancel</button>
              <button type="button" className="adm-btn primary" onClick={() => void saveEdit()} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <PartFields
            form={editForm}
            errors={editErrors}
            idPrefix="edit"
            showStatus
            onChange={(key, value) => {
              setEditForm(f => ({ ...f, [key]: value }));
              if (editErrors[key]) setEditErrors(er => ({ ...er, [key]: undefined }));
            }}
          />
          <div className="adm-field" style={{ marginTop: 14 }}>
            <label>Photo</label>
            <PhotoPicker
              file={editPhoto}
              onFile={setEditPhoto}
              onError={m => notify(m, true)}
              currentUrl={editing.photoUrl}
              hint="Leave as is to keep the current photo."
            />
          </div>
        </Modal>
      )}

      {relisting && (
        <Modal
          title="Relist this part?"
          subtitle="It will go live in the shop again. Adjust anything that's changed, or just confirm."
          onClose={closeRelist}
          footer={
            <>
              <button type="button" className="adm-btn" onClick={closeRelist} disabled={savingRelist}>Cancel</button>
              <button type="button" className="adm-btn primary" onClick={() => void confirmRelist()} disabled={savingRelist}>
                {savingRelist ? 'Relisting…' : 'Confirm & relist'}
              </button>
            </>
          }
        >
          <div className="adm-summary">
            <SafeImg src={relisting.photoUrl} className="adm-thumb" fallbackClass="adm-nophoto" />
            <div>
              <strong>{relisting.name}</strong>
              <span className="adm-muted" style={{ fontSize: '.8rem' }}>{relisting.make} {relisting.model} · {relisting.year}</span>
            </div>
          </div>
          <div className="adm-form-grid two">
            <div className="adm-field">
              <label htmlFor="relist-price">Price (incl. GST)</label>
              <input
                id="relist-price"
                className={`adm-input${relistError ? ' invalid' : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={relistForm.price}
                onChange={e => { setRelistForm(f => ({ ...f, price: e.target.value })); setRelistError(''); }}
              />
              {relistError && <span className="adm-error">{relistError}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="relist-condition">Condition</label>
              <select id="relist-condition" className="adm-input" value={relistForm.condition} onChange={e => setRelistForm(f => ({ ...f, condition: e.target.value }))}>
                {conditionOptions(relistForm.condition).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-field adm-wide">
              <label htmlFor="relist-description">Description</label>
              <textarea id="relist-description" className="adm-input" value={relistForm.description} onChange={e => setRelistForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          danger
          title="Delete this part?"
          confirmLabel="Delete part"
          busy={deleting}
          message={<>“<strong>{toDelete.name}</strong>” ({toDelete.make} {toDelete.model} {toDelete.year}) will be permanently removed, along with its photo. This can't be undone.</>}
          onCancel={() => { if (!deleting) setToDelete(null); }}
          onConfirm={() => void confirmDelete()}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
