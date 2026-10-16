import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Part } from "../lib/types";
import { usePageTitle } from "../lib/usePageTitle";
import { API } from "../lib/api";
import PartCard, { PartCardSkeleton } from "../components/PartCard";
import { CarIcon, ChatIcon, SearchIcon } from "../components/Icons";
import "../styles/home.css";

type Phase = "arrival" | "scan" | "explode" | "reveal";
const timings: Array<[Phase, number]> = [
  ["arrival", 0],
  ["scan", 1900],
  ["explode", 3400],
  ["reveal", 5400],
];

// Each make gets its own colour on the "Search by make" tiles, so no photos are needed.
// Known makes use a colour close to their brand; any other make gets a steady colour from its name.
const makeColours: Record<string, string> = {
  toyota: "#d71920", bmw: "#1c69d4", ford: "#1f4fa3", mazda: "#9b1b30", subaru: "#1e4fa0", audi: "#8a939b",
  mercedes: "#9aa3ab", "mercedes-benz": "#9aa3ab", honda: "#cc0000", lexus: "#5f6670", mg: "#c8102e",
  nissan: "#c3002f", hyundai: "#2a62b8", kia: "#bb162b", holden: "#d0021b", mitsubishi: "#e60012",
  volkswagen: "#2b6cb0", "rolls royce": "#6b4c9a", "rolls-royce": "#6b4c9a", jeep: "#4b5d3a", dodge: "#b3001b",
  genesis: "#8a7a5c", tesla: "#cc0000", isuzu: "#c8102e", suzuki: "#1e5bb8", volvo: "#2c4a7a",
  "land rover": "#2f5d3a", porsche: "#b08d57", mini: "#4a4f55", peugeot: "#2c4a7a", renault: "#d4a017",
};
// White brand logos in /public/makes (from Simple Icons, CC0). Makes without one show their name instead.
const makeLogos = new Set([
  "toyota", "ford", "mazda", "kia", "hyundai", "mitsubishi", "tesla", "nissan", "subaru", "volkswagen", "mg",
  "bmw", "audi", "honda", "suzuki", "jeep", "volvo", "peugeot", "renault", "skoda", "porsche", "mini",
  "rollsroyce", "chrysler", "fiat", "ram", "polestar", "citroen",
]);
const logoSlug = (make: string) => {
  const slug = make.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return makeLogos.has(slug) ? slug : null;
};
const makeColour = (make: string) => {
  const key = make.trim().toLowerCase();
  if (makeColours[key]) return makeColours[key];
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 42%)`;
};


function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function HeroSequence() {
  // people who turn off animations see the finished hero straight away
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? "reveal" : "arrival"));
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = timings.slice(1).map(([nextPhase, delay]) =>
      window.setTimeout(() => setPhase(nextPhase), delay));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!stageRef.current) return;
    const b = stageRef.current.getBoundingClientRect();
    const x = (event.clientX - b.left) / b.width - 0.5;
    const y = (event.clientY - b.top) / b.height - 0.5;
    stageRef.current.style.setProperty("--tilt-x", `${x * 5}deg`);
    stageRef.current.style.setProperty("--tilt-y", `${y * -4}deg`);
  }
  function resetPointer() {
    stageRef.current?.style.setProperty("--tilt-x", "0deg");
    stageRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <section className={`wn-hero wn-hero-${phase}`} aria-labelledby="wn-hero-title">
      <div className="wn-hero-grid" aria-hidden="true" />
      <div className="wn-hero-glow wn-hero-glow-one" aria-hidden="true" />
      <div className="wn-hero-glow wn-hero-glow-two" aria-hidden="true" />
      <div className="wn-hero-copy">
        <h1 id="wn-hero-title">One car.<span className="wn-hero-accent">Every part.</span><span className="wn-hero-last">One place.</span></h1>
        <p className="wn-hero-intro">Quality recycled parts, professionally dismantled, checked and ready for their next life.</p>
        <div className="wn-hero-actions">
          <Link className="wn-button wn-button-primary" to="/parts"><SearchIcon /> Browse parts</Link>
          <Link className="wn-button wn-button-ghost" to="/finder">Find parts for my car</Link>
        </div>
        <div className="wn-hero-proof" aria-label="WN Wrecker service benefits">
          <div className="wn-proof-item"><strong>Quality checked</strong><span>Before every listing</span></div>
          <div className="wn-proof-item"><strong>Vehicle matched</strong><span>Find compatible parts</span></div>
          <div className="wn-proof-item"><strong>Fast enquiries</strong><span>Talk directly to the team</span></div>
        </div>
      </div>
      <div
        className="wn-car-stage"
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        aria-label="A Toyota Camry arrives and separates into recyclable automotive parts"
        role="img"
      >
        <div className="wn-scan-label" aria-hidden="true">Checking every part</div>
        <div className="wn-scan-line" aria-hidden="true" />
        <div className="wn-car-shadow" aria-hidden="true" />
        <div className="wn-car-crop wn-car-intact" aria-hidden="true" />
        <div className="wn-car-crop wn-car-exploded" aria-hidden="true" />
        <div className="wn-part-callout wn-callout-engine" aria-hidden="true">Engine</div>
        <div className="wn-part-callout wn-callout-body" aria-hidden="true">Body panels</div>
        <div className="wn-part-callout wn-callout-interior" aria-hidden="true">Interior</div>
      </div>
      <div className="wn-brand-reveal" aria-hidden="true">
        <span className="wn-brand-mark">WN</span>
        <div><strong>WRECKER</strong><small>Parts with another chapter</small></div>
      </div>
      <Link className="wn-hero-scroll" to="/parts"><span>Explore inventory</span><ArrowIcon /></Link>
    </section>
  );
}

export default function Home() {
  const [parts, setParts] = useState<Part[]>([]);
  const [makes, setMakes] = useState<{ make: string; count: number }[]>([]);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [partsLoaded, setPartsLoaded] = useState(false);
  const [makesLoaded, setMakesLoaded] = useState(false);
  usePageTitle();
  const makeNavigationTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // the 8 newest parts customers can buy, and each in-stock make with its part count
    fetch(`${API}/api/parts?inStock=true&sort=newest&page=1&pageSize=8`)
      .then(response => (response.ok ? response.json() : []))
      .then((data: Part[]) => setParts(data))
      .catch(() => setParts([]))
      .finally(() => setPartsLoaded(true));
    fetch(`${API}/api/vehicles/makes/counts`)
      .then(response => (response.ok ? response.json() : []))
      .then((data: { make: string; count: number }[]) => setMakes(data))
      .catch(() => setMakes([]))
      .finally(() => setMakesLoaded(true));
  }, []);
  useEffect(() => () => {
    if (makeNavigationTimer.current !== null) window.clearTimeout(makeNavigationTimer.current);
  }, []);

  function selectMake(make: string) {
    setSelectedMake(make);
    if (makeNavigationTimer.current !== null) window.clearTimeout(makeNavigationTimer.current);
    makeNavigationTimer.current = window.setTimeout(() => {
      navigate(`/parts?make=${encodeURIComponent(make)}`);
    }, 280);
  }

  return (
    <>
      <div className="wn-homepage">
        <HeroSequence />
        <section className="wn-home-links" aria-label="WN Wrecker services">
          <article className="wn-home-card">
            <span className="wn-home-card-icon"><SearchIcon /></span>
            <h2>Search parts</h2>
            <p>Browse currently available parts by name, make, model and year.</p>
            <Link to="/parts">Browse inventory</Link>
          </article>
          <article className="wn-home-card">
            <span className="wn-home-card-icon"><CarIcon /></span>
            <h2>Find your vehicle</h2>
            <p>Use the car finder to locate compatible parts for your vehicle.</p>
            <Link to="/finder">Open car finder</Link>
          </article>
          <article className="wn-home-card">
            <span className="wn-home-card-icon"><ChatIcon /></span>
            <h2>Talk to the team</h2>
            <p>Use the chat widget for availability, pricing and pickup enquiries.</p>
            <Link to="/contact">Contact WN Wrecker</Link>
          </article>
        </section>
        <section className="wn-arrivals" aria-labelledby="wn-arrivals-title">
          <div className="wn-arrivals-heading">
            <div>
              <h2 id="wn-arrivals-title">Latest arrivals</h2>
            </div>
            <Link to="/parts">View all available parts</Link>
          </div>
          <div className="wn-arrivals-layout">
            {!partsLoaded ? (
              <div className="grid wn-arrivals-grid" aria-label="Loading parts">{Array.from({ length: 4 }, (_, i) => <PartCardSkeleton key={i} />)}</div>
            ) : parts.length > 0 ? (
              <div className="grid wn-arrivals-grid">
                {parts.map(p => <PartCard key={p.id} part={p} />)}
              </div>
            ) : (
              <div className="wn-arrivals-empty">New parts will appear here as soon as they are added.</div>
            )}
            <aside className="wn-parts-help">
              <h3>Can’t see your part?</h3>
              <p>Tell us your vehicle details and the part you need. Our team will check current and upcoming stock.</p>
              <Link to="/contact#request">Send a parts request</Link>
            </aside>
          </div>
        </section>
        <section className="wn-makes" aria-labelledby="wn-makes-title">
          <div className="wn-makes-heading">
            <h2 id="wn-makes-title">Search by make</h2>
            <span>Pick a manufacturer to see the parts we have in stock for it.</span>
          </div>
          <div className="wn-makes-grid">
            {makesLoaded && makes.length === 0 && <p className="wn-makes-empty">Makes will appear here as soon as parts are listed.</p>}
            {makes.map(({ make, count }) => {
              const logo = logoSlug(make);
              return (
                <button
                  className={`wn-make-card${selectedMake === make ? " is-selected" : ""}`}
                  key={make}
                  type="button"
                  style={{ "--make": makeColour(make) } as CSSProperties}
                  onClick={() => selectMake(make)}
                  aria-label={`Shop ${make} parts`}
                  aria-pressed={selectedMake === make}
                >
                  {logo
                    ? <span className="wn-make-logo" aria-hidden="true" style={{ "--logo": `url(/makes/${logo}.svg)` } as CSSProperties} />
                    : <span className="wn-make-mark" aria-hidden="true">{make}</span>}
                  <span className="wn-make-copy">
                    <strong>{make}</strong>
                    <small>{count} {count === 1 ? "part" : "parts"} in stock</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
