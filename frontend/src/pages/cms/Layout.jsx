import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth.jsx";
import { CILogoMark, TickerBar, Icons, useClock } from "../../shared.jsx";

const NAV = [
  { to: "/cms/reports", label: "Reports", Icon: Icons.Archive },
  { to: "/cms/jobs",    label: "Jobs",    Icon: Icons.Bolt, hot: true },
];

const VIEW_PUBLIC = [
  { to: "/",                                          label: "Landing Page", Icon: Icons.Globe },
  { to: "/reports/rwanda-financial-overview-2026",    label: "Featured Reader", Icon: Icons.Book },
];

export function CMSLayout() {
  const { user, logout } = useAuth();
  const now = useClock(60_000);
  const clock = `UTC ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} · CI.SYNTH.Q2`;
  const initials = (user?.email || "??").slice(0, 2).toUpperCase();

  return (
    <>
      <TickerBar clock={clock} />
      <div className="cms-root">
        <aside className="cms-sidebar">
          <div className="cms-sidebar-brand">
            <CILogoMark size={34} />
            <div>
              <div className="cms-sidebar-name serif">Combined Intelligence</div>
              <div className="cms-sidebar-tagline">The Synthesis of Inevitability</div>
            </div>
          </div>

          <div className="cms-sidebar-nav">
            <div className="cms-sidebar-header">WORKBENCH</div>
            {NAV.map(({ to, label, Icon, hot }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `cms-sidebar-link${isActive ? " active" : ""}`}
              >
                <Icon size={14} color="currentColor" />
                <span style={{ flex: 1 }}>{label}</span>
                {hot && <span style={{ width: 6, height: 6, background: "var(--orange)", animation: "pulse-dot 1.4s ease-in-out infinite" }} />}
              </NavLink>
            ))}

            <div className="cms-sidebar-header" style={{ marginTop: 16 }}>VIEW PUBLIC</div>
            {VIEW_PUBLIC.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className="cms-sidebar-link">
                <Icon size={14} color="currentColor" />
                <span style={{ flex: 1 }}>{label}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--blue)", letterSpacing: ".06em" }}>→</span>
              </NavLink>
            ))}
          </div>

          <div className="cms-sidebar-footer">
            <div className="cms-sidebar-avatar">{initials}</div>
            <div className="cms-sidebar-user">
              <div className="cms-sidebar-user-name">{user?.email || "anonymous"}</div>
              <div className="cms-sidebar-user-role">{(user?.role || "").replace("_", " ").toUpperCase()}</div>
            </div>
            <button onClick={logout} aria-label="Sign out" style={{ padding: 6, color: "#666" }}>
              <Icons.Logout size={14} color="#888" />
            </button>
          </div>
        </aside>

        <main className="cms-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
