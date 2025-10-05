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

/* ---------------- utils ---------------- */

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

const ensureKeys = (obj, keys) => {
  const base = { ...(obj || {}) };
  keys.forEach((k) => {
    if (!(k in base)) base[k] = "";
  });
  return base;
};

/* ---------------- seed ---------------- */

const initialBrands = [
  {
    id: "bwincom",
    name: "bwincom",
    locales: ["en-GB"], // brand locales (lobby uses these)
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
        // global_category_id: null, // when set, inherit from that global category
      },
    ],
    subcategories: [], // brand subcategories
  },
];

/* ---------------- context ---------------- */

const CmsCtx = createContext(null);
export const useCms = () => useContext(CmsCtx);

/**
 * selection.scope:
 * - 'global'            (global settings)
 * - 'g-category'        (a global category)            id
 * - 'g-subcategory'     (a global subcategory)         id
 * - 'brand'             (brand selected)               id
 * - 'category'          (brand category selected)      brandId, id
 * - 'subcategory'       (brand subcategory selected)   brandId, id
 */

export function CmsProvider({ children }) {
  /* ---- state ---- */
  const [brands, setBrands] = useState(initialBrands);

  // global locales that drive translations for global cats/subcats
  const [globalLocales, setGlobalLocales] = useState(["en-gb", "de-at"]);

  const [globalCategories, setGlobalCategories] = useState([]); // array of global categories
  const [globalCategorySubcategories, setGlobalCategorySubcategories] =
    useState([]); // array of global subcategories (each has parent_category = global category id)

  const [loading, setLoading] = useState(true);

  const [selection, setSelection] = useState({ scope: "brand", id: "bwincom" });

  /* ---- derived ---- */
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

  /* ---- load ---- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/cms");
        if (!res.ok) throw new Error(await res.text());
        const payload = await res.json();
        const state = payload?.state || {};

        if (!mounted) return;

        if (Array.isArray(state.brands)) {
          setBrands(normalizeLoadedBrands(state.brands));
        }
        if (Array.isArray(state.globalCategories)) {
          setGlobalCategories(
            normalizeLoadedGlobalCategories(state.globalCategories)
          );
        }
        if (Array.isArray(state.globalCategorySubcategories)) {
          setGlobalCategorySubcategories(
            normalizeLoadedGlobalSubcategories(
              state.globalCategorySubcategories
            )
          );
        }
        if (Array.isArray(state.globalLocales) && state.globalLocales.length) {
          setGlobalLocales(
            Array.from(
              new Set(state.globalLocales.map((l) => String(l).toLowerCase()))
            )
          );
        }

        // sane selection
        if (state?.brands?.length) {
          setSelection((sel) => {
            const have =
              state.brands.find((b) => b.id === sel.id) || state.brands[0];
            return have ? sel : { scope: "brand", id: state.brands[0]?.id };
          });
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

  /* ---- persist (whole CMS blob) ---- */
  const writeTicket = useRef(0);
  const persistAll = async (
    nextBrands = brands,
    nextGlobalCats = globalCategories,
    nextGlobalSubs = globalCategorySubcategories,
    nextGlobalLocales = globalLocales
  ) => {
    const t = ++writeTicket.current;
    try {
      await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            brands: nextBrands,
            globalCategories: nextGlobalCats,
            globalCategorySubcategories: nextGlobalSubs,
            globalLocales: nextGlobalLocales,
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
    persistAll(nextBrands, undefined, undefined, undefined);
  const persistGlobals = (nextGlobalCats, nextGlobalSubs) =>
    persistAll(undefined, nextGlobalCats, nextGlobalSubs, undefined);
  const persistLocales = (nextGlobalLocales) =>
    persistAll(undefined, undefined, undefined, nextGlobalLocales);

  /* ---- normalization ---- */

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
        global_category_id: c.global_category_id ?? null,
      }));
      b.subcategories = (b.subcategories || []).map((sc) => ({
        id: sc.id || uid(),
        // internal
        subcategory_name: sc.subcategory_name || sc.name || "New subcategory",
        parent_category: sc.parent_category || null, // brand category id
        displayed_in_nav: !!sc.displayed_in_nav,
        order: sc.order ?? 0,
        // content/config
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
    return (raw || []).map((c) => ({
      id: c.id || uid(),
      name: c.name || "Global Category",
      parent_id: c.parent_id ?? null,
      order: c.order ?? 0,
      displayed_in_nav: !!c.displayed_in_nav,
      template: normalizeTemplate(c.template),
      is_home: !!c.is_home,
      nav_icon: c.nav_icon || "",
      new_games_count: !!c.new_games_count,
      type: c.type || "category",
      url: c.url || "",
      slug: { ...(c.slug || {}) }, // locales are validated in editors
      nav_label: { ...(c.nav_label || {}) },
    }));
  }

  function normalizeLoadedGlobalSubcategories(raw) {
    return (raw || []).map((s) => ({
      id: s.id || uid(),
      subcategory_name: s.subcategory_name || s.name || "Global subcategory",
      parent_category: s.parent_category || null, // global category id
      displayed_in_nav: !!s.displayed_in_nav,
      order: s.order ?? 0,
      type: s.type || "Game List",
      layout_type: s.layout_type || "Carousel",
      icon: s.icon || "",
      slug: { ...(s.slug || {}) },
      label: { ...(s.label || {}) },
      label_sub: { ...(s.label_sub || {}) },
    }));
  }

  /* ---- selection actions ---- */

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

  /* ---- global locales action ---- */

  const setGlobalLocalesAction = (list) => {
    const cleaned = Array.from(
      new Set((list || []).map((l) => String(l).toLowerCase()))
    );
    setGlobalLocales(cleaned);
    persistLocales(cleaned);
  };

  /* ---- brand actions ---- */

  const updateBrand = (brandId, partial) => {
    setBrands((prev) => {
      const next = prev.map((b) =>
        b.id === brandId ? { ...b, ...partial } : b
      );
      persist(next);
      return next;
    });
  };

  /* ---- brand category actions ---- */

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
      };
      b.categories.push(cat);
      persist(next);
      setSelection({ scope: "category", brandId, id: cat.id });
      return next;
    });
  };

  // NOTE: clears brand translations when linking to a global category
  const updateCategory = (brandId, categoryId, partial) => {
    setBrands((prev) => {
      const next = deepClone(prev);
      const b = next.find((x) => x.id === brandId);
      if (!b) return prev;
      const idx = b.categories.findIndex((c) => c.id === categoryId);
      if (idx === -1) return prev;

      const prevCat = b.categories[idx];

      const linkChanged =
        Object.prototype.hasOwnProperty.call(partial, "global_category_id") &&
        partial.global_category_id !== prevCat.global_category_id;
      const nowLinked = linkChanged && !!partial.global_category_id;

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

      if (partial.template !== undefined)
        merged.template = normalizeTemplate(partial.template);

      if (nowLinked) {
        // clear brand-local translations so only global ones are visible while linked
        merged.slug = {};
        merged.nav_label = {};
      } else {
        // normal merge of translatables (avoid clobbering other locales)
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

  /* ---- brand subcategory actions ---- */

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
        displayed_in_nav: true,
        order: nextOrder,
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
      const list = b.subcategories || [];
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

  /* ---- GLOBAL category actions ---- */

  const addGlobalCategory = (parentId = null) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const order =
        next.filter((c) => (c.parent_id ?? null) === (parentId ?? null))
          .length +
        (next.length ? Math.max(...next.map((c) => c.order || 0)) + 1 : 0);
      const gc = {
        id: uid(),
        name: "Global Category",
        parent_id: parentId ?? null,
        order: order,
        displayed_in_nav: true,
        template: DEFAULT_TEMPLATE,
        is_home: false,
        nav_icon: "",
        new_games_count: false,
        type: "category",
        url: "",
        slug: ensureKeys({}, globalLocales),
        nav_label: ensureKeys({}, globalLocales),
      };
      next.push(gc);
      persistGlobals(next, globalCategorySubcategories);
      setSelection({ scope: "g-category", id: gc.id });
      return next;
    });
  };

  const updateGlobalCategory = (gCatId, partial) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const idx = next.findIndex((c) => c.id === gCatId);
      if (idx === -1) return prev;

      const prevC = next[idx];
      const merged = { ...prevC, ...partial };

      if (merged.is_home) merged.parent_id = null;

      if ("parent_id" in partial && partial.parent_id !== prevC.parent_id) {
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

      // normalize translation keys to globalLocales
      merged.slug = ensureKeys(
        { ...(prevC.slug || {}), ...(partial.slug || {}) },
        globalLocales
      );
      merged.nav_label = ensureKeys(
        { ...(prevC.nav_label || {}), ...(partial.nav_label || {}) },
        globalLocales
      );

      next[idx] = merged;
      persistGlobals(next, globalCategorySubcategories);
      return next;
    });
  };

  const deleteGlobalCategory = (gCatId) => {
    setGlobalCategories((prevCats) => {
      const nextCats = deepClone(prevCats).filter((c) => c.id !== gCatId);
      // Promote children of deleted category to root
      nextCats.forEach((c) => {
        if (c.parent_id === gCatId) c.parent_id = null;
      });

      // Remove/float subcategories under that global category
      setGlobalCategorySubcategories((prevSubs) => {
        const nextSubs = deepClone(prevSubs).map((s) =>
          s.parent_category === gCatId ? { ...s, parent_category: null } : s
        );
        persistAll(brands, nextCats, nextSubs, globalLocales);
        return nextSubs;
      });

      setSelection({ scope: "global" });
      return nextCats;
    });
  };

  const moveGlobalCategory = (gCatId, dir /* -1 up, +1 down */) => {
    setGlobalCategories((prev) => {
      const next = deepClone(prev);
      const list = next;
      const idx = list.findIndex((c) => c.id === gCatId);
      if (idx === -1) return prev;

      const target = list[idx];
      const groupKey = target.parent_id ?? null;

      const group = list
        .filter((c) => (c.parent_id ?? null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((c) => c.id === gCatId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      const a = list.find((c) => c.id === target.id);
      const bCat = list.find((c) => c.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = bCat.order || 0;
      bCat.order = tmp;

      persistGlobals(next, globalCategorySubcategories);
      return next;
    });
  };

  const moveGlobalCategoryUp = (gCatId) => moveGlobalCategory(gCatId, -1);
  const moveGlobalCategoryDown = (gCatId) => moveGlobalCategory(gCatId, +1);

  /* ---- GLOBAL subcategory actions ---- */

  const addGlobalSubcategoryInCategory = (parentGlobalCategoryId = null) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const order = Math.max(0, ...next.map((s) => s.order || 0)) + 1;
      const sc = {
        id: uid(),
        subcategory_name: "Global subcategory",
        parent_category: parentGlobalCategoryId,
        displayed_in_nav: true,
        order,
        type: "Game List",
        layout_type: "Carousel",
        icon: "",
        slug: ensureKeys({}, globalLocales),
        label: ensureKeys({}, globalLocales),
        label_sub: ensureKeys({}, globalLocales),
      };
      next.push(sc);
      persistGlobals(globalCategories, next);
      setSelection({ scope: "g-subcategory", id: sc.id });
      return next;
    });
  };

  const updateGlobalSubcategoryInCategory = (gSubId, partial) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const idx = next.findIndex((s) => s.id === gSubId);
      if (idx === -1) return prev;

      const prevS = next[idx];
      const merged = {
        ...prevS,
        ...partial,
        slug: ensureKeys(
          { ...(prevS.slug || {}), ...(partial.slug || {}) },
          globalLocales
        ),
        label: ensureKeys(
          { ...(prevS.label || {}), ...(partial.label || {}) },
          globalLocales
        ),
        label_sub: ensureKeys(
          { ...(prevS.label_sub || {}), ...(partial.label_sub || {}) },
          globalLocales
        ),
      };

      if (
        "parent_category" in partial &&
        partial.parent_category !== prevS.parent_category
      ) {
        const group = next.filter(
          (s) =>
            (s.parent_category || null) === (merged.parent_category || null) &&
            s.id !== merged.id
        );
        merged.order = group.length
          ? Math.max(...group.map((s) => s.order || 0)) + 1
          : 0;
      }

      next[idx] = merged;
      persistGlobals(globalCategories, next);
      return next;
    });
  };

  const deleteGlobalSubcategoryInCategory = (gSubId) => {
    setGlobalCategorySubcategories((prev) => {
      const next = prev.filter((s) => s.id !== gSubId);
      persistGlobals(globalCategories, next);
      setSelection({ scope: "global" });
      return next;
    });
  };

  const moveGlobalSubcategoryInCategory = (
    gSubId,
    dir /* -1 up, +1 down */
  ) => {
    setGlobalCategorySubcategories((prev) => {
      const next = deepClone(prev);
      const list = next;
      const idx = list.findIndex((s) => s.id === gSubId);
      if (idx === -1) return prev;
      const target = list[idx];
      const groupKey = target.parent_category || null;

      const group = list
        .filter((s) => (s.parent_category || null) === groupKey)
        .sort((a, z) => (a.order || 0) - (z.order || 0));

      const pos = group.findIndex((s) => s.id === gSubId);
      const swapWith = group[pos + dir];
      if (!swapWith) return prev;

      const a = list.find((s) => s.id === target.id);
      const bItem = list.find((s) => s.id === swapWith.id);
      const tmp = a.order || 0;
      a.order = bItem.order || 0;
      bItem.order = tmp;

      persistGlobals(globalCategories, next);
      return next;
    });
  };

  const moveGlobalSubcategoryUpInCategory = (gSubId) =>
    moveGlobalSubcategoryInCategory(gSubId, -1);
  const moveGlobalSubcategoryDownInCategory = (gSubId) =>
    moveGlobalSubcategoryInCategory(gSubId, +1);

  /* ---- effective resolver ---- */

  /**
   * Returns an "effective" category object for runtime/lobby:
   * - If brand category links to a global category, inherit fields from global
   *   (displayed_in_nav, template, nav_icon, new_games_count, type, url, slug, nav_label)
   *   but keep brand's structure: name, parent_id, is_home, order.
   * - Subcategories: brand subs (for that category) first, then global subs (for the linked global category).
   */
  const resolveCategory = (brandId, categoryId) => {
    const b = brands.find((x) => x.id === brandId);
    if (!b) return null;
    const cat = (b.categories || []).find((c) => c.id === categoryId);
    if (!cat) return null;

    const linked = cat.global_category_id
      ? globalCategories.find((g) => g.id === cat.global_category_id)
      : null;

    // base effective = brand structural fields
    const eff = {
      ...cat,
      template: normalizeTemplate(cat.template),
    };

    if (linked) {
      // overlay from global
      eff.displayed_in_nav = !!linked.displayed_in_nav;
      eff.template = normalizeTemplate(linked.template);
      eff.nav_icon = linked.nav_icon || "";
      eff.new_games_count = !!linked.new_games_count;
      eff.type = linked.type || "category";
      eff.url = linked.url || "";
      eff.slug = { ...(linked.slug || {}) };
      eff.nav_label = { ...(linked.nav_label || {}) };
    }

    // effective subcategories: brand-first
    const brandSubs = (b.subcategories || [])
      .filter((s) => s.parent_category === cat.id)
      .sort((a, z) => (a.order || 0) - (z.order || 0));

    const globalSubs = linked
      ? (globalCategorySubcategories || [])
          .filter((s) => s.parent_category === linked.id)
          .sort((a, z) => (a.order || 0) - (z.order || 0))
      : [];

    eff.subcategories = [...brandSubs, ...globalSubs];

    return eff;
  };

  /* ---- value ---- */

  const value = {
    loading,
    // data
    brands,
    selectedBrand,
    selection,

    globalLocales,
    globalCategories,
    globalCategorySubcategories,

    // helpers
    resolveCategory,

    // actions
    actions: {
      // selection
      selectGlobal,
      selectGlobalCategory,
      selectGlobalSubcategory,
      selectBrand,
      selectCategory,
      selectSubcategory,

      // global locales
      setGlobalLocales: setGlobalLocalesAction,

      // brands
      updateBrand,

      // brand categories
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

      // global categories
      addGlobalCategory,
      updateGlobalCategory,
      deleteGlobalCategory,
      moveGlobalCategoryUp,
      moveGlobalCategoryDown,

      // global subcategories
      addGlobalSubcategoryInCategory,
      updateGlobalSubcategoryInCategory,
      deleteGlobalSubcategoryInCategory,
      moveGlobalSubcategoryUpInCategory,
      moveGlobalSubcategoryDownInCategory,
    },
  };

  return <CmsCtx.Provider value={value}>{children}</CmsCtx.Provider>;
}
