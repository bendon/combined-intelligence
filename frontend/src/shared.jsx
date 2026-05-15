/* Combined Intelligence — design system primitives
   Ported from designs/shared.jsx + designs/landing.jsx into an ES-module React shape.
   Theme: "blueprint paper" (light) for public surfaces; obsidian ink for CMS chrome. */

import { useEffect, useMemo, useState } from "react";

// ─── Design tokens + base CSS ─────────────────────────────────────────────────
const TOKENS = `
  :root {
    /* Blueprint-paper palette */
    --bg:        #F4F1EA;
    --paper:     #FFFFFF;
    --ink:       #0A0A0A;
    --ink-2:     #1F1F1F;
    --muted:     #6B6B66;
    --line:      #D9D4C7;
    --line-soft: #E8E3D6;
    --grid:      rgba(10,10,10,.04);

    /* Signal palette */
    --orange:    #FF5C1A;
    --blue:      #00B4E0;
    --purple:    #7C3AED;
    --green:     #0ACF83;
    --red:       #E5484D;
    --amber:     #F59E0B;

    /* Compatibility aliases (used by some legacy sub-pages) */
    --carbon:    var(--paper);
    --surface:   var(--paper);
    --border:    var(--line);
    --text:      var(--ink);
    --accent:    var(--orange);
    --obsidian:  var(--ink);

    /* Fonts */
    --font-sans:  'Inter', 'Söhne', -apple-system, system-ui, sans-serif;
    --font-serif: 'DM Serif Display', 'GT Sectra', 'Tiempos Headline', 'Cormorant Garamond', Georgia, serif;
    --font-mono:  'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  /* Reserve scrollbar space on the root so page transitions (short → tall content) don't shift horizontally. */
  html { scrollbar-gutter: stable; }
  html { font-size: 16px; }
  body {
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; cursor: default; border: 0; background: none; color: inherit; padding: 0; }
  button:not(:disabled) { cursor: pointer; }
  input, textarea, select { font: inherit; color: inherit; }
  textarea { font-family: var(--font-mono); }
  ::selection { background: var(--ink); color: #FFB99F; }

  /* Type helpers */
  .serif { font-family: var(--font-serif); font-weight: 400; }
  .mono  { font-family: var(--font-mono); }
  .tnum  { font-variant-numeric: tabular-nums; }
  .lbl   { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em;
           text-transform: uppercase; color: var(--muted); font-weight: 700; }
  .lbl-ink { color: var(--ink); }

  /* Scrollbars */
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: var(--line); }
  *::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  /* Surface card */
  .surface { background: var(--paper); border: 1px solid var(--line); }

  /* Blueprint grid bg */
  .grid-bg {
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* Animations */
  @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  .pulse { animation: pulse-dot 1.4s ease-in-out infinite; }
  @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .ticker-track { display: flex; gap: 48px; animation: ticker 60s linear infinite; white-space: nowrap; }
  @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .grow { animation: grow .6s cubic-bezier(.2,.8,.2,1) forwards; transform-origin: left; }

  /* Registration corners */
  .reg { position: relative; }
  .reg > .reg-tl, .reg > .reg-tr, .reg > .reg-bl, .reg > .reg-br {
    content: ''; position: absolute; width: 10px; height: 10px;
  }
  .reg > .reg-tl { top: -1px; left: -1px;  border-top: 1.5px solid var(--ink); border-left: 1.5px solid var(--ink); }
  .reg > .reg-tr { top: -1px; right: -1px; border-top: 1.5px solid var(--ink); border-right: 1.5px solid var(--ink); }
  .reg > .reg-bl { bottom: -1px; left: -1px;  border-bottom: 1.5px solid var(--ink); border-left: 1.5px solid var(--ink); }
  .reg > .reg-br { bottom: -1px; right: -1px; border-bottom: 1.5px solid var(--ink); border-right: 1.5px solid var(--ink); }

  /* ── Layout shells ──
     Flex column ensures footer pushes to the bottom on short pages and that
     there's always meaningful spacing between the global header and footer. */
  .ci-root { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; background: var(--bg); }
  .ci-root > main { flex: 1 0 auto; display: flex; flex-direction: column; }
  .ci-root > main > * { width: 100%; }
  .ci-root > .site-footer { flex-shrink: 0; }
  /* Default min content height so the footer never hugs the header */
  .ci-main-spaced { min-height: 60vh; }

  /* ── Public topnav ── */
  /* Single sticky shell so the Bloomberg substrip stays pinned with the main nav */
  .public-header-sticky {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--paper);
    box-shadow: 0 1px 0 rgba(0, 0, 0, .06), 0 4px 20px rgba(0, 0, 0, .04);
  }
  .public-nav-wrap { background: var(--paper); border-bottom: 1px solid var(--line); }
  .public-nav-inner { max-width: 1320px; margin: 0 auto; padding: 14px 32px; display: flex; align-items: center; gap: 24px; }
  .public-nav-brand { display: flex; align-items: center; gap: 14px; text-decoration: none; }
  .public-nav-wordmark { font-family: var(--font-serif); font-size: 22px; letter-spacing: -.005em; text-transform: uppercase; line-height: 1; color: var(--ink); }
  .public-nav-tagline  { font-family: var(--font-mono); font-size: 9px; letter-spacing: .3em; color: var(--purple); margin-top: 4px; font-weight: 700; text-transform: uppercase; }
  .public-nav-links { display: flex; gap: 36px; }
  .public-nav-link  { font-family: var(--font-mono); font-size: 11px; letter-spacing: .22em; color: var(--muted); font-weight: 700; padding: 6px 0; border-bottom: 2px solid transparent; transition: color .12s, border-color .12s; }
  .public-nav-link:hover, .public-nav-link.active { color: var(--ink); border-bottom-color: var(--orange); }
  .public-nav-cta {
    padding: 10px 18px; background: var(--ink); color: #fff;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; font-weight: 800;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .public-nav-cta.ghost { background: transparent; color: var(--ink); border: 1px solid var(--ink); }

  /* Substrip — Bloomberg-style status row */
  .substrip {
    background: var(--ink); color: #999; padding: 8px 32px;
    display: flex; gap: 28px; justify-content: center;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .22em; font-weight: 700;
  }
  .substrip > span { flex-shrink: 0; }

  /* Mobile drawer */
  .mobile-menu-btn {
    display: none; align-items: center; justify-content: center;
    width: 40px; height: 40px; padding: 0;
    border: 1px solid var(--line); background: var(--paper);
    position: relative; flex-shrink: 0;
  }
  .mobile-menu-btn span { display: block; width: 18px; height: 1.5px; background: var(--ink); position: relative; }
  .mobile-menu-btn span::before,
  .mobile-menu-btn span::after { content: ''; position: absolute; left: 0; width: 18px; height: 1.5px; background: var(--ink); }
  .mobile-menu-btn span::before { top: -6px; }
  .mobile-menu-btn span::after  { top:  6px; }
  .drawer-scrim { display: none; position: fixed; inset: 0; background: rgba(10,10,10,.5); z-index: 80; }
  .drawer-scrim.open { display: block; }
  .mobile-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: 80%; max-width: 320px;
    background: var(--ink); color: #fff; z-index: 90; padding: 24px 24px 40px;
    display: flex; flex-direction: column; gap: 4px; transform: translateX(100%);
    transition: transform .25s ease;
  }
  .mobile-drawer.open { transform: translateX(0); }
  .mobile-drawer a {
    display: block; padding: 12px 4px; font-family: var(--font-mono);
    font-size: 12px; letter-spacing: .22em; color: #ddd; font-weight: 700;
    border-bottom: 1px solid #1f1f1f;
  }

  /* ── Section header (used on landing + section pages) ── */
  .sh-rule { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .sh-num  { font-family: var(--font-mono); font-size: 11px; letter-spacing: .22em; color: var(--muted); font-weight: 800; }
  .sh-line { flex: 1; height: 1px; background: var(--line); }
  .sh-tag  { font-family: var(--font-mono); font-size: 11px; letter-spacing: .24em; color: var(--purple); font-weight: 800; }
  .sh-titles { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
  .sh-title { font-family: var(--font-serif); font-size: clamp(36px, 5vw, 64px); line-height: .95; margin: 0; letter-spacing: -.025em; max-width: 760px; }
  .sh-lede  { font-family: var(--font-serif); font-size: 17px; line-height: 1.45; color: var(--muted); margin: 0; max-width: 320px; font-style: italic; }

  /* ── Buttons (compat with old class names) ── */
  .btn-primary, .btn-secondary, .btn-ghost, .btn-tier, .btn-danger {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 11px; letter-spacing: .2em; font-weight: 800;
    padding: 12px 18px; border: 1px solid transparent; transition: opacity .15s, border-color .15s, background .15s, color .15s;
    text-transform: uppercase;
  }
  .btn-primary { background: var(--ink); color: #fff; }
  .btn-primary:hover { opacity: .9; }
  .btn-secondary { background: transparent; color: var(--ink); border-color: var(--ink); }
  .btn-secondary:hover { background: var(--ink); color: #fff; }
  .btn-ghost { padding: 8px 12px; color: var(--muted); font-size: 10px; }
  .btn-ghost:hover { color: var(--ink); }
  .btn-danger { color: var(--red); border-color: var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-tier { background: var(--paper); color: var(--ink); border-color: var(--line); width: 100%; justify-content: center; }
  .btn-tier:hover { border-color: var(--ink); }
  .btn-sm { padding: 8px 12px; font-size: 10px; }
  .btn-xs { padding: 5px 10px; font-size: 9px; }
  .btn-full { width: 100%; justify-content: center; }
  button:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Form fields ── */
  .field-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; font-weight: 700; }
  .field-input, .field-select, .field-textarea {
    width: 100%; background: var(--paper); border: 1px solid var(--line);
    padding: 10px 12px; color: var(--ink); font-family: var(--font-sans); font-size: 14px;
    transition: border-color .12s; outline: none;
  }
  .field-input:focus, .field-select:focus, .field-textarea:focus { border-color: var(--ink); }
  .field-textarea { resize: vertical; font-family: var(--font-mono); font-size: 13px; line-height: 1.55; }
  .field-select { appearance: none; padding-right: 32px; background-image:
    linear-gradient(45deg, transparent 50%, var(--muted) 50%),
    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
    background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
    background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
  }

  /* ── Tables ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table th {
    text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; color: var(--muted);
    text-transform: uppercase; font-weight: 700; background: var(--bg);
  }
  .data-table td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
  .data-table tr:hover td { background: var(--bg); }
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--line); }
  .table-scroll .data-table { min-width: 600px; }

  /* ── Status / tier visuals (compat with old class names) ── */
  .pill { display: inline-block; font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em;
          font-weight: 700; padding: 4px 8px; border: 1px solid var(--muted); color: var(--muted); text-transform: uppercase; }
  .tier-badge { display: inline-flex; align-items: center; gap: 6px;
                font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; font-weight: 700;
                padding: 3px 7px; border: 1px solid; background: rgba(255,255,255,.5); text-transform: uppercase; }
  .tier-badge.free    { color: var(--muted);  border-color: var(--muted); }
  .tier-badge.members { color: var(--blue);   border-color: var(--blue); }
  .tier-badge.paid    { color: var(--purple); border-color: var(--purple); }

  /* ── Landing page shell ── */
  .landing-page  { width: 100%; }
  .landing-shell { max-width: 1320px; margin: 0 auto; padding: 0 32px; }
  @media (max-width: 900px) { .landing-shell { padding: 0 20px; } }
  @media (max-width: 600px) { .landing-shell { padding: 0 14px; } }

  /* ── Landing hero — editorial index + featured dossier ── */
  .hero-section {
    padding: clamp(56px, 8vw, 88px) 0 clamp(64px, 9vw, 96px);
    border-bottom: 1px solid var(--line);
    position: relative;
  }
  .hero-section::before {
    content: '';
    position: absolute; inset: 0 0 auto 0; height: min(42vh, 420px);
    pointer-events: none;
    opacity: 0.45;
    background:
      linear-gradient(105deg, rgba(124,58,237,.06) 0%, transparent 42%),
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: auto, 28px 28px, 28px 28px;
  }
  .hero-inner { position: relative; z-index: 1; }
  .hero-kicker {
    display: flex; align-items: center; justify-content: center; gap: clamp(12px, 2vw, 20px);
    margin-bottom: clamp(24px, 3.5vw, 36px);
  }
  .hero-kicker-line { flex: 1; max-width: 120px; height: 1px; background: var(--line); }
  .hero-kicker-text {
    font-family: var(--font-mono); font-size: 10px; letter-spacing: .26em;
    font-weight: 800; color: var(--purple); text-transform: uppercase; white-space: nowrap;
  }
  .hero-title {
    font-family: var(--font-serif); font-weight: 400;
    font-size: clamp(44px, 5.6vw, 104px);
    line-height: 0.92; letter-spacing: -0.032em; margin: 0;
    font-feature-settings: "kern" 1, "liga" 1;
    text-wrap: balance;
  }
  .hero-title em {
    font-style: italic; color: var(--purple);
    font-feature-settings: "kern" 1, "liga" 1;
  }
  .hero-mast {
    display: grid;
    grid-template-columns: 1.12fr 1fr;
    grid-template-rows: auto auto;
    column-gap: clamp(32px, 4.5vw, 72px);
    row-gap: clamp(20px, 2.5vw, 36px);
    align-items: start;
    margin-top: clamp(28px, 4vw, 48px);
  }
  .hero-mast .hero-title { grid-column: 1; grid-row: 1; margin: 0; align-self: start; }
  .hero-copy-col { grid-column: 1; grid-row: 2; min-width: 0; }
  .hero-mast .hero-featured {
    grid-column: 2;
    grid-row: 1 / -1;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
  }
  .hero-mast .hero-featured-card {
    flex: 1;
    min-height: 280px;
    height: 100%;
    display: flex;
  }
  .hero-pull {
    font-family: var(--font-serif); font-style: italic; font-weight: 400;
    font-size: clamp(22px, 2.15vw, 28px); line-height: 1.38; letter-spacing: -0.014em;
    color: var(--ink); margin: 0 0 1.25rem; max-width: 38rem;
  }
  .hero-body {
    font-family: var(--font-sans); font-size: 17px; line-height: 1.65;
    letter-spacing: -0.012em; color: var(--ink-2); margin: 0 0 1.15rem; max-width: 38rem;
  }
  .hero-body strong { color: var(--ink); font-weight: 600; }
  .hero-cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 1.75rem; }
  .hero-btn-primary, .hero-btn-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: .2em; font-weight: 800;
    padding: 14px 22px; text-transform: uppercase; border: 1px solid transparent;
    transition: transform .15s ease, border-color .15s, background .15s, color .15s;
    text-decoration: none;
  }
  .hero-btn-primary { background: var(--ink); color: #fff; }
  .hero-btn-primary:hover { transform: translateY(-1px); }
  .hero-btn-secondary {
    background: transparent; color: var(--ink); border-color: var(--ink);
  }
  .hero-btn-secondary:hover { background: var(--ink); color: #fff; }

  .hero-featured { display: block; width: 100%; text-align: left; }
  .hero-featured-card {
    position: relative; display: flex; overflow: hidden;
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow:
      0 1px 0 rgba(10,10,10,.04),
      0 22px 50px -18px rgba(10,10,10,.12);
    transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  }
  .hero-featured-card:hover {
    border-color: rgba(10,10,10,.35);
    box-shadow:
      0 1px 0 rgba(10,10,10,.06),
      0 28px 64px -20px rgba(10,10,10,.16);
    transform: translateY(-3px);
  }
  .hero-featured-rail {
    width: 30px; flex-shrink: 0;
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, var(--bg) 0%, var(--paper) 55%, var(--bg) 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 16px 0;
  }
  .hero-featured-rail span {
    writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg);
    font-family: var(--font-mono); font-size: 7px; letter-spacing: .32em;
    font-weight: 800; text-transform: uppercase; color: var(--muted); white-space: nowrap;
  }
  .hero-featured-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .hero-featured-top {
    display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px 16px;
    padding: 12px 18px 12px 16px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(90deg, rgba(255,92,26,.06), transparent 38%);
  }
  .hero-featured-bise {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .hero-featured-bise-i {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em;
    font-weight: 700; color: var(--muted); text-transform: uppercase;
  }
  .hero-featured-bise-i i {
    width: 7px; height: 7px; border-radius: 1px; font-style: normal; flex-shrink: 0;
  }
  .hero-featured-flag {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .2em;
    font-weight: 800; color: var(--orange);
  }
  .hero-featured-meta {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .16em;
    font-weight: 700; color: var(--muted); text-align: right; white-space: nowrap;
  }
  .hero-featured-body {
    padding: 28px 22px 22px 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .hero-featured-eyebrow {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .22em;
    font-weight: 700; color: var(--muted); text-transform: uppercase; margin-bottom: 12px;
  }
  .hero-featured-title {
    font-family: var(--font-serif); font-weight: 400;
    font-size: clamp(28px, 2.6vw, 40px); line-height: 1.05; letter-spacing: -0.024em;
    margin: 0 0 10px; color: var(--ink);
  }
  .hero-featured-sub {
    font-family: var(--font-serif); font-style: italic; font-size: clamp(15px, 1.35vw, 18px);
    line-height: 1.4; color: var(--muted); margin: 0 0 16px; letter-spacing: -0.01em;
  }
  .hero-featured-hook {
    font-family: var(--font-sans); font-size: 13px; line-height: 1.55;
    letter-spacing: -0.01em; color: var(--ink-2); margin: 0 0 20px;
    padding-left: 14px; border-left: 2px solid var(--purple);
    display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .hero-featured-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
    border: 1px solid var(--line); background: var(--bg);
    margin-top: auto;
  }
  .hero-featured-stat {
    padding: 16px 14px; text-align: center;
    border-right: 1px solid var(--line);
  }
  .hero-featured-stat:last-child { border-right: 0; }
  .hero-featured-stat-val {
    font-family: var(--font-serif); font-variant-numeric: tabular-nums;
    font-size: clamp(22px, 2vw, 28px); line-height: 1; letter-spacing: -0.02em;
    margin-bottom: 6px; color: var(--ink);
  }
  .hero-featured-stat-lbl {
    font-family: var(--font-mono); font-size: 8px; letter-spacing: .18em;
    font-weight: 700; color: var(--muted); text-transform: uppercase;
  }
  .hero-featured-foot {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px 12px 16px; margin-top: auto;
    border-top: 1px solid var(--line);
    background: var(--ink); color: #fff;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .2em; font-weight: 800;
  }
  @media (max-width: 1024px) {
    .hero-title { font-size: clamp(36px, 6.5vw, 88px); }
  }
  @media (max-width: 900px) {
    .hero-mast {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      row-gap: clamp(24px, 4vw, 40px);
    }
    .hero-mast .hero-title { grid-column: 1; grid-row: 1; }
    .hero-mast .hero-featured {
      grid-column: 1;
      grid-row: 2;
      align-self: stretch;
    }
    .hero-copy-col { grid-column: 1; grid-row: 3; }
    .hero-featured-top { grid-template-columns: 1fr; text-align: left; }
    .hero-featured-meta { text-align: left; white-space: normal; }
  }
  @media (max-width: 600px) {
    .hero-title { font-size: clamp(32px, 9vw, 48px); }
    .hero-section { padding: 44px 0 52px; }
    .hero-kicker-line { max-width: 48px; }
    .hero-cta-row { flex-direction: column; }
    .hero-btn-primary, .hero-btn-secondary { width: 100%; justify-content: center; text-align: center; }
    .hero-featured-rail { display: none; }
    .hero-featured-stats { grid-template-columns: 1fr; }
    .hero-featured-stat { border-right: 0; border-bottom: 1px solid var(--line); }
    .hero-featured-stat:last-child { border-bottom: 0; }
  }

  /* ── Article toolbar (sticky strip under the global header, used by Reader) ── */
  .article-toolbar {
    background: var(--paper); border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 40;
  }
  .article-toolbar-inner {
    max-width: 1280px; margin: 0 auto; padding: 10px 32px;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
  .article-toolbar-strip {
    background: var(--ink); color: #999;
    padding: 6px 32px; display: flex; gap: 22px;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; font-weight: 700;
    overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap;
  }
  .article-toolbar-strip > span { flex-shrink: 0; }
  .tier-toggle { display: inline-flex; border: 1px solid var(--line); }
  .tier-toggle > button {
    padding: 6px 12px; font-family: var(--font-mono); font-size: 9px;
    letter-spacing: .18em; font-weight: 700; color: var(--muted);
    background: transparent; border-right: 1px solid var(--line); text-transform: uppercase;
  }
  .tier-toggle > button:last-child { border-right: 0; }
  .tier-toggle > button.active { background: var(--ink); color: #fff; }
  @media (max-width: 900px) {
    .article-toolbar-inner  { padding: 10px 20px; gap: 10px; }
    .article-toolbar-strip  { padding: 6px 20px; gap: 16px; }
  }
  @media (max-width: 600px) {
    .article-toolbar-inner  { padding: 8px 14px; }
    .article-toolbar-strip  { padding: 6px 14px; gap: 12px; font-size: 8px; }
  }

  /* ── Section page header ── */
  .section-page  { max-width: 1320px; margin: 0 auto; padding: 48px 32px 80px; }
  .section-page-header { margin-bottom: 36px; }
  .section-page-title  { font-family: var(--font-serif); font-size: clamp(32px, 4.5vw, 56px); line-height: 1.05; letter-spacing: -.02em; margin: 0 0 12px; }
  .section-page-sub    { font-size: 16px; color: var(--muted); max-width: 640px; line-height: 1.6; margin: 0; }

  /* Prose-heavy pages — aligned to the same 1320px / 32px container as the header,
     content is left-aligned with a 960px reading column so it lives inside the
     same horizontal band as the logo and the nav links. */
  .prose-header {
    background: var(--paper); border-bottom: 1px solid var(--line);
    padding: 56px 0 40px;
  }
  .prose-header-inner {
    max-width: 1320px; margin: 0 auto; padding: 0 32px;
  }
  .prose-title  { font-family: var(--font-serif); font-size: clamp(36px, 5vw, 64px); margin: 0; letter-spacing: -.02em; }
  .prose-subtitle { color: var(--muted); font-size: 18px; margin-top: 12px; font-style: italic; max-width: 720px; }
  .prose-body {
    max-width: 1320px; margin: 0 auto;
    padding: 56px 32px 80px;
    font-size: 17px; line-height: 1.75; color: var(--ink-2);
  }
  .prose-body > * { max-width: 960px; }
  .prose-body h2 { font-family: var(--font-serif); font-size: 28px; color: var(--ink); margin: 48px 0 12px; font-weight: 400; }
  .prose-body h3 { font-family: var(--font-mono); font-size: 11px; letter-spacing: .22em; color: var(--purple); margin: 32px 0 12px; text-transform: uppercase; font-weight: 800; }
  .prose-body p  { margin: 0 0 16px; }
  .prose-body ul, .prose-body ol { padding-left: 24px; margin: 0 0 20px; }
  .prose-body li { margin-bottom: 8px; }
  .prose-body strong { color: var(--ink); }
  .prose-body a { color: var(--purple); text-decoration: underline; text-underline-offset: 3px; }
  .prose-body blockquote { border-left: 3px solid var(--purple); padding-left: 20px; margin: 24px 0; font-style: italic; color: var(--muted); }

  @media (max-width: 1024px) {
    .prose-header-inner { padding: 0 24px; }
    .prose-body { padding: 48px 24px 64px; }
  }
  @media (max-width: 900px) {
    .prose-header { padding: 40px 0 28px; }
    .prose-header-inner { padding: 0 20px; }
    .prose-body { padding: 40px 20px 56px; }
  }
  @media (max-width: 600px) {
    .prose-header { padding: 28px 0 20px; }
    .prose-header-inner { padding: 0 14px; }
    .prose-body { padding: 32px 14px 48px; font-size: 16px; }
  }

  /* ── CMS workbench (dark sidebar) ── */
  .cms-root { display: flex; min-height: 100vh; background: var(--bg); }
  .cms-sidebar { width: 220px; background: var(--ink); color: #fff;
                 display: flex; flex-direction: column; flex-shrink: 0;
                 border-right: 1px solid #1f1f1f; position: sticky; top: 0; height: 100vh; }
  .cms-sidebar-brand { padding: 20px 18px; border-bottom: 1px solid #1f1f1f; display: flex; align-items: center; gap: 10px; }
  .cms-sidebar-name { font-family: var(--font-serif); font-size: 13px; letter-spacing: -.005em; text-transform: uppercase; line-height: 1; color: #fff; }
  .cms-sidebar-tagline { font-family: var(--font-mono); font-size: 8px; letter-spacing: .22em; color: var(--purple); margin-top: 4px; font-weight: 700; text-transform: uppercase; }
  .cms-sidebar-nav { padding: 14px 12px; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .cms-sidebar-header { font-family: var(--font-mono); font-size: 8px; letter-spacing: .22em; color: #666;
                        padding: 8px 8px 6px; font-weight: 700; text-transform: uppercase; }
  .cms-sidebar-link {
    display: flex; align-items: center; gap: 10px; padding: 9px 10px; text-align: left;
    background: transparent; color: #bbb; border-left: 2px solid transparent;
    font-size: 12px; font-weight: 500; text-decoration: none;
  }
  .cms-sidebar-link:hover { color: #fff; }
  .cms-sidebar-link.active { background: rgba(124,58,237,.18); color: #fff; border-left-color: var(--purple); font-weight: 600; }
  .cms-sidebar-footer { padding: 14px; border-top: 1px solid #1f1f1f; display: flex; align-items: center; gap: 10px; }
  .cms-sidebar-avatar { width: 28px; height: 28px; background: var(--orange); color: var(--ink);
                        display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; }
  .cms-sidebar-user { flex: 1; min-width: 0; }
  .cms-sidebar-user-name { font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff; }
  .cms-sidebar-user-role { font-family: var(--font-mono); font-size: 8px; letter-spacing: .18em; color: var(--orange); margin-top: 2px; font-weight: 700; }
  .cms-main { flex: 1; overflow-y: auto; }

  /* CMS page header (Bloomberg) */
  .ph { border-bottom: 1px solid var(--line); padding: 16px 28px; background: var(--paper);
        display: flex; align-items: center; gap: 24px; }
  .ph-crumb { font-family: var(--font-mono); font-size: 9px; letter-spacing: .22em; color: var(--muted);
              font-weight: 700; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ph-crumb-sep { color: var(--line); }
  .ph-title { font-family: var(--font-serif); margin: 0; font-size: clamp(22px, 3vw, 30px); line-height: 1.1; letter-spacing: -.012em; font-weight: 400; }
  .ph-sub   { margin-top: 6px; font-size: 13px; color: var(--muted); }
  .ph-code  { color: var(--purple); margin-left: auto; }
  .cms-page { padding: 32px 28px; }

  /* ── Status dot ── */
  .sd { width: 8px; height: 8px; display: inline-block; }
  .sd.running, .sd.processing, .sd.pending { background: var(--blue); animation: pulse-dot 1.4s ease-in-out infinite; }
  .sd.published, .sd.live, .sd.complete, .sd.completed { background: var(--green); }
  .sd.draft  { background: var(--amber); }
  .sd.queued, .sd.retired { background: var(--muted); }
  .sd.failed, .sd.error   { background: var(--red); }
  .sd.resolved, .sd.sealed { background: var(--purple); }

  /* ── Footer ── */
  .site-footer { background: var(--paper); border-top: 1px solid var(--line); padding: 48px 32px 24px; }
  .site-footer-inner { max-width: 1320px; margin: 0 auto;
                       display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 48px;
                       padding-bottom: 36px; border-bottom: 1px solid var(--line); }
  .footer-brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .footer-brand     { font-family: var(--font-serif); font-size: 14px; text-transform: uppercase; line-height: 1; }
  .footer-tagline-x { font-family: var(--font-mono); font-size: 8px; letter-spacing: .22em; color: var(--purple); margin-top: 3px; font-weight: 700; }
  .footer-blurb     { font-size: 12px; color: var(--muted); line-height: 1.6; margin: 0; max-width: 320px; }
  .footer-col-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 14px; }
  .footer-link      { display: block; font-size: 12px; color: var(--muted); padding: 5px 0; transition: color .12s; }
  .footer-link:hover { color: var(--ink); }
  .footer-bottom    { max-width: 1320px; margin: 0 auto; padding-top: 20px;
                      display: flex; align-items: center; gap: 24px;
                      font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; color: var(--muted); font-weight: 700; }
  .footer-seal      { color: var(--purple); margin-left: auto; }

  /* ── Responsive ──
     Breakpoints:
       desktop ≥ 1024px (default rules above)
       small-desktop / large tablet: 900 – 1024
       tablet portrait / large phone: 600 – 900
       phone: ≤ 600
  */

  /* SMALL DESKTOP / LARGE TABLET (≤ 1024px) */
  @media (max-width: 1024px) {
    .public-nav-inner { padding: 12px 24px; gap: 18px; }
    .site-footer-inner { grid-template-columns: 1.4fr repeat(4, 1fr); gap: 28px; }
    .section-page { padding: 40px 24px 64px; }
  }

  /* TABLET (≤ 900px) — hamburger appears, footer becomes 2 columns */
  @media (max-width: 900px) {
    .public-nav-links  { display: none; }
    .public-nav-cta.desktop-only { display: none; }
    .mobile-menu-btn   { display: inline-flex; margin-left: auto; }

    .site-footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; padding-bottom: 28px; }
    .section-page { padding: 32px 20px 56px; }
    .ph { padding: 14px 20px; gap: 16px; flex-wrap: wrap; }
    .cms-page { padding: 24px 20px; }
    .cms-root { flex-direction: column; }
    .cms-sidebar { width: 100%; height: auto; position: relative;
                   flex-direction: row; flex-wrap: nowrap; overflow-x: auto; }
    .cms-sidebar-brand { border-bottom: 0; border-right: 1px solid #1f1f1f; flex-shrink: 0; }
    .cms-sidebar-nav { flex-direction: row; padding: 0; }
    .cms-sidebar-header { display: none; }
    .cms-sidebar-link { white-space: nowrap; border-left: 0; border-bottom: 2px solid transparent; }
    .cms-sidebar-link.active { border-left: 0; border-bottom-color: var(--purple); }
    .cms-sidebar-footer { display: none; }
  }

  /* PHONE (≤ 600px) — single-column everywhere */
  @media (max-width: 600px) {
    .public-nav-inner { padding: 10px 14px; gap: 10px; }
    .public-nav-wordmark { font-size: 16px; }
    .public-nav-tagline { display: none; }
    .substrip { font-size: 8px; gap: 16px; padding: 6px 12px; flex-wrap: nowrap;
                overflow-x: auto; -webkit-overflow-scrolling: touch; justify-content: flex-start; }
    .substrip > span { white-space: nowrap; }

    .site-footer { padding: 32px 16px 16px; }
    .site-footer-inner { grid-template-columns: 1fr; gap: 28px; padding-bottom: 20px; }
    .footer-bottom { flex-direction: column; align-items: flex-start; gap: 8px; padding-top: 16px; padding-left: 16px; padding-right: 16px; }
    .footer-seal { margin-left: 0; }

    .section-page { padding: 24px 14px 48px; }
    .section-page-title { font-size: clamp(28px, 8vw, 40px); }
    .sh-titles { flex-direction: column; align-items: flex-start; gap: 16px; }
    .sh-lede { max-width: 100%; }

    .ph { padding: 12px 14px; gap: 12px; }
    .ph-code { width: 100%; margin-left: 0; }

    .filter-bar { gap: 8px; }
    .library-row { flex-direction: column; gap: 12px; padding: 16px; }
    .library-row-right { justify-content: flex-start; }
  }

  /* ════════════════════════════════════════════════════════════════════════
     Legacy class compatibility — used by sub-pages (synthesis, ledger,
     cms editor, etc.) that haven't been individually rebuilt yet.
     All adapted to the blueprint-paper theme.
     ════════════════════════════════════════════════════════════════════════ */

  /* Empty state */
  .empty-state { color: var(--muted); font-size: 14px; padding: 40px 0; font-style: italic; }

  /* Latest reports / hero card grid */
  .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px,100%), 1fr)); gap: 0; border: 1px solid var(--line); }
  .report-card {
    background: var(--paper); padding: 24px; display: flex; flex-direction: column; gap: 10px;
    text-decoration: none; color: inherit; transition: background .15s;
    border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); min-height: 240px;
  }
  .report-card:hover { background: var(--bg); }
  .rc-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
  .rc-title { font-family: var(--font-serif); font-size: 22px; line-height: 1.15; letter-spacing: -.01em; margin: 0; }
  .rc-sub { font-family: var(--font-serif); font-style: italic; color: var(--muted); font-size: 14px; line-height: 1.4; margin: 0; }
  .rc-footer { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; color: var(--muted); margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line-soft); text-transform: uppercase; }

  /* Library list rows */
  .library-list { display: flex; flex-direction: column; border: 1px solid var(--line); background: var(--paper); }
  .library-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px; padding: 18px 20px; border-bottom: 1px solid var(--line-soft);
    text-decoration: none; color: inherit; transition: background .12s;
  }
  .library-row:last-child { border-bottom: 0; }
  .library-row:hover { background: var(--bg); }
  .library-row-left { flex: 1; min-width: 0; }
  .library-row-title { font-family: var(--font-serif); font-size: 18px; line-height: 1.25; margin-bottom: 4px; }
  .library-row-sub { font-family: var(--font-serif); font-style: italic; font-size: 14px; color: var(--muted); line-height: 1.4; margin-bottom: 6px; }
  .library-row-meta { display: flex; gap: 8px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; color: var(--muted); text-transform: uppercase; }
  .library-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .library-row-date, .library-row-read { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; color: var(--muted); white-space: nowrap; text-transform: uppercase; }

  /* Filter bar */
  .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; align-items: center; }
  .filter-input {
    flex: 1; min-width: 220px; background: var(--paper);
    border: 1px solid var(--line); padding: 10px 14px;
    color: var(--ink); font-family: var(--font-sans); font-size: 14px; outline: none;
  }
  .filter-input:focus { border-color: var(--ink); }
  .filter-input::placeholder { color: var(--muted); }
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-pill {
    padding: 6px 14px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .16em;
    font-weight: 700; text-transform: uppercase;
    border: 1px solid var(--line); color: var(--muted); background: var(--paper);
    transition: border-color .12s, color .12s, background .12s;
  }
  .filter-pill:hover { color: var(--ink); border-color: var(--ink); }
  .filter-pill.active { background: var(--ink); border-color: var(--ink); color: #fff; }

  /* Predictions / ledger table */
  .pred-table { width: 100%; border-collapse: collapse; font-size: 14px; background: var(--paper); }
  .pred-table th {
    text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; color: var(--muted);
    text-transform: uppercase; font-weight: 700; background: var(--bg);
  }
  .pred-table td { padding: 14px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  .pred-table tr:hover td { background: var(--bg); }
  .pred-statement { font-size: 13px; line-height: 1.5; color: var(--ink); }
  .pred-report-link { font-family: var(--font-mono); font-size: 10px; color: var(--purple); letter-spacing: .12em; text-transform: uppercase; }
  .pred-report-link:hover { text-decoration: underline; }
  .pred-target { font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: .04em; }
  .pred-conf { font-family: var(--font-mono); font-size: 12px; color: var(--ink); }
  .outcome-badge {
    display: inline-block; padding: 4px 10px; font-family: var(--font-mono);
    font-size: 9px; letter-spacing: .18em; font-weight: 800; text-transform: uppercase; color: #fff;
  }
  .outcome-badge.true    { background: var(--green); }
  .outcome-badge.false   { background: var(--red); }
  .outcome-badge.partial { background: var(--amber); }
  .outcome-badge.pending { background: var(--muted); }

  /* KPI grid (outcomes) */
  .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .kpi-card { background: var(--paper); border: 1px solid var(--line); padding: 20px 18px; border-top: 3px solid var(--purple); }
  .kpi-value { font-family: var(--font-serif); font-size: 32px; line-height: 1; letter-spacing: -.02em; color: var(--ink); margin-bottom: 6px; }
  .kpi-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; font-weight: 700; }

  /* Calibration plot */
  .cal-chart-wrap { background: var(--paper); border: 1px solid var(--line); padding: 24px; margin-bottom: 32px; }
  .cal-chart-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; margin-bottom: 16px; font-weight: 700; }
  .cal-bucket-row { display: grid; grid-template-columns: 80px 1fr 60px; gap: 12px; align-items: center; margin-bottom: 12px; }
  .cal-bucket-label { font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: .04em; }
  .cal-bucket-bar-wrap { background: var(--bg); height: 22px; position: relative; overflow: visible; border: 1px solid var(--line-soft); }
  .cal-bucket-bar-expected { position: absolute; top: 0; left: 0; height: 100%; background: rgba(124,58,237,.18); }
  .cal-bucket-bar-actual   { position: absolute; top: 0; left: 0; height: 100%; background: var(--orange); transition: width .5s ease; }
  .cal-bucket-n { font-family: var(--font-mono); font-size: 10px; color: var(--muted); text-align: right; letter-spacing: .04em; }

  /* Reader extras (legacy class names) */
  .reader-article { max-width: 900px; margin: 60px auto; padding: 0 32px 80px; }
  .article-header { margin-bottom: 48px; }
  .article-tags { display: flex; gap: 8px; margin-bottom: 16px; }
  .article-title { font-family: var(--font-serif); font-size: clamp(36px, 6vw, 72px); line-height: 1.02; letter-spacing: -.025em; margin: 0 0 16px; }
  .article-subtitle { font-family: var(--font-serif); font-style: italic; font-size: clamp(18px, 2.4vw, 26px); color: var(--muted); line-height: 1.35; margin: 0 0 20px; }
  .article-meta { display: flex; gap: 8px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; color: var(--muted); text-transform: uppercase; flex-wrap: wrap; }
  .article-hook { border-left: 3px solid var(--purple); padding-left: 20px; margin: 24px 0 0; font-family: var(--font-serif); font-style: italic; font-size: 20px; color: var(--ink-2); line-height: 1.5; }
  .article-body { font-size: 17px; line-height: 1.75; color: var(--ink-2); }
  .article-body h2 { font-family: var(--font-serif); font-size: 28px; margin: 40px 0 14px; color: var(--ink); font-weight: 400; }
  .article-body h3 { font-family: var(--font-mono); font-size: 11px; letter-spacing: .22em; color: var(--purple); margin: 28px 0 10px; text-transform: uppercase; font-weight: 800; }
  .article-body p  { margin: 0 0 16px; }
  .article-body strong { color: var(--ink); }
  .article-body em { font-style: italic; }
  .article-body a { color: var(--purple); text-decoration: underline; text-underline-offset: 3px; }

  /* Stats row (reader header) */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0; margin-bottom: 40px; border: 1px solid var(--line); background: var(--paper); }
  .stats-row > .stat-card,
  .stats-row > div { border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 20px; }
  .stat-card { background: var(--paper); padding: 20px; }
  .stat-value { font-family: var(--font-serif); font-size: 32px; line-height: 1; letter-spacing: -.02em; color: var(--ink); margin-top: 6px; }
  .stat-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; font-weight: 700; }
  .stat-desc { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4; }

  /* Headlines */
  .headlines-section { margin-top: 64px; }
  .headlines-list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
  .headline-card {
    display: flex; gap: 20px; align-items: flex-start;
    background: var(--paper); border: 1px solid var(--line); padding: 20px 22px;
  }
  .headline-n { font-family: var(--font-serif); font-style: italic; font-size: 32px; line-height: 1; color: rgba(124,58,237,.35); min-width: 40px; }
  .headline-body { flex: 1; }
  .headline-title { font-family: var(--font-serif); font-size: 18px; font-weight: 400; margin-bottom: 6px; line-height: 1.25; }
  .headline-text { font-size: 13px; color: var(--muted); line-height: 1.6; }

  /* Section title (generic) */
  .section-title { font-family: var(--font-serif); font-size: 28px; line-height: 1.1; letter-spacing: -.015em; margin: 0 0 14px; }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }

  /* Report sections (structured editorial) */
  .report-sections { display: flex; flex-direction: column; gap: 0; }
  .report-section { padding: 40px 0; border-bottom: 1px solid var(--line); }
  .report-section:last-child { border-bottom: 0; }
  .report-section--gated { opacity: .7; }
  .tier-border-free    { border-left: 3px solid var(--green);  padding-left: 20px; }
  .tier-border-members { border-left: 3px solid var(--blue);   padding-left: 20px; }
  .tier-border-paid    { border-left: 3px solid var(--purple); padding-left: 20px; }
  .rs-part-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--purple); font-weight: 800; margin-bottom: 10px; }
  .rs-title { font-family: var(--font-serif); font-size: clamp(22px, 3vw, 32px); line-height: 1.15; color: var(--ink); margin: 0 0 16px; font-weight: 400; }
  .rs-desc  { font-size: 15px; color: var(--muted); line-height: 1.6; margin: 0 0 24px; max-width: 640px; }

  .rs-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0; margin-top: 8px; border: 1px solid var(--line); background: var(--paper); }
  .rs-kpi-card { padding: 18px 16px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .rs-kpi-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
  .rs-kpi-value { font-family: var(--font-serif); font-size: 28px; letter-spacing: -.02em; color: var(--ink); margin-bottom: 4px; }
  .rs-kpi-change { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
  .rs-kpi-change.pos { color: var(--green); }
  .rs-kpi-change.neg { color: var(--red); }
  .rs-kpi-desc { font-size: 11px; color: var(--muted); line-height: 1.45; margin-top: 4px; }

  .rs-corr-list { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
  .rs-corr-row { background: var(--paper); border: 1px solid var(--line); padding: 16px 18px; }
  .rs-corr-pair { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .rs-corr-a, .rs-corr-b { font-size: 13px; font-weight: 600; padding: 4px 10px; border: 1px solid var(--line); }
  .rs-corr-arrow { font-family: var(--font-mono); font-size: 14px; color: var(--purple); font-weight: 800; }
  .rs-corr-bar-wrap { position: relative; background: var(--line-soft); height: 8px; margin-bottom: 10px; overflow: hidden; display: flex; align-items: center; }
  .rs-corr-bar { height: 100%; transition: width .4s ease; }
  .rs-corr-bar.positive { background: var(--green); }
  .rs-corr-bar.negative { background: var(--red); }
  .rs-corr-bar.neutral  { background: var(--muted); }
  .rs-corr-r { position: absolute; right: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--ink); white-space: nowrap; }
  .rs-corr-insight { font-size: 13px; color: var(--muted); line-height: 1.55; }

  .rs-table-wrap { overflow-x: auto; margin-top: 8px; border: 1px solid var(--line); background: var(--paper); }
  .rs-table-wrap .data-table { margin: 0; }

  /* Correlations section (legacy alias) */
  .correlations-section { margin-top: 64px; }
  .correlations-list { display: flex; flex-direction: column; gap: 14px; margin-top: 20px; }

  /* Tier-blocked inline content */
  .tier-block { border-left: 3px solid var(--purple); padding: 12px 0 12px 20px; margin: 16px 0; }
  .tier-block.tier-paid { border-color: var(--orange); }

  /* PDF / actions row */
  .pdf-download { display: flex; align-items: center; gap: 16px; margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); flex-wrap: wrap; }
  .hero-note { font-size: 13px; color: var(--muted); font-style: italic; }

  /* CMS pages (Editor, Reports, Jobs) */
  .cms-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .cms-page-title { font-family: var(--font-serif); font-size: clamp(24px, 3vw, 32px); margin: 0; letter-spacing: -.015em; line-height: 1.1; }
  .cms-note { font-size: 13px; color: var(--muted); }
  .report-slug { font-family: var(--font-mono); font-size: 11px; color: var(--purple); letter-spacing: .06em; padding: 4px 8px; background: var(--bg); border: 1px solid var(--line); display: inline-block; margin-top: 6px; }

  /* Editor layout */
  .editor-page .cms-page-header { align-items: flex-start; }
  .editor-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .editor-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
  .editor-main { display: flex; flex-direction: column; gap: 12px; }
  .editor-sidebar { display: flex; flex-direction: column; gap: 16px; }
  .editor-fieldset {
    border: 1px solid var(--line); background: var(--paper); padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .editor-fieldset legend {
    font-family: var(--font-mono); font-size: 10px; color: var(--muted);
    text-transform: uppercase; letter-spacing: .18em; padding: 0 6px; font-weight: 700;
  }
  .og-preview { width: 100%; margin-bottom: 8px; border: 1px solid var(--line); }
  .job-status { font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin: 0; }

  /* Authors */
  .authors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px,100%), 1fr)); gap: 0; border: 1px solid var(--line); }
  .author-card { display: flex; gap: 16px; background: var(--paper); padding: 24px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .author-avatar {
    width: 48px; height: 48px; background: var(--ink); color: var(--orange);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-serif); font-size: 22px; flex-shrink: 0;
  }
  .author-name { font-family: var(--font-serif); font-size: 18px; margin-bottom: 4px; }
  .author-role { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: var(--purple); text-transform: uppercase; font-weight: 700; margin-bottom: 12px; }
  .author-bio  { font-size: 14px; color: var(--muted); line-height: 1.6; }

  /* Hide-on-mobile helper */
  @media (max-width: 720px) {
    .hide-mobile { display: none; }
    .editor-layout { grid-template-columns: 1fr; }
    .editor-sidebar { order: -1; }
  }

  /* Gated block placeholder */
  .gated-block { background: var(--ink); color: #fff; padding: 20px 24px; border-left: 3px solid var(--purple); margin: 16px 0; }
  .gated-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; color: #bbb; text-transform: uppercase; font-weight: 700; margin: 0; }
  .gated-tier  { color: var(--purple); font-weight: 800; }

  /* ════════════════════════════════════════════════════════════════════════
     RESPONSIVE OVERRIDES — literal port of designs/responsive.css
     ════════════════════════════════════════════════════════════════════════ */

  html { -webkit-text-size-adjust: 100%; }
  .mobile-only  { display: none; }
  .desktop-only { display: initial; }

  @media (pointer: coarse) {
    button, a, input, select { min-height: 36px; }
  }

  /* TABLET (≤ 1024px) */
  @media (max-width: 1024px) {
    [style*="clamp(72px, 11vw, 156px)"] { font-size: clamp(48px, 9vw, 96px) !important; }
    [style*="clamp(56px, 11vw, 156px)"] { font-size: clamp(48px, 9vw, 96px) !important; }
    [style*="clamp(44px, 7.5vw, 112px)"] { font-size: clamp(36px, 6.5vw, 88px) !important; }
    [style*="clamp(48px, 7vw, 96px)"]   { font-size: clamp(36px, 7vw, 72px)  !important; }

    [style*="grid-template-columns: repeat(5, 1fr)"],
    [style*="grid-template-columns: repeat(5,1fr)"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    [style*="grid-template-columns: repeat(4, 1fr)"],
    [style*="grid-template-columns: repeat(4,1fr)"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }

  /* TABLET PORTRAIT / LARGE PHONE (≤ 900px) */
  @media (max-width: 900px) {
    .cms-sidebar { display: none !important; }
    .cms-sidebar.open {
      display: flex !important; position: fixed !important; inset: 0 !important;
      width: 80vw !important; max-width: 320px !important; z-index: 200 !important;
      height: 100vh !important;
    }
    .mobile-only  { display: initial; }
    .desktop-only { display: none !important; }

    [style*="padding: '80px 0"]         { padding-top: 48px !important; padding-bottom: 48px !important; }
    [style*="padding: '96px 0"]         { padding-top: 56px !important; padding-bottom: 56px !important; }
    [style*="padding: '60px 32px 80px"] { padding: 32px 16px 48px !important; }
    [style*="padding: '0 32px'"]        { padding-left: 16px !important; padding-right: 16px !important; }
    [style*="padding: '14px 32px'"]     { padding-left: 16px !important; padding-right: 16px !important; }
    [style*="padding: '8px 32px'"]      { padding-left: 12px !important; padding-right: 12px !important; }
    [style*="padding: '6px 32px'"]      { padding-left: 12px !important; padding-right: 12px !important; }

    [style*="repeat(3, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }

    [style*="grid-template-columns: '1.2fr 1fr'"],
    [style*="grid-template-columns: '1.4fr 1fr'"],
    [style*="grid-template-columns: '1fr 1fr'"],
    [style*="grid-template-columns: '1fr 320px'"],
    [style*="grid-template-columns: 1fr 1fr"],
    [style*="grid-template-columns: 1fr 320px"],
    [style*="grid-template-columns: 1.2fr 1fr"],
    [style*="grid-template-columns: 1.4fr 1fr"],
    [style*="grid-template-columns: '1.4fr repeat(4, 1fr)'"] {
      grid-template-columns: 1fr !important;
      gap: 24px !important;
    }

    [style*="position: 'sticky'"][style*="top: 140"],
    [style*="position: 'sticky'"][style*="top: 60"] {
      position: static !important;
    }

    [style*="display: 'flex', gap: 24, fontSize: 9"] { flex-wrap: wrap !important; gap: 8px 12px !important; }
    [style*="display: 'flex', gap: 28, fontSize: 9"] { flex-wrap: wrap !important; gap: 8px 12px !important; }

    [style*="font-size: 64px"]          { font-size: 40px !important; }
    [style*="fontSize: 64"]             { font-size: 36px !important; line-height: 1 !important; }
    [style*="fontSize: 56"]             { font-size: 32px !important; line-height: 1 !important; }
    [style*="fontSize: 42"]             { font-size: 28px !important; }
    [style*="fontSize: 38"]             { font-size: 28px !important; }
    [style*="fontSize: 36, fontStyle"]  { font-size: 24px !important; }
    [style*="fontSize: 32, fontStyle"]  { font-size: 22px !important; }

    [style*="gap: 80"]            { gap: 24px !important; }
    [style*="gap: 56"]            { gap: 24px !important; }
    [style*="gap: 48"]            { gap: 20px !important; }
    [style*="gap: 32"]            { gap: 16px !important; }
    [style*="margin-bottom: 96"]  { margin-bottom: 48px !important; }
    [style*="marginBottom: 96"]   { margin-bottom: 48px !important; }
    [style*="marginBottom: 80"]   { margin-bottom: 40px !important; }
    [style*="marginBottom: 64"]   { margin-bottom: 32px !important; }

    [style*="grid-template-columns: '1.4fr repeat(4, 1fr)'"] { grid-template-columns: repeat(2, 1fr) !important; }

    .scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }

    .public-nav-links { display: none !important; }
    .mobile-menu-btn  { display: inline-flex !important; }
  }

  /* PHONE (≤ 600px) */
  @media (max-width: 600px) {
    [style*="grid-template-columns: repeat(3"],
    [style*="grid-template-columns: repeat(2"] {
      grid-template-columns: 1fr !important;
    }

    [style*="clamp(48px, 9vw, 96px)"] { font-size: clamp(40px, 11vw, 56px) !important; }
    [style*="clamp(44px, 7.5vw, 112px)"] { font-size: clamp(32px, 9vw, 48px) !important; }

    [style*="padding: '80px 0"]     { padding: 36px 0 !important; }
    [style*="padding: '64px 64px'"] { padding: 32px 16px !important; }

    h1[class*="serif"] { font-size: clamp(36px, 11vw, 56px) !important; line-height: .95 !important; }

    [style*="maxWidth: 1320, margin: '0 auto', padding: '0 32px'"],
    [style*="maxWidth: 1280, margin: '0 auto', padding"] {
      padding-left: 14px !important; padding-right: 14px !important;
    }

    [style*="top: 28"] { top: 0 !important; }

    button[class*="mono"][style*="padding: '14px 22px'"] { width: 100% !important; }

    [class*="serif"][style*="fontSize: 22"] { font-size: 16px !important; }
    [class*="serif"][style*="fontSize: 18"] { font-size: 14px !important; }

    .substrip {
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      flex-wrap: nowrap !important; white-space: nowrap;
      justify-content: flex-start !important;
    }

    [style*="grid-template-columns: 'repeat(4, 1fr)'"] { grid-template-columns: repeat(2, 1fr) !important; }
  }

  /* INSTALL PROMPT */
  .install-toast {
    position: fixed; bottom: 16px; left: 16px; right: 16px; z-index: 300;
    background: var(--ink); color: #fff; border: 1px solid #1f1f1f;
    padding: 14px 16px; display: none; align-items: center; gap: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.4);
  }
  .install-toast.show { display: flex; }
  @media (min-width: 600px) {
    .install-toast { left: auto; max-width: 380px; }
  }

  /* MOBILE NAV DRAWER */
  .drawer-scrim {
    position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 199; display: none;
  }
  .drawer-scrim.open { display: block; }

  @media (max-width: 900px) {
    body { overscroll-behavior-y: contain; }
  }
`;

