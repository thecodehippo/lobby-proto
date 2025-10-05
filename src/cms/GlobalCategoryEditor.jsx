// src/cms/GlobalCategoryEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import { CATEGORY_TEMPLATES, TEMPLATE_KEYS } from "./templates.js";
import Icon from "@/shared/Icon.jsx";
import TargetingEditor from "./TargetingEditor.jsx";

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

const ensureKeys = (obj, keys) => {
  const base = { ...(obj || {}) };
  keys.forEach((k) => {
    if (!(k in base)) base[k] = "";
  });
  return base;
};

export default function GlobalCategoryEditor() {
  const {
    globalCategories,
    globalCategorySubcategories,
    selection,
    actions,
    globalLocales,
  } = useCms();

  const current = useMemo(
    () => globalCategories.find((c) => c.id === selection?.id) || null,
    [globalCategories, selection?.id]
  );

  const locs =
    globalLocales && globalLocales.length ? globalLocales : ["en-gb", "de-at"];

  const parentOptions = useMemo(() => {
    if (!current) return [];
    return globalCategories
      .filter((c) => c.parent_id == null && c.id !== current.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
  }, [globalCategories, current]);

  const subs = useMemo(() => {
    return (globalCategorySubcategories || [])
      .filter((s) => s.parent_category === current?.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
  }, [globalCategorySubcategories, current?.id]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!current) {
      setForm(null);
      return;
    }
    setForm({
      name: current.name || "New Global Category",
      parent_id: current.parent_id ?? null,
      displayed_in_nav: !!current.displayed_in_nav,
      template: normalizeTemplate(current.template),
      is_home: !!current.is_home,
      nav_icon: current.nav_icon || "",
      new_games_count: !!current.new_games_count,
      type: current.type || "category",
      url: current.url || "",
      slug: { "en-gb": "", "de-at": "", ...(current.slug || {}) },
      nav_label: {
        "en-gb": current.nav_label?.["en-gb"] || "Global",
        "de-at": current.nav_label?.["de-at"] || "Global",
        ...(current.nav_label || {}),
      },
      targeting: {
        devices: current.targeting?.devices || ["mobile", "desktop"],
        countries: current.targeting?.countries || ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
        segment: current.targeting?.segment || null,
        internal_only: !!current.targeting?.internal_only,
        player_ids: current.targeting?.player_ids || [],
      },
    });
  }, [current?.id, locs.join("|")]);

  if (!current || !form) {
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a global category to edit.
      </div>
    );
  }

  const onChange = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = () => {
    const payload = {
      name: form.name?.trim() || "Global Category",
      parent_id: form.is_home ? null : form.parent_id ?? null,
      displayed_in_nav: !!form.displayed_in_nav,
      template: normalizeTemplate(form.template),
      is_home: !!form.is_home,
      nav_icon: form.nav_icon || "",
      new_games_count: !!form.new_games_count,
      type: form.type || "category",
      url: form.url || "",
      slug: { ...(form.slug || {}) },
      nav_label: { ...(form.nav_label || {}) },
      targeting: form.targeting,
    };
    actions.updateGlobalCategory(current.id, payload);
  };

  const remove = () => {
    if (!confirm("Delete this global category? Children become root.")) return;
    actions.deleteGlobalCategory(current.id);
  };

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Global Category</h3>

      <div style={styles.field}>
        <label style={styles.label}>Name</label>
        <input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          style={styles.input}
          placeholder="Internal name"
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Parent</label>
        <select
          value={form.parent_id || ""}
          onChange={(e) => onChange({ parent_id: e.target.value || null })}
          style={styles.select}
          disabled={form.is_home}
        >
          <option value="">(none — treated as parent)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
            </option>
          ))}
        </select>
        <div style={styles.help}>No parent = top level.</div>
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

      <TargetingEditor
        targeting={form.targeting}
        onChange={(targeting) => onChange({ targeting })}
        disabled={false}
      />

      <div style={styles.section}>Translations</div>
      {locs.map((loc) => (
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
              placeholder="Label"
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
              placeholder="slug-for-this-locale"
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
