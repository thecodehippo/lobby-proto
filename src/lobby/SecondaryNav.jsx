// src/lobby/SecondaryNav.jsx
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

export default function SecondaryNav() {
  const { selectedBrand } = useCms();
  const { pathname } = useLocation();

  if (!selectedBrand) return null;

  // Derive locale + slug directly from URL
  const parts = pathname.split("/").filter(Boolean); // e.g. "/en-GB/home" -> ["en-GB","home"]
  const locale = parts[0] || selectedBrand.locales?.[0] || null;
  const routeSlug = parts[1] || null;
  if (!locale) return null;

  const cats = selectedBrand.categories;
  const parentsOrdered = useMemo(
    () =>
      cats
        .filter((c) => c.parent_id === null)
        .sort((a, z) => a.order - z.order),
    [cats]
  );

  // Resolve current category:
  // - with :slug -> by localized slug, else by id
  // - without :slug -> infer (home -> first displayed parent -> first parent)
  const current =
    (routeSlug
      ? cats.find((c) => slugFor(c, locale) === routeSlug) ||
        cats.find((c) => c.id === routeSlug)
      : parentsOrdered.find((c) => c.is_home) ||
        parentsOrdered.find((c) => c.displayed_in_nav) ||
        parentsOrdered[0]) || null;

  // Determine parent to show children for
  const parent = current
    ? current.parent_id === null
      ? current
      : cats.find((c) => c.id === current.parent_id) || null
    : null;

  // If no parent, or parent is not displayed in nav, do not render secondary nav
  if (!parent || !parent.displayed_in_nav) return null;

  const items = useMemo(() => {
    // Only children that are displayed in nav
    const visibleChildren = cats
      .filter((c) => c.parent_id === parent.id && c.displayed_in_nav)
      .sort((a, z) => a.order - z.order)
      .map((c) => ({
        id: c.id,
        label: labelFor(c, locale),
        icon: c.nav_icon || "",
        to: pathFor(c, locale),
        tooltip: c.type === "url" && c.url ? c.url : undefined,
      }));
    return visibleChildren;
  }, [cats, parent?.id, locale]);

  if (!items.length) return null;

  return (
    <nav style={styles.nav}>
      <ul style={styles.list}>
        {items.map((item) => (
          <li key={item.id} style={styles.li}>
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
  nav: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  list: {
    display: "flex",
    gap: 10,
    listStyle: "none",
    margin: 0,
    padding: "6px 16px",
    overflowX: "auto",
  },
  li: {},
  link: {
    textDecoration: "none",
    padding: "6px 8px",
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    color: "#111827",
    whiteSpace: "nowrap",
  },
};