export function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: TOKENS }} />;
}

// ─── CI Logo Mark ─────────────────────────────────────────────────────────────
export function CILogoMark({ size = 34 }) {
  const inset  = Math.round(size * 0.18);
  const sq     = Math.round(size * 0.42);
  const center = Math.round(size * 0.28);
  return (
    <div
      style={{
        width: size, height: size, background: "var(--ink)",
        position: "relative", flexShrink: 0, borderRadius: 2,
        boxShadow: "0 0 0 1px rgba(0,0,0,.06)",
      }}
      aria-hidden
    >
      <div style={{ position: "absolute", top: inset, left: inset, width: sq, height: sq, background: "var(--orange)", borderRadius: 1 }} />
      <div style={{ position: "absolute", bottom: inset, right: inset, width: sq, height: sq, background: "var(--blue)", borderRadius: 1 }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: center, height: center, background: "var(--purple)",
        borderRadius: 1, mixBlendMode: "screen",
      }} />
    </div>
  );
}

// ─── Pill / TierBadge / StatusDot ─────────────────────────────────────────────
export function Pill({ label, children, color = "var(--muted)", filled = false, style }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: 9, letterSpacing: ".18em", fontWeight: 700,
        padding: "4px 8px", border: `1px solid ${color}`,
        color: filled ? "#fff" : color,
        background: filled ? color : "transparent",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {label || children}
    </span>
  );
}

