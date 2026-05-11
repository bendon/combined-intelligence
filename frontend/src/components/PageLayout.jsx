import { Link } from "react-router-dom";
import { GlobalNav } from "./GlobalNav.jsx";
import { StyleTag } from "../shared.jsx";

export function PageLayout({ children, prose = false }) {
  return (
    <>
      <StyleTag />
      <div className="ci-root">
        <GlobalNav />
        <main className={prose ? "prose-layout" : "page-layout"}>
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

/* Wrapper for text-heavy pages: constrained width, big typography */
export function ProseLayout({ title, subtitle, children }) {
  return (
    <PageLayout prose>
      <div className="prose-header">
        <h1 className="prose-title">{title}</h1>
        {subtitle && <p className="prose-subtitle">{subtitle}</p>}
      </div>
      <div className="prose-body">{children}</div>
    </PageLayout>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col">
          <div className="footer-brand">Combined Intelligence</div>
          <p className="footer-tagline">Strategic foresight for frontier markets.</p>
        </div>
        <FooterLinks title="Synthesis" links={[
          { label: "The Method",     to: "/synthesis/method" },
          { label: "Latest Reports", to: "/synthesis/reports" },
          { label: "The Library",    to: "/synthesis/library" },
        ]} />
        <FooterLinks title="Ledger" links={[
          { label: "Open Predictions", to: "/ledger/open" },
          { label: "Resolved Claims",  to: "/ledger/resolved" },
          { label: "Calibration",      to: "/ledger/calibration" },
        ]} />
        <FooterLinks title="Desk" links={[
          { label: "About",               to: "/desk/about" },
          { label: "Authors",             to: "/desk/authors" },
          { label: "Editorial Standards", to: "/desk/editorial-standards" },
          { label: "Contact",             to: "/desk/contact" },
        ]} />
        <FooterLinks title="Legal" links={[
          { label: "Terms",       to: "/legal/terms" },
          { label: "Privacy",     to: "/legal/privacy" },
          { label: "Methodology", to: "/legal/methodology" },
          { label: "Sources",     to: "/legal/sources" },
        ]} />
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Combined Intelligence Desk</span>
        <span>combinedintelligence.us</span>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }) {
  return (
    <div className="footer-col">
      <div className="footer-col-title">{title}</div>
      {links.map(({ label, to }) => (
        <Link key={to} to={to} className="footer-link">{label}</Link>
      ))}
    </div>
  );
}
