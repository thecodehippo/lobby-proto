// src/cms/Sidebar.jsx
import React from "react";
import {
  Globe,
  Folder,
  FolderOpen,
  CornerDownRight,
  List,
  ChevronRight,
  ChevronDown,
  Plus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useCms } from "./CmsContext.jsx";

export default function Sidebar() {
  const { brands, selectedBrand, selection, globalSubcategories, actions } =
    useCms();

  // ---------- helpers to understand tree shape ----------
  const brandMeta = React.useMemo(() => {
    // Build fast lookups:
    // - first child category for each brand & category
    // - categories grouped by parent
    const mapFirstChild = new Map(); // key: node id (brand.id or category.id) -> first child category id
    const childrenByParent = new Map(); // key: category.id -> child list (sorted)
    const topByBrand = new Map(); // key: brand.id -> sorted top-level categories

    brands.forEach((b) => {
      const cats = (b.categories || []).slice();
      const byOrder = (a, z) => (a.order || 0) - (z.order || 0);

      const tops = cats.filter((c) => c.parent_id == null).sort(byOrder);
      topByBrand.set(b.id, tops);

      // brand -> first top-level category
      if (tops.length) mapFirstChild.set(b.id, tops[0].id);

      // map category children + first child for each category
      cats
        .filter((c) => c.parent_id != null)
        .forEach((c) => {
          if (!childrenByParent.has(c.parent_id))
            childrenByParent.set(c.parent_id, []);
          childrenByParent.get(c.parent_id).push(c);
        });

      childrenByParent.forEach((arr, pid) => arr.sort(byOrder));
      cats.forEach((c) => {
        const kids = childrenByParent.get(c.id) || [];
        if (kids.length) mapFirstChild.set(c.id, kids[0].id);
      });
    });

    return { mapFirstChild, topByBrand };
  }, [brands]);

  // ---------- expansion state ----------
  const [expanded, setExpanded] = React.useState(() => {
    const s = new Set();
    if (selectedBrand?.id) s.add(selectedBrand.id);
    return s;
  });

  // open/close with "open first child too" behavior
  const toggle = React.useCallback(
    (id) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        const willOpen = !next.has(id);
        if (willOpen) {
          next.add(id);
          const firstChild = brandMeta.mapFirstChild.get(id);
          if (firstChild) next.add(firstChild);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [brandMeta.mapFirstChild]
  );

  const isOpen = (id) => expanded.has(id);

  // Default expand first path on initial render / when brands first load
  React.useEffect(() => {
    if (!brands.length) return;
    setExpanded((prev) => {
      if (prev.size > 0) return prev; // don't override user's state
      const next = new Set(prev);
      const firstBrand = brands[0];
      if (!firstBrand) return prev;
      next.add(firstBrand.id);

      let current = brandMeta.mapFirstChild.get(firstBrand.id);
      while (current) {
        if (next.has(current)) break;
        next.add(current);
        const nextChild = brandMeta.mapFirstChild.get(current);
        if (nextChild && !next.has(nextChild)) {
          current = nextChild;
        } else {
          break;
        }
      }
      return next;
    });
  }, [brands, brandMeta.mapFirstChild]);

  return (
    <aside style={styles.sidebar}>
      {/* GLOBAL */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionLeft}>
          <Globe size={14} />
          <span style={styles.sectionTitle}>Global</span>
        </div>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={actions.addGlobalSubcategory}
          style={styles.smallBtn}
          title="Add global subcategory"
        >
          <Plus size={12} /> <span className="hide-sm">Global subcategory</span>
        </button>
      </div>

      <ul style={styles.tree}>
        {(globalSubcategories || [])
          .slice()
          .sort((a, z) => (a.order || 0) - (z.order || 0))
          .map((g) => {
            const active =
              selection.scope === "g-subcategory" && selection.id === g.id;
            return (
              <li key={g.id} style={styles.row}>
                <span style={styles.chevStub} />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.selectGlobalSubcategory(g.id)}
                  style={{
                    ...styles.nodeBtn,
                    ...styles.dashed,
                    ...(active ? styles.nodeActive : {}),
                  }}
                >
                  <span style={styles.icon}>
                    <List size={14} />
                  </span>
                  <span style={styles.label}>{g.name || g.id}</span>
                </button>
              </li>
            );
          })}
      </ul>

      {/* CONTENT / BRANDS */}
      <div style={{ ...styles.sectionHeader, marginTop: 10 }}>
        <div style={styles.sectionLeft}>
          <span style={styles.sectionTitle}>Content</span>
        </div>
      </div>

      <ul style={styles.tree}>
        {brands.map((brand) => {
          const open = isOpen(brand.id);
          const isActive =
            selectedBrand &&
            selectedBrand.id === brand.id &&
            selection.scope === "brand";
          return (
            <li key={brand.id}>
              <div style={styles.row}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(brand.id)}
                  style={styles.chev}
                  aria-label={open ? "Collapse" : "Expand"}
                >
                  {open ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.selectBrand(brand.id)}
                  style={{
                    ...styles.nodeBtn,
                    ...(isActive ? styles.nodeActive : {}),
                  }}
                >
                  <span style={styles.icon}>
                    {open ? <FolderOpen size={14} /> : <Folder size={14} />}
                  </span>
                  <span style={styles.label}>{brand.name}</span>
                </button>
                <div style={styles.inline}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => actions.addCategory(brand.id)}
                    style={styles.iconBtn}
                    title="Add category"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {open && (
                <BrandTree
                  brand={brand}
                  selection={selection}
                  actions={actions}
                  isOpen={isOpen}
                  toggle={toggle}
                />
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function BrandTree({ brand, selection, actions, isOpen, toggle }) {
  const { parents, childrenByParent, subByCat } = React.useMemo(() => {
    const cats = (brand.categories || []).slice();

    const parents = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const childrenByParent = new Map();
    parents.forEach((p) => childrenByParent.set(p.id, []));
    cats
      .filter((c) => c.parent_id != null)
      .forEach((c) => {
        if (!childrenByParent.has(c.parent_id))
          childrenByParent.set(c.parent_id, []);
        childrenByParent.get(c.parent_id).push(c);
      });
    childrenByParent.forEach((arr) =>
      arr.sort((a, z) => (a.order || 0) - (z.order || 0))
    );

    // Robust subcategory grouping (supports multiple parent keys and nested)
    const getParentCategoryId = (s) =>
      s.parent_category_id ?? s.parent_id ?? s.parent_category ?? null;

    const subByCat = new Map();

    // brand-level subcategories with parent pointer
    (brand.subcategories || []).forEach((s) => {
      const pid = getParentCategoryId(s);
      if (pid == null) return;
      if (!subByCat.has(pid)) subByCat.set(pid, []);
      subByCat.get(pid).push(s);
    });

    // nested subcategories on categories
    (brand.categories || []).forEach((cat) => {
      const nested = cat.subcategories || [];
      if (!nested.length) return;
      if (!subByCat.has(cat.id)) subByCat.set(cat.id, []);
      subByCat.get(cat.id).push(...nested);
    });

    subByCat.forEach((arr) =>
      arr.sort((a, z) => (a.order || 0) - (z.order || 0))
    );

    return { parents, childrenByParent, subByCat };
  }, [brand]);

  const subs = (catId) => subByCat.get(catId) || [];

  return (
    <ul style={{ ...styles.tree, marginLeft: 14 }}>
      {parents.map((p) => {
        const open = isOpen(p.id);
        const active = selection.scope === "category" && selection.id === p.id;
        const kids = childrenByParent.get(p.id) || [];
        const subcats = subs(p.id);

        return (
          <li key={p.id}>
            <div style={styles.row}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(p.id)}
                style={styles.chev}
                aria-label={open ? "Collapse" : "Expand"}
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => actions.selectCategory(brand.id, p.id)}
                style={{
                  ...styles.nodeBtn,
                  ...(active ? styles.nodeActive : {}),
                }}
              >
                <span style={styles.icon}>
                  <Folder size={14} />
                </span>
                <span style={styles.label}>{p.name || p.id}</span>
              </button>
              <div style={styles.inline}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.addSubcategory(brand.id, p.id)}
                  style={styles.iconBtn}
                  title="Add subcategory"
                >
                  <List size={14} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.moveCategoryUp(brand.id, p.id)}
                  style={styles.iconBtn}
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.moveCategoryDown(brand.id, p.id)}
                  style={styles.iconBtn}
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>

            {open && (
              <ul style={{ ...styles.tree, marginLeft: 14 }}>
                {/* subcategories under parent */}
                {subcats.map((sc) => {
                  const scActive =
                    selection.scope === "subcategory" && selection.id === sc.id;
                  return (
                    <li
                      key={sc.id ?? `${p.id}-sc-${sc.slug || sc.name}`}
                      style={styles.row}
                    >
                      <span style={styles.chevStub} />
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          actions.selectSubcategory(brand.id, sc.id)
                        }
                        style={{
                          ...styles.nodeBtn,
                          ...styles.dashed,
                          ...(scActive ? styles.nodeActive : {}),
                        }}
                      >
                        <span style={styles.icon}>
                          <List size={14} />
                        </span>
                        <span style={styles.label}>
                          {sc.name ?? sc.title ?? sc.subcategory_name ?? sc.id}
                        </span>
                      </button>
                    </li>
                  );
                })}

                {/* child categories */}
                {kids.map((c) => {
                  const cOpen = isOpen(c.id);
                  const cActive =
                    selection.scope === "category" && selection.id === c.id;
                  const subC = subs(c.id);

                  return (
                    <li key={c.id}>
                      <div style={styles.row}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggle(c.id)}
                          style={styles.chev}
                          aria-label={cOpen ? "Collapse" : "Expand"}
                        >
                          {cOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => actions.selectCategory(brand.id, c.id)}
                          style={{
                            ...styles.nodeBtn,
                            ...(cActive ? styles.nodeActive : {}),
                          }}
                        >
                          <span style={styles.icon}>
                            <CornerDownRight size={14} />
                          </span>
                          <span style={styles.label}>{c.name || c.id}</span>
                        </button>
                        <div style={styles.inline}>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.addSubcategory(brand.id, c.id)
                            }
                            style={styles.iconBtn}
                            title="Add subcategory"
                          >
                            <List size={14} />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.moveCategoryUp(brand.id, c.id)
                            }
                            style={styles.iconBtn}
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.moveCategoryDown(brand.id, c.id)
                            }
                            style={styles.iconBtn}
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>

                      {cOpen && (
                        <ul style={{ ...styles.tree, marginLeft: 14 }}>
                          {subC.map((sc) => {
                            const scActive =
                              selection.scope === "subcategory" &&
                              selection.id === sc.id;
                            return (
                              <li
                                key={
                                  sc.id ?? `${c.id}-sc-${sc.slug || sc.name}`
                                }
                                style={styles.row}
                              >
                                <span style={styles.chevStub} />
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    actions.selectSubcategory(brand.id, sc.id)
                                  }
                                  style={{
                                    ...styles.nodeBtn,
                                    ...styles.dashed,
                                    ...(scActive ? styles.nodeActive : {}),
                                  }}
                                >
                                  <span style={styles.icon}>
                                    <List size={14} />
                                  </span>
                                  <span style={styles.label}>
                                    {sc.name ??
                                      sc.title ??
                                      sc.subcategory_name ??
                                      sc.id}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- styles ---------------- */

const styles = {
  sidebar: {
    width: "100%",
    borderRight: "1px solid #e5e7eb",
    padding: 10,
    background: "#fafafa",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionLeft: { display: "inline-flex", alignItems: "center", gap: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
  },

  tree: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 },
  row: {
    display: "grid",
    gridTemplateColumns: "18px 1fr auto",
    alignItems: "center",
    gap: 6,
  },

  chev: {
    width: 18,
    height: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
    background: "transparent",
    cursor: "pointer",
  },
  chevStub: { width: 18, height: 26 },

  nodeBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "6px 8px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  dashed: { borderStyle: "dashed" },
  nodeActive: { background: "#eef2ff" },

  icon: {
    width: 16,
    display: "inline-flex",
    justifyContent: "center",
    flex: "0 0 16px",
  },
  label: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  inline: { display: "inline-flex", gap: 4, alignItems: "center" },
  iconBtn: {
    padding: "4px 6px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 6,
    cursor: "pointer",
    lineHeight: 1,
  },

  smallBtn: {
    fontSize: 12,
    padding: "3px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
};
