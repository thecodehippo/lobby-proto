// src/cms/Sidebar.jsx
import React, { useMemo } from "react";
import { Globe, Folder, CornerDownRight, List } from "lucide-react";
import { useCms } from "./CmsContext.jsx";

export default function Sidebar() {
  const { brands, selectedBrand, selection, globalSubcategories, actions } =
    useCms();
  const preventMouseFocus = (e) => e.preventDefault();

  // ---- GLOBAL SECTION ----
  const GlobalSection = () => (
    <>
      <div
        style={{
          ...styles.sectionTitle,
          marginTop: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Globe size={14} /> Global
        </span>
        <button
          onMouseDown={preventMouseFocus}
          onClick={actions.addGlobalSubcategory}
          title="Add global subcategory"
          style={styles.smallBtnAlt}
        >
          + Global subcategory
        </button>
      </div>

      <ul style={styles.globalList}>
        {globalSubcategories
          .slice()
          .sort((a, z) => (a.order || 0) - (z.order || 0))
          .map((g) => {
            const active =
              selection.scope === "g-subcategory" && selection.id === g.id;
            return (
              <li key={g.id}>
                <button
                  onMouseDown={preventMouseFocus}
                  onClick={() => actions.selectGlobalSubcategory(g.id)}
                  style={{
                    ...styles.globalBtn,
                    ...(active ? styles.catBtnSelected : {}),
                  }}
                  title="Global subcategory"
                >
                  {active ? (
                    <span style={styles.leftAccent} aria-hidden />
                  ) : null}
                  <span style={styles.iconWrap}>
                    <List size={14} />
                  </span>
                  <span style={styles.catName}>{g.name || g.id}</span>
                </button>
              </li>
            );
          })}
      </ul>
    </>
  );

  if (!selectedBrand) {
    return (
      <aside style={styles.sidebar}>
        <GlobalSection />
        <div style={{ ...styles.sectionTitle, marginTop: 12 }}>Brands</div>
        <ul style={styles.brandList}>
          {brands.map((b) => (
            <li key={b.id}>
              <button
                onMouseDown={preventMouseFocus}
                style={styles.brandBtn}
                onClick={() => actions.selectBrand(b.id)}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  // Build categories + subcategories map
  const { parents, childrenByParent, subcatsByCategory } = useMemo(() => {
    const cats = (selectedBrand.categories || []).slice();
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

    const subcatsByCategory = new Map();
    (selectedBrand.subcategories || []).forEach((s) => {
      if (!s.parent_category) return;
      if (!subcatsByCategory.has(s.parent_category))
        subcatsByCategory.set(s.parent_category, []);
      subcatsByCategory.get(s.parent_category).push(s);
    });
    subcatsByCategory.forEach((arr) =>
      arr.sort((a, z) => (a.order || 0) - (z.order || 0))
    );

    return { parents, childrenByParent, subcatsByCategory };
  }, [selectedBrand]);

  const subcatList = (categoryId) => subcatsByCategory.get(categoryId) || [];

  const addSubcategoryFromSidebar = () => {
    if (!selectedBrand) return;
    const parentCategoryId =
      selection.scope === "category" ? selection.id : null;
    actions.addSubcategory(selectedBrand.id, parentCategoryId);
  };

  return (
    <aside style={styles.sidebar}>
      <GlobalSection />

      <div style={{ ...styles.sectionTitle, marginTop: 12 }}>Brands</div>
      <ul style={styles.brandList}>
        {brands.map((b) => (
          <li key={b.id}>
            <button
              onMouseDown={preventMouseFocus}
              style={{
                ...styles.brandBtn,
                ...(selectedBrand.id === b.id && selection.scope === "brand"
                  ? styles.brandBtnActive
                  : {}),
              }}
              onClick={() => actions.selectBrand(b.id)}
            >
              {b.name}
            </button>
          </li>
        ))}
      </ul>

      <div
        style={{
          ...styles.sectionTitle,
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>Categories</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onMouseDown={preventMouseFocus}
            onClick={() => actions.addCategory(selectedBrand.id)}
            title="Add category"
            style={styles.smallBtn}
          >
            + Category
          </button>
          <button
            onMouseDown={preventMouseFocus}
            onClick={addSubcategoryFromSidebar}
            title={
              selection.scope === "category"
                ? "Add subcategory (mapped)"
                : "Add subcategory (unmapped)"
            }
            style={styles.smallBtnAlt}
          >
            + Subcategory
          </button>
        </div>
      </div>

      <ul style={styles.catList}>
        {parents.map((p) => {
          const kids = childrenByParent.get(p.id) || [];
          const activeParent =
            selection.scope === "category" && selection.id === p.id;
          const subcatsOfParent = subcatList(p.id);

          return (
            <li key={p.id} style={{ marginBottom: 4 }}>
              {/* Parent row with move controls */}
              <div style={styles.rowWithMoves}>
                <button
                  onMouseDown={preventMouseFocus}
                  onClick={() => actions.selectCategory(selectedBrand.id, p.id)}
                  style={{
                    ...styles.catBtn,
                    ...(activeParent ? styles.catBtnSelected : {}),
                  }}
                  title="Parent category"
                >
                  {activeParent ? (
                    <span style={styles.leftAccent} aria-hidden />
                  ) : null}
                  <span style={styles.iconWrap}>
                    <Folder size={14} />
                  </span>
                  <span style={styles.catName}>{p.name || p.id}</span>
                  {(kids.length > 0 || subcatsOfParent.length > 0) && (
                    <span style={styles.badge}>
                      {kids.length + subcatsOfParent.length}
                    </span>
                  )}
                </button>

                <div style={styles.moveCol}>
                  <button
                    onMouseDown={preventMouseFocus}
                    onClick={() =>
                      actions.moveCategoryUp(selectedBrand.id, p.id)
                    }
                    style={styles.moveBtn}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onMouseDown={preventMouseFocus}
                    onClick={() =>
                      actions.moveCategoryDown(selectedBrand.id, p.id)
                    }
                    style={styles.moveBtn}
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Parent's subcategories (only displayed_in_nav) */}
              {subcatsOfParent.length > 0 && (
                <ul style={styles.subcatList}>
                  {subcatsOfParent.map((sc) => {
                    const active =
                      selection.scope === "subcategory" &&
                      selection.id === sc.id;
                    return (
                      <li key={sc.id}>
                        <button
                          onMouseDown={preventMouseFocus}
                          onClick={() =>
                            actions.selectSubcategory(selectedBrand.id, sc.id)
                          }
                          style={{
                            ...styles.subcatBtn,
                            ...(active ? styles.catBtnSelected : {}),
                          }}
                          title="Subcategory"
                        >
                          {active ? (
                            <span style={styles.leftAccent} aria-hidden />
                          ) : null}
                          <span style={styles.iconWrap}>
                            <List size={14} />
                          </span>
                          <span style={styles.catName}>
                            {sc.subcategory_name || sc.id}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Child categories + their subcategories */}
              {kids.length > 0 && (
                <ul style={styles.childList}>
                  {kids.map((c) => {
                    const activeChild =
                      selection.scope === "category" && selection.id === c.id;
                    const subcatsOfChild = subcatList(c.id);

                    return (
                      <li key={c.id} style={{ marginBottom: 2 }}>
                        <div style={styles.rowWithMoves}>
                          <button
                            onMouseDown={preventMouseFocus}
                            onClick={() =>
                              actions.selectCategory(selectedBrand.id, c.id)
                            }
                            style={{
                              ...styles.catBtn,
                              ...styles.childIndent,
                              ...(activeChild ? styles.catBtnSelected : {}),
                              ...(c.displayed_in_nav ? {} : styles.dim),
                            }}
                            title={`Child of ${p.name || p.id}`}
                          >
                            {activeChild ? (
                              <span style={styles.leftAccent} aria-hidden />
                            ) : null}
                            <span style={styles.iconWrap}>
                              <CornerDownRight size={14} />
                            </span>
                            <span style={styles.catName}>{c.name || c.id}</span>
                            {subcatsOfChild.length > 0 && (
                              <span style={styles.badge}>
                                {subcatsOfChild.length}
                              </span>
                            )}
                          </button>

                          <div style={styles.moveCol}>
                            <button
                              onMouseDown={preventMouseFocus}
                              onClick={() =>
                                actions.moveCategoryUp(selectedBrand.id, c.id)
                              }
                              style={styles.moveBtn}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onMouseDown={preventMouseFocus}
                              onClick={() =>
                                actions.moveCategoryDown(selectedBrand.id, c.id)
                              }
                              style={styles.moveBtn}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {subcatsOfChild.length > 0 && (
                          <ul style={styles.subcatList}>
                            {subcatsOfChild.map((sc) => {
                              const active =
                                selection.scope === "subcategory" &&
                                selection.id === sc.id;
                              return (
                                <li key={sc.id}>
                                  <button
                                    onMouseDown={preventMouseFocus}
                                    onClick={() =>
                                      actions.selectSubcategory(
                                        selectedBrand.id,
                                        sc.id
                                      )
                                    }
                                    style={{
                                      ...styles.subcatBtn,
                                      ...(active ? styles.catBtnSelected : {}),
                                    }}
                                    title="Subcategory"
                                  >
                                    {active ? (
                                      <span
                                        style={styles.leftAccent}
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span style={styles.iconWrap}>
                                      <List size={14} />
                                    </span>
                                    <span style={styles.catName}>
                                      {sc.subcategory_name || sc.id}
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
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 272,
    borderRight: "1px solid #e5e7eb",
    padding: 10,
    background: "#fafafa",
    overflowX: "hidden",
    boxSizing: "border-box",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
  },

  smallBtn: {
    fontSize: 12,
    padding: "2px 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
  },
  smallBtnAlt: {
    fontSize: 12,
    padding: "2px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#f9fafb",
    cursor: "pointer",
  },

  globalList: {
    listStyle: "none",
    margin: 8,
    marginLeft: 0,
    padding: 0,
    display: "grid",
    gap: 4,
  },
  globalBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "5px 7px",
    border: "1px dashed #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  brandList: {
    listStyle: "none",
    margin: 8,
    marginLeft: 0,
    padding: 0,
    display: "grid",
    gap: 6,
  },
  brandBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "7px 9px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  brandBtnActive: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
  },

  catList: {
    listStyle: "none",
    margin: 8,
    marginLeft: 0,
    padding: 0,
    display: "grid",
    gap: 4,
  },
  childList: {
    listStyle: "none",
    margin: 4,
    marginLeft: 16,
    padding: 0,
    display: "grid",
    gap: 4,
  },

  rowWithMoves: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 6,
    alignItems: "center",
  },

  catBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "5px 7px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  subcatList: {
    listStyle: "none",
    margin: 4,
    marginLeft: 16,
    padding: 0,
    display: "grid",
    gap: 4,
  },
  subcatBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "5px 7px",
    border: "1px dashed #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  catBtnSelected: { background: "#eef2ff" },
  leftAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    background: "#4f46e5",
  },

  childIndent: { paddingLeft: 8 },
  dim: { opacity: 0.7 },

  iconWrap: {
    width: 16,
    display: "inline-flex",
    justifyContent: "center",
    flex: "0 0 16px",
  },
  catName: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 999,
    background: "#e5e7eb",
    color: "#374151",
    flex: "0 0 auto",
  },

  moveCol: { display: "grid", gap: 4 },
  moveBtn: {
    padding: "4px 6px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    lineHeight: 1,
    fontSize: 12,
  },
};
