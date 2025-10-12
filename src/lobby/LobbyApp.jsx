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

/** "/" -> first locale of first brand */
function NavigateToDefault() {
  const { brands } = useCms();
  const navigate = useNavigate();
  React.useEffect(() => {
    const b = brands[0];
    const firstLocale = b?.locales?.[0] || "en-GB";
    navigate(`/${encodeURIComponent(firstLocale)}`, { replace: true });
  }, [brands, navigate]);
  return null;
}

/** "/:locale" -> home parent if any, else first parent (by order) */
function NavigateToHome() {
  const { brands, resolveCategory, loading } = useCms();
  const { locale } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return; // 🔑 wait for data
    const b = brands[0];
    if (!b) return;

    const cats = b.categories || [];
    if (!cats.length) return;

    // All parents (root categories), ordered
    const roots = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    // Home among parents (if multiple flagged, first by order wins)
    const homeRoot = roots.find((c) => c.is_home) || null;

    // Prioritize categories with subcategories, then home, then first by order
    const categoryWithSubs = roots.find(cat => {
      const eff = resolveCategory(b.id, cat.id) || cat;
      return eff.subcategories && eff.subcategories.length > 0;
    });
    
    const target = categoryWithSubs || homeRoot || roots[0] || null;
    
    if (!target) return;

    const lower = String(locale).toLowerCase();
    const eff = resolveCategory(b.id, target.id) || target;
    const slugCandidate =
      eff.slug?.[locale] ||
      eff.slug?.[lower] ||
      target.slug?.[locale] ||
      target.slug?.[lower] ||
      "";
    const slug = String(slugCandidate).trim() || target.id;

    navigate(`/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`, {
      replace: true,
    });
  }, [brands, locale, navigate, resolveCategory, loading]);

  return null;
}

