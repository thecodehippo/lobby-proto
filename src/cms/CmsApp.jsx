// src/cms/CmsApp.jsx
import React from "react";
import { useCms } from "./CmsContext.jsx";

import Sidebar from "./Sidebar.jsx";
import BrandEditor from "./BrandEditor.jsx";
import CategoryEditor from "./CategoryEditor.jsx";

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

  return (
    <div style={styles.appWrap}>
      <Sidebar />

      <main style={styles.main}>
        {/* BRAND VIEW */}
        {selection.scope === "brand" && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                Brand: <span style={styles.mono}>{selectedBrand?.name}</span>
              </h2>
              <button onClick={handleAddCategory} style={styles.addBtn}>
                + Add category
              </button>
            </header>

            <BrandEditor />

            <div style={styles.note}>
              Select a category on the left to edit it.
            </div>
          </section>
        )}

        {/* CATEGORY VIEW */}
        {selection.scope === "category" && (
          <section style={styles.panel}>
            <header style={styles.header}>
              <h2 style={styles.h2}>
                Category editor —{" "}
                <span style={styles.mono}>{selectedBrand?.name}</span>
              </h2>
              <button onClick={handleAddCategory} style={styles.addBtn}>
                + Add category
              </button>
            </header>

            <CategoryEditor />
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  appWrap: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    minHeight: "100vh",
    background: "#fff",
  },
  sidebarSkeleton: {
    width: 280,
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
};
