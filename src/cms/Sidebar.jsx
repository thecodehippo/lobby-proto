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
  const {
    brands,
    selectedBrand,
    selection,
    globalCategories,
    globalCategorySubcategories,
    actions,
    resolveCategory,
  } = useCms();

  const [expanded, setExpanded] = React.useState(() => {
    const s = new Set();
    if (selectedBrand?.id) s.add(selectedBrand.id);
    return s;
  });

  const isOpen = (id) => expanded.has(id);
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const markTouched = () =>
    setExpanded((prev) => {
      if (prev.__userTouched) return prev;
      prev.__userTouched = true;
      return prev;
    });

  // default-expand first global + first brand
  React.useEffect(() => {
    if (!globalCategories?.length) return;
    setExpanded((prev) => {
      if (prev.__userTouched) return prev;
      const next = new Set(prev);
      const first = globalCategories
        .filter((c) => c.parent_id == null)
        .sort((a, z) => (a.order || 0) - (z.order || 0))[0];
      if (first) next.add(first.id);
      return next;
    });
  }, [globalCategories]);

  React.useEffect(() => {
    if (!brands?.length) return;
    setExpanded((prev) => {
      if (prev.__userTouched) return prev;
      const next = new Set(prev);
      const firstBrand = brands[0];
      if (firstBrand) next.add(firstBrand.id);
      return next;
    });
  }, [brands]);

  return (
    <aside style={styles.sidebar}>
      {/* GLOBAL CATEGORIES */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionLeft}>
          <Globe size={14} />
          <span style={styles.sectionTitle}>Global Categories</span>
        </div>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            markTouched();
            actions.addGlobalCategory();
          }}
          style={styles.smallBtn}
          title="Add global category"
        >
          <Plus size={12} /> <span className="hide-sm">Global category</span>
        </button>
      </div>

      <GlobalTree
        isOpen={(id) => isOpen(id)}
        toggle={(id) => {
          markTouched();
          toggle(id);
        }}
        globalCategories={globalCategories}
        globalSubs={globalCategorySubcategories}
        actions={actions}
      />

      {/* BRANDS */}
      <div style={{ ...styles.sectionHeader, marginTop: 10 }}>
        <div style={styles.sectionLeft}>
          <span style={styles.sectionTitle}>Content</span>
        </div>
      </div>

      <ul style={styles.tree}>
        {brands.map((brand) => {
          const openNode = isOpen(brand.id);
          const isActive =
            selectedBrand &&
            selectedBrand.id === brand.id &&
            selection.scope === "brand";

          return (
            <li key={brand.id}>
              <div style={styles.row}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    markTouched();
                    toggle(brand.id);
                  }}
                  style={styles.chev}
                  aria-label={openNode ? "Collapse" : "Expand"}
                >
                  {openNode ? (
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
                    {openNode ? <FolderOpen size={14} /> : <Folder size={14} />}
                  </span>
                  <span style={styles.label}>{brand.name}</span>
                </button>

                <div style={styles.inline}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      markTouched();
                      actions.addCategory(brand.id);
                    }}
                    style={styles.iconBtn}
                    title="Add category"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {openNode && (
                <BrandTree
                  brand={brand}
                  selection={selection}
                  actions={actions}
                  isOpen={(id) => isOpen(id)}
                  onToggle={(id) => {
                    markTouched();
                    toggle(id);
                  }}
                  resolveCategory={resolveCategory}
                />
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function GlobalTree({ globalCategories, globalSubs, actions, isOpen, toggle }) {
  const { roots, childrenByParent, subByCat } = React.useMemo(() => {
    const cats = (globalCategories || []).slice();
    const roots = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const childrenByParent = new Map();
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

    const subByCat = new Map();
    (globalSubs || []).forEach((s) => {
      const pid = s.parent_category || null;
      if (pid == null) return;
      if (!subByCat.has(pid)) subByCat.set(pid, []);
      subByCat.get(pid).push(s);
    });
    subByCat.forEach((arr) =>
      arr.sort((a, z) => (a.order || 0) - (z.order || 0))
    );

    return { roots, childrenByParent, subByCat };
  }, [globalCategories, globalSubs]);

  const subs = (catId) => subByCat.get(catId) || [];
  const kids = (catId) => childrenByParent.get(catId) || [];

  return (
    <ul style={styles.tree}>
      {roots.map((gc) => {
        const open = isOpen(gc.id);
        return (
          <li key={gc.id}>
            <div style={styles.row}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(gc.id)}
                style={styles.chev}
                aria-label={open ? "Collapse" : "Expand"}
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => actions.selectGlobalCategory(gc.id)}
                style={styles.nodeBtn}
                title="Edit global category"
              >
                <span style={styles.icon}>
                  {open ? <FolderOpen size={14} /> : <Folder size={14} />}
                </span>
                <span style={styles.label}>{gc.name || gc.id}</span>
              </button>

              <div style={styles.inline}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.addGlobalSubcategoryToCategory(gc.id)}
                  style={styles.iconBtn}
                  title="Add global subcategory"
                >
                  <List size={14} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.moveGlobalCategoryUp(gc.id)}
                  style={styles.iconBtn}
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => actions.moveGlobalCategoryDown(gc.id)}
                  style={styles.iconBtn}
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>

            {open && (
              <ul style={{ ...styles.tree, marginLeft: 14 }}>
                {subs(gc.id).map((sc) => (
                  <li key={sc.id} style={styles.row}>
                    <span style={styles.chevStub} />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => actions.selectGlobalSubcategory(sc.id)}
                      style={{ ...styles.nodeBtn, ...styles.dashed }}
                      title="Edit global subcategory"
                    >
                      <span style={styles.icon}>
                        <List size={14} />
                      </span>
                      <span style={styles.label}>
                        {sc.subcategory_name || sc.name || sc.id}
                      </span>
                    </button>
                    <div style={styles.inline}>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          actions.moveGlobalSubcategoryUpInCategory(sc.id)
                        }
                        style={styles.iconBtn}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          actions.moveGlobalSubcategoryDownInCategory(sc.id)
                        }
                        style={styles.iconBtn}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </li>
                ))}

                {kids(gc.id).map((child) => {
                  const cOpen = isOpen(child.id);
                  return (
                    <li key={child.id}>
                      <div style={styles.row}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggle(child.id)}
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
                          onClick={() => actions.selectGlobalCategory(child.id)}
                          style={styles.nodeBtn}
                          title="Edit global category"
                        >
                          <span style={styles.icon}>
                            <CornerDownRight size={14} />
                          </span>
                          <span style={styles.label}>
                            {child.name || child.id}
                          </span>
                        </button>

                        <div style={styles.inline}>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.addGlobalSubcategoryToCategory(child.id)
                            }
                            style={styles.iconBtn}
                            title="Add global subcategory"
                          >
                            <List size={14} />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.moveGlobalCategoryUp(child.id)
                            }
                            style={styles.iconBtn}
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              actions.moveGlobalCategoryDown(child.id)
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
                          {(subs(child.id) || []).map((sc) => (
                            <li key={sc.id} style={styles.row}>
                              <span style={styles.chevStub} />
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                  actions.selectGlobalSubcategory(sc.id)
                                }
                                style={{ ...styles.nodeBtn, ...styles.dashed }}
                                title="Edit global subcategory"
                              >
                                <span style={styles.icon}>
                                  <List size={14} />
                                </span>
                                <span style={styles.label}>
                                  {sc.subcategory_name || sc.name || sc.id}
                                </span>
                              </button>
                              <div style={styles.inline}>
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    actions.moveGlobalSubcategoryUpInCategory(
                                      sc.id
                                    )
                                  }
                                  style={styles.iconBtn}
                                  title="Move up"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    actions.moveGlobalSubcategoryDownInCategory(
                                      sc.id
                                    )
                                  }
                                  style={styles.iconBtn}
                                  title="Move down"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            </li>
                          ))}
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

function BrandTree({
  brand,
  selection,
  actions,
  isOpen,
  onToggle,
  resolveCategory,
}) {
  const { parents, childrenByParent } = React.useMemo(() => {
    const cats = (brand.categories || []).slice();
    const parents = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const childrenByParent = new Map();
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

    return { parents, childrenByParent };
  }, [brand]);

  const subs = (catId) =>
    (resolveCategory(brand.id, catId)?.subcategories || []).slice();

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
                onClick={() => onToggle(p.id)}
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
                {subcats.map((sc, i) => {
                  const scActive =
                    selection.scope === "subcategory" && selection.id === sc.id;
                  return (
                    <li key={sc.id ?? `${p.id}-sc-${i}`} style={styles.row}>
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
                            sc.id ??
                            "Subcategory"}
                        </span>
                      </button>
                    </li>
                  );
                })}

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
                          onClick={() => onToggle(c.id)}
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
                          {subC.map((sc, i) => {
                            const scActive =
                              selection.scope === "subcategory" &&
                              selection.id === sc.id;
                            return (
                              <li
                                key={sc.id ?? `${c.id}-sc-${i}`}
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
                                      sc.id ??
                                      "Subcategory"}
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
