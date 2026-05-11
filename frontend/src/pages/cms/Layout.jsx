import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth.jsx";
import { CILogoMark, StyleTag } from "../../shared.jsx";

const NAV = [
  { to: "/cms/reports", label: "Reports" },
  { to: "/cms/jobs", label: "Jobs" },
];

export function CMSLayout() {
  const { user, logout } = useAuth();

  return (
    <>
      <StyleTag />
      <div className="cms-root">
        <aside className="cms-sidebar">
          <div className="sidebar-logo">
            <CILogoMark size={28} />
            <span className="cms-wordmark">CI Desk</span>
          </div>
          <nav className="sidebar-nav">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="sidebar-user">{user?.email}</span>
            <button onClick={logout} className="btn-ghost btn-sm">Sign out</button>
          </div>
        </aside>
        <main className="cms-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
