import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import { StyleTag } from "./shared.jsx";

// ── Lazy page imports ─────────────────────────────────────────────────────────
const LandingPage   = lazy(() => import("./pages/Landing.jsx").then(m => ({ default: m.LandingPage })));
const ReaderScreen  = lazy(() => import("./pages/Reader.jsx").then(m => ({ default: m.ReaderScreen })));

// Synthesis
const MethodPage        = lazy(() => import("./pages/synthesis/Method.jsx").then(m => ({ default: m.MethodPage })));
const LatestReportsPage = lazy(() => import("./pages/synthesis/LatestReports.jsx").then(m => ({ default: m.LatestReportsPage })));
const LibraryPage       = lazy(() => import("./pages/synthesis/Library.jsx").then(m => ({ default: m.LibraryPage })));

// Ledger
const OpenPredictionsPage = lazy(() => import("./pages/ledger/OpenPredictions.jsx").then(m => ({ default: m.OpenPredictionsPage })));
const ResolvedClaimsPage  = lazy(() => import("./pages/ledger/ResolvedClaims.jsx").then(m => ({ default: m.ResolvedClaimsPage })));
const CalibrationPlotPage = lazy(() => import("./pages/ledger/CalibrationPlot.jsx").then(m => ({ default: m.CalibrationPlotPage })));
const OutcomesPage        = lazy(() => import("./pages/ledger/Outcomes.jsx").then(m => ({ default: m.OutcomesPage })));

// Desk
const AboutPage             = lazy(() => import("./pages/desk/About.jsx").then(m => ({ default: m.AboutPage })));
const AuthorsPage           = lazy(() => import("./pages/desk/Authors.jsx").then(m => ({ default: m.AuthorsPage })));
const EditorialStandardsPage= lazy(() => import("./pages/desk/EditorialStandards.jsx").then(m => ({ default: m.EditorialStandardsPage })));
const ContactPage           = lazy(() => import("./pages/desk/Contact.jsx").then(m => ({ default: m.ContactPage })));

// Legal
const TermsPage       = lazy(() => import("./pages/legal/Terms.jsx").then(m => ({ default: m.TermsPage })));
const PrivacyPage     = lazy(() => import("./pages/legal/Privacy.jsx").then(m => ({ default: m.PrivacyPage })));
const MethodologyPage = lazy(() => import("./pages/legal/Methodology.jsx").then(m => ({ default: m.MethodologyPage })));
const SourcesPage     = lazy(() => import("./pages/legal/Sources.jsx").then(m => ({ default: m.SourcesPage })));

// CMS
const CMSLayout     = lazy(() => import("./pages/cms/Layout.jsx").then(m => ({ default: m.CMSLayout })));
const ReportsScreen = lazy(() => import("./pages/cms/Reports.jsx").then(m => ({ default: m.ReportsScreen })));
const EditorScreen  = lazy(() => import("./pages/cms/Editor.jsx").then(m => ({ default: m.EditorScreen })));
const JobsScreen    = lazy(() => import("./pages/cms/Jobs.jsx").then(m => ({ default: m.JobsScreen })));

function Spinner() {
  return (
    <>
      <StyleTag />
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0d0d14", color: "#6b7280",
        fontFamily: "Inter, sans-serif", fontSize: 14,
      }}>
        Loading…
      </div>
    </>
  );
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (!user || !["admin", "super_admin"].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Public */}
        <Route path="/"                 element={<LandingPage />} />
        <Route path="/reports/:slug"    element={<ReaderScreen />} />

        {/* SYNTHESIS */}
        <Route path="/synthesis/method"    element={<MethodPage />} />
        <Route path="/synthesis/reports"   element={<LatestReportsPage />} />
        <Route path="/synthesis/library"   element={<LibraryPage />} />
        <Route path="/synthesis"           element={<Navigate to="/synthesis/method" replace />} />

        {/* LEDGER */}
        <Route path="/ledger/open"        element={<OpenPredictionsPage />} />
        <Route path="/ledger/resolved"    element={<ResolvedClaimsPage />} />
        <Route path="/ledger/calibration" element={<CalibrationPlotPage />} />
        <Route path="/ledger/outcomes"    element={<OutcomesPage />} />
        <Route path="/ledger"             element={<Navigate to="/ledger/open" replace />} />

        {/* DESK */}
        <Route path="/desk/about"               element={<AboutPage />} />
        <Route path="/desk/authors"             element={<AuthorsPage />} />
        <Route path="/desk/editorial-standards" element={<EditorialStandardsPage />} />
        <Route path="/desk/contact"             element={<ContactPage />} />
        <Route path="/desk"                     element={<Navigate to="/desk/about" replace />} />

        {/* LEGAL */}
        <Route path="/legal/terms"       element={<TermsPage />} />
        <Route path="/legal/privacy"     element={<PrivacyPage />} />
        <Route path="/legal/methodology" element={<MethodologyPage />} />
        <Route path="/legal/sources"     element={<SourcesPage />} />
        <Route path="/legal"             element={<Navigate to="/legal/terms" replace />} />

        {/* CMS (admin-gated) */}
        <Route
          path="/cms/*"
          element={
            <AdminRoute>
              <CMSLayout />
            </AdminRoute>
          }
        >
          <Route index                   element={<ReportsScreen />} />
          <Route path="reports"          element={<ReportsScreen />} />
          <Route path="reports/:id/edit" element={<EditorScreen />} />
          <Route path="jobs"             element={<JobsScreen />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
