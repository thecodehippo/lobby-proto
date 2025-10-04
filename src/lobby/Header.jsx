import React from "react";

export default function Header({ brandName, locales, locale, onChangeLocale }) {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>{brandName ?? "—"}</div>

      <div style={styles.localeWrap}>
        <label htmlFor="locale" style={styles.label}>
          Locale
        </label>
        <select
          id="locale"
          value={locale || ""}
          onChange={(e) => onChangeLocale(e.target.value)}
          style={styles.select}
          disabled={!locales || locales.length === 0}
        >
          {(!locales || locales.length === 0) && (
            <option value="">(no locales)</option>
          )}
          {locales &&
            locales.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
        </select>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 20px",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  brand: {
    fontSize: 18,
    fontWeight: 600,
  },
  localeWrap: { display: "flex", alignItems: "center", gap: 8 },
  label: { fontSize: 12, color: "#6b7280" },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "white",
  },
};
