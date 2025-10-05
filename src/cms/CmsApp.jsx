// src/cms/CmsApp.jsx
import React from "react";
import { useCms } from "./CmsContext.jsx";

import Sidebar from "./Sidebar.jsx";
import BrandEditor from "./BrandEditor.jsx";
import CategoryEditor from "./CategoryEditor.jsx";
import SubcategoryEditor from "./SubcategoryEditor.jsx";

export default function CmsApp() {
  const { loading, selection, selectedBrand, actions } = useCms();

  if (loading) {
    return (
      <div style={styles.appWrap}>
        <div style={styles.sidebarSkeleton} />
        <main style={styles.main}>
          <div style={{ padding: 24 }}>Loading CMS…</div>
        </main>
      </div>
    );
  }

  const handleAddCategory = () => {
    if (!selectedBrand) return;
    actions.addCategory(selectedBrand.id);
  };

  const handleAddSubcategory = () => {
    if (!selectedBrand) return;
    const parentCategoryId =
      selection.scope === "category" ? selection.id : null;
    actions.addSubcategory(selectedBrand.id, parentCategoryId);
  };

  return (
    <div style={styles.appWrap}>
      <Sidebar />

      <main style={styles.main}>
        {(selection.scope === "global" ||
          selection.scope === "g-subcategory") && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                {selection.scope === "global"
                  ? "Global"
                  : "Global subcategory editor"}
              </h2>
            </header>
            <SubcategoryEditor />
            {selection.scope === "global" && (
              <div style={styles.note}>
                Use “+ Global subcategory” in the left panel to create one.
              </div>
            )}
          </section>
        )}

        {selection.scope === "brand" && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                Brand: <span style={styles.mono}>{selectedBrand?.name}</span>
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddCategory} style={styles.addBtn}>
                  + Add category
                </button>
                <button
                  onClick={handleAddSubcategory}
                  style={styles.addBtnSecondary}
                >
                  + Add subcategory
                </button>
              </div>
            </header>

            <BrandEditor />
            <div style={styles.note}>
              Select a category or subcategory on the left to edit it.
            </div>
          </section>
        )}

        {selection.scope === "category" && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                Category editor —{" "}
                <span style={styles.mono}>{selectedBrand?.name}</span>
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddCategory} style={styles.addBtn}>
                  + Add category
                </button>
                <button
                  onClick={handleAddSubcategory}
                  style={styles.addBtnSecondary}
                >
                  + Add subcategory
                </button>
              </div>
            </header>

            <CategoryEditor />
          </section>
        )}

        {selection.scope === "subcategory" && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                Subcategory editor —{" "}
                <span style={styles.mono}>{selectedBrand?.name}</span>
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddCategory} style={styles.addBtn}>
                  + Add category
                </button>
                <button
                  onClick={handleAddSubcategory}
                  style={styles.addBtnSecondary}
                >
                  + Add subcategory
                </button>
              </div>
            </header>

            <SubcategoryEditor />
          </section>
        )}
      </main>
    </div>
  );
}

const SIDEBAR_W = 360; // <— adjust this to taste

const styles = {
  appWrap: {
    display: "grid",
    gridTemplateColumns: `${SIDEBAR_W}px 1fr`, // was 272px 1fr
    minHeight: "100vh",
    background: "#fff",
  },
  sidebarSkeleton: {
    width: SIDEBAR_W, // keep skeleton in sync
    borderRight: "1px solid #e5e7eb",
    background: "#fafafa",
  },
  main: { minWidth: 0, overflow: "auto", background: "#ffffff" },
  panel: { padding: 16 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  h2: { margin: 0, fontSize: 18 },
  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 14,
  },
  note: { marginTop: 12, fontSize: 13, color: "#6b7280" },
  addBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  addBtnSecondary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
  },
};
