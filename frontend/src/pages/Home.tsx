import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import type { Part } from "../lib/types";
import PartCard from "../components/PartCard";
import carSprite from "../assets/camry-intact-exploded.png";

const API = import.meta.env.VITE_API_URL;

type Phase = "arrival" | "scan" | "explode" | "reveal";
const timings: Array<[Phase, number]> = [
  ["arrival", 0],
  ["scan", 1900],
  ["explode", 3400],
  ["reveal", 5400],
];

const styles = `
  .wn-homepage {
    --wn-ink: #f5f5f1;
    --wn-muted: #a7adb0;
    --wn-dark: #090b0d;
    --wn-amber: #f2a51a;
    --wn-amber-bright: #ffc24b;
    margin: 0;
    overflow: hidden;
    color: var(--wn-ink);
    background: var(--wn-dark);
    font-family: Inter, Arial, sans-serif;
  }
  .wn-hero {
    position: relative;
    min-height: 580px;
    padding: 70px clamp(20px, 5.5vw, 104px) 60px;
    display: grid;
    grid-template-columns: minmax(300px, 0.76fr) minmax(520px, 1.24fr);
    align-items: center;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 71% 43%, rgba(255, 255, 255, 0.075), transparent 23%),
      linear-gradient(115deg, #0c0f11 0%, #090b0d 52%, #0b0d0f 100%);
  }
  .wn-hero::after {
    content: "";
    position: absolute;
    z-index: -1;
    inset: auto 0 0;
    height: 25%;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
    pointer-events: none;
  }
  .wn-hero-grid {
    position: absolute;
    z-index: -3;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(circle at 70% 48%, black 0%, transparent 70%);
  }
  .wn-hero-glow {
    position: absolute;
    z-index: -2;
    width: 38vw;
    aspect-ratio: 1;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.13;
    pointer-events: none;
  }
  .wn-hero-glow-one { top: 20%; right: 6%; background: var(--wn-amber); }
  .wn-hero-glow-two { top: -15%; left: 25%; background: #6b7780; opacity: 0.08; }
  .wn-hero-copy { position: relative; z-index: 5; max-width: 660px; }
  .wn-eyebrow {
    margin: 0 0 22px;
    display: flex;
    align-items: center;
    gap: 11px;
    color: var(--wn-amber-bright);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .wn-eyebrow span { width: 28px; height: 1px; background: currentColor; }
  .wn-hero h1 {
    max-width: 690px;
    margin: 0;
    font-family: Impact, "Arial Narrow", sans-serif;
    font-size: clamp(4.3rem, 6.6vw, 8.5rem);
    font-weight: 600;
    line-height: 0.78;
    letter-spacing: -0.035em;
    text-transform: uppercase;
  }
  .wn-hero h1 span {
    display: block;
    margin-top: 0.2em;
    color: transparent;
    -webkit-text-stroke: 1px rgba(245, 245, 241, 0.48);
    font-size: 0.55em;
    line-height: 0.95;
    letter-spacing: -0.015em;
  }
  .wn-hero-intro {
    max-width: 510px;
    margin: 31px 0 0;
    color: var(--wn-muted);
    font-size: clamp(0.95rem, 1.2vw, 1.08rem);
    line-height: 1.7;
  }
  .wn-hero-actions { margin-top: 36px; display: flex; gap: 11px; flex-wrap: wrap; }
  .wn-button {
    min-height: 50px;
    padding: 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    border: 1px solid transparent;
    border-radius: 2px;
    color: white;
    background: transparent;
    font: inherit;
    font-size: 0.83rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
  }
  .wn-button:hover { transform: translateY(-2px); }
  .wn-button svg { width: 18px; height: 18px; }
  .wn-button-primary { color: #111; background: var(--wn-amber); }
  .wn-button-primary:hover { background: var(--wn-amber-bright); }
  .wn-button-ghost { border-color: rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.035); }
  .wn-button-ghost:hover { border-color: rgba(255, 255, 255, 0.38); background: rgba(255, 255, 255, 0.07); }
  .wn-car-stage {
    --tilt-x: 0deg;
    --tilt-y: 0deg;
    position: relative;
    z-index: 3;
    width: min(42vw, 640px);
    height: min(42vw, 500px);
    min-height: 380px;
    margin-left: -11%;
    perspective: 1200px;
    transform-style: preserve-3d;
  }
  .wn-car-stage::before {
    content: "";
    position: absolute;
    top: 10%;
    left: 16%;
    width: 69%;
    aspect-ratio: 1;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    box-shadow: 0 0 0 42px rgba(255, 255, 255, 0.015), 0 0 0 88px rgba(255, 255, 255, 0.012);
    transform: rotateX(65deg) rotateZ(-10deg);
    transition: border-color 800ms ease, box-shadow 800ms ease;
  }
  .wn-hero-explode .wn-car-stage::before,
  .wn-hero-reveal .wn-car-stage::before {
    border-color: rgba(242, 165, 26, 0.28);
    box-shadow: 0 0 0 42px rgba(242, 165, 26, 0.018), 0 0 0 88px rgba(242, 165, 26, 0.012);
  }
  .wn-car-crop {
    position: absolute;
    top: 50%;
    left: 50%;
    background-image: url("${carSprite}");
    background-repeat: no-repeat;
    background-size: auto 100%;
    filter: drop-shadow(0 33px 26px rgba(0, 0, 0, 0.52));
    will-change: transform, opacity;
    transform-style: preserve-3d;
  }
  .wn-car-intact {
    width: min(30vw, 460px);
    aspect-ratio: 760 / 887;
    background-position: left center;
    opacity: 1;
    animation: wn-car-arrival 1.55s cubic-bezier(0.16, 0.82, 0.28, 1) both;
    transform: translate(-36%, -48%) rotateY(var(--tilt-x)) rotateX(var(--tilt-y));
    transition: opacity 700ms ease, transform 950ms cubic-bezier(0.22, 0.72, 0.2, 1), filter 500ms ease;
  }
  .wn-car-exploded {
    width: min(40vw, 600px);
    aspect-ratio: 1084 / 887;
    background-position: right center;
    opacity: 0;
    transform: translate(-42%, -47%) scale(0.7) rotateY(var(--tilt-x)) rotateX(var(--tilt-y));
    transition: opacity 820ms ease, transform 1200ms cubic-bezier(0.16, 0.84, 0.24, 1), filter 700ms ease;
  }
  @keyframes wn-car-arrival {
    from { opacity: 0; transform: translate(48%, -44%) scale(0.72) rotateY(-8deg); filter: blur(4px) drop-shadow(0 28px 22px rgba(0, 0, 0, 0.4)); }
    to { opacity: 1; transform: translate(-36%, -48%) scale(1) rotateY(0deg); filter: blur(0) drop-shadow(0 33px 26px rgba(0, 0, 0, 0.52)); }
  }
  .wn-hero-scan .wn-car-intact { filter: saturate(0.72) brightness(1.08) drop-shadow(0 33px 26px rgba(0, 0, 0, 0.52)); }
  .wn-hero-explode .wn-car-intact,
  .wn-hero-reveal .wn-car-intact {
    opacity: 0;
    transform: translate(-38%, -48%) scale(0.78) rotateY(var(--tilt-x)) rotateX(var(--tilt-y));
  }
  .wn-hero-explode .wn-car-exploded,
  .wn-hero-reveal .wn-car-exploded {
    opacity: 1;
    transform: translate(-42%, -47%) scale(1) rotateY(var(--tilt-x)) rotateX(var(--tilt-y));
  }
  .wn-car-shadow {
    position: absolute;
    z-index: -1;
    top: 70%;
    left: 7%;
    width: 80%;
    height: 15%;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.72);
    filter: blur(27px);
    transform: rotate(-3deg);
  }
  .wn-scan-line {
    position: absolute;
    z-index: 8;
    top: 15%;
    left: 20%;
    width: 2px;
    height: 63%;
    opacity: 0;
    background: var(--wn-amber-bright);
    box-shadow: 0 0 18px var(--wn-amber), 0 0 48px rgba(242, 165, 26, 0.6);
  }
  .wn-hero-scan .wn-scan-line { opacity: 0.9; animation: wn-scan 1.35s ease-in-out both; }
  @keyframes wn-scan {
    0% { left: 18%; opacity: 0; }
    12% { opacity: 1; }
    88% { opacity: 1; }
    100% { left: 78%; opacity: 0; }
  }
  .wn-scan-label {
    position: absolute;
    z-index: 9;
    top: 18%;
    right: 8%;
    width: 122px;
    padding: 11px;
    display: flex;
    justify-content: space-between;
    color: var(--wn-amber-bright);
    border-top: 1px solid currentColor;
    opacity: 0;
    font-size: 0.58rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
  .wn-scan-label strong { font-weight: 500; }
  .wn-hero-scan .wn-scan-label { opacity: 1; transition: opacity 250ms 180ms ease; }
  .wn-part-callout {
    position: absolute;
    z-index: 9;
    padding: 8px 11px;
    display: flex;
    gap: 9px;
    border-left: 1px solid var(--wn-amber);
    background: rgba(9, 11, 13, 0.72);
    backdrop-filter: blur(8px);
    opacity: 0;
    transform: translateY(8px);
    color: #d9dddf;
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: opacity 450ms ease, transform 450ms ease;
  }
  .wn-part-callout span { color: var(--wn-amber); }
  .wn-callout-engine { top: 54%; left: 33%; }
  .wn-callout-body { top: 28%; right: 7%; }
  .wn-callout-interior { top: 34%; left: 44%; }
  .wn-hero-reveal .wn-part-callout { opacity: 1; transform: translateY(0); }
  .wn-hero-reveal .wn-callout-body { transition-delay: 180ms; }
  .wn-hero-reveal .wn-callout-interior { transition-delay: 360ms; }
  .wn-brand-reveal {
    position: absolute;
    z-index: 10;
    right: clamp(24px, 5.5vw, 104px);
    bottom: 8.5%;
    display: flex;
    align-items: center;
    gap: 14px;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 650ms ease, transform 650ms ease;
  }
  .wn-hero-reveal .wn-brand-reveal { opacity: 1; transform: translateY(0); }
  .wn-brand-mark {
    width: 59px;
    height: 59px;
    display: grid;
    place-items: center;
    color: #101214;
    background: var(--wn-amber);
    font-family: Impact, "Arial Narrow", sans-serif;
    font-size: 1.7rem;
    font-weight: 700;
    transform: skew(-8deg);
  }
  .wn-brand-reveal div { display: grid; gap: 4px; }
  .wn-brand-reveal strong { font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.75rem; letter-spacing: 0.08em; }
  .wn-brand-reveal small { color: #848c91; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; }
  .wn-hero-scroll {
    position: absolute;
    z-index: 12;
    left: clamp(20px, 5.5vw, 104px);
    bottom: 28px;
    display: flex;
    align-items: center;
    gap: 14px;
    color: #777e82;
    font-size: 0.65rem;
    letter-spacing: 0.16em;
    text-decoration: none;
    text-transform: uppercase;
  }
  .wn-hero-scroll svg { width: 17px; transform: rotate(90deg); }
  .wn-home-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: #f0f0eb;
    color: #16191b;
  }
  .wn-home-card { min-height: 210px; padding: 38px; border-right: 1px solid rgba(22, 25, 27, 0.15); }
  .wn-home-card:last-child { border-right: 0; }
  .wn-home-card > span { color: #a76500; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
  .wn-home-card h2 { margin: 24px 0 12px; font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.65rem; letter-spacing: 0.02em; text-transform: uppercase; }
  .wn-home-card p { max-width: 360px; margin: 0 0 20px; color: #5c6266; line-height: 1.65; }
  .wn-home-card a { color: #16191b; font-weight: 800; text-decoration-color: var(--wn-amber); text-underline-offset: 5px; }
  .wn-arrivals { background: #fff; padding: 56px clamp(20px, 5.5vw, 104px); }
  .wn-arrivals h2 { font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.9rem; letter-spacing: 0.02em; text-transform: uppercase; color: #16191b; margin: 0 0 22px; }
  @media (max-width: 900px) {
    .wn-hero { min-height: 950px; padding-top: 70px; grid-template-columns: 1fr; align-content: start; }
    .wn-hero-copy { max-width: 620px; }
    .wn-hero h1 { font-size: clamp(4.8rem, 14vw, 7.5rem); }
    .wn-car-stage { width: 100vw; height: 520px; min-height: 0; margin: -20px 0 0 -6vw; }
    .wn-car-intact { width: min(65vw, 560px); }
    .wn-car-exploded { width: min(86vw, 760px); }
    .wn-brand-reveal { right: 24px; bottom: 5.8%; }
    .wn-home-links { grid-template-columns: 1fr; }
    .wn-home-card { border-right: 0; border-bottom: 1px solid rgba(22, 25, 27, 0.15); }
  }
  @media (max-width: 640px) {
    .wn-hero { min-height: 880px; padding-top: 54px; }
    .wn-hero h1 { font-size: clamp(4.1rem, 20vw, 5.8rem); line-height: 0.79; }
    .wn-hero h1 span { font-size: 0.48em; }
    .wn-hero-intro { margin-top: 22px; font-size: 0.86rem; }
    .wn-hero-actions { margin-top: 25px; }
    .wn-button { min-height: 46px; padding: 0 17px; }
    .wn-car-stage { height: 420px; margin-top: 8px; }
    .wn-car-intact { width: 75vw; }
    .wn-car-exploded { width: 100vw; }
    .wn-part-callout, .wn-scan-label { display: none; }
    .wn-brand-reveal { bottom: 7%; }
    .wn-brand-mark { width: 45px; height: 45px; font-size: 1.35rem; }
    .wn-brand-reveal strong { font-size: 1.35rem; }
    .wn-brand-reveal small, .wn-hero-scroll { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .wn-homepage *, .wn-homepage *::before, .wn-homepage *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroSequence() {
  const [phase, setPhase] = useState<Phase>("arrival");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setPhase("reveal"); return; }
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
        <p className="wn-eyebrow"><span /> Quality auto recyclers</p>
        <h1 id="wn-hero-title">One car.<br /><span>Thousands of possibilities.</span></h1>
        <p className="wn-hero-intro">Quality recycled parts, carefully dismantled, checked and ready for their next life.</p>
        <div className="wn-hero-actions">
          <Link className="wn-button wn-button-primary" to="/parts"><SearchIcon /> Find a part</Link>
          <Link className="wn-button wn-button-ghost" to="/finder">Find my car</Link>
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
        <div className="wn-scan-label" aria-hidden="true"><span>Vehicle scan</span><strong>01</strong></div>
        <div className="wn-scan-line" aria-hidden="true" />
        <div className="wn-car-shadow" aria-hidden="true" />
        <div className="wn-car-crop wn-car-intact" aria-hidden="true" />
        <div className="wn-car-crop wn-car-exploded" aria-hidden="true" />
        <div className="wn-part-callout wn-callout-engine" aria-hidden="true"><span>01</span> Engine</div>
        <div className="wn-part-callout wn-callout-body" aria-hidden="true"><span>02</span> Body</div>
        <div className="wn-part-callout wn-callout-interior" aria-hidden="true"><span>03</span> Interior</div>
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
  useEffect(() => {
    fetch(`${API}/api/parts`).then(r => (r.ok ? r.json() : [])).then(setParts).catch(() => {});
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="wn-homepage">
        <HeroSequence />
        <section className="wn-home-links" aria-label="WN Wrecker services">
          <article className="wn-home-card">
            <span>01</span>
            <h2>Search parts</h2>
            <p>Browse currently available parts by name, make, model and year.</p>
            <Link to="/parts">Browse inventory</Link>
          </article>
          <article className="wn-home-card">
            <span>02</span>
            <h2>Find your vehicle</h2>
            <p>Use the car finder to locate compatible parts for your vehicle.</p>
            <Link to="/finder">Open car finder</Link>
          </article>
          <article className="wn-home-card">
            <span>03</span>
            <h2>Talk to the team</h2>
            <p>Use the chat widget for availability, pricing and pickup enquiries.</p>
            <Link to="/contact">Contact WN Wrecker</Link>
          </article>
        </section>
        {parts.length > 0 && (
          <section className="wn-arrivals">
            <h2>Latest arrivals</h2>
            <div className="grid">{parts.slice(0, 8).map(p => <PartCard key={p.id} part={p} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}