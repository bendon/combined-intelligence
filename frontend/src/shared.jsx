/* Shared UI primitives for Combined Intelligence frontend */

const TOKENS = `
  :root {
    --obsidian: #0d0d14;
    --carbon:   #13131f;
    --surface:  #1a1a2e;
    --border:   #2a2a3e;
    --muted:    #6b7280;
    --text:     #e2e8f0;
    --accent:   #f97316;
    --blue:     #3b82f6;
    --purple:   #6366f1;
    --green:    #10b981;
    --red:      #ef4444;
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-serif: 'DM Serif Display', Georgia, serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body { background: var(--obsidian); color: var(--text); font-family: var(--font-sans); }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }

  /* ── Layout shells ── */
  .ci-root { min-height: 100vh; }
  .cms-root { display: flex; min-height: 100vh; }
  .cms-main { flex: 1; overflow-y: auto; }

  /* ── Nav ── */
  .landing-nav, .reader-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 40px; position: sticky; top: 0; z-index: 50;
    background: rgba(13,13,20,.9); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .reader-nav-center { display: flex; align-items: center; gap: 8px; }
  .ci-logo-link { display: flex; align-items: center; gap: 10px; }
  .ci-wordmark { font-family: var(--font-serif); font-size: 18px; }
  .nav-actions { display: flex; align-items: center; gap: 12px; }

  /* ── Sidebar ── */
  .cms-sidebar {
    width: 220px; background: var(--carbon); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
  }
  .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 16px; border-bottom: 1px solid var(--border); }
  .cms-wordmark { font-family: var(--font-serif); font-size: 16px; }
  .sidebar-nav { flex: 1; padding: 12px 0; }
  .sidebar-link {
    display: block; padding: 10px 16px; color: var(--muted); font-size: 14px;
    transition: color .15s, background .15s; border-left: 3px solid transparent;
  }
  .sidebar-link:hover { color: var(--text); background: var(--surface); }
  .sidebar-link.active { color: var(--accent); border-left-color: var(--accent); }
  .sidebar-footer { padding: 16px; border-top: 1px solid var(--border); }
  .sidebar-user { display: block; font-size: 11px; color: var(--muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Hero ── */
  .hero { padding: clamp(60px,10vw,100px) clamp(16px,5vw,40px) clamp(48px,8vw,80px); max-width: 800px; margin: 0 auto; }
  .hero-title { font-family: var(--font-serif); font-size: clamp(40px, 6vw, 72px); line-height: 1.1; margin: 16px 0; }
  .hero-title em { font-style: italic; color: var(--accent); }
  .hero-sub { color: var(--muted); font-size: 18px; line-height: 1.6; max-width: 520px; }
  .hero-cta { display: flex; align-items: center; gap: 16px; margin-top: 32px; flex-wrap: wrap; }
  .hero-note { font-size: 13px; color: var(--muted); }

  /* ── Reports grid ── */
  .reports-grid-section { padding: clamp(40px,6vw,60px) clamp(16px,5vw,40px); max-width: 1100px; margin: 0 auto; }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24px; }
  .section-title { font-family: var(--font-serif); font-size: 28px; }
  .section-note { font-size: 13px; color: var(--muted); }
  .section-desc { color: var(--muted); font-size: 16px; line-height: 1.6; max-width: 560px; margin: 12px 0 32px; }
  .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px,100%), 1fr)); gap: 20px; }
  .report-card {
    background: var(--carbon); border: 1px solid var(--border); border-radius: 8px;
    padding: 20px; display: flex; flex-direction: column; gap: 10px;
    transition: border-color .2s, transform .2s;
  }
  .report-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .rc-meta { display: flex; gap: 8px; }
  .rc-title { font-family: var(--font-serif); font-size: 18px; line-height: 1.3; }
  .rc-sub { font-size: 13px; color: var(--muted); line-height: 1.4; }
  .rc-footer { display: flex; gap: 12px; font-size: 12px; color: var(--muted); margin-top: auto; }

  /* ── BISE section ── */
  .bise-section { padding: clamp(40px,6vw,60px) clamp(16px,5vw,40px); background: var(--carbon); }
  .bise-inner { max-width: 1100px; margin: 0 auto; }
  .bise-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px,100%), 1fr)); gap: 16px; margin-top: 32px; }
  .bise-card { background: var(--surface); border: 1px solid; border-radius: 8px; padding: 20px; }
  .bise-letter { font-family: var(--font-serif); font-size: 40px; line-height: 1; margin-bottom: 4px; }
  .bise-label { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
  .bise-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* ── Tiers ── */
  .tiers-section { padding: clamp(40px,6vw,60px) clamp(16px,5vw,40px); max-width: 900px; margin: 0 auto; }
  .tiers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px,100%), 1fr)); gap: 16px; margin-top: 32px; }
  .tier-card { background: var(--carbon); border: 1px solid var(--border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .tier-card.tier-featured { border-color: var(--accent); }
  .tier-price { font-family: var(--font-mono); font-size: 22px; color: var(--text); }
  .tier-perks { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .tier-perks li { font-size: 13px; color: var(--muted); }
  .tier-perks li::before { content: "✓ "; color: var(--green); }

  /* ── Footer ── */
  .landing-footer {
    display: flex; align-items: center; gap: 12px; padding: 24px clamp(16px,5vw,40px);
    border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); flex-wrap: wrap;
  }
  .footer-domain { margin-left: auto; }

  /* ── Reader ── */
  .reader-root { max-width: 100%; }
  .reader-article { max-width: 720px; margin: clamp(32px,5vw,60px) auto; padding: 0 clamp(16px,4vw,24px) clamp(48px,6vw,80px); }
  .article-header { margin-bottom: 48px; }
  .article-title { font-family: var(--font-serif); font-size: clamp(28px, 4vw, 44px); line-height: 1.15; margin-bottom: 16px; }
  .article-subtitle { font-size: 20px; color: var(--muted); line-height: 1.4; margin-bottom: 12px; }
  .article-meta { display: flex; gap: 8px; font-size: 13px; color: var(--muted); }
  .article-hook { border-left: 3px solid var(--accent); padding-left: 16px; margin-top: 20px; font-style: italic; color: var(--muted); line-height: 1.5; }
  .article-body { font-size: 17px; line-height: 1.75; color: #cbd5e1; }
  .article-body h2 { font-family: var(--font-serif); font-size: 24px; margin: 40px 0 12px; color: var(--text); }
  .article-body h3 { font-size: 18px; font-weight: 600; margin: 28px 0 8px; color: var(--text); }
  .article-body p { margin-bottom: 16px; }
  .article-body strong { color: var(--text); }

  /* ── Stats ── */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .stat-card { background: var(--carbon); border: 1px solid var(--border); border-radius: 6px; padding: 16px; }
  .stat-value { font-family: var(--font-mono); font-size: 22px; color: var(--accent); }
  .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .stat-desc { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* ── Headlines ── */
  .headlines-section { margin-top: 48px; }
  .headlines-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
  .headline-card { display: flex; gap: 16px; align-items: flex-start; background: var(--carbon); border: 1px solid var(--border); border-radius: 6px; padding: 16px; }
  .headline-n { font-family: var(--font-mono); font-size: 20px; color: var(--accent); min-width: 32px; }
  .headline-body { flex: 1; }
  .headline-title { font-weight: 600; margin-bottom: 4px; }
  .headline-text { font-size: 14px; color: var(--muted); line-height: 1.5; }

  /* ── Gated block ── */
  .gated-block { background: var(--surface); border: 1px dashed var(--border); border-radius: 6px; padding: 20px; text-align: center; }
  .gated-label { font-size: 13px; color: var(--muted); }
  .gated-tier { color: var(--accent); font-weight: 600; text-transform: capitalize; }

  /* ── Tier block inline ── */
  .tier-block { border-left: 3px solid var(--purple); padding-left: 16px; margin: 16px 0; }
  .tier-block.tier-paid { border-color: var(--accent); }

  /* ── PDF download ── */
  .pdf-download { display: flex; align-items: center; gap: 16px; margin-top: 48px; flex-wrap: wrap; }

  /* ── CMS pages ── */
  .cms-page { padding: 24px clamp(16px,4vw,40px); }
  .cms-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .cms-page-title { font-family: var(--font-serif); font-size: 28px; }
  .cms-note { font-size: 13px; color: var(--muted); }
  .report-slug { font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

  /* ── Editor ── */
  .editor-page .cms-page-header { align-items: flex-start; }
  .editor-actions { display: flex; align-items: center; gap: 12px; }
  .editor-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; margin-top: 8px; }
  .editor-main { display: flex; flex-direction: column; gap: 12px; }
  .editor-sidebar { display: flex; flex-direction: column; gap: 16px; }
  .editor-fieldset { border: 1px solid var(--border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .editor-fieldset legend { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; padding: 0 4px; }
  .og-preview { width: 100%; border-radius: 4px; margin-bottom: 8px; }
  .job-status { font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

  /* ── Form fields ── */
  .field-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .field-input, .field-select, .field-textarea {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; padding: 10px 12px; color: var(--text); font-family: var(--font-sans); font-size: 14px;
    transition: border-color .15s;
  }
  .field-input:focus, .field-select:focus, .field-textarea:focus {
    outline: none; border-color: var(--blue);
  }
  .field-textarea { resize: vertical; font-family: var(--font-mono); font-size: 13px; }
  .field-select { appearance: none; }

  /* ── Table ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .data-table th { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .data-table td { padding: 12px; border-bottom: 1px solid var(--border); }
  .data-table tr:hover td { background: var(--surface); }
  .table-link { color: var(--text); font-weight: 500; }
  .table-link:hover { color: var(--accent); }
  .table-actions { display: flex; gap: 8px; }
  .error-cell { font-size: 12px; color: var(--red); font-family: var(--font-mono); max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

  /* ── Buttons ── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--accent); color: #fff; border-radius: 6px;
    padding: 10px 20px; font-size: 14px; font-weight: 600; transition: opacity .15s;
  }
  .btn-primary:hover { opacity: .85; }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 20px; font-size: 14px; font-weight: 500; transition: border-color .15s;
  }
  .btn-secondary:hover { border-color: var(--accent); }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--muted); font-size: 14px; padding: 8px 12px; border-radius: 4px; transition: color .15s;
  }
  .btn-ghost:hover { color: var(--text); }
  .btn-danger {
    display: inline-flex; align-items: center;
    color: var(--red); font-size: 13px; padding: 4px 8px; border-radius: 4px;
  }
  .btn-danger:hover { background: rgba(239,68,68,.1); }
  .btn-tier { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 500; width: 100%; justify-content: center; }
  .btn-sm { padding: 6px 14px !important; font-size: 13px !important; }
  .btn-xs { padding: 3px 8px !important; font-size: 12px !important; }
  .btn-full { width: 100%; justify-content: center; }
  button:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Pills & badges ── */
  .pill { display: inline-block; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .tier-badge { display: inline-block; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
  .tier-badge.free { background: rgba(16,185,129,.15); color: var(--green); }
  .tier-badge.members { background: rgba(99,102,241,.15); color: var(--purple); }
  .tier-badge.paid { background: rgba(249,115,22,.15); color: var(--accent); }

  /* ── Status dot ── */
  .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
  .status-dot.draft { background: var(--muted); }
  .status-dot.processing { background: var(--blue); }
  .status-dot.published { background: var(--green); }
  .status-dot.retired { background: var(--red); }
  .status-dot.running { background: var(--blue); }
  .status-dot.completed { background: var(--green); }
  .status-dot.failed { background: var(--red); }
  .status-dot.pending { background: var(--muted); }

  /* ── Library list rows ── */
  .library-list { display: flex; flex-direction: column; gap: 1px; }
  .library-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px; padding: 18px 16px; border-bottom: 1px solid var(--border);
    text-decoration: none; transition: background .12s;
  }
  .library-row:hover { background: var(--carbon); }
  .library-row-left { flex: 1; min-width: 0; }
  .library-row-title { font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
  .library-row-sub { font-size: 13px; color: var(--muted); line-height: 1.4; margin-bottom: 6px; }
  .library-row-meta { display: flex; gap: 6px; font-size: 12px; color: var(--muted); }
  .library-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .library-row-date, .library-row-read { font-size: 12px; color: var(--muted); white-space: nowrap; }

  /* ── Authors ── */
  .authors-grid { display: flex; flex-direction: column; gap: 24px; }
  .author-card { display: flex; gap: 20px; background: var(--carbon); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
  .author-avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-size: 18px; color: var(--accent); flex-shrink: 0; }
  .author-name { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
  .author-role { font-size: 13px; color: var(--accent); margin-bottom: 10px; }
  .author-bio { font-size: 14px; color: var(--muted); line-height: 1.6; }

  /* ── Article extras ── */
  .article-tags { display: flex; gap: 8px; margin-bottom: 16px; }

  /* ── Hero actions ── */
  .hero-actions { display: flex; gap: 12px; margin-top: 32px; flex-wrap: wrap; align-items: center; }

  /* ── Misc ── */
  .empty-state { color: var(--muted); font-size: 14px; padding: 40px 0; }

  /* ════════════════════════════════════════════════════════════════
     GLOBAL NAV
  ════════════════════════════════════════════════════════════════ */
  .g-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(13,13,20,.96); backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .g-nav-inner {
    display: flex; align-items: stretch; height: 58px;
    padding: 0 clamp(16px,4vw,32px); gap: 0;
  }
  .g-nav-logo {
    display: flex; align-items: center; gap: 10px;
    margin-right: 32px; text-decoration: none; flex-shrink: 0;
  }
  .g-nav-wordmark {
    font-family: var(--font-serif); font-size: 16px;
    color: var(--text); white-space: nowrap;
  }
  .g-nav-sections { display: flex; align-items: stretch; flex: 1; }

  /* Section trigger */
  .g-nav-section { position: relative; display: flex; align-items: stretch; }
  .g-nav-section-label {
    display: flex; align-items: center; padding: 0 14px;
    font-size: 10.5px; font-weight: 700; letter-spacing: .12em;
    color: var(--muted); cursor: default; white-space: nowrap;
    border-bottom: 2px solid transparent;
    transition: color .15s, border-color .15s;
  }
  .g-nav-section:hover .g-nav-section-label,
  .g-nav-section.active .g-nav-section-label {
    color: var(--text);
  }
  .g-nav-section.active .g-nav-section-label { border-bottom-color: var(--accent); }
  .g-nav-section.open .g-nav-section-label  { color: var(--text); border-bottom-color: var(--accent); }

  /* Dropdown */
  .g-nav-dropdown {
    position: absolute; top: 100%; left: 0;
    min-width: 256px; background: var(--carbon);
    border: 1px solid var(--border); border-top: 2px solid var(--accent);
    box-shadow: 0 12px 40px rgba(0,0,0,.6);
    opacity: 0; pointer-events: none;
    transform: translateY(-6px);
    transition: opacity .15s ease, transform .15s ease;
  }
  .g-nav-section:hover .g-nav-dropdown,
  .g-nav-section.open  .g-nav-dropdown {
    opacity: 1; pointer-events: auto; transform: translateY(0);
  }
  .g-nav-item {
    display: block; padding: 12px 18px;
    border-bottom: 1px solid var(--border);
    text-decoration: none; transition: background .12s;
  }
  .g-nav-item:last-child { border-bottom: none; }
  .g-nav-item:hover { background: var(--surface); }
  .g-nav-item-label { font-size: 13px; color: var(--text); font-weight: 500; display: block; }
  .g-nav-item-desc  { font-size: 11px; color: var(--muted); margin-top: 2px; display: block; }
  .g-nav-item.accent .g-nav-item-label { color: var(--accent); }

  /* Actions */
  .g-nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

  /* Hamburger */
  .g-nav-burger {
    display: none; flex-direction: column; gap: 5px;
    padding: 8px; cursor: pointer; background: none; border: none;
  }
  .g-nav-burger span {
    display: block; width: 22px; height: 2px;
    background: var(--muted); border-radius: 2px;
  }

  /* Mobile menu */
  .g-mobile-menu {
    display: none; flex-direction: column;
    background: var(--carbon); border-top: 1px solid var(--border);
    padding: 16px 0; max-height: calc(100vh - 58px); overflow-y: auto;
  }
  .g-mobile-section { padding: 8px 0; border-bottom: 1px solid var(--border); }
  .g-mobile-section:last-of-type { border-bottom: none; }
  .g-mobile-section-label {
    padding: 6px 24px; font-size: 10px; font-weight: 700;
    letter-spacing: .12em; color: var(--muted);
  }
  .g-mobile-item {
    display: block; padding: 10px 32px; font-size: 14px; color: var(--text);
    text-decoration: none; transition: color .12s;
  }
  .g-mobile-item:hover, .g-mobile-item.accent { color: var(--accent); }
  .g-mobile-auth { padding: 16px 24px; }

  @media (max-width: 768px) {
    .g-nav-sections { display: none; }
    .g-nav-burger   { display: flex; }
    .g-mobile-menu  { display: flex; }
    .g-nav-wordmark { display: none; }
    .g-nav-inner    { padding: 0 16px; }

    /* CMS sidebar collapses to horizontal tab bar */
    .cms-root    { flex-direction: column; }
    .cms-sidebar {
      width: 100%; height: auto; position: relative;
      flex-direction: row; flex-wrap: nowrap;
    }
    .sidebar-logo  { padding: 12px 16px; border-bottom: none; border-right: 1px solid var(--border); flex-shrink: 0; }
    .sidebar-nav   { flex-direction: row; overflow-x: auto; padding: 0; flex: 1; scrollbar-width: none; }
    .sidebar-nav::-webkit-scrollbar { display: none; }
    .sidebar-link  {
      padding: 12px 14px; white-space: nowrap;
      border-left: none; border-bottom: 3px solid transparent;
    }
    .sidebar-link.active { border-left-color: transparent; border-bottom-color: var(--accent); }
    .sidebar-footer { display: none; }
    .cms-main { overflow-y: visible; }

    /* Editor stacks to single column */
    .editor-layout { grid-template-columns: 1fr; }
    .editor-sidebar { order: -1; }

    /* Prose body padding */
    .prose-body { padding: 40px 16px 60px; }
  }

  /* ════════════════════════════════════════════════════════════════
     PAGE LAYOUTS
  ════════════════════════════════════════════════════════════════ */
  .page-layout  { min-height: calc(100vh - 58px); }
  .prose-layout { min-height: calc(100vh - 58px); }

  /* Section pages (reports grid, library, etc.) */
  .section-page { max-width: 1200px; margin: 0 auto; padding: clamp(32px,5vw,48px) clamp(16px,5vw,40px) clamp(48px,6vw,80px); }
  .section-page-header { margin-bottom: 36px; }
  .section-page-title {
    font-family: var(--font-serif); font-size: clamp(28px, 4vw, 42px);
    line-height: 1.1; margin-bottom: 8px;
  }
  .section-page-sub { font-size: 16px; color: var(--muted); max-width: 560px; line-height: 1.6; }

  /* Prose pages (about, legal, etc.) */
  .prose-header {
    background: var(--carbon); border-bottom: 1px solid var(--border);
    padding: clamp(40px,6vw,56px) clamp(16px,5vw,40px) clamp(28px,4vw,40px); text-align: center;
  }
  .prose-title    { font-family: var(--font-serif); font-size: clamp(28px, 4vw, 44px); }
  .prose-subtitle { color: var(--muted); font-size: 18px; margin-top: 10px; }
  .prose-body {
    max-width: 720px; margin: 0 auto; padding: 56px 24px 80px;
    font-size: 17px; line-height: 1.8; color: #cbd5e1;
  }
  .prose-body h2 { font-family: var(--font-serif); font-size: 24px; color: var(--text); margin: 48px 0 12px; }
  .prose-body h3 { font-size: 17px; font-weight: 600; color: var(--text); margin: 32px 0 8px; }
  .prose-body p  { margin-bottom: 20px; }
  .prose-body ul, .prose-body ol { padding-left: 24px; margin-bottom: 20px; }
  .prose-body li { margin-bottom: 8px; }
  .prose-body strong { color: var(--text); }
  .prose-body a  { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .prose-body blockquote {
    border-left: 3px solid var(--accent); padding-left: 20px;
    margin: 24px 0; font-style: italic; color: var(--muted);
  }

  /* ════════════════════════════════════════════════════════════════
     SITE FOOTER
  ════════════════════════════════════════════════════════════════ */
  .site-footer {
    background: var(--carbon); border-top: 1px solid var(--border);
    padding: clamp(32px,5vw,48px) clamp(16px,5vw,40px) 0;
  }
  .site-footer-inner {
    max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 32px;
    padding-bottom: 40px; border-bottom: 1px solid var(--border);
  }
  .footer-brand { font-family: var(--font-serif); font-size: 18px; margin-bottom: 8px; }
  .footer-tagline { font-size: 13px; color: var(--muted); line-height: 1.5; }
  .footer-col { display: flex; flex-direction: column; gap: 8px; }
  .footer-col-title { font-size: 11px; font-weight: 700; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; margin-bottom: 4px; }
  .footer-link { font-size: 13px; color: var(--muted); text-decoration: none; transition: color .12s; }
  .footer-link:hover { color: var(--text); }
  .footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 0; font-size: 12px; color: var(--muted);
    max-width: 1200px; margin: 0 auto;
  }
  @media (max-width: 900px) {
    .site-footer-inner { grid-template-columns: 1fr 1fr; }
  }

  /* ── 640 px — large phones / small tablets ─────────────────────────────── */
  @media (max-width: 640px) {
    /* Typography */
    .hero-title          { font-size: clamp(28px, 8vw, 40px); }
    .section-page-title  { font-size: clamp(22px, 7vw, 32px); }
    .prose-title         { font-size: clamp(22px, 7vw, 32px); }
    .article-title       { font-size: clamp(22px, 6vw, 32px); }
    .section-title       { font-size: 22px; }

    /* Grids → single column */
    .reports-grid  { grid-template-columns: 1fr; }
    .tiers-grid    { grid-template-columns: 1fr; }

    /* Stats row → 2 columns */
    .stats-row  { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .kpi-row    { grid-template-columns: repeat(2, 1fr); }

    /* Reader */
    .reader-article { margin-top: 24px; }
    .article-header { margin-bottom: 32px; }
    .article-meta   { flex-wrap: wrap; gap: 6px; }

    /* Headlines */
    .headline-card { flex-wrap: wrap; }

    /* Predictions table → readable on phone */
    .pred-table th, .pred-table td { padding: 10px 8px; font-size: 13px; }

    /* Sections */
    .rs-kpi-grid     { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .rs-matrix-chart { height: 260px; }
    .rs-matrix-cards { grid-template-columns: 1fr 1fr; }
    .report-section  { padding: 28px 0; }

    /* Correlations */
    .rs-corr-pair { flex-wrap: wrap; gap: 6px; }

    /* Filter bar */
    .filter-bar { flex-direction: column; align-items: stretch; }
    .filter-input { min-width: unset; }

    /* Calibration */
    .cal-bucket-row { grid-template-columns: 60px 1fr 36px; gap: 8px; }

    /* Hero CTA */
    .hero-cta    { flex-direction: column; align-items: flex-start; gap: 12px; }
    .hero-actions { flex-direction: column; align-items: flex-start; }

    /* Library rows */
    .library-row       { flex-direction: column; gap: 10px; }
    .library-row-right { align-self: flex-start; }
  }

  /* ── 480 px — small phones ──────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .site-footer-inner { grid-template-columns: 1fr; }
    .site-footer { padding: 32px 16px 0; }

    /* Stats / KPI → 2 equal cols */
    .stats-row { grid-template-columns: 1fr 1fr; }
    .rs-kpi-grid { grid-template-columns: 1fr 1fr; }

    /* BISE → single column */
    .bise-grid { grid-template-columns: 1fr; }

    /* Report card full-width */
    .report-card { padding: 16px; }

    /* Prediction table — hide less critical columns */
    .pred-table .hide-mobile { display: none; }

    /* Matrix */
    .rs-matrix-chart { height: 200px; }
    .rs-matrix-cards { grid-template-columns: 1fr; }

    /* Correlation labels smaller */
    .rs-corr-a, .rs-corr-b { font-size: 11px; padding: 2px 8px; }

    /* Headlines */
    .headline-card { gap: 12px; }
    .headline-n    { font-size: 16px; min-width: 24px; }

    /* Prose */
    .prose-subtitle { font-size: 15px; }

    /* Buttons full-width in certain contexts */
    .pdf-download { flex-direction: column; align-items: flex-start; }
  }

  /* ════════════════════════════════════════════════════════════════
     LIBRARY FILTERS
  ════════════════════════════════════════════════════════════════ */
  .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; align-items: center; }
  .filter-input {
    flex: 1; min-width: 200px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 6px;
    padding: 9px 14px; color: var(--text); font-size: 14px; font-family: var(--font-sans);
  }
  .filter-input:focus { outline: none; border-color: var(--blue); }
  .filter-input::placeholder { color: var(--muted); }
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-pill {
    padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
    border: 1px solid var(--border); color: var(--muted); cursor: pointer;
    transition: border-color .12s, color .12s, background .12s;
  }
  .filter-pill:hover { color: var(--text); border-color: var(--text); }
  .filter-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  /* ════════════════════════════════════════════════════════════════
     LEDGER / PREDICTIONS
  ════════════════════════════════════════════════════════════════ */
  .pred-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
  .pred-table th { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .pred-table td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .pred-table tr:hover td { background: var(--surface); }
  .pred-statement { font-size: 14px; line-height: 1.5; }
  .pred-report-link { font-size: 12px; color: var(--accent); text-decoration: none; }
  .pred-report-link:hover { text-decoration: underline; }
  .pred-target { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .pred-conf { font-family: var(--font-mono); font-size: 13px; }
  .outcome-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .outcome-badge.true    { background: rgba(16,185,129,.15); color: var(--green); }
  .outcome-badge.false   { background: rgba(239,68,68,.15);  color: var(--red); }
  .outcome-badge.partial { background: rgba(249,115,22,.15); color: var(--accent); }
  .outcome-badge.pending { background: rgba(107,114,128,.12); color: var(--muted); }

  /* Stats row for Outcomes */
  .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; margin-bottom: 40px; }
  .kpi-card { background: var(--carbon); border: 1px solid var(--border); border-radius: 8px; padding: 20px 18px; }
  .kpi-value { font-family: var(--font-mono); font-size: 28px; color: var(--accent); margin-bottom: 4px; }
  .kpi-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }

  /* ── Scrollable table wrapper ── */
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 6px; }
  .table-scroll .pred-table, .table-scroll .data-table { min-width: 560px; }

  /* Calibration plot */
  .cal-chart-wrap { background: var(--carbon); border: 1px solid var(--border); border-radius: 8px; padding: 24px; margin-bottom: 32px; }
  .cal-chart-title { font-size: 14px; color: var(--muted); margin-bottom: 16px; }
  .cal-bucket-row { display: grid; grid-template-columns: 80px 1fr 60px; gap: 12px; align-items: center; margin-bottom: 12px; }
  .cal-bucket-label { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
  .cal-bucket-bar-wrap { background: var(--surface); border-radius: 4px; height: 20px; position: relative; overflow: visible; }
  .cal-bucket-bar-expected { position: absolute; top: 0; left: 0; height: 100%; background: rgba(99,102,241,.2); border-radius: 4px; }
  .cal-bucket-bar-actual   { position: absolute; top: 0; left: 0; height: 100%; background: var(--accent); border-radius: 4px; transition: width .5s ease; }
  .cal-bucket-n { font-size: 11px; color: var(--muted); text-align: right; }

  /* ════════════════════════════════════════════════════════════════
     REPORT SECTIONS  (structured editorial PDF rendering)
  ════════════════════════════════════════════════════════════════ */
  .report-sections { display: flex; flex-direction: column; gap: 0; }

  .report-section {
    padding: 40px 0;
    border-bottom: 1px solid var(--border);
  }
  .report-section:last-child { border-bottom: none; }

  /* Tier-coloured left accent on narrative sections */
  .tier-border-free    { border-left: 3px solid var(--green);  padding-left: 20px; }
  .tier-border-members { border-left: 3px solid var(--purple); padding-left: 20px; }
  .tier-border-paid    { border-left: 3px solid var(--accent); padding-left: 20px; }

  .rs-part-label {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
  }
  .rs-title {
    font-family: var(--font-serif); font-size: clamp(20px, 2.8vw, 28px);
    line-height: 1.2; color: var(--text); margin-bottom: 16px;
  }
  .rs-desc {
    font-size: 15px; color: var(--muted); line-height: 1.6;
    margin-bottom: 24px; max-width: 640px;
  }

  /* ── KPI Grid ── */
  .rs-kpi-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px; margin-top: 8px;
  }
  .rs-kpi-card {
    background: var(--carbon); border: 1px solid var(--border);
    border-radius: 8px; padding: 18px 16px;
  }
  .rs-kpi-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
    color: var(--muted); margin-bottom: 6px;
  }
  .rs-kpi-value {
    font-family: var(--font-mono); font-size: 22px; color: var(--text); margin-bottom: 4px;
  }
  .rs-kpi-change {
    font-family: var(--font-mono); font-size: 12px; font-weight: 700; margin-bottom: 4px;
  }
  .rs-kpi-change.pos { color: var(--green); }
  .rs-kpi-change.neg { color: var(--red); }
  .rs-kpi-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }

  /* ── Correlation rows ── */
  .correlations-section { margin-top: 48px; }
  .correlations-list { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
  .rs-corr-list { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }

  .rs-corr-row {
    background: var(--carbon); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px 18px;
  }
  .rs-corr-pair {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;
  }
  .rs-corr-a, .rs-corr-b {
    font-size: 13px; font-weight: 600; color: var(--text);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; padding: 3px 10px;
  }
  .rs-corr-arrow { font-size: 16px; color: var(--accent); }
  .rs-corr-bar-wrap {
    position: relative; background: var(--surface);
    border-radius: 4px; height: 8px; margin-bottom: 10px; overflow: hidden;
    display: flex; align-items: center;
  }
  .rs-corr-bar {
    height: 100%; border-radius: 4px; transition: width .4s ease;
  }
  .rs-corr-bar.positive { background: var(--green); }
  .rs-corr-bar.negative { background: var(--red); }
  .rs-corr-bar.neutral  { background: var(--muted); }
  .rs-corr-r {
    position: absolute; right: 8px; font-family: var(--font-mono);
    font-size: 11px; color: var(--text); white-space: nowrap;
  }
  .rs-corr-insight { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* ── Data table ── */
  .rs-table-wrap { overflow-x: auto; margin-top: 8px; border-radius: 6px; border: 1px solid var(--border); }
  .rs-table-wrap .data-table { margin: 0; }

  /* ── Strategic matrix ── */
  .rs-matrix-wrap { display: flex; flex-direction: column; align-items: center; margin: 16px 0; }
  .rs-matrix-y-label {
    font-size: 11px; color: var(--muted); text-transform: uppercase;
    letter-spacing: .08em; writing-mode: vertical-rl; transform: rotate(180deg);
    margin-right: 8px; align-self: center;
  }
  .rs-matrix-chart {
    position: relative; width: 100%; max-width: 560px;
    height: clamp(220px, 40vw, 360px);
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--carbon);
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 25% 25%;
    overflow: hidden;
  }
  .rs-matrix-x-axis {
    position: absolute; bottom: 50%; left: 0; right: 0;
    height: 1px; background: var(--border);
  }
  .rs-matrix-y-axis {
    position: absolute; left: 50%; top: 0; bottom: 0;
    width: 1px; background: var(--border);
  }
  .rs-matrix-cell {
    position: absolute; transform: translate(-50%, 50%);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .rs-matrix-dot {
    display: block; width: 10px; height: 10px;
    background: var(--accent); border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(249,115,22,.25);
  }
  .rs-matrix-cell-label {
    font-size: 10px; color: var(--text); white-space: nowrap;
    background: rgba(13,13,20,.85); padding: 2px 6px; border-radius: 3px;
  }
  .rs-matrix-x-label {
    font-size: 11px; color: var(--muted); text-transform: uppercase;
    letter-spacing: .08em; margin-top: 8px;
  }
  .rs-matrix-cards {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px; margin-top: 16px;
  }
  .rs-matrix-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 12px 14px;
  }
  .rs-matrix-card-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .rs-matrix-card-desc { font-size: 12px; color: var(--muted); line-height: 1.4; }

  /* ── Gated section ── */
  .report-section--gated { opacity: .7; }
`;


export function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: TOKENS }} />;
}

export function CILogoMark({ size = 36 }) {
  const s = size;
  const u = s / 3;
  return (
    <svg width={s} height={s} viewBox="0 0 3 3" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="2" height="2" fill="#f97316" />
      <rect x="1" y="1" width="2" height="2" fill="#6366f1" />
      <rect x="1" y="1" width="1" height="1" fill="#c026d3" style={{ mixBlendMode: "screen" }} />
    </svg>
  );
}

export function Pill({ label }) {
  return <span className="pill">{label}</span>;
}

export function TierBadge({ tier }) {
  return <span className={`tier-badge ${tier}`}>{tier}</span>;
}

export function StatusDot({ status }) {
  return <span className={`status-dot ${status}`} />;
}

export function StatCard({ stat }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{stat.label}</div>
      <div className="stat-value">{stat.value}</div>
      <div className="stat-desc">{stat.desc}</div>
    </div>
  );
}

export function GatedBlock({ tier }) {
  return (
    <div className="gated-block">
      <p className="gated-label">
        This content requires a <span className="gated-tier">{tier}</span> membership.
      </p>
    </div>
  );
}
