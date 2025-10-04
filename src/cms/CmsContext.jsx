// src/cms/CmsContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CATEGORY_TEMPLATES, TEMPLATE_KEYS } from "./templates.js";

const DEFAULT_TEMPLATE =
  (TEMPLATE_KEYS && TEMPLATE_KEYS.STANDARD) ||
  CATEGORY_TEMPLATES[CATEGORY_TEMPLATES.length - 1];

const uid = () => Math.random().toString(36).slice(2, 10);
const deepClone = (x) => JSON.parse(JSON.stringify(x));

function normalizeTemplate(value) {
  if (!value) return DEFAULT_TEMPLATE;
  const raw = String(value).trim();
  if (CATEGORY_TEMPLATES.includes(raw)) return raw;
  const key = Object.keys(TEMPLATE_KEYS || {}).find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );
  if (key) return TEMPLATE_KEYS[key];
  const lbl = CATEGORY_TEMPLATES.find(
    (l) => l.toLowerCase() === raw.toLowerCase()
  );
  return lbl || DEFAULT_TEMPLATE;
}

// ---- seed ----
const initialBrands = [
  {
    id: "bwincom",
    name: "bwincom",
    locales: ["en-GB"],
    categories: [
      {
        id: "cat-home",
        name: "Home",
        parent_id: null,
        order: 0,
        slug: { "en-GB": "home" },
        nav_label: { "en-GB": "Home" },
        displayed_in_nav: true,
        template: DEFAULT_TEMPLATE,
        is_home: true,
        nav_icon: "home",
        new_games_count: false,
        type: "category",
        url: "",
      },
    ],
    subcategories: [], // brand subcategories
  },
];

// ---------- context ----------
const CmsCtx = createContext(null);
export const useCms = () => useContext(CmsCtx);

/**
 * selection.scope:
 * - 'global'             (global list)
 * - 'g-subcategory'      (a global subcategory selected)  id
 * - 'brand'              (brand selected)                 id
 * - 'category'           (category selected)              brandId, id
 * - 'subcategory'        (brand subcategory selected)     brandId, id
 */
