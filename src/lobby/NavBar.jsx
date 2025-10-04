// src/lobby/NavBar.jsx
import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCms } from "@/cms/CmsContext.jsx";
import Icon from "@/shared/Icon.jsx";

// helpers
const labelFor = (cat, loc) =>
  (cat.nav_label && cat.nav_label[loc]) || cat.name || cat.id;
const slugFor = (cat, loc) =>
  (cat.slug && cat.slug[loc] && cat.slug[loc].trim()) || "";
const pathFor = (cat, loc) => `/${slugFor(cat, loc) || cat.id}`; // "/<slug>" or "/<id>"

export default function NavBar() {
  const { selectedBrand } = useCms();
  const { pathname } = useLocation();

  // derive current locale from URL (/:locale/...), fallback to brand's first locale
  const urlLocale = pathname.split("/").filter(Boolean)[0] || null;
  const locale = urlLocale || selectedBrand?.locales?.[0] || null;

  const items = useMemo(() => {
    if (!selectedBrand || !locale) return [];
    // NAV ONLY: show parents with displayed_in_nav === true
    return selectedBrand.categories
      .filter((c) => c.parent_id === null && c.displayed_in_nav)
      .sort((a, z) => a.order - z.order)
      .map((c) => ({
        id: c.id,
        label: labelFor(c, locale),
        icon: c.nav_icon || "",
        to: pathFor(c, locale), // "/<slug>" or "/<id>"
        tooltip: c.type === "url" && c.url ? c.url : undefined,
      }));
  }, [selectedBrand, locale]);

  return (
    <nav style={styles.nav}>
      <ul style={styles.list}>
        {items.map((item) => (
          <li key={item.id} style={styles.li}>
            {/* Always prefix with current locale so clicks keep it */}
            <Link
              to={`/${locale}${item.to}`}
              style={styles.link}
              title={item.tooltip || ""}
            >
              {item.icon ? (
                <Icon name={item.icon} size={16} style={{ marginRight: 6 }} />
              ) : null}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const styles = {
  nav: { borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  list: {
    display: "flex",
    gap: 12,
    listStyle: "none",
    margin: 0,
    padding: "8px 16px",
    overflowX: "auto",
  },
  li: {},
  link: {
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    color: "#111827",
    whiteSpace: "nowrap",
  },
};
