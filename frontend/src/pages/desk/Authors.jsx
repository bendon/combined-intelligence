import { PageLayout } from "../../components/PageLayout.jsx";

const TEAM = [
  {
    name: "Combined Intelligence Desk",
    role: "Editorial team",
    bio: "The CI Desk is a collective of analysts with backgrounds in economics, political science, and financial analysis. Our team has worked across central banks, development finance institutions, and strategic advisory firms in sub-Saharan Africa, South-East Asia, and South America.",
    reports: [],
    initials: "CI",
  },
];

export function AuthorsPage() {
  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Authors</h1>
          <p className="section-page-sub">
            The analysts behind Combined Intelligence.
          </p>
        </div>

        <div className="authors-grid">
          {TEAM.map((author) => (
            <AuthorCard key={author.name} author={author} />
          ))}
        </div>

        <div style={{ marginTop: 60, padding: "32px 0", borderTop: "1px solid var(--border)" }}>
          <h2 style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, marginBottom: 12 }}>
            Contribute to the Desk
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
            We occasionally commission external analysis from specialists in specific markets or sectors.
            If you have deep expertise in a frontier market and an interest in structured analytical
            writing, we would be interested to hear from you.
          </p>
          <a href="/desk/contact" style={{ color: "var(--accent)", fontSize: 14, marginTop: 12, display: "inline-block" }}>
            Get in touch →
          </a>
        </div>
      </div>
    </PageLayout>
  );
}

function AuthorCard({ author }) {
  return (
    <div className="author-card">
      <div className="author-avatar">{author.initials}</div>
      <div className="author-info">
        <div className="author-name">{author.name}</div>
        <div className="author-role">{author.role}</div>
        <p className="author-bio">{author.bio}</p>
      </div>
    </div>
  );
}
