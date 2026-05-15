import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CILogoMark } from "../shared.jsx";
import { useAuth } from "../auth.jsx";
import { auth as authApi } from "../api.js";

// Cross-app route nav (used everywhere except the Landing page)
const ROUTE_NAV = [
  { label: "SYNTHESIS",  to: "/synthesis/method" },
  { label: "LEDGER",     to: "/ledger/open" },
  { label: "DESK",       to: "/desk/about" },
  { label: "LEGAL",      to: "/legal/terms" },
];

// In-page anchor nav for the Landing page (matches the literal design)
const LANDING_NAV = [
  { label: "SYNTHESIS",  anchor: "#synthesis" },
  { label: "SCAN",       anchor: "#scan" },
  { label: "LEDGER",     anchor: "#ledger" },
  { label: "MEMBERSHIP", anchor: "#tiers" },
];

const LANDING_MOBILE_EXTRA = [
  { label: "LATEST",     anchor: "#reports" },
];

const SUBSTRIP = [
  { label: "● Q2 · 2026",            color: "var(--orange)" },
  { label: "04 LIVE REPORTS" },
  { label: "09 BOUND CONSTRAINTS" },
  { label: "76% LIFETIME HIT-RATE",  color: "var(--green)" },
  { label: "31 SEALED PREDICTIONS" },
];

export function GlobalNav({ withSubstrip = true, variant = "default" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAdmin = user && ["admin", "super_admin"].includes(user.role);
  const isLanding = variant === "landing";
  const navItems = isLanding ? LANDING_NAV : ROUTE_NAV;
  const mobileNavItems = isLanding ? [...LANDING_NAV, ...LANDING_MOBILE_EXTRA] : ROUTE_NAV;

  const handleBrandClick = (e) => {
    e.preventDefault();
    setDrawerOpen(false);
    if (location.pathname === "/" || location.hash) {
      // Clear any in-page anchor and reset scroll without adding history entries
      if (location.hash) navigate("/", { replace: true });
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      navigate("/");
      window.scrollTo({ top: 0, left: 0 });
    }
  };

  return (
    <>
      <div className="public-header-sticky">
      <div className="public-nav-wrap">
        <div className="public-nav-inner">
          <Link to="/" className="public-nav-brand" onClick={handleBrandClick} aria-label="Combined Intelligence — home">
            <CILogoMark size={42} />
            <div>
              <div className="public-nav-wordmark">Combined Intelligence</div>
              <div className="public-nav-tagline">The Synthesis of Inevitability</div>
            </div>
          </Link>

          <div style={{ flex: 1 }} />

          <nav className="public-nav-links" aria-label="Primary">
            {navItems.map((n) =>
              n.anchor ? (
                <a key={n.label} href={n.anchor} className="public-nav-link">
                  {n.label}
                </a>
              ) : (
                <NavLink
                  key={n.label}
                  to={n.to}
                  className={({ isActive }) =>
                    `public-nav-link${isActive || location.pathname.startsWith("/" + n.to.split("/")[1]) ? " active" : ""}`
                  }
                >
                  {n.label}
                </NavLink>
              ),
            )}
          </nav>

          {!user && (
            <a href={authApi.loginUrl()} className="public-nav-cta desktop-only">
              MEMBER ACCESS ›
            </a>
          )}
          {user && (
            <div style={{ display: "flex", gap: 8 }} className="desktop-only">
              {isAdmin && <Link to="/cms" className="public-nav-cta ghost">CMS</Link>}
              <button onClick={logout} className="public-nav-cta ghost">SIGN OUT</button>
            </div>
          )}

          <button
            onClick={() => setDrawerOpen(true)}
            className="mobile-menu-btn"
            aria-label="Open menu"
          >
            <span />
          </button>

          {drawerOpen && <div className="drawer-scrim open" onClick={() => setDrawerOpen(false)} />}
          <div className={"mobile-drawer " + (drawerOpen ? "open" : "")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <a
                href="/"
                onClick={handleBrandClick}
                aria-label="Combined Intelligence — home"
                style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, color: "inherit" }}
              >
                <CILogoMark size={32} />
                <div className="serif" style={{ fontSize: 14, textTransform: "uppercase", color: "#fff" }}>
                  Combined Intelligence
                </div>
              </a>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{ color: "#888", fontSize: 22, lineHeight: 1, padding: 4 }}
              >×</button>
            </div>
            {mobileNavItems.map((n) =>
              n.anchor ? (
                <a key={n.label} href={n.anchor} onClick={() => setDrawerOpen(false)}>
                  {n.label}
                </a>
              ) : (
                <Link key={n.label} to={n.to} onClick={() => setDrawerOpen(false)}>
                  {n.label}
                </Link>
              ),
            )}
            {isLanding && (
              <Link to="/reports/rwanda-financial-overview-2026" onClick={() => setDrawerOpen(false)}>
                READ FEATURED →
              </Link>
            )}
            {!user && (
              <a href={authApi.loginUrl()} style={{ color: "var(--purple)" }}>MEMBER ACCESS ›</a>
            )}
            {user && (
              <>
                {isAdmin && <Link to="/cms" onClick={() => setDrawerOpen(false)} style={{ color: "var(--purple)" }}>CMS</Link>}
                <button
                  onClick={() => { logout(); setDrawerOpen(false); }}
                  style={{
                    textAlign: "left", padding: "12px 4px", color: "#ddd",
                    fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".22em",
                    fontWeight: 700, borderBottom: "1px solid #1f1f1f", width: "100%",
                  }}
                >SIGN OUT</button>
              </>
            )}
          </div>
        </div>
      </div>

      {withSubstrip && (
        <div className="substrip">
          {SUBSTRIP.map((s) => (
            <span key={s.label} style={{ color: s.color || "#999" }}>{s.label}</span>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
