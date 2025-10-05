// src/cms/GlobalSettings.jsx
import React, { useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";

const isValidLocale = (s) => /^[a-z]{2}-[a-z]{2}$/i.test(String(s).trim());

export default function GlobalSettings() {
  const { globalLocales, actions } = useCms();
  const [draft, setDraft] = useState("");
  const list = useMemo(
    () => (Array.isArray(globalLocales) ? globalLocales : []),
    [globalLocales]
  );

  const add = () => {
    const raw = draft.trim();
    if (!raw) return;
    const norm = raw.toLowerCase();
    if (!isValidLocale(norm)) {
      alert("Use format like en-gb or de-at");
      return;
    }
    if (list.includes(norm)) return;
    actions.setGlobalLocales([...list, norm]);
    setDraft("");
  };

  const remove = (loc) => {
    actions.setGlobalLocales(list.filter((l) => l !== loc));
  };

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Global Settings</h3>
      <div style={styles.section}>Locales</div>
      <p style={styles.help}>
        These locales drive translation fields for all <b>global categories</b>{" "}
        and
        <b> global subcategories</b>. Brand content will inherit what you set
        here.
      </p>

      <div style={styles.row}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. en-gb"
          style={styles.input}
        />
        <button onClick={add} style={styles.primaryBtn}>
          Add
        </button>
      </div>

      <div style={styles.chips}>
        {list.length === 0 ? (
          <span style={styles.help}>(no locales yet)</span>
        ) : (
          list.map((loc) => (
            <span key={loc} style={styles.chip}>
              {loc}
              <button
                onClick={() => remove(loc)}
                style={styles.chipX}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { padding: 16 },
  h3: { margin: 0, marginBottom: 12 },
  section: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  help: { fontSize: 12, color: "#6b7280" },
  row: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12 },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    width: 220,
  },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    background: "#fff",
    fontSize: 13,
  },
  chipX: {
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    color: "#6b7280",
  },
};