const TIER_MAP = {
  free:    { label: "FREE",    color: "var(--muted)" },
  members: { label: "MEMBERS", color: "var(--blue)"  },
  paid:    { label: "PAID",    color: "var(--purple)"},
};
export function TierBadge({ tier = "free", size = "sm" }) {
  const t = TIER_MAP[tier] || TIER_MAP.free;
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: size === "sm" ? 9 : 10, letterSpacing: ".18em", fontWeight: 700,
        padding: size === "sm" ? "3px 7px" : "5px 10px",
        border: `1px solid ${t.color}`,
        color: t.color,
        background: "rgba(255,255,255,.5)",
        textTransform: "uppercase",
      }}
    >
      <Icons.Shield size={size === "sm" ? 9 : 11} color={t.color} />
      {t.label}
    </span>
  );
}

export function StatusDot({ status = "draft" }) {
  return <span className={`sd ${status}`} aria-label={status} />;
}

// ─── Registration corners wrapper ─────────────────────────────────────────────
export function RegBox({ children, style }) {
  return (
    <div className="reg" style={{ position: "relative", ...style }}>
      <span className="reg-tl" /><span className="reg-tr" />
      <span className="reg-bl" /><span className="reg-br" />
      {children}
    </div>
  );
}

// ─── Icons (Lucide-ish inline SVG, ported from designs/shared.jsx) ────────────
const I = (path, vb = "0 0 24 24") => ({ size = 16, color = "currentColor", stroke = 1.6, style, ...rest } = {}) => (
  <svg width={size} height={size} viewBox={vb} fill="none"
       stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       style={style} {...rest}>
    {path}
  </svg>
);

