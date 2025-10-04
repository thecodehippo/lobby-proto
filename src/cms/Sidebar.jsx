// src/cms/Sidebar.jsx
import React, { useMemo } from "react";
import { Folder, CornerDownRight } from "lucide-react";
import { useCms } from "./CmsContext.jsx";

export default function Sidebar() {
  const { brands, selectedBrand, selection, actions } = useCms();
  const preventMouseFocus = (e) => e.preventDefault(); // keep keyboard focus ring, ignore mouse focus

  if (!selectedBrand) {
    return (
      <aside style={styles.sidebar}>
        <div style={{ ...styles.sectionTitle, marginTop: 0 }}>Brands</div>
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

  const { parents, childrenByParent } = useMemo(() => {
    const cats = (selectedBrand.categories || []).slice();
    const parents = cats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const map = new Map();
    parents.forEach((p) => map.set(p.id, []));
    cats
      .filter((c) => c.parent_id != null)
      .forEach((c) => {
        if (!map.has(c.parent_id)) map.set(c.parent_id, []);
        map.get(c.parent_id).push(c);
      });
    map.forEach((arr) => arr.sort((a, z) => (a.order || 0) - (z.order || 0)));
    return { parents, childrenByParent: map };
  }, [selectedBrand]);

  return (
    <aside style={styles.sidebar}>
      <div style={{ ...styles.sectionTitle, marginTop: 0 }}>Brands</div>
      <ul style={styles.brandList}>
        {brands.map((b) => (
          <li key={b.id}>
            <button
              onMouseDown={preventMouseFocus}
              style={{
                ...styles.brandBtn,
                ...(selection.scope === "brand" && selectedBrand.id === b.id
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

      <div style={{ ...styles.sectionTitle, marginTop: 12 }}>Categories</div>
      <ul style={styles.catList}>
        {parents.map((p) => {
          const kids = childrenByParent.get(p.id) || [];
          const activeParent =
            selection.scope === "category" && selection.id === p.id;
          return (
            <li key={p.id} style={{ marginBottom: 4 }}>
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
                {kids.length > 0 && (
                  <span style={styles.badge}>{kids.length}</span>
                )}
              </button>

              {kids.length > 0 && (
                <ul style={styles.childList}>
                  {kids.map((c) => {
                    const activeChild =
                      selection.scope === "category" && selection.id === c.id;
                    return (
                      <li key={c.id}>
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
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 280,
    borderRight: "1px solid #e5e7eb",
    padding: 12,
    background: "#fafafa",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
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
    width: "100%",
    textAlign: "left",
    borderRadius: 8,
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  },
  brandBtnActive: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
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
    marginLeft: 20,
    padding: 0,
    display: "grid",
    gap: 4,
  },

  catBtn: {
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    borderRadius: 8,
    padding: "6px 8px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
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
  iconWrap: { width: 16, display: "inline-flex", justifyContent: "center" },
  catName: {
    flex: 1,
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
  },
};