function CategoryPage() {
  const { brands, resolveCategory, loading } = useCms();
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
    selectedSubcategory,
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

    // find by effective slug (case-insensitive) then by id
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

    // parent context for subnav: siblings if child; children if parent
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

    // Effective subcategories (brand-first, then global)
    const subsForCat = (effCat?.subcategories || []).slice();

    // Selected subcategory (if on subcat route)
    let selectedSubcat = null;
    if (subcatSlug && subsForCat.length) {
      const t = String(subcatSlug).toLowerCase();
      selectedSubcat =
        subsForCat.find((s) => {
          const sSlug =
            s.slug?.[locale] ||
            s.slug?.[lower] ||
            s.slug?.[String(locale)] ||
            "";
          return String(sSlug).toLowerCase() === t;
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

  // If slug is stale/missing, redirect to the same home/first-parent fallback
  const navigate = useNavigate();
  React.useEffect(() => {
    if (loading) return; // 🔑 wait for data
    if (!brand || category) return;

    const cats = brand.categories || [];
    if (!cats.length) return;

    // Parents, ordered
    const roots = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const homeRoot = roots.find((c) => c.is_home) || null;
    const target = homeRoot || roots[0] || null;
    if (!target) return;

    const lower = String(locale).toLowerCase();
    const eff = resolveCategory(brand.id, target.id) || target;
    const slugCandidate =
      eff.slug?.[locale] ||
      eff.slug?.[lower] ||
      target.slug?.[locale] ||
      target.slug?.[lower] ||
      "";
    const fallbackSlug = String(slugCandidate).trim() || target.id;

    navigate(
      `/${encodeURIComponent(locale)}/${encodeURIComponent(fallbackSlug)}`,
      { replace: true }
    );
  }, [brand, category, locale, navigate, resolveCategory, loading]);

  if (!brand) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!category) return null; // redirect in-flight (only after !loading)

  const localeSafe = locale;
  const lowerLocale = String(localeSafe).toLowerCase();

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

      {/* Primary nav */}
      <nav style={styles.nav}>
        {allRootCats.map((c) => {
          const eff = resolveCategory(brand.id, c.id) || c;
          const slug =
            eff.slug?.[localeSafe] ||
            eff.slug?.[lowerLocale] ||
            c.slug?.[localeSafe] ||
            c.slug?.[lowerLocale] ||
            c.id;
          const active = c.id === category?.id || c.id === category.parent_id;
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

      {/* Secondary nav */}
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

      {/* Title */}
      <div style={styles.titleRow}>
        <h1 style={styles.h1}>
          {effCategory.nav_label?.[localeSafe] ||
            effCategory.nav_label?.[lowerLocale] ||
            ""}
        </h1>
      </div>

      {/* Modules */}
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
              subcategory={sc}
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

// Collection rule evaluation functions
function evaluateCollectionRules(game, rules) {
  if (rules.length === 0) return true;
  let result = evaluateCollectionRule(game, rules[0]);
  for (let i = 1; i < rules.length; i++) {
    const ruleResult = evaluateCollectionRule(game, rules[i]);
    if (rules[i].logic === 'AND') {
      result = result && ruleResult;
    } else {
      result = result || ruleResult;
    }
  }
  return result;
}

function evaluateCollectionRule(game, rule) {
  const gameValue = String(game[rule.field] || '').toLowerCase();
  const ruleValue = String(rule.value || '').toLowerCase();
  switch (rule.operator) {
    case '==':
      return gameValue === ruleValue;
    case '!=':
      return gameValue !== ruleValue;
    case 'contains':
      return gameValue.includes(ruleValue);
    case '>':
      return parseFloat(game[rule.field]) > parseFloat(rule.value);
    case '<':
      return parseFloat(game[rule.field]) < parseFloat(rule.value);
    default:
      return false;
  }
}

function ModuleBlock({ icon, label, labelSub, type, layout, href, active, subcategory }) {
  const [games, setGames] = React.useState([]);
  const [allGames, setAllGames] = React.useState([]);

  // Fetch all games on mount
  React.useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => setAllGames(data))
      .catch(err => console.error('Failed to load games:', err));
  }, []);

  // Filter games based on subcategory type
  React.useEffect(() => {
    if (!allGames.length) return;
    
    if (subcategory?.type === 'Collection' && subcategory?.collection?.rules?.length > 0) {
      // Collection: filter games by rules
      const filtered = allGames.filter(game => evaluateCollectionRules(game, subcategory.collection.rules));
      setGames(filtered);
    } else if (subcategory?.selected_games?.length > 0) {
      // Game List: use manually selected games
      const selectedGames = subcategory.selected_games.map(sg => {
        const game = allGames.find(g => g.gameid === sg.id);
        return game ? { ...game, order: subcategory.selected_games.findIndex(s => s.id === sg.id) } : null;
      }).filter(Boolean).sort((a, b) => a.order - b.order);
      setGames(selectedGames);
    } else {
      setGames([]);
    }
  }, [subcategory, allGames]);

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

      <div style={styles.moduleBody}>
        {(type === 'Game List' || type === 'Collection') && games.length > 0 ? (
          <div style={styles.gamesGrid}>
            {games.map(game => (
              <div key={game.gameid} style={styles.gameTile}>
                <div style={styles.gameImage}>
                  <Icon name="gamepad2" size={24} />
                </div>
                <div style={styles.gameInfo}>
                  <div style={styles.gameName}>{game.gamename}</div>
                  <div style={styles.gameStudio}>{game.studio}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.placeholderGrid}>
            <div style={styles.placeholderCard} />
            <div style={styles.placeholderCard} />
            <div style={styles.placeholderCard} />
            <div style={styles.placeholderCard} />
          </div>
        )}
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
  gamesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
  },
  gameTile: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 8,
    background: "#fff",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  gameImage: {
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f3f4f6",
    borderRadius: 6,
    marginBottom: 8,
    color: "#6b7280",
  },
  gameInfo: {
    textAlign: "center",
  },
  gameName: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 2,
    lineHeight: 1.2,
  },
  gameStudio: {
    fontSize: 10,
    color: "#6b7280",
  },

  empty: { padding: "16px", color: "#6b7280", fontStyle: "italic" },
};
