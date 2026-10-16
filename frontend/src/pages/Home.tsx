import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Part } from "../lib/types";
import PartCard, { PartCardSkeleton } from "../components/PartCard";
import carSprite from "../assets/camry-intact-exploded.webp";
import { usePageTitle } from "../lib/usePageTitle";
import { CarIcon, ChatIcon, SearchIcon } from "../components/Icons";

const API = import.meta.env.VITE_API_URL;

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

const styles = `
  .wn-homepage {
    --wn-ink: #f5f5f1;
    --wn-muted: #a7adb0;
    --wn-dark: #090b0d;
    --wn-amber: var(--c-amber);
    --wn-amber-bright: var(--c-amber-light);
    margin: 0;
    overflow: hidden;
    color: var(--wn-ink);
    background: var(--c-sand);
    font-family: var(--font-body);
  }
  .wn-hero {
    position: relative;
    min-height: 650px;
    padding: 72px clamp(24px, 5vw, 92px) 68px;
    display: grid;
    grid-template-columns: minmax(370px, 0.86fr) minmax(560px, 1.14fr);
    align-items: center;
    gap: clamp(24px, 3vw, 58px);
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 73% 45%, rgba(242, 165, 26, 0.12), transparent 31%),
      radial-gradient(circle at 73% 43%, rgba(255, 255, 255, 0.07), transparent 20%),
      linear-gradient(115deg, #0b1424 0%, #07101d 55%, #120e08 100%);
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
  .wn-hero-copy { position: relative; z-index: 5; max-width: 570px; }
  .wn-hero h1 {
    max-width: 600px;
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(4rem, 5.8vw, 7.4rem);
    font-weight: 600;
    line-height: 0.82;
    letter-spacing: -0.035em;
    text-transform: uppercase;
  }
  .wn-hero h1 span {
    display: block;
    margin-top: 0.04em;
    font-size: 0.72em;
    line-height: 0.88;
    letter-spacing: -0.02em;
  }
  .wn-hero h1 .wn-hero-accent { color: var(--wn-amber-bright); }
  .wn-hero h1 .wn-hero-last { color: transparent; -webkit-text-stroke: 1px rgba(245, 245, 241, 0.58); }
  .wn-hero-intro {
    max-width: 480px;
    margin: 28px 0 0;
    color: var(--wn-muted);
    font-size: clamp(0.95rem, 1.2vw, 1.08rem);
    line-height: 1.7;
  }
  .wn-hero-actions { margin-top: 31px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
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
  .wn-button-ghost { border-color: rgba(255, 255, 255, 0.28); background: transparent; }
  .wn-button-ghost:hover { border-color: var(--wn-amber-bright); color: var(--wn-amber-bright); background: transparent; }
  .wn-hero-proof {
    margin-top: 38px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .wn-proof-item { display: grid; gap: 4px; padding: 12px 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; background: rgba(255, 255, 255, 0.05); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
  .wn-proof-item strong { color: #e9ebec; font-size: 0.72rem; }
  .wn-proof-item span { color: #9aa3a8; font-size: 0.66rem; line-height: 1.35; }
  .wn-car-stage {
    --tilt-x: 0deg;
    --tilt-y: 0deg;
    position: relative;
    z-index: 3;
    width: min(46vw, 710px);
    height: min(43vw, 540px);
    min-height: 410px;
    margin-left: -5%;
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
    animation: wn-car-arrival 1.55s cubic-bezier(0.16, 0.82, 0.28, 1);
    transform: translate(-36%, -48%) rotateY(var(--tilt-x)) rotateX(var(--tilt-y));
    transition: opacity 700ms ease, transform 950ms cubic-bezier(0.22, 0.72, 0.2, 1), filter 500ms ease;
  }
  .wn-car-exploded {
    width: min(42vw, 650px);
    aspect-ratio: 1084 / 887;
    background-position: right center;
    clip-path: inset(0 0 0 6%);
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
    font-size: 0.72rem;
  }
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
    font-size: 0.78rem;
    transition: opacity 450ms ease, transform 450ms ease;
  }
  .wn-callout-engine { top: 54%; left: 33%; }
  .wn-callout-body { top: 28%; right: 7%; }
  .wn-callout-interior { top: 34%; left: 44%; }
  .wn-hero-reveal .wn-part-callout { opacity: 1; transform: translateY(0); }
  .wn-hero-reveal .wn-callout-body { transition-delay: 180ms; }
  .wn-hero-reveal .wn-callout-interior { transition-delay: 360ms; }
  .wn-brand-reveal {
    position: absolute;
    z-index: 10;
    right: clamp(24px, 4vw, 72px);
    bottom: 6.5%;
    display: flex;
    align-items: center;
    gap: 14px;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 650ms ease, transform 650ms ease;
  }
  .wn-hero-reveal .wn-brand-reveal { opacity: 1; transform: translateY(0); }
  .wn-brand-mark {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    color: #101214;
    background: var(--wn-amber);
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 700;
    transform: skew(-8deg);
  }
  .wn-brand-reveal div { display: grid; gap: 4px; }
  .wn-brand-reveal strong { font-family: var(--font-display); font-size: 1.45rem; letter-spacing: 0.08em; }
  .wn-brand-reveal small { color: #9aa3a8; font-size: 0.78rem; }
  .wn-hero-scroll {
    position: absolute;
    z-index: 12;
    left: clamp(20px, 5.5vw, 104px);
    bottom: 28px;
    display: flex;
    align-items: center;
    gap: 14px;
    color: #777e82;
    font-size: 0.82rem;
    text-decoration: none;
  }
  .wn-hero-scroll svg { width: 17px; transform: rotate(90deg); }
  .wn-home-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 0 clamp(24px, 5vw, 92px);
    background: #d9d7d1;
    color: #16191b;
  }
  .wn-home-card {
    min-height: 218px;
    padding: 36px;
    position: relative;
    background: var(--c-sand);
    transition: transform 220ms ease, background 220ms ease, box-shadow 220ms ease;
  }
  .wn-home-card:hover { z-index: 2; transform: translateY(-6px); background: #fff; box-shadow: 0 18px 35px rgba(17, 20, 22, 0.1); }
  .wn-home-card-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: var(--c-amber-text); background: rgba(245, 163, 19, 0.14); }
  .wn-home-card-icon svg { width: 22px; height: 22px; }
  .wn-home-card h2 { margin: 22px 0 11px; font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 0.02em; text-transform: uppercase; }
  .wn-home-card p { max-width: 360px; margin: 0 0 20px; color: #5c6266; line-height: 1.65; }
  .wn-home-card a { color: #16191b; font-weight: 800; text-decoration: underline; text-decoration-color: var(--c-amber); text-decoration-thickness: 2px; text-underline-offset: 5px; }
  .wn-home-card a::after { content: ""; position: absolute; inset: 0; }   /* the whole card is clickable */
  .wn-arrivals { background: #fff; padding: 68px clamp(24px, 5vw, 92px) 76px; }
  .wn-arrivals-heading { margin-bottom: 30px; display: flex; align-items: end; justify-content: space-between; gap: 24px; }
  .wn-arrivals h2 { font-family: var(--font-display); font-size: clamp(2rem, 3vw, 3rem); letter-spacing: 0.02em; text-transform: uppercase; color: #16191b; margin: 0; }
  .wn-arrivals-heading > a { color: #16191b; font-size: 0.82rem; font-weight: 800; text-decoration-color: #c77d00; text-underline-offset: 5px; }
  .wn-arrivals-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 330px); gap: 30px; align-items: stretch; }
  .wn-arrivals-grid { align-content: start; }
  .wn-arrivals-empty { min-height: 260px; padding: 34px; display: grid; place-content: center; text-align: center; color: #667077; background: #f3f5f6; border: 1px dashed #cbd1d5; }
  .wn-parts-help {
    min-height: 300px;
    padding: 38px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: end;
    color: #f5f5f1;
    background: linear-gradient(145deg, var(--c-navy-2), var(--c-navy-deep));
  }
  .wn-parts-help::before { content: "WN"; position: absolute; top: -30px; right: -8px; color: rgba(255,255,255,0.035); font-family: var(--font-display); font-size: 10rem; line-height: 1; }
  .wn-parts-help h3 { position: relative; margin: 0 0 10px; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1; text-transform: uppercase; }
  .wn-parts-help p { position: relative; margin: 0 0 22px; color: #a7adb0; line-height: 1.55; }
  .wn-parts-help a { position: relative; align-self: flex-start; min-height: 44px; padding: 0 17px; display: inline-flex; align-items: center; color: #111; background: var(--wn-amber); font-size: 0.78rem; font-weight: 800; text-decoration: none; }
  .wn-makes { padding: 70px clamp(24px, 5vw, 92px) 80px; color: #16191b; background: var(--c-sand); }
  .wn-makes-heading { max-width: 760px; margin: 0 auto 34px; text-align: center; }
  .wn-makes-heading h2 { margin: 0; font-family: var(--font-display); font-size: clamp(2.2rem, 3.4vw, 3.4rem); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
  .wn-makes-heading span { display: block; margin-top: 11px; color: #697177; line-height: 1.55; }
  .wn-makes-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .wn-makes-empty { grid-column: 1 / -1; margin: 0; color: #9aa3ad; }
  .wn-make-card {
    --make: #475569;
    width: 100%;
    min-height: 190px;
    padding: 0;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: #fff;
    background:
      radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.16), transparent 55%),
      linear-gradient(155deg, color-mix(in oklab, var(--make) 82%, #07101d) 0%, color-mix(in oklab, var(--make) 34%, #07101d) 58%, #07101d 100%);
    border: 1px solid rgba(255,255,255,0.08);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: transform 200ms ease, box-shadow 200ms ease;
  }
  .wn-make-card::after { content: none; position: absolute; z-index: 3; top: 18px; right: 19px; width: 34px; height: 34px; display: grid; place-items: center; color: #111; background: var(--wn-amber); font-size: 1.1rem; transition: transform 180ms ease, background 180ms ease; }
  .wn-make-card:hover { transform: translateY(-5px); box-shadow: 0 18px 34px color-mix(in oklab, var(--make) 35%, transparent); }
  .wn-make-card:focus-visible { outline: 3px solid var(--wn-amber); outline-offset: 3px; }
  .wn-make-card.is-selected { transform: translateY(-5px) scale(0.985); box-shadow: 0 0 0 3px rgba(245,163,19,0.45), 0 18px 34px rgba(18,21,23,0.16); }
  .wn-make-card.is-selected::after { content: "✓"; transform: none; background: var(--wn-amber-bright); }
  /* the make's name again, big and outlined, like "One place." in the hero */
  .wn-make-mark { position: absolute; z-index: -1; right: -0.08em; bottom: -0.2em; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.22); font-family: var(--font-display); font-size: 6.4rem; line-height: 1; text-transform: uppercase; white-space: nowrap; pointer-events: none; transition: transform 450ms ease; }
  .wn-make-card:hover .wn-make-mark { transform: translateX(-10px); }
  /* brand logo, drawn in white from the SVG shape */
  .wn-make-logo { position: absolute; z-index: -1; top: 24px; left: 22px; width: 92px; height: 56px; background: #fff; opacity: 0.92; -webkit-mask: var(--logo) left top / contain no-repeat; mask: var(--logo) left top / contain no-repeat; transition: transform 300ms ease; }
  .wn-make-card:hover .wn-make-logo { transform: scale(1.06); }
  .wn-make-copy { position: relative; z-index: 2; padding: 22px; display: block; }
  .wn-make-card strong { color: #fff; font-family: var(--font-display); font-size: 1.75rem; font-weight: 400; letter-spacing: 0.035em; text-transform: uppercase; }
  .wn-make-card small { display: block; margin-top: 4px; color: rgba(255,255,255,0.78); font-size: 0.74rem; }
  /* tiles rise in as they scroll into view (browsers without support just show them) */
  @media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
      @keyframes wn-tile-in { from { opacity: 0; translate: 0 28px; } }
      .wn-make-card { animation: wn-tile-in linear backwards; animation-timeline: view(); animation-range: entry 0% entry 90%; }
    }
  }
  @media (max-width: 900px) {
    .wn-hero { min-height: 980px; padding-top: 64px; grid-template-columns: minmax(0, 1fr); align-content: start; }
    .wn-hero-copy { max-width: min(620px, 100%); min-width: 0; }
    .wn-hero h1 { font-size: clamp(4.8rem, 14vw, 7.5rem); }
    .wn-car-stage { width: 100vw; height: 520px; min-height: 0; margin: -20px 0 0 -6vw; }
    .wn-car-intact { width: min(65vw, 560px); }
    .wn-car-exploded { width: min(86vw, 760px); }
    .wn-brand-reveal { right: 24px; bottom: 5.8%; }
    .wn-home-links { grid-template-columns: 1fr; padding: 0; }
    .wn-arrivals-layout { grid-template-columns: 1fr; }
    .wn-parts-help { min-height: 250px; }
    .wn-makes-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) {
    .wn-hero { min-height: 0; padding-top: 54px; padding-bottom: 36px; }
    .wn-hero h1 { font-size: clamp(4.1rem, 20vw, 5.8rem); line-height: 0.79; }
    .wn-hero h1 span { font-size: 0.48em; }
    .wn-hero-intro { margin-top: 22px; font-size: 0.86rem; }
    .wn-hero-actions { margin-top: 25px; }
    .wn-button { min-height: 46px; padding: 0 17px; }
    /* car fits inside the screen: no sideways overflow, nothing cut off */
    .wn-car-stage { width: 100%; height: 300px; margin: -24px 0 0; }
    .wn-car-intact { width: 60%; transform: translate(-50%, -48%); animation-name: wn-car-arrival-sm; }
    .wn-car-exploded { width: 84%; transform: translate(-53%, -47%) scale(0.7); }
    .wn-hero-explode .wn-car-intact, .wn-hero-reveal .wn-car-intact { transform: translate(-50%, -48%) scale(0.78); }
    .wn-hero-explode .wn-car-exploded, .wn-hero-reveal .wn-car-exploded { transform: translate(-53%, -47%) scale(1); }
    @keyframes wn-car-arrival-sm {
      from { opacity: 0; transform: translate(10%, -44%) scale(0.72); }
      to { opacity: 1; transform: translate(-50%, -48%) scale(1); }
    }
    .wn-part-callout, .wn-scan-label { display: none; }
    .wn-brand-reveal, .wn-hero-scroll { display: none; }   /* would sit on top of the car on a phone */
    /* the three benefits become one compact row */
    .wn-hero-proof { margin-top: 28px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .wn-proof-item { padding: 10px; text-align: center; }
    .wn-proof-item span { display: none; }
    /* the three service cards get shorter: icon on the left, text on the right */
    .wn-home-card { min-height: 0; padding: 24px 20px; display: grid; grid-template-columns: 44px 1fr; column-gap: 14px; align-items: start; }
    .wn-home-card h2 { margin: 6px 0 6px; font-size: 1.5rem; }
    .wn-home-card p { margin-bottom: 12px; font-size: 0.92rem; }
    .wn-home-card p, .wn-home-card a { grid-column: 2; justify-self: start; }
    .wn-arrivals { padding: 52px 20px 60px; }
    .wn-arrivals-heading { align-items: flex-start; flex-direction: column; }
    /* latest arrivals become one row you swipe through, instead of a long list */
    .wn-arrivals-grid { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 78%; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 0 -20px; padding: 6px 20px 10px; scroll-padding-inline: 20px; scrollbar-width: none; }
    .wn-arrivals-grid::-webkit-scrollbar { display: none; }
    .wn-arrivals-grid > * { scroll-snap-align: start; }
    .wn-makes { padding: 54px 20px 62px; }
    .wn-makes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    /* smaller tiles on phones so long names don't run into the logo */
    .wn-make-card { min-height: 150px; }
    .wn-make-logo { top: 16px; left: 16px; width: 64px; height: 38px; }
    .wn-make-copy { padding: 16px; }
    .wn-make-card strong { font-size: 1.3rem; line-height: 1.05; }
    .wn-make-mark { font-size: 4.6rem; }
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
      navigate(`/parts?make=${encodeURIComponent(make)}`);   // open the shop filtered to this make
    }, 280);
  }

  return (
    <>
      <style>{styles}</style>
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
