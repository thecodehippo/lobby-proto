// src/cms/CmsApp.jsx
import React from "react";
import { useCms } from "./CmsContext.jsx";
import Sidebar from "./Sidebar.jsx";
import BrandEditor from "./BrandEditor.jsx";
import CategoryEditor from "./CategoryEditor.jsx";
import SubcategoryEditor from "./SubcategoryEditor.jsx";
import GlobalCategoryEditor from "./GlobalCategoryEditor.jsx";
import GlobalSubcategoryEditor from "./GlobalSubcategoryEditor.jsx";

export default function CmsApp() {
  const { loading, selection } = useCms();

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <Sidebar />
      </aside>
      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>Loading…</div>
        ) : (
          <EditorSwitch scope={selection?.scope} />
        )}
      </main>
    </div>
  );
}

function EditorSwitch({ scope }) {
  switch (scope) {
    case "brand":
      return <BrandEditor />;
    case "category":
      return <CategoryEditor />;
    case "subcategory":
      return <SubcategoryEditor />;
    case "g-category":
      return <GlobalCategoryEditor />;
    case "g-subcategory":
      return <GlobalSubcategoryEditor />;
    case "global":
    default:
      return (
        <div style={{ padding: 16, color: "#6b7280" }}>
          Select something from the left to edit.
        </div>
      );
  }
}

const styles = {
  wrap: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    minHeight: "100vh",
    background: "#fff",
  },
  sidebar: {
    borderRight: "1px solid #e5e7eb",
    minWidth: 0,
    overflow: "hidden",
  },
  main: { minWidth: 0, overflow: "auto" },
  loading: { padding: 16, color: "#6b7280" },
};
