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
import { evaluateTargeting } from "@/cms/targeting.js";
import { TargetingProvider, useTargeting } from "./TargetingContext.jsx";
import TargetingSimulator from "./TargetingSimulator.jsx";

export default function LobbyApp() {
  return (
    <TargetingProvider>
      <Routes>
        <Route path="/" element={<NavigateToDefault />} />
        <Route path="/:locale" element={<NavigateToHome />} />
        <Route path="/:locale/:categorySlug" element={<CategoryPage />} />
        <Route
          path="/:locale/:categorySlug/:subcatSlug"
          element={<CategoryPage />}
        />
      </Routes>
    </TargetingProvider>
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
  const { brands, resolveCategory } = useCms();
  const { locale } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    const b = brands[0];
    if (!b) return;
    const home = (b.categories || []).find((c) => c.is_home);
    if (!home) return;
    const eff = resolveCategory(b.id, home.id) || home;
    const slug =
      eff.slug?.[locale] ||
      eff.slug?.[String(locale).toLowerCase()] ||
      home.slug?.[locale] ||
      home.slug?.[String(locale).toLowerCase()] ||
      home.id;
    navigate(`/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`, {
      replace: true,
    });
  }, [brands, locale, navigate, resolveCategory]);
  return null;
}

function CategoryPage() {
  const { brands, resolveCategory } = useCms();
  const { locale, categorySlug, subcatSlug } = useParams();
  const brand = brands[0]; // bwincom for now
  const { updateTargeting, ...targetingContext } = useTargeting();

  const {
    category, // brand-local matched category
    effCategory, // effective (brand + global inheritance)
    parentForSubnav,
    subnavItems,
    allRootCats,
    subcategoriesForCategory,
    selectedSubcategory, // when subcat route present
  } = useMemo(() => {
    if (!brand) {
      return {
        category: null,
        effCategory: null,
        parentForSubnav: null,
        subnavItems: [],
        allRootCats: [],
        subcategoriesForCategory: [],
        selectedSubcategory: null,
      };
    }

    const cats = brand.categories || [];
    const lower = String(locale).toLowerCase();

    // helper: effective label/slug (tries exact locale then lowercase)
    const slugFor = (effCat) =>
      effCat?.slug?.[locale] ||
      effCat?.slug?.[lower] ||
      // fallback to brand-local slug if eff not present
      effCat?.slug?.[locale] ||
      effCat?.slug?.[lower];

    // Find category by matching against EFFECTIVE slug for this locale (case-insens), then by id
    const findCategoryBySlugOrId = (slugVal) => {
      const target = String(slugVal || "").toLowerCase();
      let hit =
        cats.find((c) => {
          const eff = resolveCategory(brand.id, c.id) || c;
          const s =
            eff?.slug?.[locale] ||
            eff?.slug?.[lower] ||
            c?.slug?.[locale] ||
            c?.slug?.[lower] ||
            "";
          return String(s).toLowerCase() === target;
        }) || cats.find((c) => c.id === slugVal);
      return hit || null;
    };

    const cat = findCategoryBySlugOrId(categorySlug);
    if (!cat) {
      // not found
      return {
        category: null,
        effCategory: null,
        parentForSubnav: null,
        subnavItems: [],
        allRootCats: [],
        subcategoriesForCategory: [],
        selectedSubcategory: null,
      };
    }

    const effCat = resolveCategory(brand.id, cat.id) || cat;

    // parent for subnav: if this cat has a parent, subnav shows siblings; else shows children
    const parent = cat.parent_id
      ? cats.find((c) => c.id === cat.parent_id) || null
      : cat;

    // roots for primary nav (parents only), filtered by effective displayed_in_nav and targeting
    const roots = cats
      .filter((c) => c.parent_id == null)
      .filter((c) => {
        const eff = resolveCategory(brand.id, c.id) || c;
        return !!eff.displayed_in_nav && evaluateTargeting(c.targeting, targetingContext);
      })
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    // siblings/children for secondary nav, filtered by effective displayed_in_nav and targeting
    const siblingsOrChildren = parent
      ? cats
          .filter((c) => c.parent_id === parent.id)
          .filter((c) => {
            const eff = resolveCategory(brand.id, c.id) || c;
            return !!eff.displayed_in_nav && evaluateTargeting(c.targeting, targetingContext);
          })
          .sort((a, z) => (a.order || 0) - (z.order || 0))
      : [];

    // EFFECTIVE subcategories for the selected category (brand-first, then global; no de-dupe)
    const subsForCat = (effCat?.subcategories || []).slice();

    // If subcat route present, find that subcategory by slug (or exact id) within effective subs
    let selectedSubcat = null;
    if (subcatSlug && subsForCat.length) {
      const target = String(subcatSlug).toLowerCase();
      selectedSubcat =
        subsForCat.find((s) => {
          const sSlug =
            s.slug?.[locale] ||
            s.slug?.[lower] ||
            s.slug?.[String(locale)] ||
            "";
          return String(sSlug).toLowerCase() === target;
        }) ||
        subsForCat.find((s) => s.id === subcatSlug) ||
        null;
    }

    return {
      category: cat,
      effCategory: effCat,
      parentForSubnav: parent,
      subnavItems: siblingsOrChildren,
      allRootCats: roots,
      subcategoriesForCategory: subsForCat,
      selectedSubcategory: selectedSubcat,
    };
  }, [brand, locale, categorySlug, subcatSlug, resolveCategory, targetingContext]);

  if (!brand) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!category || !effCategory)
    return <div style={{ padding: 16 }}>Category not found.</div>;

  const localeSafe = locale;
  const lowerLocale = String(localeSafe).toLowerCase();

  // If subcategory is specified but not found, just show category view (all modules)
  const modulesToShow = selectedSubcategory
    ? [selectedSubcategory]
    : subcategoriesForCategory;

  return (
    <div style={styles.page}>
      {/* Targeting Simulator */}
      <TargetingSimulator />
      
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>{brand.name}</div>
        <LocalePicker locales={brand.locales} current={localeSafe} />
      </header>

      {/* Primary nav (root categories shown if effective displayed_in_nav=true) */}
      <nav style={styles.nav}>
        {allRootCats.map((c) => {
          const eff = resolveCategory(brand.id, c.id) || c;
          const slug =
            eff.slug?.[localeSafe] ||
            eff.slug?.[lowerLocale] ||
            c.slug?.[localeSafe] ||
            c.slug?.[lowerLocale] ||
            c.id;
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
              {eff.nav_icon ? <Icon name={eff.nav_icon} size={16} /> : null}
              <span>
                {eff.nav_label?.[localeSafe] ||
                  eff.nav_label?.[lowerLocale] ||
                  ""}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary nav persists, tied to parentForSubnav (siblings-of-child or children-of-parent) */}
      {parentForSubnav && subnavItems.length > 0 && (
        <nav style={styles.subnav}>
          {subnavItems.map((c) => {
            const eff = resolveCategory(brand.id, c.id) || c;
            const slug =
              eff.slug?.[localeSafe] ||
              eff.slug?.[lowerLocale] ||
              c.slug?.[localeSafe] ||
              c.slug?.[lowerLocale] ||
              c.id;
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
                {eff.nav_icon ? <Icon name={eff.nav_icon} size={14} /> : null}
                <span>
                  {eff.nav_label?.[localeSafe] ||
                    eff.nav_label?.[lowerLocale] ||
                    ""}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Page title (use effective label) */}
      <div style={styles.titleRow}>
        <h1 style={styles.h1}>
          {effCategory.nav_label?.[localeSafe] ||
            effCategory.nav_label?.[lowerLocale] ||
            ""}
          {selectedSubcategory && (
            <span style={styles.h1Sub}>
              {selectedSubcategory.label?.[localeSafe] ||
              selectedSubcategory.label?.[lowerLocale]
                ? ` — ${
                    selectedSubcategory.label?.[localeSafe] ||
                    selectedSubcategory.label?.[lowerLocale]
                  }`
                : ""}
            </span>
          )}
        </h1>
      </div>

      {/* Modules (subcategory blocks, from effective list) */}
      <section style={styles.modulesWrap}>
        {modulesToShow.map((sc) => {
          const scSlug = sc.slug?.[localeSafe] || sc.slug?.[lowerLocale];
          const catSlug =
            effCategory.slug?.[localeSafe] ||
            effCategory.slug?.[lowerLocale] ||
            category.id;

          const link = scSlug
            ? `/${encodeURIComponent(localeSafe)}/${encodeURIComponent(
                catSlug
              )}/${encodeURIComponent(scSlug)}`
            : null;

          return (
            <ModuleBlock
              key={sc.id}
              icon={sc.icon}
              label={sc.label?.[localeSafe] || sc.label?.[lowerLocale] || ""}
              labelSub={
                sc.label_sub?.[localeSafe] || sc.label_sub?.[lowerLocale] || ""
              }
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
