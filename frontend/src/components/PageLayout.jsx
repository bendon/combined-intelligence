import { Link } from "react-router-dom";
import { GlobalNav } from "./GlobalNav.jsx";
import { CILogoMark, InstallPromptToast } from "../shared.jsx";

export function PageLayout({ children, withSubstrip = true, variant = "default" }) {
  return (
    <>
      <div className="ci-root">
        <GlobalNav withSubstrip={withSubstrip} variant={variant} />
        <main>{children}</main>
        <SiteFooter />
      </div>
      <InstallPromptToast />
    </>
  );
}

export function ProseLayout({ title, subtitle, children }) {
  return (
    <PageLayout>
      <header className="prose-header">
        <div className="prose-header-inner">
          <h1 className="prose-title serif">{title}</h1>
          {subtitle && <p className="prose-subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="prose-body">{children}</div>
    </PageLayout>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <div className="footer-brand-row">
            <CILogoMark size={32} />
            <div>
              <div className="footer-brand serif">Combined Intelligence</div>
              <div className="footer-tagline-x">SYNTHESIS · INEVITABILITY</div>
            </div>
          </div>
          <p className="footer-blurb">
            Editorial intelligence desk. Public-data only. BISE-triangulated. Ledger-sealed.
          </p>
        </div>
        <FooterCol title="Synthesis" links={[
          { label: "The Method",              to: "/synthesis/method" },
          { label: "Latest Reports",          to: "/synthesis/reports" },
          { label: "The Library",             to: "/synthesis/library" },
          { label: "Featured: Rwanda 2026",   to: "/reports/rwanda-financial-overview-2026" },
        ]} />
        <FooterCol title="Ledger" links={[
          { label: "Open Predictions",  to: "/ledger/open" },
          { label: "Resolved Claims",   to: "/ledger/resolved" },
          { label: "Calibration Plot",  to: "/ledger/calibration" },
          { label: "Outcomes",          to: "/ledger/outcomes" },
        ]} />
        <FooterCol title="Desk" links={[
          { label: "About",               to: "/desk/about" },
          { label: "Authors",             to: "/desk/authors" },
          { label: "Editorial Standards", to: "/desk/editorial-standards" },
          { label: "Contact",             to: "/desk/contact" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Terms",       to: "/legal/terms" },
          { label: "Privacy",     to: "/legal/privacy" },
          { label: "Methodology", to: "/legal/methodology" },
          { label: "Sources",     to: "/legal/sources" },
        ]} />
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} COMBINED INTELLIGENCE</span>
        <span className="footer-seal">SEAL · 9F4A·B21E · CI.SYNTH.Q2 · SHA-256</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="footer-col-title">{title}</div>
      {links.map(({ label, to }) => (
        <Link key={to} to={to} className="footer-link">{label}</Link>
      ))}
    </div>
  );
}