export function CmsProvider({ children }) {
  const [brands, setBrands] = useState(initialBrands);
  const [globalSubcategories, setGlobalSubcategories] = useState([]); // <— NEW
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({ scope: "brand", id: "bwincom" });

  const selectedBrand = useMemo(() => {
    if (selection.scope === "brand") {
      return brands.find((b) => b.id === selection.id) || brands[0] || null;
    }
    if (selection.scope === "category" || selection.scope === "subcategory") {
      return (
        brands.find((b) => b.id === selection.brandId) || brands[0] || null
      );
    }
    return brands[0] || null;
  }, [brands, selection]);

  // ---------- load ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/cms");
        if (!res.ok) throw new Error(await res.text());
        const payload = await res.json();
        const state = payload?.state;

        if (mounted) {
          if (state?.brands) {
            setBrands(normalizeLoadedBrands(state.brands));
          }
          // load globals if present
          if (Array.isArray(state?.globalSubcategories)) {
            setGlobalSubcategories(
              normalizeLoadedGlobals(state.globalSubcategories)
            );
          }
          // keep selection sane
          if (state?.brands?.length) {
            setSelection((sel) => {
              const have =
                state.brands.find((b) => b.id === sel.id) || state.brands[0];
              return have ? sel : { scope: "brand", id: state.brands[0]?.id };
            });
          }
        }
      } catch (e) {
        console.warn("[cms] load failed, using seed:", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---------- persist (whole CMS state) ----------
  const writeTicket = useRef(0);
  const persistAll = async (nextBrands, nextGlobals) => {
    const t = ++writeTicket.current;
    try {
      await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: { brands: nextBrands, globalSubcategories: nextGlobals },
        }),
      });
    } catch (e) {
      console.error("[cms] save failed:", e);
    } finally {
      if (t !== writeTicket.current) return;
    }
  };
  const persist = (nextBrands) => persistAll(nextBrands, globalSubcategories);
  const persistGlobals = (nextGlobals) => persistAll(brands, nextGlobals);

  // ---------- normalization ----------
  function normalizeLoadedBrands(rawBrands) {
    const cloned = deepClone(rawBrands);
    cloned.forEach((b) => {
      b.locales = Array.isArray(b.locales) ? b.locales : [];
      b.categories = (b.categories || []).map((c) => ({
        id: c.id || uid(),
        name: c.name || c.nav_label?.[b.locales?.[0]] || "Untitled Category",
        parent_id: c.parent_id ?? null,
        order: c.order ?? 0,
        slug: { ...(c.slug || {}) },
        nav_label: { ...(c.nav_label || {}) },
        displayed_in_nav: !!c.displayed_in_nav,
        template: normalizeTemplate(c.template),
        is_home: !!c.is_home,
        nav_icon: c.nav_icon || "",
        new_games_count: !!c.new_games_count,
        type: c.type || "category",
        url: c.url || "",
      }));
      b.subcategories = (b.subcategories || []).map((sc) => ({
        id: sc.id || uid(),
        // internal
        subcategory_name: sc.subcategory_name || sc.name || "New subcategory",
        parent_category: sc.parent_category || null, // category id or null
        displayed_in_nav: !!sc.displayed_in_nav,
        order: sc.order ?? 0,

        // content source / config
        global_subcategory: sc.global_subcategory || null, // id from global area
        type: sc.type || "Game List",
        layout_type: sc.layout_type || "Carousel",

        // presentational
        icon: sc.icon || "",

        // translatables (brand locales)
        slug: { ...(sc.slug || {}) },
        label: { ...(sc.label || {}) },
        label_sub: { ...(sc.label_sub || {}) },
      }));
    });
    return cloned;
  }

  function normalizeLoadedGlobals(raw) {
    return (raw || []).map((g) => ({
      id: g.id || uid(),
      name: g.name || "New global subcategory",
      order: g.order ?? 0,
    }));
  }

  // ---------- selection actions ----------
  const selectGlobal = () => setSelection({ scope: "global" });
  const selectGlobalSubcategory = (id) =>
    setSelection({ scope: "g-subcategory", id });
  const selectBrand = (brandId) =>
    setSelection({ scope: "brand", id: brandId });
  const selectCategory = (brandId, categoryId) =>
    setSelection({ scope: "category", brandId, id: categoryId });
  const selectSubcategory = (brandId, subcatId) =>
    setSelection({ scope: "subcategory", brandId, id: subcatId });

  // ---------- brand actions ----------
  const updateBrand = (brandId, partial) => {
    setBrands((prev) => {
      const next = prev.map((b) =>
        b.id === brandId ? { ...b, ...partial } : b
      );
      persist(next);
      return next;
    });
  };

  // ---------- category actions ----------
  const addCategory = (brandId) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const baseLocales = b.locales.length ? b.locales : ["en-GB"];
      const nextOrder =
        Math.max(0, ...b.categories.map((c) => c.order || 0)) + 1;
      const cat = {
        id: uid(),
        name: "New Category",
        parent_id: null,
        order: nextOrder,
        slug: Object.fromEntries(baseLocales.map((l) => [l, ""])),
        nav_label: Object.fromEntries(
          baseLocales.map((l) => [l, "New Category"])
        ),
        displayed_in_nav: true,
        template: DEFAULT_TEMPLATE,
        is_home: false,
        nav_icon: "",
        new_games_count: false,
        type: "category",
        url: "",
      };
      b.categories.push(cat);
      persist(next);
      setSelection({ scope: "category", brandId, id: cat.id });
      return next;
    });
  };

  const updateCategory = (brandId, categoryId, partial) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const idx = b.categories.findIndex((c) => c.id === categoryId);
      if (idx === -1) return prev;

      const prevCat = b.categories[idx];
      const merged = { ...prevCat, ...partial };

      if (merged.is_home) merged.parent_id = null;

      if ("parent_id" in partial && partial.parent_id !== prevCat.parent_id) {
        const newPid = merged.parent_id ?? null;
        const sibs = b.categories.filter(
          (c) => (c.parent_id ?? null) === newPid && c.id !== merged.id
        );
        merged.order = sibs.length
          ? Math.max(...sibs.map((s) => s.order || 0)) + 1
          : 0;
      }

      merged.slug = { ...(prevCat.slug || {}), ...(partial.slug || {}) };
      merged.nav_label = {
        ...(prevCat.nav_label || {}),
        ...(partial.nav_label || {}),
      };
      if (partial.template !== undefined)
        merged.template = normalizeTemplate(partial.template);

      b.categories[idx] = merged;
      persist(next);
      return next;
    });
  };

  const deleteCategory = (brandId, categoryId) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      b.categories = b.categories
        .filter((c) => c.id !== categoryId)
        .map((c) =>
          c.parent_id === categoryId ? { ...c, parent_id: null } : c
        );
      b.subcategories = b.subcategories.map((sc) =>
        sc.parent_category === categoryId
          ? { ...sc, parent_category: null }
          : sc
      );
      persist(next);
      setSelection({ scope: "brand", id: brandId });
      return next;
    });
  };

  // ---------- brand subcategory actions ----------
  const addSubcategory = (brandId, parentCategoryId = null) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const nextOrder =
        Math.max(0, ...b.subcategories.map((s) => s.order || 0)) + 1;
      const sc = {
        id: uid(),
        name: "New subcategory",
        parent_category: parentCategoryId,
        order: nextOrder,
      };
      b.subcategories.push(sc);
      persist(next);
      setSelection({ scope: "subcategory", brandId, id: sc.id });
      return next;
    });
  };

  const updateSubcategory = (brandId, subcatId, partial) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const idx = b.subcategories.findIndex((s) => s.id === subcatId);
      if (idx === -1) return prev;

      const prevS = b.subcategories[idx];
      const merged = {
        ...prevS,
        ...partial,
        // merge translatables (so we don't clobber other locales)
        slug: { ...(prevS.slug || {}), ...(partial.slug || {}) },
        label: { ...(prevS.label || {}), ...(partial.label || {}) },
        label_sub: { ...(prevS.label_sub || {}), ...(partial.label_sub || {}) },
      };

      // if parent changes, move to end of the new group
      if (
        "parent_category" in partial &&
        partial.parent_category !== prevS.parent_category
      ) {
        const newGroup = b.subcategories.filter(
          (s) =>
            (s.parent_category || null) === (merged.parent_category || null) &&
            s.id !== merged.id
        );
        merged.order = newGroup.length
          ? Math.max(...newGroup.map((s) => s.order || 0)) + 1
          : 0;
      }

      b.subcategories[idx] = merged;
      persist(next);
      return next;
    });
  };

  const moveSubcategory = (brandId, subcatId, dir /* -1 up, +1 down */) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const list = b.subcategories;
      if (!Array.isArray(list)) return prev;

      const idx = list.findIndex((s) => s.id === subcatId);
      if (idx === -1) return prev;
      const target = list[idx];
      const groupKey = target.parent_category || null;

      // group items sharing same parent_category
      const group = list
        .filter((s) => (s.parent_category || null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((s) => s.id === subcatId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      // swap order
      const a = list.find((s) => s.id === target.id);
      const bItem = list.find((s) => s.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = bItem.order || 0;
      bItem.order = tmp;

      persist(next);
      return next;
    });
  };

  const moveSubcategoryUp = (brandId, subcatId) =>
    moveSubcategory(brandId, subcatId, -1);
  const moveSubcategoryDown = (brandId, subcatId) =>
    moveSubcategory(brandId, subcatId, +1);

  // --- Category reordering helpers ---
  const moveCategory = (brandId, categoryId, dir /* -1 up, +1 down */) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const list = b.categories || [];
      const idx = list.findIndex((c) => c.id === categoryId);
      if (idx === -1) return prev;

      const target = list[idx];
      const groupKey = target.parent_id ?? null;

      // group by same parent_id (parents together, children under same parent)
      const group = list
        .filter((c) => (c.parent_id ?? null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((c) => c.id === categoryId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      // swap order values
      const a = list.find((c) => c.id === target.id);
      const bCat = list.find((c) => c.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = bCat.order || 0;
      bCat.order = tmp;

      persist(next);
      return next;
    });
  };

  const moveCategoryUp = (brandId, categoryId) =>
    moveCategory(brandId, categoryId, -1);
  const moveCategoryDown = (brandId, categoryId) =>
    moveCategory(brandId, categoryId, +1);

  const deleteSubcategory = (brandId, subcatId) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      b.subcategories = b.subcategories.filter((s) => s.id !== subcatId);
      persist(next);
      setSelection({ scope: "brand", id: brandId });
      return next;
    });
  };

  // ---------- GLOBAL subcategory actions ----------
  const addGlobalSubcategory = () => {
    setGlobalSubcategories((prev) => {
      const next = deepClone(prev);
      const order = next.length
        ? Math.max(...next.map((g) => g.order || 0)) + 1
        : 0;
      const g = { id: uid(), name: "New global subcategory", order };
      next.push(g);
      persistGlobals(next);
      setSelection({ scope: "g-subcategory", id: g.id });
      return next;
    });
  };

  const updateGlobalSubcategory = (gId, partial) => {
    setGlobalSubcategories((prev) => {
      const next = deepClone(prev);
      const idx = next.findIndex((g) => g.id === gId);
      if (idx === -1) return prev;
      next[idx] = { ...next[idx], ...partial };
      persistGlobals(next);
      return next;
    });
  };

  const deleteGlobalSubcategory = (gId) => {
    setGlobalSubcategories((prev) => {
      const next = prev.filter((g) => g.id !== gId);
      persistGlobals(next);
      setSelection({ scope: "global" });
      return next;
    });
  };

  const value = {
    loading,
    brands,
    globalSubcategories,
    selectedBrand,
    selection,
    actions: {
      // selection
      selectGlobal,
      selectGlobalSubcategory,
      selectBrand,
      selectCategory,
      selectSubcategory,
      // brands/categories
      updateBrand,
      addCategory,
      updateCategory,
      deleteCategory,
      moveCategoryUp,
      moveCategoryDown, // <-- add these
      // subcategories
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      moveSubcategoryUp,
      moveSubcategoryDown,
      // globals
      addGlobalSubcategory,
      updateGlobalSubcategory,
      deleteGlobalSubcategory,
    },
  };

  return <CmsCtx.Provider value={value}>{children}</CmsCtx.Provider>;
}
