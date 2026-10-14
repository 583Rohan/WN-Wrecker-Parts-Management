import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const carMakes = [
  { name: "MG", short: "MG", image: "/brands/mg.png" },
  { name: "Lexus", short: "LX", image: "/brands/lexus.png" },
  { name: "BMW", short: "BMW", image: "/brands/bmw.png" },
  { name: "Audi", short: "AU", image: "/brands/audi.png" },
  { name: "Mercedes", short: "MB", image: "/brands/mercedes.png" },
  { name: "Dodge", short: "DG", image: "/brands/dodge.png" },
  { name: "Genesis", short: "GN", image: "/brands/genesis.png" },
  { name: "Subaru", short: "SB", image: "/brands/subaru.png" },
  { name: "Honda", short: "HN", image: "/brands/honda.png" },
  { name: "Mazda", short: "MZ", image: "/brands/mazda.png" },
] as const;

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
    background: #f4f2ed;
    font-family: Inter, Arial, sans-serif;
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
      linear-gradient(115deg, #0c1013 0%, #080a0c 55%, #120e08 100%);
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
    max-width: 600px;
    margin: 0;
    font-family: Impact, "Arial Narrow", sans-serif;
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
  .wn-button-ghost { min-height: 42px; padding: 0 2px; border: 0; background: transparent; }
  .wn-button-ghost svg { color: var(--wn-amber-bright); }
  .wn-button-ghost:hover { color: var(--wn-amber-bright); background: transparent; }
  .wn-hero-proof {
    margin-top: 38px;
    padding-top: 20px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
  .wn-proof-item { display: grid; gap: 4px; }
  .wn-proof-item strong { color: #e9ebec; font-size: 0.72rem; }
  .wn-proof-item span { color: #727b80; font-size: 0.66rem; line-height: 1.35; }
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
    font-family: Impact, "Arial Narrow", sans-serif;
    font-size: 1.45rem;
    font-weight: 700;
    transform: skew(-8deg);
  }
  .wn-brand-reveal div { display: grid; gap: 4px; }
  .wn-brand-reveal strong { font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.45rem; letter-spacing: 0.08em; }
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
    gap: 1px;
    padding: 0 clamp(24px, 5vw, 92px);
    background: #d9d7d1;
    color: #16191b;
  }
  .wn-home-card {
    min-height: 218px;
    padding: 36px;
    position: relative;
    background: #f4f2ed;
    transition: transform 220ms ease, background 220ms ease, box-shadow 220ms ease;
  }
  .wn-home-card:hover { z-index: 2; transform: translateY(-6px); background: #fff; box-shadow: 0 18px 35px rgba(17, 20, 22, 0.1); }
  .wn-home-card > span { color: #a76500; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
  .wn-home-card h2 { margin: 22px 0 11px; font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.8rem; letter-spacing: 0.02em; text-transform: uppercase; }
  .wn-home-card p { max-width: 360px; margin: 0 0 20px; color: #5c6266; line-height: 1.65; }
  .wn-home-card a { display: inline-flex; align-items: center; gap: 8px; color: #16191b; font-weight: 800; text-decoration: none; }
  .wn-home-card a::after { content: "→"; color: #a76500; transition: transform 180ms ease; }
  .wn-home-card:hover a::after { transform: translateX(4px); }
  .wn-arrivals { background: #fff; padding: 68px clamp(24px, 5vw, 92px) 76px; }
  .wn-arrivals-heading { margin-bottom: 30px; display: flex; align-items: end; justify-content: space-between; gap: 24px; }
  .wn-arrivals-eyebrow { margin: 0 0 8px; color: #a76500; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.17em; text-transform: uppercase; }
  .wn-arrivals h2 { font-family: Impact, "Arial Narrow", sans-serif; font-size: clamp(2rem, 3vw, 3rem); letter-spacing: 0.02em; text-transform: uppercase; color: #16191b; margin: 0; }
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
    background: linear-gradient(145deg, #12181c, #080b0d);
  }
  .wn-parts-help::before { content: "WN"; position: absolute; top: -30px; right: -8px; color: rgba(255,255,255,0.035); font-family: Impact, sans-serif; font-size: 10rem; line-height: 1; }
  .wn-parts-help > span { position: relative; color: var(--wn-amber-bright); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
  .wn-parts-help h3 { position: relative; margin: 14px 0 10px; font-family: Impact, "Arial Narrow", sans-serif; font-size: 2rem; font-weight: 500; line-height: 1; text-transform: uppercase; }
  .wn-parts-help p { position: relative; margin: 0 0 22px; color: #a7adb0; line-height: 1.55; }
  .wn-parts-help a { position: relative; align-self: flex-start; min-height: 44px; padding: 0 17px; display: inline-flex; align-items: center; color: #111; background: var(--wn-amber); font-size: 0.78rem; font-weight: 800; text-decoration: none; }
  .wn-makes { padding: 70px clamp(24px, 5vw, 92px) 80px; color: #16191b; background: #f4f2ed; }
  .wn-makes-heading { max-width: 760px; margin: 0 auto 34px; text-align: center; }
  .wn-makes-heading p { margin: 0 0 9px; color: #a76500; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.17em; text-transform: uppercase; }
  .wn-makes-heading h2 { margin: 0; font-family: Impact, "Arial Narrow", sans-serif; font-size: clamp(2.2rem, 3.4vw, 3.4rem); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
  .wn-makes-heading span { display: block; margin-top: 11px; color: #697177; line-height: 1.55; }
  .wn-makes-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .wn-make-card {
    width: 100%;
    min-height: 220px;
    padding: 0;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: #fff;
    background: #14191d;
    border: 1px solid #deddd8;
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
  }
  .wn-make-card::before { content: ""; position: absolute; z-index: 1; inset: 0; background: linear-gradient(180deg, rgba(4,7,9,0.02) 20%, rgba(4,7,9,0.9) 100%); transition: background 200ms ease; }
  .wn-make-card::after { content: "→"; position: absolute; z-index: 3; top: 18px; right: 19px; width: 34px; height: 34px; display: grid; place-items: center; color: #111; background: var(--wn-amber); font-size: 1.1rem; transition: transform 180ms ease, background 180ms ease; }
  .wn-make-card:hover { transform: translateY(-5px); border-color: #d39224; box-shadow: 0 16px 30px rgba(18, 21, 23, 0.09); }
  .wn-make-card:hover::before { background: linear-gradient(180deg, rgba(4,7,9,0) 8%, rgba(4,7,9,0.94) 100%); }
  .wn-make-card:hover::after { transform: translateX(4px); }
  .wn-make-card.is-selected { transform: translateY(-5px) scale(0.985); border-color: var(--wn-amber); box-shadow: 0 0 0 3px rgba(242,165,26,0.3), 0 18px 34px rgba(18,21,23,0.16); }
  .wn-make-card.is-selected::after { content: "✓"; transform: none; background: var(--wn-amber-bright); }
  .wn-make-image { position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden; background: #20262a; }
  .wn-make-image > span { color: rgba(255,255,255,0.18); font-family: Impact, "Arial Narrow", sans-serif; font-size: 4rem; letter-spacing: 0.04em; }
  .wn-make-image img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #20262a; transition: transform 450ms ease, filter 300ms ease; }
  .wn-make-card:hover .wn-make-image img { transform: scale(1.06); filter: brightness(0.92); }
  .wn-make-copy { position: relative; z-index: 2; padding: 22px; display: block; }
  .wn-make-card strong { color: #fff; font-family: Impact, "Arial Narrow", sans-serif; font-size: 1.75rem; font-weight: 500; letter-spacing: 0.035em; text-shadow: 0 2px 12px rgba(0,0,0,0.8); text-transform: uppercase; }
  .wn-make-card small { display: block; margin-top: 4px; color: #d5dadd; font-size: 0.7rem; }
  @media (max-width: 900px) {
    .wn-hero { min-height: 980px; padding-top: 64px; grid-template-columns: 1fr; align-content: start; }
    .wn-hero-copy { max-width: 620px; }
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
    .wn-hero-proof { grid-template-columns: 1fr; gap: 12px; }
    .wn-proof-item { grid-template-columns: 120px 1fr; align-items: center; }
    .wn-arrivals { padding: 52px 20px 60px; }
    .wn-arrivals-heading { align-items: flex-start; flex-direction: column; }
    .wn-makes { padding: 54px 20px 62px; }
    .wn-makes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
        <h1 id="wn-hero-title">One car.<span className="wn-hero-accent">Every part.</span><span className="wn-hero-last">One place.</span></h1>
        <p className="wn-hero-intro">Quality recycled parts, professionally dismantled, checked and ready for their next life.</p>
        <div className="wn-hero-actions">
          <Link className="wn-button wn-button-primary" to="/parts"><SearchIcon /> Find a part</Link>
          <Link className="wn-button wn-button-ghost" to="/finder">Find my vehicle <ArrowIcon /></Link>
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
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const makeNavigationTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/parts`)
      .then(response => (response.ok ? response.json() : []))
      .then((data: Part[]) => {
        const availableParts = data.filter(
          part => part.status?.trim().toLowerCase() === 'in stock'
        );
        setParts(availableParts);
      })
      .catch(() => setParts([]));
  }, []);

  useEffect(() => () => {
    if (makeNavigationTimer.current !== null) window.clearTimeout(makeNavigationTimer.current);
  }, []);

  function selectMake(make: string) {
    setSelectedMake(make);
    if (makeNavigationTimer.current !== null) window.clearTimeout(makeNavigationTimer.current);
    makeNavigationTimer.current = window.setTimeout(() => {
      navigate("/finder");
    }, 280);
  }

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
        <section className="wn-arrivals" aria-labelledby="wn-arrivals-title">
          <div className="wn-arrivals-heading">
            <div>
              <p className="wn-arrivals-eyebrow">Freshly dismantled</p>
              <h2 id="wn-arrivals-title">Latest arrivals</h2>
            </div>
            <Link to="/parts">View all available parts</Link>
          </div>
          <div className="wn-arrivals-layout">
            {parts.length > 0 ? (
              <div className="grid wn-arrivals-grid">
                {parts.slice(0, 8).map(p => <PartCard key={p.id} part={p} />)}
              </div>
            ) : (
              <div className="wn-arrivals-empty">New parts will appear here as soon as they are added.</div>
            )}
            <aside className="wn-parts-help">
              <span>Can’t see your part?</span>
              <h3>Let us find it</h3>
              <p>Tell us your vehicle details and the part you need. Our team will check current and upcoming stock.</p>
              <Link to="/contact">Send a parts request</Link>
            </aside>
          </div>
        </section>
        <section className="wn-makes" aria-labelledby="wn-makes-title">
          <div className="wn-makes-heading">
            <p>Browse vehicles</p>
            <h2 id="wn-makes-title">Search by make</h2>
            <span>Select your vehicle manufacturer to browse matching parts in the shop.</span>
          </div>
          <div className="wn-makes-grid">
            {carMakes.map(make => (
              <button
                className={`wn-make-card${selectedMake === make.name ? " is-selected" : ""}`}
                key={make.name}
                type="button"
                onClick={() => selectMake(make.name)}
                aria-label={`Shop ${make.name} parts`}
                aria-pressed={selectedMake === make.name}
              >
                <span className="wn-make-image" aria-hidden="true">
                  <span>{make.short}</span>
                  <img src={make.image} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />
                </span>
                <span className="wn-make-copy"><strong>{make.name}</strong><small>Shop parts</small></span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
