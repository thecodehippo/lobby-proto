// src/cms/GlobalSubcategoryEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import Icon from "@/shared/Icon.jsx";
import { ArrowUp, ArrowDown } from "lucide-react";

const ensureKeys = (obj, keys) => {
  const base = { ...(obj || {}) };
  keys.forEach((k) => {
    if (!(k in base)) base[k] = "";
  });
  return base;
};

export default function GlobalSubcategoryEditor() {
  const {
    selection,
    globalCategories,
    globalCategorySubcategories,
    actions,
    globalLocales,
  } = useCms();

  const subcat = useMemo(() => {
    if (selection.scope !== "g-subcategory") return null;
    return (
      (globalCategorySubcategories || []).find((s) => s.id === selection.id) ||
      null
    );
  }, [selection, globalCategorySubcategories]);

  const locs =
    globalLocales && globalLocales.length ? globalLocales : ["en-gb", "de-at"];

  // global categories flattened (for parent select)
  const categoryOptions = useMemo(() => {
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

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!subcat) {
      setForm(null);
      return;
    }
    setForm({
      subcategory_name:
        subcat.subcategory_name || subcat.name || "Global subcategory",
      parent_category: subcat.parent_category || "",
      displayed_in_nav: !!subcat.displayed_in_nav,
      type: subcat.type || "Game List",
      layout_type: subcat.layout_type || "Carousel",
      icon: subcat.icon || "",
      slug: ensureKeys(subcat.slug, locs),
      label: ensureKeys(subcat.label, locs),
      label_sub: ensureKeys(subcat.label_sub, locs),
    });
  }, [subcat?.id, locs.join("|")]);

  if (selection.scope !== "g-subcategory" || !subcat || !form) {
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a global subcategory to edit.
      </div>
    );
  }

  const onChange = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = () => {
    const payload = {
      subcategory_name:
        (form.subcategory_name || "").trim() || "Global subcategory",
      parent_category: form.parent_category || null,
      displayed_in_nav: !!form.displayed_in_nav,
      type: form.type || "Game List",
      layout_type: form.layout_type || "Carousel",
      icon: form.icon || "",
      slug: ensureKeys(form.slug, locs),
      label: ensureKeys(form.label, locs),
      label_sub: ensureKeys(form.label_sub, locs),
    };
    actions.updateGlobalSubcategoryInCategory(subcat.id, payload);
  };

  const remove = () => {
    if (!confirm("Delete this global subcategory?")) return;
    actions.deleteGlobalSubcategoryInCategory(subcat.id);
  };

  const moveUp = () => actions.moveGlobalSubcategoryUpInCategory(subcat.id);
  const moveDown = () => actions.moveGlobalSubcategoryDownInCategory(subcat.id);

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h3 style={styles.h3}>Global Subcategory</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={moveUp} style={styles.iconBtn} title="Move up">
            <ArrowUp size={16} />
          </button>
          <button onClick={moveDown} style={styles.iconBtn} title="Move down">
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Subcategory name (internal)</label>
        <input
          value={form.subcategory_name}
          onChange={(e) => onChange({ subcategory_name: e.target.value })}
          placeholder="Internal name"
          style={styles.input}
        />
        <div style={styles.help}>Used only in the CMS UI.</div>
      </div>

      <div style={styles.section}>Placement</div>
      <div style={styles.field}>
        <label style={styles.label}>Parent global category</label>
        <select
          value={form.parent_category || ""}
          onChange={(e) => onChange({ parent_category: e.target.value || "" })}
          style={styles.select}
        >
          <option value="">(none)</option>
          {categoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.section}>Visibility & Behavior</div>
      <div style={styles.grid3}>
        <Checkbox
          label="Displayed in nav"
          checked={!!form.displayed_in_nav}
          onChange={(v) => onChange({ displayed_in_nav: v })}
        />
        <SelectField
          label="Type"
          value={form.type}
          onChange={(v) => onChange({ type: v })}
          options={[
            { v: "Game List", l: "Game List" },
            { v: "Module", l: "Module" },
            { v: "Collection", l: "Collection" },
            { v: "Personalised", l: "Personalised" },
          ]}
        />
        <SelectField
          label="Layout"
          value={form.layout_type}
          onChange={(v) => onChange({ layout_type: v })}
          options={[
            { v: "1 row", l: "1 row" },
            { v: "2 rows", l: "2 rows" },
            { v: "Hero", l: "Hero" },
            { v: "Carousel", l: "Carousel" },
          ]}
        />
      </div>

      <div style={styles.section}>Appearance</div>
      <div style={styles.field}>
        <label style={styles.label}>Icon (lucide key)</label>
        <input
          value={form.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          placeholder="e.g. gamepad2, star, flame"
          style={styles.input}
        />
        <div style={styles.iconPreview}>
          <span style={styles.help}>Preview:</span>
          <Icon name={form.icon} size={18} />
          <span style={styles.helpMono}>{form.icon || "(none)"}</span>
        </div>
      </div>

      <div style={styles.section}>Translations</div>
      {locs.map((loc) => (
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
              placeholder="Primary label"
              style={styles.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.labelMini}>Sub label</label>
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
              placeholder="Secondary label"
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

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.select}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  wrap: { padding: 16 },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  h3: { margin: 0 },
  section: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
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
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    alignItems: "end",
  },
  checkbox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#111827",
  },
  iconPreview: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
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
  iconBtn: {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    lineHeight: 1,
  },
  localeRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
};
