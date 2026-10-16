import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import PartCard from '../components/PartCard';
import { usePageTitle } from '../lib/usePageTitle';

const API = import.meta.env.VITE_API_URL;

type SortOption = 'newest' | 'price-asc' | 'price-desc';
const PAGE_SIZE = 24;

const styles = `
  .shop-page {
    --shop-navy: var(--c-navy);
    --shop-navy-2: var(--c-navy-2);
    --shop-orange: var(--c-amber);
    --shop-orange-light: var(--c-amber-light);
    --shop-ink: var(--c-ink);
    --shop-muted: var(--c-muted);
    --shop-line: var(--c-line);
    min-height: 100vh;
    color: var(--shop-ink);
    background: #f5f6f7;
    font-family: var(--font-body);
  }
  .shop-hero {
    position: relative;
    min-height: 190px;
    padding: 36px clamp(22px, 5vw, 92px) 52px;
    overflow: hidden;
    color: #fff;
    background:
      radial-gradient(circle at 80% 42%, rgba(247,164,17,0.22), transparent 29%),
      linear-gradient(115deg, #09111f, #101d32 64%, #171207);
  }
  .shop-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.22;
    background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 58px 58px;
    mask-image: linear-gradient(90deg, black, transparent 82%);
  }
  .shop-hero-inner { position: relative; z-index: 1; width: min(1320px, 100%); margin: 0 auto; }
  .shop-hero h1 { max-width: 720px; margin: 0; font-family: var(--font-display); font-size: clamp(2.2rem, 4vw, 3.4rem); font-weight: 400; line-height: 1; letter-spacing: 0.01em; text-transform: uppercase; }
  .shop-hero-copy { max-width: 610px; margin: 12px 0 0; color: #aeb8c7; font-size: 0.84rem; line-height: 1.5; }
  .shop-shell { width: min(1320px, calc(100% - 44px)); margin: 0 auto; }
  .shop-controls {
    position: relative;
    z-index: 1;
    margin-top: 26px;
    padding: 18px 18px 18px 20px;
    display: grid;
    grid-template-columns: minmax(320px, 1.6fr) minmax(180px, 0.55fr) minmax(180px, 0.55fr) 140px;
    gap: 14px;
    align-items: end;
    border: 1px solid rgba(255,255,255,0.14);
    border-left: 4px solid var(--shop-orange);
    border-radius: 10px;
    background: rgba(255,255,255,0.07);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.25);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
    backdrop-filter: blur(16px) saturate(140%);
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .shop-controls { background: rgba(22,37,62,0.92); } }
  .shop-field { display: grid; gap: 7px; }
  .shop-field label { color: #cbd5e1; font-size: 0.85rem; font-weight: 700; }
  .shop-input-wrap { position: relative; }
  .shop-search-icon { position: absolute; left: 14px; top: 50%; width: 18px; height: 18px; transform: translateY(-50%); color: #778397; pointer-events: none; }
  .shop-input {
    width: 100%;
    height: 44px;
    padding: 0 13px;
    box-sizing: border-box;
    border: 1px solid #d5dde7;
    border-radius: 8px;
    outline: 0;
    color: var(--shop-ink);
    background: #fafbfd;
    font: inherit;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }
  .shop-search { padding-left: 43px; padding-right: 40px; }
  .shop-input:focus { border-color: var(--shop-orange); background: #fff; box-shadow: 0 0 0 4px rgba(247,164,17,0.14); }
  .shop-clear-search { position: absolute; top: 50%; right: 10px; width: 29px; height: 29px; border: 0; border-radius: 50%; color: #64748b; background: #edf1f5; transform: translateY(-50%); cursor: pointer; }
  .shop-clear-button { height: 44px; padding: 0 15px; border: 1px solid rgba(255,255,255,0.22); border-radius: 8px; color: #fff; background: rgba(255,255,255,0.06); font: inherit; font-size: 0.74rem; font-weight: 800; cursor: pointer; transition: border-color 160ms ease, background 160ms ease, opacity 160ms ease; }
  .shop-clear-button:disabled { cursor: default; opacity: 0.45; }
  .shop-clear-button:hover { border-color: var(--shop-orange); background: rgba(245,163,19,0.14); }
  .shop-content { padding: 29px 0 52px; }
  .shop-summary { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: end; gap: 20px; }
  .shop-summary h2 { margin: 0; color: var(--shop-navy); font-family: var(--font-display); font-size: clamp(1.5rem, 2.4vw, 2rem); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase; }
  .shop-summary p { margin: 7px 0 0; color: var(--shop-muted); font-size: 0.8rem; }
  .shop-active-filter { padding: 8px 11px; display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; color: #8a5200; background: #fff1ce; font-size: 0.7rem; font-weight: 800; }
  .shop-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  .shop-grid > * { transition: transform 180ms ease, box-shadow 180ms ease; }
  .shop-grid > *:hover { transform: translateY(-5px); box-shadow: 0 16px 30px rgba(13,25,48,0.12); }
  .shop-skeleton { overflow: hidden; min-height: 340px; border: 1px solid var(--shop-line); border-radius: 12px; background: #fff; }
  .shop-skeleton-image { height: 210px; background: #e4e9ef; }
  .shop-skeleton-lines { padding: 18px; display: grid; gap: 12px; }
  .shop-skeleton-line { height: 13px; border-radius: 999px; background: #e8edf2; }
  .shop-skeleton-line:nth-child(2) { width: 65%; }
  .shop-skeleton-image, .shop-skeleton-line { background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent); background-size: 200% 100%; animation: shop-shimmer 1.2s infinite; }
  @keyframes shop-shimmer { to { background-position: -200% 0; } }
  .shop-state { min-height: 330px; padding: 56px 24px; display: grid; place-items: center; align-content: center; text-align: center; border: 1px dashed #cbd5e1; border-radius: 14px; background: #fff; }
  .shop-state-icon { width: 62px; height: 62px; display: grid; place-items: center; margin-bottom: 17px; border-radius: 50%; color: var(--shop-navy); background: #fff0cc; font-size: 1.45rem; }
  .shop-state h3 { margin: 0; color: var(--shop-navy); font-size: 1.25rem; }
  .shop-state p { max-width: 430px; margin: 10px auto 20px; color: var(--shop-muted); font-size: 0.85rem; line-height: 1.6; }
  .shop-primary { min-height: 45px; padding: 0 20px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 7px; color: #111; background: var(--shop-orange); font: inherit; font-size: 0.78rem; font-weight: 900; text-decoration: none; cursor: pointer; }
  .shop-primary:hover { background: var(--shop-orange-light); }
  .shop-more { margin-top: 28px; display: grid; justify-items: center; gap: 10px; }
  .shop-more p { margin: 0; color: var(--shop-muted); font-size: 0.8rem; }
  .shop-more-button { min-width: 200px; color: var(--shop-navy); background: #fff; border-color: #cfd7e2; }
  .shop-more-button:hover { background: #fff8e9; }
  @media (max-width: 1050px) {
    .shop-controls { grid-template-columns: 1fr 1fr; }
    .shop-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .shop-hero { min-height: 175px; padding-top: 30px; }
    .shop-shell { width: min(100% - 28px, 1320px); }
    .shop-controls { grid-template-columns: 1fr; padding: 16px; }
    .shop-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .shop-summary { align-items: flex-start; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shop-page *, .shop-page *::before, .shop-page *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

function SearchIcon() {
  return <svg className="shop-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

export default function Parts() {
  usePageTitle('Shop');
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [make, setMake] = useState(() => searchParams.get('make') ?? '');   // e.g. /parts?make=BMW from the home page
  const [makes, setMakes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);   // the shop loads PAGE_SIZE parts at a time ("Show more" loads the next page)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/vehicles/makes`)
      .then(response => (response.ok ? response.json() : []))
      .then(setMakes)
      .catch(() => setMakes([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ inStock: 'true', sort, page: String(page), pageSize: String(PAGE_SIZE) });   // only parts customers can buy
      if (search.trim()) params.set('search', search.trim());
      if (make) params.set('make', make);

      try {
        const response = await fetch(`${API}/api/parts?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error('We could not load the parts inventory.');
        const data: Part[] = await response.json();
        setTotal(Number(response.headers.get('X-Total-Count') ?? data.length));
        setParts(previous => (page === 1 ? data : [...previous, ...data]));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        if (page === 1) setParts([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load parts.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, page === 1 ? 280 : 0);   // short wait while typing; "Show more" loads straight away

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, make, sort, page, retryKey]);

  // any filter change starts again from the first page
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeMake = (value: string) => { setMake(value); setPage(1); };
  const changeSort = (value: SortOption) => { setSort(value); setPage(1); };

  const hasFilters = Boolean(search.trim() || make);
  const clearFilters = () => { setSearch(''); setMake(''); setSort('newest'); setPage(1); };
  const firstLoad = loading && page === 1;

  return (
    <>
      <style>{styles}</style>
      <main className="shop-page">
        <section className="shop-hero">
          <div className="shop-hero-inner">
            <h1>Find the right part</h1>
            <p className="shop-hero-copy">Search by part, make, model or year — for example "Corolla bumper". Sold parts are removed automatically.</p>
            <section className="shop-controls" aria-label="Parts search controls">
              <div className="shop-field">
                <label htmlFor="parts-search">Search inventory</label>
                <div className="shop-input-wrap">
                  <SearchIcon />
                  <input id="parts-search" className="shop-input shop-search" placeholder="Try radiator, bumper, BMW…" value={search} onChange={event => changeSearch(event.target.value)} />
                  {search && <button className="shop-clear-search" type="button" aria-label="Clear search" onClick={() => changeSearch('')}>×</button>}
                </div>
              </div>
              <div className="shop-field">
                <label htmlFor="parts-make">Vehicle make</label>
                <select id="parts-make" className="shop-input" value={make} onChange={event => changeMake(event.target.value)}>
                  <option value="">All makes</option>
                  {make && !makes.includes(make) && <option value={make}>{make}</option>}
                  {makes.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="shop-field">
                <label htmlFor="parts-sort">Sort results</label>
                <select id="parts-sort" className="shop-input" value={sort} onChange={event => changeSort(event.target.value as SortOption)}>
                  <option value="newest">Newest added</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </div>
              <button className="shop-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters && sort === 'newest'}>Clear filters</button>
            </section>
          </div>
        </section>

        <div className="shop-shell">
          <section className="shop-content" aria-labelledby="shop-results-title">
            <header className="shop-summary">
              <div>
                <h2 id="shop-results-title">Available parts</h2>
                <p>{firstLoad ? 'Checking current inventory…' : `${total} ${total === 1 ? 'part' : 'parts'} currently available`}</p>
              </div>
              {hasFilters && <span className="shop-active-filter">● Filters active</span>}
            </header>

            {firstLoad ? (
              <div className="shop-grid" aria-label="Loading parts">
                {Array.from({ length: 4 }, (_, index) => <div className="shop-skeleton" key={index}><div className="shop-skeleton-image"/><div className="shop-skeleton-lines"><div className="shop-skeleton-line"/><div className="shop-skeleton-line"/><div className="shop-skeleton-line"/></div></div>)}
              </div>
            ) : error && parts.length === 0 ? (
              <div className="shop-state"><span className="shop-state-icon">!</span><h3>Inventory unavailable</h3><p>{error}</p><button className="shop-primary" type="button" onClick={() => setRetryKey(key => key + 1)}>Try again</button></div>
            ) : parts.length === 0 ? (
              <div className="shop-state"><span className="shop-state-icon">⌕</span><h3>No matching parts</h3><p>Try clearing your filters, search for another part, or let our team locate it for you.</p>{hasFilters ? <button className="shop-primary" type="button" onClick={clearFilters}>Clear filters</button> : <Link className="shop-primary" to="/contact#request">Request a part</Link>}</div>
            ) : (
              <>
                <div className="shop-grid">{parts.map(part => <PartCard key={part.id} part={part} />)}</div>
                {parts.length < total && (
                  <div className="shop-more">
                    <p>Showing {parts.length} of {total}</p>
                    <button className="shop-clear-button shop-more-button" type="button" onClick={() => setPage(p => p + 1)} disabled={loading}>{loading ? 'Loading…' : 'Show more parts'}</button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

      </main>
    </>
  );
}
