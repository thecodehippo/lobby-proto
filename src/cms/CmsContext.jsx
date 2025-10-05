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

// No seed data - all data comes from database/API

// ---------- context ----------
const CmsCtx = createContext(null);
export const useCms = () => useContext(CmsCtx);

/**
 * selection.scope:
 * - 'global'         (global list)
 * - 'g-category'     (a global category selected)          id
 * - 'g-subcategory'  (a global subcategory selected)       id
 * - 'brand'          (brand selected)                      id
 * - 'category'       (brand category selected)             brandId, id
 * - 'subcategory'    (brand subcategory selected)          brandId, id
 */
export function CmsProvider({ children }) {
  const [brands, setBrands] = useState([]);

  // NEW: Global Categories & Global Subcategories
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalCategorySubcategories, setGlobalCategorySubcategories] =
    useState([]);

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
          // Load globals (new shape). Backwards compat: tolerate older keys.
          const loadedGlobalCats = normalizeLoadedGlobalCategories(
            state?.globalCategories || state?.global?.categories || []
          );
          const loadedGlobalSubs = normalizeLoadedGlobalSubcategories(
            state?.globalCategorySubcategories ||
              state?.global?.subcategories ||
              []
          );
          setGlobalCategories(loadedGlobalCats);
          setGlobalCategorySubcategories(loadedGlobalSubs);

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
  const persistAll = async (
    nextBrands,
    nextGlobalCategories,
    nextGlobalSubs
  ) => {
    const t = ++writeTicket.current;
    try {
      await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            brands: nextBrands,
            globalCategories: nextGlobalCategories,
            globalCategorySubcategories: nextGlobalSubs,
          },
        }),
      });
    } catch (e) {
      console.error("[cms] save failed:", e);
    } finally {
      if (t !== writeTicket.current) return;
    }
  };
  const persist = (nextBrands) =>
    persistAll(nextBrands, globalCategories, globalCategorySubcategories);
  const persistGlobals = (nextCats, nextSubs) =>
    persistAll(
      brands,
      nextCats ?? globalCategories,
      nextSubs ?? globalCategorySubcategories
    );

  // ---------- normalization ----------
  function normalizeLoadedBrands(rawBrands) {
    const cloned = deepClone(rawBrands || []);
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
        global_category_id: c.global_category_id || null,
        // targeting
        targeting: {
          devices: c.targeting?.devices || ["mobile", "desktop"],
          countries: c.targeting?.countries || ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
          segment: c.targeting?.segment || null,
          internal_only: !!c.targeting?.internal_only,
          player_ids: Array.isArray(c.targeting?.player_ids) ? c.targeting.player_ids : [],
        },
      }));
      b.subcategories = (b.subcategories || []).map((sc) => ({
        id: sc.id || uid(),
        // internal
        subcategory_name: sc.subcategory_name || sc.name || "New subcategory",
        parent_category: sc.parent_category || null, // brand category id
        displayed_in_nav: !!sc.displayed_in_nav,
        order: sc.order ?? 0,

        // content source / config
        global_subcategory: sc.global_subcategory || null, // (legacy; unused now)
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

  function normalizeLoadedGlobalCategories(raw) {
    const arr = deepClone(raw || []);
    const ensured = arr.map((c) => {
      const lowerSlug = { ...(c.slug || {}) };
      const lowerLabel = { ...(c.nav_label || {}) };
      // ensure keys exist; keep case-liberal
      lowerSlug["en-gb"] = lowerSlug["en-gb"] || "";
      lowerSlug["de-at"] = lowerSlug["de-at"] || "";
      lowerLabel["en-gb"] = lowerLabel["en-gb"] || c.name || "Global";
      lowerLabel["de-at"] = lowerLabel["de-at"] || c.name || "Global";

      return {
        id: c.id || uid(),
        name: c.name || "Global Category",
        parent_id: c.parent_id ?? null,
        order: c.order ?? 0,
        slug: lowerSlug,
        nav_label: lowerLabel,
        displayed_in_nav: !!c.displayed_in_nav,
        template: normalizeTemplate(c.template),
        is_home: !!c.is_home,
        nav_icon: c.nav_icon || "",
        new_games_count: !!c.new_games_count,
        type: c.type || "category",
        url: c.url || "",
        targeting: {
          devices: c.targeting?.devices || ["mobile", "desktop"],
          countries: c.targeting?.countries || ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
          segment: c.targeting?.segment || null,
          internal_only: !!c.targeting?.internal_only,
          player_ids: Array.isArray(c.targeting?.player_ids) ? c.targeting.player_ids : [],
        },
      };
    });
    return ensured;
  }

  function normalizeLoadedGlobalSubcategories(raw) {
    const arr = deepClone(raw || []);
    return arr.map((s) => {
      const slug = { ...(s.slug || {}) };
      const label = { ...(s.label || {}) };
      const label_sub = { ...(s.label_sub || {}) };
      slug["en-gb"] = slug["en-gb"] || "";
      slug["de-at"] = slug["de-at"] || "";
      label["en-gb"] = label["en-gb"] || "";
      label["de-at"] = label["de-at"] || "";
      label_sub["en-gb"] = label_sub["en-gb"] || "";
      label_sub["de-at"] = label_sub["de-at"] || "";
      return {
        id: s.id || uid(),
        subcategory_name: s.subcategory_name || s.name || "Global subcategory",
        parent_category: s.parent_category || null, // global category id
        displayed_in_nav: !!s.displayed_in_nav,
        order: s.order ?? 0,
        type: s.type || "Game List",
        layout_type: s.layout_type || "Carousel",
        icon: s.icon || "",
        slug,
        label,
        label_sub,
      };
    });
  }

  // ---------- selection actions ----------
  const selectGlobal = () => setSelection({ scope: "global" });
  const selectGlobalCategory = (id) =>
    setSelection({ scope: "g-category", id });
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

  // ---------- category actions (brand) ----------
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
        global_category_id: null,
        targeting: {
          devices: ["mobile", "desktop"],
          countries: ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
          segment: null,
          internal_only: false,
          player_ids: [],
        },
      };
      b.categories.push(cat);
      persist(next);
      setSelection({ scope: "category", brandId, id: cat.id });
      return next;
    });
  };

  // ---------- category actions ----------
  const updateCategory = (brandId, categoryId, partial) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const idx = b.categories.findIndex((c) => c.id === categoryId);
      if (idx === -1) return prev;

      const prevCat = b.categories[idx];

      // did link status change in this update?
      const linkChanged =
        Object.prototype.hasOwnProperty.call(partial, "global_category_id") &&
        partial.global_category_id !== prevCat.global_category_id;
      const nowLinked = linkChanged && !!partial.global_category_id;

      // start merge
      const merged = { ...prevCat, ...partial };

      // structural rule: home must be a parent
      if (merged.is_home) merged.parent_id = null;

      // if parent changed, push to end of new group
      if ("parent_id" in partial && partial.parent_id !== prevCat.parent_id) {
        const newPid = merged.parent_id ?? null;
        const sibs = b.categories.filter(
          (c) => (c.parent_id ?? null) === newPid && c.id !== merged.id
        );
        merged.order = sibs.length
          ? Math.max(...sibs.map((s) => s.order || 0)) + 1
          : 0;
      }

      // normalize template if provided
      if (partial.template !== undefined) {
        merged.template = normalizeTemplate(partial.template);
      }

      // IMPORTANT: translations
      // - When linking -> clear brand-local translations so they don't linger.
      // - When not linking (or normal edits) -> do the usual merge.
      if (nowLinked) {
        merged.slug = {};
        merged.nav_label = {};
        // Optional: also clear brand-local presentational fields when linking.
        // (kept minimal to avoid surprises)
        // merged.nav_icon = "";
        // merged.new_games_count = false;
        // merged.type = "category";
        // merged.url = "";
        // merged.displayed_in_nav = false;
      } else {
        merged.slug = { ...(prevCat.slug || {}), ...(partial.slug || {}) };
        merged.nav_label = {
          ...(prevCat.nav_label || {}),
          ...(partial.nav_label || {}),
        };
      }

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
        subcategory_name: "New subcategory",
        parent_category: parentCategoryId,
        order: nextOrder,
        displayed_in_nav: true,
        type: "Game List",
        layout_type: "Carousel",
        icon: "",
        slug: {},
        label: {},
        label_sub: {},
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
        slug: { ...(prevS.slug || {}), ...(partial.slug || {}) },
        label: { ...(prevS.label || {}), ...(partial.label || {}) },
        label_sub: { ...(prevS.label_sub || {}), ...(partial.label_sub || {}) },
      };

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

      const group = list
        .filter((s) => (s.parent_category || null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((s) => s.id === subcatId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

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

  // --- Category reordering helpers (brand) ---
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

      const group = list
        .filter((c) => (c.parent_id ?? null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((c) => c.id === categoryId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

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

  // ---------- GLOBAL category actions ----------
  const addGlobalCategory = (parentId = null) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const sibs = next.filter(
        (c) => (c.parent_id ?? null) === (parentId ?? null)
      );
      const order = sibs.length
        ? Math.max(...sibs.map((c) => c.order || 0)) + 1
        : 0;
      const gc = {
        id: uid(),
        name: "New Global Category",
        parent_id: parentId ?? null,
        order,
        slug: { "en-gb": "", "de-at": "" },
        nav_label: { "en-gb": "Global", "de-at": "Global" },
        displayed_in_nav: true,
        template: DEFAULT_TEMPLATE,
        is_home: false,
        nav_icon: "",
        new_games_count: false,
        type: "category",
        url: "",
        targeting: {
          devices: ["mobile", "desktop"],
          countries: ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
          segment: null,
          internal_only: false,
          player_ids: [],
        },
      };
      next.push(gc);
      persistGlobals(next, null);
      setSelection({ scope: "g-category", id: gc.id });
      return next;
    });
  };

  const updateGlobalCategory = (gId, partial) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const idx = next.findIndex((g) => g.id === gId);
      if (idx === -1) return prev;

      const prevCat = next[idx];
      const merged = {
        ...prevCat,
        ...partial,
        slug: { ...(prevCat.slug || {}), ...(partial.slug || {}) },
        nav_label: {
          ...(prevCat.nav_label || {}),
          ...(partial.nav_label || {}),
        },
      };

      if ("parent_id" in partial && partial.parent_id !== prevCat.parent_id) {
        const newPid = merged.parent_id ?? null;
        const sibs = next.filter(
          (c) => (c.parent_id ?? null) === newPid && c.id !== merged.id
        );
        merged.order = sibs.length
          ? Math.max(...sibs.map((s) => s.order || 0)) + 1
          : 0;
      }

      if (partial.template !== undefined)
        merged.template = normalizeTemplate(partial.template);

      next[idx] = merged;
      persistGlobals(next, null);
      return next;
    });
  };

  const deleteGlobalCategory = (gId) => {
    setGlobalCategories((prevCats) => {
      let nextCats = deepClone(prevCats);
      // remove the category
      const removed = nextCats.find((c) => c.id === gId);
      nextCats = nextCats
        .filter((c) => c.id !== gId)
        .map((c) => (c.parent_id === gId ? { ...c, parent_id: null } : c));

      // move any global subcategories under this category to have no parent
      setGlobalCategorySubcategories((prevSubs) => {
        const nextSubs = prevSubs.map((s) =>
          s.parent_category === gId ? { ...s, parent_category: null } : s
        );
        persistGlobals(nextCats, nextSubs);
        setSelection({ scope: "global" });
        return nextSubs;
      });

      if (!removed) {
        persistGlobals(nextCats, globalCategorySubcategories);
        setSelection({ scope: "global" });
      }
      return nextCats;
    });
  };

  const moveGlobalCategory = (gId, dir /* -1 up, +1 down */) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const list = next;
      const idx = list.findIndex((c) => c.id === gId);
      if (idx === -1) return prev;

      const target = list[idx];
      const groupKey = target.parent_id ?? null;

      const group = list
        .filter((c) => (c.parent_id ?? null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((c) => c.id === gId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      const a = list.find((c) => c.id === target.id);
      const b = list.find((c) => c.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = b.order || 0;
      b.order = tmp;

      persistGlobals(next, null);
      return next;
    });
  };
  const moveGlobalCategoryUp = (gId) => moveGlobalCategory(gId, -1);
  const moveGlobalCategoryDown = (gId) => moveGlobalCategory(gId, +1);

  // ---------- GLOBAL subcategory actions ----------
  const addGlobalSubcategoryToCategory = (globalCategoryId = null) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const group = next.filter(
        (s) => (s.parent_category || null) === (globalCategoryId || null)
      );
      const order = group.length
        ? Math.max(...group.map((g) => g.order || 0)) + 1
        : 0;

      const sc = {
        id: uid(),
        subcategory_name: "New global subcategory",
        parent_category: globalCategoryId || null,
        order,
        displayed_in_nav: true,
        type: "Game List",
        layout_type: "Carousel",
        icon: "",
        slug: { "en-gb": "", "de-at": "" },
        label: { "en-gb": "", "de-at": "" },
        label_sub: { "en-gb": "", "de-at": "" },
      };
      next.push(sc);
      persistGlobals(null, next);
      setSelection({ scope: "g-subcategory", id: sc.id });
      return next;
    });
  };

  const updateGlobalSubcategoryInCategory = (subcatId, partial) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const idx = next.findIndex((s) => s.id === subcatId);
      if (idx === -1) return prev;

      const prevS = next[idx];
      const merged = {
        ...prevS,
        ...partial,
        slug: { ...(prevS.slug || {}), ...(partial.slug || {}) },
        label: { ...(prevS.label || {}), ...(partial.label || {}) },
        label_sub: { ...(prevS.label_sub || {}), ...(partial.label_sub || {}) },
      };

      if (
        "parent_category" in partial &&
        partial.parent_category !== prevS.parent_category
      ) {
        const newGroup = next.filter(
          (s) =>
            (s.parent_category || null) === (merged.parent_category || null) &&
            s.id !== merged.id
        );
        merged.order = newGroup.length
          ? Math.max(...newGroup.map((s) => s.order || 0)) + 1
          : 0;
      }

      next[idx] = merged;
      persistGlobals(null, next);
      return next;
    });
  };

  const deleteGlobalSubcategoryInCategory = (subcatId) => {
    setGlobalCategorySubcategories((prev) => {
      const next = prev.filter((s) => s.id !== subcatId);
      persistGlobals(null, next);
      setSelection({ scope: "global" });
      return next;
    });
  };

  const moveGlobalSubcategoryInCategory = (subcatId, dir /* -1 / +1 */) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const list = next;
      const idx = list.findIndex((s) => s.id === subcatId);
      if (idx === -1) return prev;
      const target = list[idx];
      const groupKey = target.parent_category || null;

      const group = list
        .filter((s) => (s.parent_category || null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((s) => s.id === subcatId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      const a = list.find((s) => s.id === target.id);
      const b = list.find((s) => s.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = b.order || 0;
      b.order = tmp;

      persistGlobals(null, next);
      return next;
    });
  };
  const moveGlobalSubcategoryUpInCategory = (subcatId) =>
    moveGlobalSubcategoryInCategory(subcatId, -1);
  const moveGlobalSubcategoryDownInCategory = (subcatId) =>
    moveGlobalSubcategoryInCategory(subcatId, +1);

  // ---------- Resolver: effective (brand + global) category ----------
  /**
   * Returns an "effective" category object merging brand category with its linked global category (if any).
   * - Inherits: displayed_in_nav, template, nav_icon, new_games_count, type, url, nav_label, slug
   * - Structural fields (name, parent_id, is_home) come from brand.
   * - Subcategories = brand subcats (for this brand category) FIRST, then global subcats (for linked global category).
   */
  const resolveCategory = (brandId, categoryId) => {
    const b = brands.find((x) => x.id === brandId);
    if (!b) return null;
    const cat = (b.categories || []).find((c) => c.id === categoryId);
    if (!cat) return null;

    const global = cat.global_category_id
      ? globalCategories.find((g) => g.id === cat.global_category_id) || null
      : null;

    const eff = {
      // structural (brand-owned)
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id,
      is_home: !!cat.is_home,

      // inherited/presentational
      displayed_in_nav:
        global?.displayed_in_nav !== undefined
          ? !!global.displayed_in_nav
          : !!cat.displayed_in_nav,
      template:
        global?.template !== undefined
          ? normalizeTemplate(global.template)
          : normalizeTemplate(cat.template),
      nav_icon: global?.nav_icon || cat.nav_icon || "",
      new_games_count:
        global?.new_games_count !== undefined
          ? !!global.new_games_count
          : !!cat.new_games_count,
      type: global?.type || cat.type || "category",
      url: global?.url || cat.url || "",

      // translations (prefer global)
      nav_label: {
        ...(cat.nav_label || {}),
        ...(global?.nav_label || {}),
      },
      slug: {
        ...(cat.slug || {}),
        ...(global?.slug || {}),
      },

      // order used for lists (brand's)
      order: cat.order || 0,
      // linked
      global_category_id: cat.global_category_id || null,
      // targeting (brand-owned, not inherited)
      targeting: cat.targeting || {
        devices: ["mobile", "desktop"],
        countries: ["UK", "Ireland", "Austria", "Canada", "Ontario", "France"],
        segment: null,
        internal_only: false,
        player_ids: [],
      },
    };

    // subcategories: brand-first then global subs
    const brandSubs = (b.subcategories || [])
      .filter((s) => s.parent_category === cat.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const globalSubs = eff.global_category_id
      ? (globalCategorySubcategories || [])
          .filter((s) => s.parent_category === eff.global_category_id)
          .sort((a, z) => (a.order || 0) - (z.order || 0))
      : [];

    eff.subcategories = [...brandSubs, ...globalSubs];

    return eff;
  };

  const value = {
    loading,
    brands,
    selectedBrand,
    selection,

    // NEW globals exposed
    globalCategories,
    globalCategorySubcategories,

    // resolver
    resolveCategory,

    actions: {
      // selection
      selectGlobal,
      selectGlobalCategory,
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
      moveCategoryDown,

      // brand subcategories
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      moveSubcategoryUp,
      moveSubcategoryDown,

      // globals: categories
      addGlobalCategory,
      updateGlobalCategory,
      deleteGlobalCategory,
      moveGlobalCategoryUp,
      moveGlobalCategoryDown,

      // globals: subcategories
      addGlobalSubcategoryToCategory,
      updateGlobalSubcategoryInCategory,
      deleteGlobalSubcategoryInCategory,
      moveGlobalSubcategoryUpInCategory,
      moveGlobalSubcategoryDownInCategory,
    },
  };

  return <CmsCtx.Provider value={value}>{children}</CmsCtx.Provider>;
}
