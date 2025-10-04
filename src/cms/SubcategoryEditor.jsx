import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import { SUBCATEGORY_TYPES, LAYOUT_TYPES } from "./templates.js";
import Icon from "@/shared/Icon.jsx";

export default function SubcategoryEditor() {
  const { selectedBrand, selection, actions, globalSubcategories } = useCms();

  const isBrandSub = selection.scope === "subcategory";
  const isGlobalSub = selection.scope === "g-subcategory";

  // Always call in same order
  const brandSub = useMemo(() => {
    if (!selectedBrand || !isBrandSub) return null;
    return (
      (selectedBrand.subcategories || []).find((s) => s.id === selection.id) ||
      null
    );
  }, [selectedBrand, selection, isBrandSub]);

  const globalSub = useMemo(() => {
    if (!isGlobalSub) return null;
    return (
      (globalSubcategories || []).find((g) => g.id === selection.id) || null
    );
  }, [globalSubcategories, selection, isGlobalSub]);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (isBrandSub && brandSub && selectedBrand) {
      setForm({
        subcategory_name: brandSub.subcategory_name || "",
        parent_category: brandSub.parent_category || "",
        displayed_in_nav: !!brandSub.displayed_in_nav,
        global_subcategory: brandSub.global_subcategory || "",
        type: brandSub.type || "Game List",
        layout_type: brandSub.layout_type || "Carousel",
        icon: brandSub.icon || "",
        slug: { ...(brandSub.slug || {}) },
        label: { ...(brandSub.label || {}) },
        label_sub: { ...(brandSub.label_sub || {}) },
      });
    } else if (isGlobalSub && globalSub) {
      setForm({ name: globalSub.name || "" });
    } else {
      setForm(null);
    }
  }, [isBrandSub, isGlobalSub, brandSub?.id, globalSub?.id, selectedBrand?.id]);

  // Always compute; return [] if not needed
  const allCats = selectedBrand?.categories || [];
  const parentsFirst = useMemo(() => {
    const parents = allCats
      .filter((c) => c.parent_id == null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
    const children = allCats
      .filter((c) => c.parent_id != null)
      .sort((a, z) => (a.order || 0) - (z.order || 0));
    return [...parents, ...children];
  }, [allCats]);

  const onChange = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = () => {
    if (!form) return;
    if (isBrandSub && brandSub && selectedBrand) {
      actions.updateSubcategory(selectedBrand.id, brandSub.id, {
        subcategory_name: (form.subcategory_name || "").trim(),
        parent_category: form.parent_category || null,
        displayed_in_nav: !!form.displayed_in_nav,
        global_subcategory: form.global_subcategory || null,
        type: form.type,
        layout_type: form.layout_type,
        icon: form.icon || "",
        slug: form.slug || {},
        label: form.label || {},
        label_sub: form.label_sub || {},
      });
    } else if (isGlobalSub && globalSub) {
      actions.updateGlobalSubcategory(globalSub.id, {
        name: (form.name || "").trim(),
      });
    }
  };

  if (!isBrandSub && !isGlobalSub)
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a subcategory to edit.
      </div>
    );
  if (!form)
    return <div style={{ padding: 16, color: "#6b7280" }}>Loading…</div>;

  if (isGlobalSub && globalSub) {
    return (
      <div style={styles.wrap}>
        <h3 style={styles.h3}>Global subcategory</h3>
        <Field label="Internal name">
          <input
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            style={styles.input}
          />
        </Field>
        <Row>
          <button onClick={save} style={styles.primaryBtn}>
            Save
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => actions.deleteGlobalSubcategory(globalSub.id)}
            style={styles.dangerBtn}
          >
            Delete
          </button>
        </Row>
      </div>
    );
  }

  // brand sub
  const handleMoveUp = () =>
    actions.moveSubcategoryUp(selectedBrand.id, brandSub.id);
  const handleMoveDown = () =>
    actions.moveSubcategoryDown(selectedBrand.id, brandSub.id);

  const locales = selectedBrand?.locales || [];

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Subcategory</h3>

      <div style={styles.grid2}>
        <Field label="Internal name">
          <input
            value={form.subcategory_name}
            onChange={(e) => onChange({ subcategory_name: e.target.value })}
            placeholder="Internal only"
            style={styles.input}
          />
        </Field>
        <Field label="Icon (lucide)">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={form.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              placeholder="e.g. star, gamepad2"
              style={styles.input}
            />
            <Icon name={form.icon} size={18} />
          </div>
        </Field>
      </div>

      <div style={styles.grid3}>
        <Field label="Mapped to category">
          <select
            value={form.parent_category || ""}
            onChange={(e) => onChange({ parent_category: e.target.value })}
            style={styles.input}
          >
            <option value="">(none — unmapped)</option>
            {parentsFirst.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? "↳ " : ""}
                {c.name || c.id}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Global subcategory (content source)">
          <select
            value={form.global_subcategory || ""}
            onChange={(e) => onChange({ global_subcategory: e.target.value })}
            style={styles.input}
          >
            <option value="">(none)</option>
            {(globalSubcategories || [])
              .sort((a, z) => (a.order || 0) - (z.order || 0))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || g.id}
                </option>
              ))}
          </select>
        </Field>
      </div>

      <div style={styles.grid2}>
        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value })}
            style={styles.input}
          >
            {SUBCATEGORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Layout">
          <select
            value={form.layout_type}
            onChange={(e) => onChange({ layout_type: e.target.value })}
            style={styles.input}
          >
            {LAYOUT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={styles.section}>Translations</div>
      {locales.map((loc) => (
        <div key={loc} style={styles.transRow}>
          <div style={{ width: 86, fontWeight: 600 }}>{loc}</div>
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
              placeholder="Header text"
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
              style={styles.input}
              placeholder="Subheader text"
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
              placeholder="URL path for this locale"
            />
          </div>
        </div>
      ))}

      <Row>
        <button onClick={save} style={styles.primaryBtn}>
          Save
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleMoveUp} style={styles.secondaryBtn}>
          Move up
        </button>
        <button onClick={handleMoveDown} style={styles.secondaryBtn}>
          Move down
        </button>
        <button
          onClick={() =>
            actions.deleteSubcategory(selectedBrand.id, brandSub.id)
          }
          style={styles.dangerBtn}
        >
          Delete
        </button>
      </Row>
      <div style={styles.hint}>
        Move up/down reorders within the same mapped parent.
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}
function Row({ children }) {
  return (
    <div
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      {children}
    </div>
  );
}

const styles = {
  wrap: { padding: 16 },
  h3: { margin: 0, marginBottom: 12 },

  section: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  transRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },

  label: { fontSize: 12, color: "#374151", fontWeight: 600 },
  labelMini: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    width: "100%",
  },
  checkbox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#111827",
    height: 38,
  },

  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
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

  hint: { marginTop: 6, fontSize: 12, color: "#9ca3af" },
};
