// src/cms/CmsApp.jsx
import React from "react";
import { useCms } from "./CmsContext.jsx";

import Sidebar from "./Sidebar.jsx";
import BrandEditor from "./BrandEditor.jsx";
import CategoryEditor from "./CategoryEditor.jsx";
import SubcategoryEditor from "./SubcategoryEditor.jsx";

// Global editors & settings
import GlobalSettings from "./GlobalSettings.jsx";
import GlobalCategoryEditor from "./GlobalCategoryEditor.jsx";
import GlobalSubcategoryEditor from "./GlobalSubcategoryEditor.jsx";

export default function CmsApp() {
  const { loading, selection } = useCms();

  const renderPanel = () => {
    if (loading) {
      return <div style={styles.emptyPanel}>Loading CMS…</div>;
    }
    if (!selection) {
      return (
        <div style={styles.emptyPanel}>
          Select something from the sidebar to begin.
        </div>
      );
    }

    switch (selection.scope) {
      // GLOBAL area
      case "global":
        return <GlobalSettings />;

      // Global category and subcategory editors
      case "g-category":
        return <GlobalCategoryEditor />;

      case "g-subcategory":
        return <GlobalSubcategoryEditor />;

      // BRAND area
      case "brand":
        return <BrandEditor />;

      case "category":
        return <CategoryEditor />;

      case "subcategory":
        return <SubcategoryEditor />;

      default:
        return (
          <div style={styles.emptyPanel}>
            Unknown selection type: <code>{String(selection.scope)}</code>
          </div>
        );
    }
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.leftCol}>
        <Sidebar />
      </aside>
      <main style={styles.rightCol}>{renderPanel()}</main>
    </div>
  );
}

/* ---------------- styles ---------------- */

const styles = {
  shell: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    minHeight: "100vh",
    background: "#fff",
  },
  leftCol: {
    borderRight: "1px solid #e5e7eb",
    background: "#fafafa",
    overflow: "hidden",
  },
  rightCol: {
    minWidth: 0,
    overflow: "auto",
    background: "#fff",
  },
  emptyPanel: {
    padding: 16,
    color: "#6b7280",
  },
};
