// src/lobby/LobbyApp.jsx
import React, { useMemo } from "react";
import {
  Routes,
  Route,
  useParams,
  useNavigate,
  Link,
  Navigate,
} from "react-router-dom";
import { useCms } from "@/cms/CmsContext.jsx";
import Icon from "@/shared/Icon.jsx";

export default function LobbyApp() {
  return (
    <Routes>
      <Route path="/" element={<NavigateToDefault />} />
      <Route path="/:locale" element={<NavigateToHome />} />
      <Route path="/:locale/:categorySlug" element={<CategoryPage />} />
      <Route
        path="/:locale/:categorySlug/:subcatSlug"
        element={<CategoryPage />}
      />
    </Routes>
  );
}

function NavigateToDefault() {
  const { brands } = useCms();
  const navigate = useNavigate();
  React.useEffect(() => {
    const b = brands[0];
    const defaultLocale = b?.locales?.[0] || "en-GB";
    navigate(`/${encodeURIComponent(defaultLocale)}`, { replace: true });
  }, [brands, navigate]);
  return null;
}

function NavigateToHome() {
  const { brands } = useCms();
  const { locale } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    const b = brands[0];
    if (!b) return;
    const home = (b.categories || []).find((c) => c.is_home);
    const homeSlug = home?.slug?.[locale] || home?.id;
    navigate(`/${encodeURIComponent(locale)}/${encodeURIComponent(homeSlug)}`, {
      replace: true,
    });
  }, [brands, locale, navigate]);
  return null;
}

