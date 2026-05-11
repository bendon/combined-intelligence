import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { CILogoMark } from "../shared.jsx";
import { useAuth, LoginButton } from "../auth.jsx";

const SECTIONS = [
  {
    label: "SYNTHESIS",
    base: "/synthesis",
    items: [
      { label: "The Method",            to: "/synthesis/method",  desc: "Our BISE analytical framework" },
      { label: "Latest Reports",        to: "/synthesis/reports", desc: "Recently published analysis" },
      { label: "The Library",           to: "/synthesis/library", desc: "Full archive of all reports" },
      { label: "Featured: Rwanda 2026", to: "/reports/rwanda-financial-overview-2026", desc: "Our flagship frontier-market report", accent: true },
    ],
  },
  {
    label: "LEDGER",
    base: "/ledger",
    items: [
      { label: "Open Predictions",  to: "/ledger/open",        desc: "Pending forecasts under review" },
      { label: "Resolved Claims",   to: "/ledger/resolved",    desc: "Outcomes of completed forecasts" },
      { label: "Calibration Plot",  to: "/ledger/calibration", desc: "Confidence vs. accuracy chart" },
      { label: "Outcomes",          to: "/ledger/outcomes",    desc: "Aggregate hit-rate statistics" },
    ],
  },
  {
    label: "DESK",
    base: "/desk",
    items: [
      { label: "About",               to: "/desk/about",               desc: "Our mission and approach" },
      { label: "Authors",             to: "/desk/authors",             desc: "The analysts behind the desk" },
      { label: "Editorial Standards", to: "/desk/editorial-standards", desc: "How we verify and publish" },
      { label: "Contact",             to: "/desk/contact",             desc: "Get in touch with the desk" },
    ],
  },
  {
    label: "LEGAL",
    base: "/legal",
    items: [
      { label: "Terms",       to: "/legal/terms",       desc: "Terms of service" },
      { label: "Privacy",     to: "/legal/privacy",     desc: "How we handle your data" },
      { label: "Methodology", to: "/legal/methodology", desc: "Technical methodology note" },
      { label: "Sources",     to: "/legal/sources",     desc: "Primary data sources" },
    ],
  },
];

export function GlobalNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(null);      // section label or null
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef(null);

  const enter = (label) => {
    clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  const isActive = (base) => location.pathname.startsWith(base);

  return (
    <header className="g-nav">
      <div className="g-nav-inner">
        {/* Logo */}
        <Link to="/" className="g-nav-logo" onClick={() => setMobileOpen(false)}>
          <CILogoMark size={30} />
          <span className="g-nav-wordmark">Combined Intelligence</span>
        </Link>

        {/* Desktop sections */}
        <nav className="g-nav-sections">
          {SECTIONS.map((sec) => (
            <div
              key={sec.label}
              className={`g-nav-section ${isActive(sec.base) ? "active" : ""} ${open === sec.label ? "open" : ""}`}
              onMouseEnter={() => enter(sec.label)}
              onMouseLeave={leave}
            >
              <span className="g-nav-section-label">{sec.label}</span>
              <div className="g-nav-dropdown" onMouseEnter={() => enter(sec.label)}>
                {sec.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`g-nav-item ${item.accent ? "accent" : ""}`}
                    onClick={() => setOpen(null)}
                  >
                    <span className="g-nav-item-label">{item.label}</span>
                    <span className="g-nav-item-desc">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="g-nav-actions">
          {user === null && <LoginButton className="btn-ghost btn-sm" />}
          {user && (
            <>
              {["admin", "super_admin"].includes(user.role) && (
                <Link to="/cms" className="btn-ghost btn-sm">CMS</Link>
              )}
              <button onClick={logout} className="btn-ghost btn-sm">Sign out</button>
            </>
          )}
          {/* Hamburger */}
          <button
            className="g-nav-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="g-mobile-menu">
          {SECTIONS.map((sec) => (
            <div key={sec.label} className="g-mobile-section">
              <div className="g-mobile-section-label">{sec.label}</div>
              {sec.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`g-mobile-item ${item.accent ? "accent" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="g-mobile-auth">
            {user === null && <LoginButton className="btn-secondary btn-sm" />}
            {user && <button onClick={logout} className="btn-ghost btn-sm">Sign out</button>}
          </div>
        </div>
      )}
    </header>
  );
}
