// src/cms/CategoryEditor.jsx
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

export default function CategoryEditor() {
  const {
    selectedBrand,
    selection,
    actions,
    globalCategories,
    resolveCategory,
  } = useCms();

  // ✅ selected category (brand-local)
  const selectedCategory = useMemo(() => {
    if (!selectedBrand || selection.scope !== "category") return null;
    return selectedBrand.categories.find((c) => c.id === selection.id) || null;
  }, [selectedBrand, selection]);

  // ⚙️ effective (brand + inherited global)
  const effective = useMemo(() => {
    if (!selectedBrand || !selectedCategory) return null;
    return resolveCategory(selectedBrand.id, selectedCategory.id) || null;
  }, [selectedBrand?.id, selectedCategory?.id, resolveCategory]);

  const locales = selectedBrand?.locales || [];

  // Parent options (top-level only, same as your existing logic)
  const parentOptions = useMemo(() => {
    if (!selectedBrand || !selectedCategory) return [];
    return selectedBrand.categories
      .filter((c) => c.parent_id === null && c.id !== selectedCategory.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
  }, [selectedBrand, selectedCategory]);

  // Global category dropdown options (flat, with indentation)
  const globalOptions = useMemo(() => {
    const cats = (globalCategories || []).slice();
    const byOrder = (a, z) => (a.order || 0) - (z.order || 0);
    const childrenByParent = new Map();
    cats.forEach((c) => {
      const pid = c.parent_id ?? null;
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid).push(c);
    });
    childrenByParent.forEach((arr) => arr.sort(byOrder));

    const out = [];
    const walk = (node, depth) => {
      out.push({
        id: node.id,
        label: `${"— ".repeat(depth)}${node.name || node.id}`,
      });
      (childrenByParent.get(node.id) || []).forEach((child) =>
        walk(child, depth + 1)
      );
    };
    (childrenByParent.get(null) || []).forEach((root) => walk(root, 0));
    return out;
  }, [globalCategories]);

  // ---------- Local form state ----------
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
      // NEW: link to global
      global_category_id: selectedCategory.global_category_id ?? null,
      // targeting
      targeting: {
        devices: selectedCategory.targeting?.devices || ["mobile", "desktop"],
        countries: selectedCategory.targeting?.countries || ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
        segment: selectedCategory.targeting?.segment || null,
        internal_only: !!selectedCategory.targeting?.internal_only,
        player_ids: selectedCategory.targeting?.player_ids || [],
      },
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

  const isLinked = !!form.global_category_id;

  const onChange = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = () => {
    // Build payload carefully: when linked, only save brand-structural + name + link
    const base = {
      name: (form.name || "").trim()
        ? form.name
        : selectedCategory.name ||
          selectedCategory.nav_label?.[locales[0]] ||
          "Untitled Category",
      parent_id: form.is_home ? null : form.parent_id ?? null,
      is_home: !!form.is_home,
      global_category_id: form.global_category_id ?? null,
      targeting: form.targeting,
    };

    let payload = base;
    if (!isLinked) {
      payload = {
        ...base,
        displayed_in_nav: !!form.displayed_in_nav,
        template: normalizeTemplate(form.template),
        nav_icon: form.nav_icon || "",
        new_games_count: !!form.new_games_count,
        type: form.type || "category",
        url: form.url || "",
        slug: { ...(form.slug || {}) },
        nav_label: { ...(form.nav_label || {}) },
      };
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

      {/* Link to Global Category */}
      <div style={{ ...styles.field, marginBottom: 14 }}>
        <label style={styles.label}>Global category</label>
        <select
          value={form.global_category_id || ""}
          onChange={(e) =>
            onChange({
              global_category_id: e.target.value || null,
            })
          }
          style={styles.select}
        >
          <option value="">(None – use brand-local settings)</option>
          {globalOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {isLinked ? (
          <div style={styles.help}>
            Inheriting all fields from the selected global category. You can
            still edit the internal name, parent, and “Is home”. Brand
            subcategories will render first, then global subcategories.
          </div>
        ) : (
          <div style={styles.help}>
            Choose a global category to inherit settings and subcategories.
          </div>
        )}
      </div>

      {/* Internal name (always editable) */}
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

      {/* Parent / structural */}
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
        {/* displayed_in_nav is inherited when linked */}
        <Checkbox
          label={isLinked ? "Displayed in nav (inherited)" : "Displayed in nav"}
          checked={
            isLinked ? !!effective?.displayed_in_nav : !!form.displayed_in_nav
          }
          onChange={(v) => onChange({ displayed_in_nav: v })}
          disabled={isLinked}
        />
        <Checkbox
          label="Is home (must be a parent)"
          checked={!!form.is_home}
          onChange={(v) =>
            onChange({ is_home: v, parent_id: v ? null : form.parent_id })
          }
        />
        {/* new_games_count is inherited when linked */}
        <Checkbox
          label={isLinked ? "New games count (inherited)" : "New games count"}
          checked={
            isLinked ? !!effective?.new_games_count : !!form.new_games_count
          }
          onChange={(v) => onChange({ new_games_count: v })}
          disabled={isLinked}
        />
      </div>

      {/* Template (inherited when linked) */}
      <div style={styles.field}>
        <label style={styles.label}>
          {isLinked ? "Template (inherited)" : "Template"}
        </label>
        <select
          value={
            isLinked
              ? effective?.template || DEFAULT_TEMPLATE
              : form.template || DEFAULT_TEMPLATE
          }
          onChange={(e) => onChange({ template: e.target.value })}
          style={styles.select}
          disabled={isLinked}
        >
          {CATEGORY_TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Icon (inherited when linked) */}
      <div style={styles.field}>
        <label style={styles.label}>
          {isLinked ? "Nav icon (inherited)" : "Nav icon (lucide key)"}
        </label>
        <input
          value={isLinked ? effective?.nav_icon || "" : form.nav_icon}
          onChange={(e) => onChange({ nav_icon: e.target.value })}
          placeholder="e.g. home, star, gamepad2"
          style={styles.input}
          disabled={isLinked}
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
          <Icon
            name={(isLinked ? effective?.nav_icon : form.nav_icon) || ""}
            size={18}
          />
          <span style={styles.helpMono}>
            {(isLinked ? effective?.nav_icon : form.nav_icon) || "(none)"}
          </span>
        </div>
      </div>

      {/* Type / URL (inherited when linked) */}
      <div style={styles.grid2}>
        <div style={styles.field}>
          <label style={styles.label}>
            {isLinked ? "Type (inherited)" : "Type"}
          </label>
          <select
            value={isLinked ? effective?.type || "category" : form.type}
            onChange={(e) => onChange({ type: e.target.value })}
            style={styles.select}
            disabled={isLinked}
          >
            <option value="category">Category (normal)</option>
            <option value="url">URL (link out)</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            {isLinked ? "URL (inherited)" : "URL (when type = URL)"}
          </label>
          <input
            value={isLinked ? effective?.url || "" : form.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://…"
            style={styles.input}
            disabled={isLinked || (form.type !== "url" && !isLinked)}
          />
        </div>
      </div>

      {/* Translations */}
      <div style={styles.section}>Translations</div>
      {(selectedBrand.locales || []).map((loc) => (
        <div key={loc} style={styles.localeRow}>
          <div style={{ fontWeight: 600, width: 90 }}>{loc}</div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>
              {isLinked ? "Nav label (inherited)" : "Nav label"}
            </label>
            <input
              value={
                isLinked
                  ? effective?.nav_label?.[loc] ??
                    // try lowercased locales if mismatch
                    effective?.nav_label?.[String(loc).toLowerCase()] ??
                    ""
                  : form.nav_label?.[loc] || ""
              }
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
              disabled={isLinked}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>
              {isLinked ? "Slug (inherited)" : "Slug"}
            </label>
            <input
              value={
                isLinked
                  ? effective?.slug?.[loc] ??
                    effective?.slug?.[String(loc).toLowerCase()] ??
                    ""
                  : form.slug?.[loc] || ""
              }
              onChange={(e) =>
                onChange({
                  slug: { ...(form.slug || {}), [loc]: e.target.value },
                })
              }
              placeholder="URL path for this locale"
              style={styles.input}
              disabled={isLinked}
            />
          </div>
        </div>
      ))}

      {/* Inheritance preview (compact) */}
      {isLinked && (
        <>
          <div style={styles.section}>Inherited from Global</div>
          <div style={styles.inheritBox}>
            <Row label="Template" value={effective?.template || "-"} />
            <Row
              label="Displayed in nav"
              value={effective?.displayed_in_nav ? "Yes" : "No"}
            />
            <Row label="Icon" value={effective?.nav_icon || "(none)"} />
            <Row
              label="Type"
              value={
                effective?.type === "url"
                  ? `URL → ${effective?.url || ""}`
                  : "Category"
              }
            />
            {(effective?.nav_label || effective?.slug) && (
              <div style={{ marginTop: 8 }}>
                <div style={styles.labelMini}>Locale mappings</div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Locale</th>
                      <th style={styles.th}>Nav label</th>
                      <th style={styles.th}>Slug</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys({
                      ...(effective?.nav_label || {}),
                      ...(effective?.slug || {}),
                    }).map((lc) => (
                      <tr key={lc}>
                        <td style={styles.td}>{lc}</td>
                        <td style={styles.td}>
                          {effective?.nav_label?.[lc] || ""}
                        </td>
                        <td style={styles.td}>{effective?.slug?.[lc] || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Targeting */}
      <TargetingEditor
        targeting={form.targeting}
        onChange={(targeting) => onChange({ targeting })}
        disabled={false}
      />

      {/* Effective subcategories preview */}
      <div style={styles.section}>Subcategories (effective order)</div>
      <div style={styles.subsWrap}>
        {(effective?.subcategories || []).length === 0 ? (
          <div style={styles.help}>(none)</div>
        ) : (
          (effective?.subcategories || []).map((s, i) => (
            <div key={s.id ?? `sc-${i}`} style={styles.subPill}>
              {s.name || s.subcategory_name || s.id || "Subcategory"}
            </div>
          ))
        )}
      </div>

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

function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label style={{ ...styles.checkbox, opacity: disabled ? 0.6 : 1 }}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.rowKV}>
      <div style={styles.rowKey}>{label}</div>
      <div style={styles.rowVal}>{value}</div>
    </div>
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
  inheritBox: {
    border: "1px dashed #d1d5db",
    borderRadius: 8,
    padding: 10,
    background: "#fafafa",
  },
  rowKV: { display: "flex", gap: 10, marginBottom: 6 },
  rowKey: { width: 130, fontSize: 12, color: "#6b7280" },
  rowVal: { flex: 1, fontSize: 13, color: "#111827" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 6,
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "4px 6px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontWeight: 600,
  },
  td: { padding: "4px 6px", borderBottom: "1px solid #f3f4f6" },
  subsWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  subPill: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    border: "1px solid #e5e7eb",
    fontSize: 12,
  },
};