function CategoryPage() {
  const { brands } = useCms();
  const { locale, categorySlug, subcatSlug } = useParams();
  const brand = brands[0]; // bwincom for now

  const {
    category,
    parentForSubnav,
    subnavItems,
    allRootCats,
    subcategoriesForCategory,
    selectedSubcategory, // when subcat route
  } = useMemo(() => {
    if (!brand) {
      return {
        category: null,
        parentForSubnav: null,
        subnavItems: [],
        allRootCats: [],
        subcategoriesForCategory: [],
        selectedSubcategory: null,
      };
    }

    const cats = brand.categories || [];
    const subcats = brand.subcategories || [];

    const findCategoryBySlugOrId = (slugVal) =>
      cats.find(
        (c) =>
          (c.slug?.[locale] || "").toLowerCase() ===
          String(slugVal).toLowerCase()
      ) || cats.find((c) => c.id === slugVal);

    const cat = findCategoryBySlugOrId(categorySlug) || null;
    const parent = cat
      ? cat.parent_id
        ? cats.find((c) => c.id === cat.parent_id) || null
        : cat
      : null;

    const siblingsOrChildren = parent
      ? cats
          .filter((c) => c.parent_id === parent.id)
          .sort((a, z) => (a.order || 0) - (z.order || 0))
      : [];

    const roots = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const subsForCat = cat
      ? subcats
          .filter((s) => s.parent_category === cat.id)
          .sort((a, z) => (a.order || 0) - (z.order || 0))
      : [];

    // if subcat route present, find that subcategory under this category by slug (or exact id)
    let selectedSubcat = null;
    if (cat && subcatSlug) {
      selectedSubcat =
        subsForCat.find(
          (s) =>
            (s.slug?.[locale] || "").toLowerCase() ===
            String(subcatSlug).toLowerCase()
        ) ||
        subsForCat.find((s) => s.id === subcatSlug) ||
        null;
    }

    return {
      category: cat,
      parentForSubnav: parent,
      subnavItems: siblingsOrChildren,
      allRootCats: roots,
      subcategoriesForCategory: subsForCat,
      selectedSubcategory: selectedSubcat,
    };
  }, [brand, locale, categorySlug, subcatSlug]);

  if (!brand) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!category) return <div style={{ padding: 16 }}>Category not found.</div>;

  const localeSafe = locale;

  // If subcategory is specified but not found, just show category view (all modules)
  const modulesToShow = selectedSubcategory
    ? [selectedSubcategory]
    : subcategoriesForCategory;

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>{brand.name}</div>
        <LocalePicker locales={brand.locales} current={localeSafe} />
      </header>

      {/* Primary nav (root categories) */}
      <nav style={styles.nav}>
        {allRootCats.map((c) => {
          const slug = c.slug?.[localeSafe] || c.id;
          const active = c.id === category.id || c.id === category.parent_id;
          return (
            <Link
              key={c.id}
              to={`/${encodeURIComponent(localeSafe)}/${encodeURIComponent(
                slug
              )}`}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : {}),
              }}
            >
              {c.nav_icon ? <Icon name={c.nav_icon} size={16} /> : null}
              <span>{c.nav_label?.[localeSafe] || ""}</span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary nav persists, tied to parentForSubnav (siblings-of-child or children-of-parent) */}
      {parentForSubnav && subnavItems.length > 0 && (
        <nav style={styles.subnav}>
          {subnavItems.map((c) => {
            const slug = c.slug?.[localeSafe] || c.id;
            const active = c.id === category.id;
            return (
              <Link
                key={c.id}
                to={`/${encodeURIComponent(localeSafe)}/${encodeURIComponent(
                  slug
                )}`}
                style={{
                  ...styles.subnavItem,
                  ...(active ? styles.subnavItemActive : {}),
                }}
              >
                {c.nav_icon ? <Icon name={c.nav_icon} size={14} /> : null}
                <span>{c.nav_label?.[localeSafe] || ""}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Page title */}
      <div style={styles.titleRow}>
        <h1 style={styles.h1}>
          {category.nav_label?.[localeSafe] || ""}
          {selectedSubcategory && (
            <span style={styles.h1Sub}>
              {/* separator + subcat label if available */}
              {selectedSubcategory.label?.[localeSafe]
                ? ` — ${selectedSubcategory.label?.[localeSafe]}`
                : ""}
            </span>
          )}
        </h1>
      </div>

      {/* Modules (subcategory blocks) */}
      <section style={styles.modulesWrap}>
        {modulesToShow.map((sc) => {
          const scSlug = sc.slug?.[localeSafe];
          const link = scSlug
            ? `/${encodeURIComponent(localeSafe)}/${encodeURIComponent(
                category.slug?.[localeSafe] || category.id
              )}/${encodeURIComponent(scSlug)}`
            : null;

          return (
            <ModuleBlock
              key={sc.id}
              icon={sc.icon}
              label={sc.label?.[localeSafe] || ""}
              labelSub={sc.label_sub?.[localeSafe] || ""}
              type={sc.type}
              layout={sc.layout_type}
              href={link}
              active={!!selectedSubcategory && selectedSubcategory.id === sc.id}
            />
          );
        })}

        {modulesToShow.length === 0 && (
          <div style={styles.empty}>
            No subcategories configured for this category.
          </div>
        )}
      </section>
    </div>
  );
}

function LocalePicker({ locales, current }) {
  const navigate = useNavigate();
  const { categorySlug, subcatSlug } = useParams();
  return (
    <div style={styles.localeWrap}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value;
          // Keep current category/subcategory slug when switching locale
          if (subcatSlug) {
            navigate(
              `/${encodeURIComponent(next)}/${encodeURIComponent(
                categorySlug
              )}/${encodeURIComponent(subcatSlug)}`
            );
          } else {
            navigate(
              `/${encodeURIComponent(next)}/${encodeURIComponent(categorySlug)}`
            );
          }
        }}
        style={styles.localeSelect}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function ModuleBlock({ icon, label, labelSub, type, layout, href, active }) {
  const headerInner = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <div>
        {label ? <div style={styles.moduleTitle}>{label}</div> : null}
        {labelSub ? <div style={styles.moduleSub}>{labelSub}</div> : null}
      </div>
    </div>
  );

  return (
    <article
      style={{ ...styles.module, ...(active ? styles.moduleActive : {}) }}
    >
      <div style={styles.moduleHeader}>
        {href ? (
          <Link to={href} style={styles.moduleHeaderLink}>
            {headerInner}
          </Link>
        ) : (
          headerInner
        )}
        <div style={styles.moduleMeta}>
          <span style={styles.metaPill}>{type}</span>
          <span style={styles.metaPill}>{layout}</span>
        </div>
      </div>

      {/* empty body for now */}
      <div style={styles.moduleBody}>
        <div style={styles.placeholderGrid}>
          <div style={styles.placeholderCard} />
          <div style={styles.placeholderCard} />
          <div style={styles.placeholderCard} />
          <div style={styles.placeholderCard} />
        </div>
      </div>
    </article>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#fff" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  brand: { fontWeight: 700, fontSize: 18 },
  localeWrap: {},
  localeSelect: {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
  },

  nav: {
    display: "flex",
    gap: 8,
    padding: "8px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  navItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    textDecoration: "none",
    color: "#111827",
    background: "#fff",
  },
  navItemActive: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
  },

  subnav: {
    display: "flex",
    gap: 8,
    padding: "8px 16px",
    borderBottom: "1px solid #f3f4f6",
    background: "#fafafa",
  },
  subnavItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    textDecoration: "none",
    color: "#111827",
    background: "#fff",
  },
  subnavItemActive: { background: "#eef2ff", border: "1px solid #e5e7eb" },

  titleRow: { padding: "14px 16px" },
  h1: { margin: 0, fontSize: 20 },
  h1Sub: { fontWeight: 400, fontSize: 16, color: "#6b7280" },

  modulesWrap: { padding: "8px 16px", display: "grid", gap: 12 },
  module: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  moduleActive: { boxShadow: "inset 0 0 0 2px #4f46e5" },
  moduleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
  },
  moduleHeaderLink: { textDecoration: "none", color: "inherit" },
  moduleTitle: { fontWeight: 600 },
  moduleSub: { fontSize: 12, color: "#6b7280" },
  moduleMeta: { display: "flex", gap: 6 },
  metaPill: {
    fontSize: 12,
    padding: "2px 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    background: "#fff",
  },

  moduleBody: { padding: "12px" },
  placeholderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  placeholderCard: {
    height: 80,
    border: "1px dashed #d1d5db",
    borderRadius: 10,
    background: "#f9fafb",
  },

  empty: { padding: "16px", color: "#6b7280", fontStyle: "italic" },
};