export const Icons = {
  Layers:   I(<><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></>),
  Archive:  I(<><rect x="3" y="3" width="18" height="4" rx="1"/><path d="M5 7v13h14V7"/><path d="M10 12h4"/></>),
  FileText: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></>),
  Upload:   I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></>),
  Plus:     I(<><path d="M12 5v14M5 12h14"/></>),
  Save:     I(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></>),
  Trash:    I(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/></>),
  Eye:      I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>),
  Lock:     I(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>),
  Shield:   I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></>),
  Globe:    I(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20"/></>),
  Users:    I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  Target:   I(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
  Link:     I(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 1 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>),
  Check:    I(<><path d="m20 6-11 11L4 12"/></>),
  X:        I(<><path d="M18 6 6 18M6 6l12 12"/></>),
  Minus:    I(<><path d="M5 12h14"/></>),
  Refresh:  I(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>),
  Filter:   I(<><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></>),
  Search:   I(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  Settings: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>),
  Bolt:     I(<><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></>),
  Logout:   I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>),
  Calendar: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  Alert:    I(<><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>),
  Book:     I(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>),
  Mail:     I(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></>),
  Arrow:    I(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
};

// ─── Ticker bar (used in CMS chrome) ──────────────────────────────────────────
export function TickerBar({ items, clock }) {
  const defaults = useMemo(() => ([
    "NSE +0.42%", "JSE −0.18%", "NGSE +1.04%", "EGX +0.62%", "KES/USD 129.42",
    "NGN/USD 1,548.10", "RWF/USD 1,422.05", "BNR-CBR 7.50%", "CBN-MPR 27.50%",
    "CI · RW-FIN-26 sealed", "CI · KE-AGRI-26 live",
  ]), []);
  const data = items && items.length ? items : defaults;
  return (
    <div style={{
      background: "var(--ink)", color: "#fff", borderBottom: "1px solid var(--ink-2)",
      overflow: "hidden", height: 28, display: "flex", alignItems: "center",
    }}>
      <div className="mono" style={{
        background: "var(--orange)", color: "var(--ink)", padding: "0 12px",
        height: "100%", display: "flex", alignItems: "center", fontSize: 9,
        letterSpacing: ".22em", fontWeight: 800, flexShrink: 0,
      }}>● LIVE</div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div className="ticker-track mono" style={{ fontSize: 10, letterSpacing: ".12em", padding: "0 24px" }}>
          {[...data, ...data].map((it, i) => (
            <span key={i} style={{ color: i % 5 === 0 ? "var(--orange)" : i % 3 === 0 ? "var(--blue)" : "#cfcfcf" }}>
              {it}
            </span>
          ))}
        </div>
      </div>
      <div className="mono" style={{
        padding: "0 12px", height: "100%", display: "flex", alignItems: "center",
        fontSize: 9, letterSpacing: ".22em", color: "#999",
        borderLeft: "1px solid #1f1f1f", flexShrink: 0,
      }}>
        {clock || "UTC · CI.SYNTH.Q2"}
      </div>
    </div>
  );
}

// ─── PageHeader (CMS/Bloomberg-style) ─────────────────────────────────────────
export function PageHeader({ crumb = [], title, sub, code, actions }) {
  return (
    <header className="ph">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ph-crumb">
          {crumb.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <span className="ph-crumb-sep">/</span>}
              <span style={{ color: i === crumb.length - 1 ? "var(--ink)" : "var(--muted)" }}>{c}</span>
            </span>
          ))}
          {code && <span className="ph-code">{code}</span>}
        </div>
        <h1 className="ph-title">{title}</h1>
        {sub && <div className="ph-sub">{sub}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
    </header>
  );
}

