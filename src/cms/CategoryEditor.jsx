import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import { CATEGORY_TEMPLATES, TEMPLATE_KEYS } from "./templates.js";
import Icon from "@/shared/Icon.jsx";

const DEFAULT_TEMPLATE =
  (TEMPLATE_KEYS && TEMPLATE_KEYS.STANDARD) ||
  CATEGORY_TEMPLATES[CATEGORY_TEMPLATES.length - 1];

function normalizeTemplate(value) {
  if (!value) return DEFAULT_TEMPLATE;
  const raw = String(value).trim();
  if (CATEGORY_TEMPLATES.includes(raw)) return raw;
  const keyHit = Object.keys(TEMPLATE_KEYS || {}).find(
    (k) => k === raw || k.toLowerCase() === raw.toLowerCase()
  );
  if (keyHit) return TEMPLATE_KEYS[keyHit];
  const labelHit = CATEGORY_TEMPLATES.find(
    (lbl) => lbl.toLowerCase() === raw.toLowerCase()
  );
  return labelHit || DEFAULT_TEMPLATE;
}

export default function CategoryEditor() {
  const { selectedBrand, selection, actions } = useCms();

  // ✅ use selection.scope === 'category'
  const selectedCategory = useMemo(() => {
    if (!selectedBrand || selection.scope !== "category") return null;
    return selectedBrand.categories.find((c) => c.id === selection.id) || null;
  }, [selectedBrand, selection]);

  const locales = selectedBrand?.locales || [];
  const parentOptions = useMemo(() => {
    if (!selectedBrand || !selectedCategory) return [];
    return selectedBrand.categories
      .filter((c) => c.parent_id === null && c.id !== selectedCategory.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
  }, [selectedBrand, selectedCategory]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!selectedBrand || !selectedCategory) {
      setForm(null);
      return;
    }
    setForm({
      name:
        selectedCategory.name ||
        selectedCategory.nav_label?.[locales[0]] ||
        "Untitled Category",
      parent_id: selectedCategory.parent_id ?? null,
      displayed_in_nav: !!selectedCategory.displayed_in_nav,
      template:
        normalizeTemplate(selectedCategory.template) || DEFAULT_TEMPLATE,
      is_home: !!selectedCategory.is_home,
      nav_icon: selectedCategory.nav_icon || "",
      new_games_count: !!selectedCategory.new_games_count,
      type: selectedCategory.type || "category",
      url: selectedCategory.url || "",
      nav_label: { ...(selectedCategory.nav_label || {}) },
      slug: { ...(selectedCategory.slug || {}) },
    });
  }, [selectedBrand?.id, selectedCategory?.id]);

  if (
    !selectedBrand ||
    selection.scope !== "category" ||
    !selectedCategory ||
    !form
  ) {
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a category to edit.
      </div>
    );
  }

  const onChange = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = () => {
    const payload = { ...form };
    if (payload.is_home) payload.parent_id = null;
    payload.template = normalizeTemplate(payload.template);
    payload.slug = { ...(form.slug || {}) };
    payload.nav_label = { ...(form.nav_label || {}) };
    if (!payload.name || !payload.name.trim()) {
      payload.name =
        selectedCategory.name ||
        selectedCategory.nav_label?.[locales[0]] ||
        "Untitled Category";
    }
    actions.updateCategory(selectedBrand.id, selectedCategory.id, payload);
  };

  const remove = () => {
    if (!confirm("Delete this category? Children will be promoted to parent."))
      return;
    actions.deleteCategory(selectedBrand.id, selectedCategory.id);
  };

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Category</h3>

      <div style={styles.field}>
        <label style={styles.label}>Category name (internal)</label>
        <input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Internal name shown in CMS"
          style={styles.input}
        />
        <div style={styles.help}>
          Used only in the CMS (left nav, editor titles).
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Parent</label>
        <select
          value={form.parent_id || ""}
          onChange={(e) => onChange({ parent_id: e.target.value || null })}
          style={styles.select}
        >
          <option value="">(none — treated as parent)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
            </option>
          ))}
        </select>
        <div style={styles.help}>
          No parent = parent category. Children sit under a parent.
        </div>
      </div>

      <div style={styles.grid2}>
        <Checkbox
          label="Displayed in nav"
          checked={!!form.displayed_in_nav}
          onChange={(v) => onChange({ displayed_in_nav: v })}
        />
        <Checkbox
          label="Is home (must be a parent)"
          checked={!!form.is_home}
          onChange={(v) =>
            onChange({ is_home: v, parent_id: v ? null : form.parent_id })
          }
        />
        <Checkbox
          label="New games count"
          checked={!!form.new_games_count}
          onChange={(v) => onChange({ new_games_count: v })}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Template</label>
        <select
          value={form.template || DEFAULT_TEMPLATE}
          onChange={(e) => onChange({ template: e.target.value })}
          style={styles.select}
        >
          {CATEGORY_TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Nav icon (lucide key)</label>
        <input
          value={form.nav_icon}
          onChange={(e) => onChange({ nav_icon: e.target.value })}
          placeholder="e.g. home, star, gamepad2"
          style={styles.input}
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
          <Icon name={form.nav_icon} size={18} />
          <span style={styles.helpMono}>{form.nav_icon || "(none)"}</span>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.field}>
          <label style={styles.label}>Type</label>
          <select
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value })}
            style={styles.select}
          >
            <option value="category">Category (normal)</option>
            <option value="url">URL (link out)</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>URL (when type = URL)</label>
          <input
            value={form.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://…"
            style={styles.input}
            disabled={form.type !== "url"}
          />
        </div>
      </div>

      <div style={styles.section}>Translations</div>
      {(selectedBrand.locales || []).map((loc) => (
        <div key={loc} style={styles.localeRow}>
          <div style={{ fontWeight: 600, width: 90 }}>{loc}</div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>Nav label</label>
            <input
              value={form.nav_label?.[loc] || ""}
              onChange={(e) =>
                onChange({
                  nav_label: {
                    ...(form.nav_label || {}),
                    [loc]: e.target.value,
                  },
                })
              }
              placeholder="Label shown in the lobby"
              style={styles.input}
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
              placeholder="URL path for this locale"
              style={styles.input}
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
