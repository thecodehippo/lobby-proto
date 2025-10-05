// src/cms/GlobalSubcategoryEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import Icon from "@/shared/Icon.jsx";

export default function GlobalSubcategoryEditor() {
  const { globalCategories, globalCategorySubcategories, selection, actions } =
    useCms();

  const current = useMemo(
    () =>
      globalCategorySubcategories.find((s) => s.id === selection?.id) || null,
    [globalCategorySubcategories, selection?.id]
  );

  const parentOptions = useMemo(() => {
    return (globalCategories || [])
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
  }, [globalCategories]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!current) {
      setForm(null);
      return;
    }
    setForm({
      subcategory_name: current.subcategory_name || "New subcategory",
      parent_category: current.parent_category || "",
      displayed_in_nav: !!current.displayed_in_nav,
      type: current.type || "Game List",
      layout_type: current.layout_type || "Carousel",
      icon: current.icon || "",
      slug: { "en-gb": "", "de-at": "", ...(current.slug || {}) },
      label: { "en-gb": "", "de-at": "", ...(current.label || {}) },
      label_sub: { "en-gb": "", "de-at": "", ...(current.label_sub || {}) },
    });
  }, [current?.id]);

  if (!current || !form) {
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a global subcategory to edit.
      </div>
    );
  }

  const onChange = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = () => {
    const payload = {
      subcategory_name: form.subcategory_name?.trim() || "Subcategory",
      parent_category: form.parent_category || null,
      displayed_in_nav: !!form.displayed_in_nav,
      type: form.type || "Game List",
      layout_type: form.layout_type || "Carousel",
      icon: form.icon || "",
      slug: { ...(form.slug || {}) },
      label: { ...(form.label || {}) },
      label_sub: { ...(form.label_sub || {}) },
    };
    actions.updateGlobalSubcategoryInCategory(current.id, payload);
  };

  const remove = () => {
    if (!confirm("Delete this global subcategory?")) return;
    actions.deleteGlobalSubcategoryInCategory(current.id);
  };

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Global Subcategory</h3>

      <div style={styles.field}>
        <label style={styles.label}>Name (internal)</label>
        <input
          value={form.subcategory_name}
          onChange={(e) => onChange({ subcategory_name: e.target.value })}
          style={styles.input}
          placeholder="Subcategory"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Parent Global Category</label>
        <select
          value={form.parent_category || ""}
          onChange={(e) =>
            onChange({ parent_category: e.target.value || null })
          }
          style={styles.select}
        >
          <option value="">(none)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.grid2}>
        <Checkbox
          label="Displayed in nav"
          checked={!!form.displayed_in_nav}
          onChange={(v) => onChange({ displayed_in_nav: v })}
        />
        <div />
      </div>

      <div style={styles.grid2}>
        <div style={styles.field}>
          <label style={styles.label}>Type</label>
          <select
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value })}
            style={styles.select}
          >
            <option value="Game List">Game List</option>
            <option value="Promo">Promo</option>
            <option value="Static">Static</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Layout</label>
          <select
            value={form.layout_type}
            onChange={(e) => onChange({ layout_type: e.target.value })}
            style={styles.select}
          >
            <option value="Carousel">Carousel</option>
            <option value="Grid">Grid</option>
            <option value="List">List</option>
          </select>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Icon (lucide key)</label>
        <input
          value={form.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          style={styles.input}
          placeholder="e.g. list, gamepad2"
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
          }}
        >
          <span style={styles.help}>Preview:</span>
          <Icon name={form.icon} size={18} />
          <span style={styles.helpMono}>{form.icon || "(none)"}</span>
        </div>
      </div>

      <div style={styles.section}>Translations</div>
      {["en-gb", "de-at"].map((loc) => (
        <div key={loc} style={styles.localeRow}>
          <div style={{ fontWeight: 600, width: 90 }}>{loc}</div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>Label</label>
            <input
              value={form.label?.[loc] || ""}
              onChange={(e) =>
                onChange({
                  label: { ...(form.label || {}), [loc]: e.target.value },
                })
              }
              style={styles.input}
              placeholder="Visible title"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>Label (sub)</label>
            <input
              value={form.label_sub?.[loc] || ""}
              onChange={(e) =>
                onChange({
                  label_sub: {
                    ...(form.label_sub || {}),
                    [loc]: e.target.value,
                  },
                })
              }
              style={styles.input}
              placeholder="Subtitle"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>Slug</label>
            <input
              value={form.slug?.[loc] || ""}
              onChange={(e) =>
                onChange({
                  slug: { ...(form.slug || {}), [loc]: e.target.value },
                })
              }
              style={styles.input}
              placeholder="slug-for-this-locale"
            />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={save} style={styles.primaryBtn}>
          Save
        </button>
        <button onClick={remove} style={styles.dangerBtn}>
          Delete
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={styles.checkbox}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

const styles = {
  wrap: { padding: 16 },
  h3: { margin: 0, marginBottom: 12 },
  field: { display: "grid", gap: 6, marginBottom: 12 },
  label: { fontSize: 12, color: "#374151", fontWeight: 600 },
  labelMini: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  help: { fontSize: 12, color: "#6b7280" },
  helpMono: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "white",
    width: "100%",
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "white",
    width: "100%",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  section: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  localeRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#111827",
  },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "#fff1f2",
    color: "#991b1b",
    cursor: "pointer",
  },
};