// ─── SectionHeader (landing-style — "01 / THE METHOD") ────────────────────────
export function SectionHeader({ num, tag, title, lede }) {
  return (
    <div>
      <div className="sh-rule">
        <span className="sh-num">{num}</span>
        <span className="sh-line" />
        <span className="sh-tag">{tag}</span>
      </div>
      <div className="sh-titles">
        <h2 className="sh-title serif" dangerouslySetInnerHTML={{ __html: title }} />
        {lede && <p className="sh-lede">{lede}</p>}
      </div>
    </div>
  );
}

// ─── Legacy back-compat: StatCard / GatedBlock (still used by Reader.jsx) ─────
export function StatCard({ stat }) {
  return (
    <div style={{
      padding: 20, background: "var(--paper)", border: "1px solid var(--line)",
    }}>
      <div className="lbl" style={{ marginBottom: 10 }}>{stat.label}</div>
      <div className="serif tnum" style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 6 }}>{stat.value}</div>
      {stat.desc && <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{stat.desc}</div>}
    </div>
  );
}

export function GatedBlock({ tier }) {
  return (
    <div style={{
      background: "var(--ink)", color: "#fff", padding: 28, position: "relative",
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
    }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>
        ◆ SEALED · {(tier || "members").toUpperCase()} TIER
      </div>
      <div className="serif" style={{ fontSize: 20, lineHeight: 1.3, fontStyle: "italic" }}>
        This section is part of the {tier || "members"} synthesis layer.
      </div>
      <button className="btn-primary" style={{ background: "var(--purple)" }}>
        Unlock {(tier || "members").toUpperCase()}
      </button>
    </div>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useClock(interval = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

// ─── Install prompt toast (PWA) — literal port of Combined Intelligence.html ──
export function InstallPromptToast() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("install-dismissed")) return undefined;
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !prompt) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("install-dismissed", "1");
  };
  const accept = async () => {
    try {
      prompt.prompt();
      await prompt.userChoice;
    } finally {
      setPrompt(null);
      setVisible(false);
    }
  };

  return (
    <div className="install-toast show">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{
          fontSize: 9, letterSpacing: ".22em", color: "var(--purple)",
          fontWeight: 800, marginBottom: 4,
        }}>◆ INSTALL APP</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: "#ddd" }}>
          Add Combined Intelligence to your home screen for offline reading.
        </div>
      </div>
      <button onClick={dismiss} className="mono" style={{
        padding: "8px 10px", color: "#666",
        fontSize: 9, letterSpacing: ".18em", fontWeight: 700,
      }}>DISMISS</button>
      <button onClick={accept} className="mono" style={{
        padding: "10px 14px", background: "var(--purple)", color: "#fff",
        fontSize: 10, letterSpacing: ".18em", fontWeight: 800,
      }}>INSTALL</button>
    </div>
  );
}
