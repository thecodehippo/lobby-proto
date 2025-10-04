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

// ---------- helpers ----------
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

// ---------- seed ----------
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
  },
];

// ---------- context ----------
const CmsCtx = createContext(null);
export const useCms = () => useContext(CmsCtx);

/**
 * selection.scope is either:
 * - 'brand'     (id = brandId)
 * - 'category'  (id = categoryId, brandId = brandId)
 */
export function CmsProvider({ children }) {
  const [brands, setBrands] = useState(initialBrands);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({ scope: "brand", id: "bwincom" });

  const selectedBrand = useMemo(() => {
    if (selection.scope === "brand") {
      return brands.find((b) => b.id === selection.id) || brands[0] || null;
    }
    if (selection.scope === "category") {
      return (
        brands.find((b) => b.id === selection.brandId) || brands[0] || null
      );
    }
    return brands[0] || null;
  }, [brands, selection]);

  // ---------- load from server ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/cms");
        if (!res.ok) throw new Error(await res.text());
        const payload = await res.json();
        const state = payload?.state;
        if (state?.brands && mounted) {
          setBrands(normalizeLoadedBrands(state.brands));
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

  // ---------- persist ----------
  const writeTicket = useRef(0);
  const persist = async (nextBrands) => {
    const t = ++writeTicket.current;
    try {
      await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: { brands: nextBrands } }),
      });
    } catch (e) {
      console.error("[cms] save failed:", e);
    } finally {
      if (t !== writeTicket.current) return;
    }
  };

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
    });
    return cloned;
  }

  // ---------- selection actions ----------
  const selectBrand = (brandId) =>
    setSelection({ scope: "brand", id: brandId });
  const selectCategory = (brandId, categoryId) =>
    setSelection({ scope: "category", id: categoryId, brandId });

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

      // home must be a parent
      if (merged.is_home) merged.parent_id = null;

      // reparent → move to end of new sibling group
      if ("parent_id" in partial && partial.parent_id !== prevCat.parent_id) {
        const newPid = merged.parent_id ?? null;
        const sibs = b.categories.filter(
          (c) => (c.parent_id ?? null) === newPid && c.id !== merged.id
        );
        merged.order = sibs.length
          ? Math.max(...sibs.map((s) => s.order || 0)) + 1
          : 0;
      }

      // merge translatables
      merged.slug = { ...(prevCat.slug || {}), ...(partial.slug || {}) };
      merged.nav_label = {
        ...(prevCat.nav_label || {}),
        ...(partial.nav_label || {}),
      };

      // normalize template
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

      // remove category and promote its children
      b.categories = b.categories
        .filter((c) => c.id !== categoryId)
        .map((c) =>
          c.parent_id === categoryId ? { ...c, parent_id: null } : c
        );

      persist(next);
      setSelection({ scope: "brand", id: brandId });
      return next;
    });
  };

  const value = {
    loading,
    brands,
    selectedBrand,
    selection,
    actions: {
      selectBrand,
      selectCategory,
      updateBrand,
      addCategory,
      updateCategory,
      deleteCategory,
    },
  };

  return <CmsCtx.Provider value={value}>{children}</CmsCtx.Provider>;
}
