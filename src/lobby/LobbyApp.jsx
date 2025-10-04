// src/lobby/LobbyApp.jsx
import React from "react";
import {
  Routes,
  Route,
  useParams,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useCms } from "@/cms/CmsContext.jsx";
import Header from "./Header.jsx";
import NavBar from "./NavBar.jsx";
import SecondaryNav from "./SecondaryNav.jsx";

// ---------- helpers ----------
const labelFor = (cat, loc) =>
  (cat.nav_label && cat.nav_label[loc]) || cat.name || cat.id;
const slugFor = (cat, loc) =>
  (cat.slug && cat.slug[loc] && cat.slug[loc].trim()) || "";
const pathFor = (cat, loc) => `/${slugFor(cat, loc) || cat.id}`; // "/<slug>" or "/<id>"

// ---------- shell ----------
function LobbyShell() {
  const { selectedBrand } = useCms();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Locale comes ONLY from URL. Fallback to first brand locale when missing.
  const parts = pathname.split("/").filter(Boolean);
  const currentLocale = parts[0] || selectedBrand?.locales?.[0] || null;
  const currentSlug = parts[1] || null;

  const onChangeLocale = (newLocale) => {
    if (!selectedBrand) return;
    if (currentSlug) {
      // try to keep same category across locales
      const cats = selectedBrand.categories;
      const catBySlug = cats.find(
        (c) => slugFor(c, currentLocale) === currentSlug
      );
      const cat = catBySlug || cats.find((c) => c.id === currentSlug);
      if (cat) {
        navigate(`/${newLocale}${pathFor(cat, newLocale)}`, { replace: true });
        return;
      }
    }
    // no category in path or couldn’t resolve -> go to that locale’s home
    navigate(`/${newLocale}`, { replace: true });
  };

  return (
    <div style={styles.wrapper}>
      <Header
        brandName={selectedBrand?.name}
        locales={selectedBrand?.locales || []}
        locale={currentLocale}
        onChangeLocale={onChangeLocale}
      />
      {/* NavBar derives locale from URL and prefixes links */}
      <NavBar />
      <SecondaryNav />

      <main style={styles.main}>
        <div style={styles.content}>
          <Routes>
            {/* "/" -> redirect to "/<first-locale>" */}
            <Route path="/" element={<DefaultLocaleRedirect />} />
            {/* "/:locale" -> redirect to that locale's home */}
            <Route path="/:locale" element={<LocaleHomeRedirect />} />
            {/* "/:locale/:slug" -> category page (nav or hidden) */}
            <Route path="/:locale/:slug" element={<CategoryRoute />} />
            {/* unknown -> root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ---------- redirects ----------
function DefaultLocaleRedirect() {
  const { selectedBrand } = useCms();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!selectedBrand) return;
    const firstLoc = selectedBrand.locales?.[0] || "en-GB";
    navigate(`/${firstLoc}`, { replace: true });
  }, [selectedBrand, navigate]);
  return <div>Loading…</div>;
}

function LocaleHomeRedirect() {
  const { selectedBrand } = useCms();
  const { locale } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!selectedBrand || !locale) return;
    const parents = selectedBrand.categories.filter(
      (c) => c.parent_id === null
    );
    const home =
      parents.find((c) => c.is_home) ||
      parents.find((c) => c.displayed_in_nav) ||
      parents[0];
    if (home) navigate(`/${locale}${pathFor(home, locale)}`, { replace: true });
  }, [selectedBrand, locale, navigate]);
  return <div>Loading home…</div>;
}

// ---------- route: category (supports hidden & canonical slugs) ----------
function CategoryRoute() {
  const { selectedBrand } = useCms();
  const { locale, slug } = useParams();

  if (!selectedBrand) return <div style={{ padding: 16 }}>No brand.</div>;
  const loc = locale || selectedBrand.locales?.[0];

  // Match ANY category (even if displayed_in_nav is false)
  const bySlug = selectedBrand.categories.find(
    (c) => slug && slugFor(c, loc) === slug
  );
  const byId = selectedBrand.categories.find((c) => c.id === slug);
  const cat = bySlug || byId;

  if (!cat) return <Navigate to={`/${loc}`} replace />;

  // Canonicalize URL to locale-specific slug if available
  const desired = pathFor(cat, loc); // "/<slug>" or "/<id>" if no slug
  const current = `/${slug}`;
  if (desired !== current) {
    return <Navigate to={`/${loc}${desired}`} replace />;
  }

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>{labelFor(cat, loc)}</h2>
      <p>
        <strong>Category ID:</strong> {cat.id}
      </p>
      <p>
        <strong>Displayed in nav:</strong> {String(!!cat.displayed_in_nav)}
      </p>
      <p>
        <strong>Level:</strong>{" "}
        {cat.parent_id === null ? "Parent" : "Child of " + cat.parent_id}
      </p>
      <p>
        <strong>Slug ({loc}):</strong>{" "}
        {slugFor(cat, loc) || "(none set, using id in URL)"}
      </p>
      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        (Page content will render here from CMS layout/config)
      </div>
    </section>
  );
}

// ---------- top-level component (no BrowserRouter here) ----------
export default function LobbyApp() {
  const { selectedBrand, loading } = useCms();
  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (!selectedBrand) return <div style={{ padding: 20 }}>No brand found.</div>;
  return <LobbyShell />;
}

// ---------- styles ----------
const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#fff",
  },
  main: { flex: 1, padding: 16 },
  content: {
    padding: 16,
    border: "1px dashed #d1d5db",
    borderRadius: 12,
    background: "#ffffff",
  },
};
