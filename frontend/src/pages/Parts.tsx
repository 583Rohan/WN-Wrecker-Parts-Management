import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Part } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { API } from '../lib/api';
import PartCard, { PartCardSkeleton } from '../components/PartCard';
import { SearchIcon } from '../components/Icons';
import '../styles/shop.css';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
const PAGE_SIZE = 24;


export default function Parts() {
  usePageTitle('Shop');
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [make, setMake] = useState(() => searchParams.get('make') ?? '');   // /parts?make=BMW from the home page tiles
  const [makes, setMakes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);   // "Show more" loads the next PAGE_SIZE parts
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
      const params = new URLSearchParams({ inStock: 'true', sort, page: String(page), pageSize: String(PAGE_SIZE) });
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
      <section className="page-hero">
        <div className="page-hero-inner">
          <h1>Find the right part</h1>
          <p>Search by part, make, model or year — for example "Corolla bumper". Sold parts are removed automatically.</p>
          <div className="glass shop-controls" role="search">
            <div>
              <label className="label" htmlFor="parts-search">Search inventory</label>
              <div className="shop-search">
                <SearchIcon />
                <input id="parts-search" className="input" placeholder="Try radiator, bumper, BMW…" value={search} onChange={event => changeSearch(event.target.value)} />
                {search && <button className="shop-search-clear" type="button" aria-label="Clear search" onClick={() => changeSearch('')}>×</button>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="parts-make">Vehicle make</label>
              <select id="parts-make" className="input" value={make} onChange={event => changeMake(event.target.value)}>
                <option value="">All makes</option>
                {make && !makes.includes(make) && <option value={make}>{make}</option>}
                {makes.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="parts-sort">Sort results</label>
              <select id="parts-sort" className="input" value={sort} onChange={event => changeSort(event.target.value as SortOption)}>
                <option value="newest">Newest added</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
            <button className="btn shop-clear" type="button" onClick={clearFilters} disabled={!hasFilters && sort === 'newest'}>Clear filters</button>
          </div>
        </div>
      </section>

      <div className="page-body">
        <header className="shop-summary">
          <div>
            <h2 className="section-title">Available parts</h2>
            <p className="muted">{firstLoad ? 'Checking current inventory…' : `${total} ${total === 1 ? 'part' : 'parts'} currently available`}</p>
          </div>
          {hasFilters && <span className="shop-active-filter">Filters on</span>}
        </header>

        {firstLoad ? (
          <div className="grid" aria-label="Loading parts">{Array.from({ length: 4 }, (_, i) => <PartCardSkeleton key={i} />)}</div>
        ) : error && parts.length === 0 ? (
          <div className="state">
            <span className="state-icon">!</span>
            <h3>Inventory unavailable</h3>
            <p>{error}</p>
            <button className="btn" type="button" onClick={() => setRetryKey(key => key + 1)}>Try again</button>
          </div>
        ) : parts.length === 0 ? (
          <div className="state">
            <span className="state-icon">⌕</span>
            <h3>No matching parts</h3>
            <p>Try clearing your filters, search for another part, or let our team find it for you.</p>
            {hasFilters
              ? <button className="btn" type="button" onClick={clearFilters}>Clear filters</button>
              : <Link className="btn" to="/contact#request">Request a part</Link>}
          </div>
        ) : (
          <>
            <div className="grid">{parts.map(part => <PartCard key={part.id} part={part} />)}</div>
            {parts.length < total && (
              <div className="shop-more">
                <p className="muted">Showing {parts.length} of {total}</p>
                <button className="btn btn-outline" type="button" onClick={() => setPage(p => p + 1)} disabled={loading}>{loading ? 'Loading…' : 'Show more parts'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
