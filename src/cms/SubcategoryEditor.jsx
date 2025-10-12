// src/cms/SubcategoryEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useCms } from "./CmsContext.jsx";
import Icon from "@/shared/Icon.jsx";
import { ArrowUp, ArrowDown } from "lucide-react";
import GameSelector from "./GameSelector.jsx";
import CollectionBuilder from "./CollectionBuilder.jsx";

export default function SubcategoryEditor() {
  const { selectedBrand, selection, actions } = useCms();

  // active brand subcategory
  const subcat = useMemo(() => {
    if (!selectedBrand || selection.scope !== "subcategory") return null;
    return (
      (selectedBrand.subcategories || []).find((s) => s.id === selection.id) ||
      null
    );
  }, [selectedBrand, selection]);

  // brand categories flattened (with simple indentation for clarity)
  const categoryOptions = useMemo(() => {
    if (!selectedBrand) return [];
    const cats = (selectedBrand.categories || []).slice();
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
  }, [selectedBrand]);

  const locales = selectedBrand?.locales || [];

  const [form, setForm] = useState(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [showCollectionBuilder, setShowCollectionBuilder] = useState(false);

  useEffect(() => {
    if (!selectedBrand || !subcat) {
      setForm(null);
      return;
    }
    setForm({
      subcategory_name:
        subcat.subcategory_name || subcat.name || "New subcategory",
      parent_category: subcat.parent_category || "",
      displayed_in_nav: !!subcat.displayed_in_nav,
      type: subcat.type || "Game List",
      layout_type: subcat.layout_type || "Carousel",
      icon: subcat.icon || "",
      slug: { ...(subcat.slug || {}) },
      label: { ...(subcat.label || {}) },
      label_sub: { ...(subcat.label_sub || {}) },
      selected_games: Array.isArray(subcat.selected_games) ? subcat.selected_games : [],
      collection: subcat.collection || { rules: [], auto_add: false },
    });
  }, [selectedBrand?.id, subcat?.id]);

  if (!selectedBrand || selection.scope !== "subcategory" || !subcat || !form) {
    return (
      <div style={{ padding: 16, color: "#6b7280" }}>
        Select a subcategory to edit.
      </div>
    );
  }

  const onChange = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = () => {
    const payload = {
      subcategory_name:
        (form.subcategory_name || "").trim() || "New subcategory",
      parent_category: form.parent_category || null,
      displayed_in_nav: !!form.displayed_in_nav,
      type: form.type || "Game List",
      layout_type: form.layout_type || "Carousel",
      icon: form.icon || "",
      slug: { ...(form.slug || {}) },
      label: { ...(form.label || {}) },
      label_sub: { ...(form.label_sub || {}) },
      selected_games: form.selected_games || [],
      collection: form.collection || { rules: [], auto_add: false },
    };
    console.log('Saving subcategory with payload:', payload);
    console.log('Selected games:', form.selected_games);
    console.log('About to call actions.updateSubcategory with:', selectedBrand.id, subcat.id, payload);
    console.log('Actions object:', actions);
    actions.updateSubcategory(selectedBrand.id, subcat.id, payload);
    console.log('Called updateSubcategory');
  };

  const remove = () => {
    if (!confirm("Delete this subcategory?")) return;
    actions.deleteSubcategory(selectedBrand.id, subcat.id);
  };

  const moveUp = () => actions.moveSubcategoryUp(selectedBrand.id, subcat.id);
  const moveDown = () =>
    actions.moveSubcategoryDown(selectedBrand.id, subcat.id);

  // New option lists (keep value if custom)
  const TYPE_OPTIONS = [
    { v: "Game List", l: "Game List" },
    { v: "Module", l: "Module" },
    { v: "Collection", l: "Collection" },
    { v: "Personalised", l: "Personalised" },
  ];
  const LAYOUT_OPTIONS = [
    { v: "1 row", l: "1 row" },
    { v: "2 rows", l: "2 rows" },
    { v: "Hero", l: "Hero" },
    { v: "Carousel", l: "Carousel" },
  ];
  const typeHas = TYPE_OPTIONS.some((o) => o.v === form.type);
  const layoutHas = LAYOUT_OPTIONS.some((o) => o.v === form.layout_type);

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.headerRow}>
        <h3 style={styles.h3}>Subcategory</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={moveUp} style={styles.iconBtn} title="Move up">
            <ArrowUp size={16} />
          </button>
          <button onClick={moveDown} style={styles.iconBtn} title="Move down">
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      {/* Identity */}
      <div style={styles.field}>
        <label style={styles.label}>Subcategory name (internal)</label>
        <input
          value={form.subcategory_name}
          onChange={(e) => onChange({ subcategory_name: e.target.value })}
          placeholder="Internal name shown in CMS"
          style={styles.input}
        />
        <div style={styles.help}>Used only in the CMS UI.</div>
      </div>

      {/* Placement */}
      <div style={styles.section}>Placement</div>
      <div style={styles.field}>
        <label style={styles.label}>Parent category</label>
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
        <div style={styles.help}>
          Subcategories appear under the selected brand category. Brand-created
          subcategories render <b>before</b> any inherited global subcategories.
        </div>
      </div>

      {/* Visibility & Behavior */}
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
          options={
            typeHas
              ? TYPE_OPTIONS
              : [...TYPE_OPTIONS, { v: form.type, l: form.type }]
          }
        />
        <SelectField
          label="Layout"
          value={form.layout_type}
          onChange={(v) => onChange({ layout_type: v })}
          options={
            layoutHas
              ? LAYOUT_OPTIONS
              : [
                  ...LAYOUT_OPTIONS,
                  { v: form.layout_type, l: form.layout_type },
                ]
          }
        />
      </div>

      {/* Appearance */}
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

      {/* Translations */}
      <div style={styles.section}>Translations</div>
      {(locales || []).map((loc) => (
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

      {/* Games Selection */}
      {form.type === 'Game List' && (
        <>
          <div style={styles.section}>Games Selection</div>
          <div style={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={styles.label}>{form.selected_games.length} games selected</span>
              <button 
                onClick={() => setShowGameSelector(true)} 
                style={styles.secondaryBtn}
              >
                Select Games
              </button>
            </div>
            {form.selected_games.length > 0 && (
              <div style={styles.gamesList}>
                {form.selected_games.map((game, index) => (
                  <div key={game.id} style={styles.gameItem}>
                    <div style={styles.gameOrder}>
                      <button 
                        onClick={() => {
                          if (index > 0) {
                            const newGames = [...form.selected_games]
                            ;[newGames[index], newGames[index - 1]] = [newGames[index - 1], newGames[index]]
                            onChange({ selected_games: newGames })
                          }
                        }}
                        disabled={index === 0}
                        style={styles.orderBtn}
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => {
                          if (index < form.selected_games.length - 1) {
                            const newGames = [...form.selected_games]
                            ;[newGames[index], newGames[index + 1]] = [newGames[index + 1], newGames[index]]
                            onChange({ selected_games: newGames })
                          }
                        }}
                        disabled={index === form.selected_games.length - 1}
                        style={styles.orderBtn}
                      >
                        ↓
                      </button>
                    </div>
                    <div style={styles.gameInfo}>
                      <span>{game.name}</span>
                      <span style={styles.gameSupplier}>{game.supplier}</span>
                    </div>
                    <button 
                      onClick={() => onChange({ 
                        selected_games: form.selected_games.filter(g => g.id !== game.id) 
                      })}
                      style={styles.removeBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Collection Builder */}
      {form.type === 'Collection' && (
        <>
          <div style={styles.section}>Collection Rules</div>
          <div style={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={styles.label}>
                {form.collection?.rules?.length || 0} rules, {form.collection?.matching_count || 0} games match
              </span>
              <button 
                onClick={() => setShowCollectionBuilder(true)} 
                style={styles.secondaryBtn}
              >
                Edit Collection
              </button>
            </div>
            {form.collection?.auto_add && (
              <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                ✓ Automatically adding new games that match criteria
              </div>
            )}
          </div>
          <CollectionGamesPreview collection={form.collection} />
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={save} style={styles.primaryBtn}>
          Save
        </button>
        <button onClick={remove} style={styles.dangerBtn}>
          Delete
        </button>
      </div>

      <GameSelector
        isOpen={showGameSelector}
        onClose={() => setShowGameSelector(false)}
        selectedGames={form.selected_games}
        onGamesChange={(games) => onChange({ selected_games: games })}
      />

      <CollectionBuilder
        isOpen={showCollectionBuilder}
        onClose={() => setShowCollectionBuilder(false)}
        collection={form.collection}
        onCollectionChange={(collection) => onChange({ collection })}
      />
    </div>
  );
}

function CollectionGamesPreview({ collection }) {
  const [matchingGames, setMatchingGames] = useState([]);
  const [allGames, setAllGames] = useState([]);

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => setAllGames(data))
      .catch(err => console.error('Failed to load games:', err));
  }, []);

  useEffect(() => {
    if (collection?.rules?.length > 0 && allGames.length > 0) {
      const filtered = allGames.filter(game => evaluateCollectionRules(game, collection.rules));
      setMatchingGames(filtered);
    } else {
      setMatchingGames([]);
    }
  }, [collection, allGames]);

  if (!collection?.rules?.length) {
    return (
      <div style={styles.field}>
        <div style={styles.help}>No collection rules defined. Click "Edit Collection" to add rules.</div>
      </div>
    );
  }

  return (
    <div style={styles.field}>
      <label style={styles.label}>Matching Games ({matchingGames.length})</label>
      {matchingGames.length > 0 ? (
        <div style={styles.gamesList}>
          {matchingGames.map(game => (
            <div key={game.gameid} style={styles.gameItem}>
              <div style={styles.gameInfo}>
                <span>{game.gamename}</span>
                <span style={styles.gameSupplier}>
                  {game.gameid} • {game.studio} • {game.gametype} • {game.features}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.help}>No games match the current collection rules.</div>
      )}
    </div>
  );
}

function evaluateCollectionRules(game, rules) {
  if (rules.length === 0) return true;

  let result = evaluateCollectionRule(game, rules[0]);
  
  for (let i = 1; i < rules.length; i++) {
    const ruleResult = evaluateCollectionRule(game, rules[i]);
    if (rules[i].logic === 'AND') {
      result = result && ruleResult;
    } else {
      result = result || ruleResult;
    }
  }
  
  return result;
}

function evaluateCollectionRule(game, rule) {
  const gameValue = String(game[rule.field] || '').toLowerCase();
  const ruleValue = String(rule.value || '').toLowerCase();
  
  switch (rule.operator) {
    case '==':
      return gameValue === ruleValue;
    case '!=':
      return gameValue !== ruleValue;
    case 'contains':
      return gameValue.includes(ruleValue);
    case '>':
      return parseFloat(game[rule.field]) > parseFloat(rule.value);
    case '<':
      return parseFloat(game[rule.field]) < parseFloat(rule.value);
    default:
      return false;
  }
}

/* ---------- UI bits ---------- */

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

/* ---------- styles ---------- */

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
    background: "#fff",
    width: "100%",
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
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
  secondaryBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    fontSize: 12,
  },
  gamesList: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    maxHeight: 200,
    overflowY: "auto",
  },
  gameItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 13,
  },
  gameOrder: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  orderBtn: {
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: 3,
    width: 20,
    height: 16,
    fontSize: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  gameInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  gameSupplier: {
    color: "#6b7280",
    fontSize: 12,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: 16,
    padding: 2,
  },
};
