"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { IngredientsPageClient } from "@/app/ingredients/IngredientsPageClient";
import { IngredientEditModal } from "@/components/ingredients/IngredientEditModal";
import { PageHeader } from "@/components/ui";
import { StockControlModalButton } from "@/components/stock/StockControlModalButton";
import { reorderIngredients } from "@/lib/actions";
import {
  getUnitCost,
  isLowStock,
} from "@/lib/calculations";
import {
  loadIngredientOrder,
  mergeIngredientOrder,
  saveIngredientOrder,
} from "@/lib/ingredient-order";
import {
  countIngredientsByCategory,
  getCategoryFilterStyle,
  normalizeIngredientCategory,
} from "@/lib/ingredient-categories";
import { getIngredientRecipeMenus } from "@/lib/recipe-index";
import { useClientMounted } from "@/lib/use-client-mounted";
import type {
  Ingredient,
  Product,
  Purchase,
  RecipeItem,
} from "@/lib/types";

const IngredientSortableList = dynamic(
  () =>
    import("@/components/ingredients/IngredientSortableList").then(
      (mod) => mod.IngredientSortableList
    ),
  { ssr: false }
);

export function IngredientsInventoryView({
  ingredients,
  products,
  purchases,
  recipeItems,
  embedded = false,
  initialSearch,
}: {
  ingredients: Ingredient[];
  products: Product[];
  purchases: Purchase[];
  recipeItems: RecipeItem[];
  embedded?: boolean;
  initialSearch?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch?.trim() ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [searchOpen, setSearchOpen] = useState(Boolean(initialSearch?.trim()));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [localOrderIds, setLocalOrderIds] = useState<string[] | null>(null);
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);
  const mounted = useClientMounted();

  useEffect(() => {
    setSavedOrder(loadIngredientOrder());

    function syncSavedOrder() {
      setSavedOrder(loadIngredientOrder());
    }

    window.addEventListener("storage", syncSavedOrder);
    return () => window.removeEventListener("storage", syncSavedOrder);
  }, []);

  useEffect(() => {
    const query = initialSearch?.trim();
    if (!query) return;
    setSearch(query);
    setSearchOpen(true);
  }, [initialSearch]);

  const canReorder = !search.trim() && categoryFilter === "all";

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function selectCategoryFilter(next: string | "all") {
    setCategoryFilter(next);
  }

  function keepFilterTapFocus(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  const searchExpanded = searchOpen || search.length > 0;

  const orderedIngredients = useMemo(() => {
    const orderSource = mounted ? (localOrderIds ?? savedOrder) : null;
    const merged = mergeIngredientOrder(
      orderSource,
      ingredients.map((i) => i.id)
    );
    return merged
      .map((id) => ingredients.find((i) => i.id === id))
      .filter((i): i is Ingredient => i !== undefined);
  }, [ingredients, localOrderIds, savedOrder, mounted]);

  const handleReorderIds = useCallback(
    (orderedIds: string[]) => {
      setLocalOrderIds(orderedIds);
      saveIngredientOrder(orderedIds);
      startTransition(async () => {
        const result = await reorderIngredients(orderedIds);
        if (result.error) {
          setMessage(result.error);
        } else {
          router.refresh();
        }
      });
    },
    [router]
  );

  const rows = useMemo(() => {
    return orderedIngredients
      .map((ingredient) => {
        const unitCost = getUnitCost(ingredient, purchases);

        return {
          ingredient,
          unitCost,
          low: isLowStock(ingredient),
        };
      })
      .filter(({ ingredient }) => {
        if (
          categoryFilter !== "all" &&
          normalizeIngredientCategory(ingredient.category) !== categoryFilter
        ) {
          return false;
        }
        return ingredient.name.toLowerCase().includes(search.toLowerCase().trim());
      });
  }, [orderedIngredients, purchases, search, categoryFilter]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const cardBottom = window.scrollY + card.getBoundingClientRect().bottom;
    const maxScrollTop = Math.max(0, cardBottom - window.innerHeight + 24);

    if (window.scrollY > maxScrollTop) {
      window.scrollTo({ top: maxScrollTop, behavior: "auto" });
    }
  }, [categoryFilter, rows.length]);

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const ingredient of orderedIngredients) {
      const category = normalizeIngredientCategory(ingredient.category);
      const key = category.toLocaleLowerCase("th").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ordered.push(category);
    }
    return ordered;
  }, [orderedIngredients]);
  const categoryCounts = useMemo(
    () => countIngredientsByCategory(ingredients),
    [ingredients]
  );
  const listTitle =
    categoryFilter === "all" ? "รายการทั้งหมด" : categoryFilter;

  const editingRow = useMemo(() => {
    if (!editingId) return null;
    const ingredient = ingredients.find((i) => i.id === editingId);
    if (!ingredient) return null;
    return {
      ingredient,
      recipeMenus: getIngredientRecipeMenus(
        ingredient.id,
        products,
        recipeItems
      ),
    };
  }, [editingId, ingredients, products, recipeItems]);

  function handleDeleted() {
    setEditingId(null);
    setMessage("ลบวัตถุดิบเรียบร้อย");
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {!embedded && (
        <PageHeader
          title="วัตถุดิบ"
          subtitle={`${ingredients.length} รายการ`}
        />
      )}

      <div ref={cardRef} className="app-card app-card-flush w-full">
        <div className="ingredient-category-filter-wrap">
          <p className="ingredient-category-filter-label">กรองประเภท</p>
          <div className="ingredient-category-filter">
            <button
              type="button"
              className={`ingredient-category-filter-btn${categoryFilter === "all" ? " is-active" : ""}`}
              onMouseDown={keepFilterTapFocus}
              onClick={() => selectCategoryFilter("all")}
            >
              ทั้งหมด
              <span className="ingredient-category-filter-count">
                {ingredients.length}
              </span>
            </button>
            {allCategories.map((category) => {
              const active = categoryFilter === category;
              const style = getCategoryFilterStyle(category, allCategories, active);
              return (
                <button
                  key={category}
                  type="button"
                  className={`ingredient-category-filter-btn${active ? " is-active" : ""}`}
                  onMouseDown={keepFilterTapFocus}
                  style={
                    active
                      ? {
                          color: style.color,
                          background: style.background,
                          borderColor: style.borderColor,
                        }
                      : { borderColor: style.borderColor }
                  }
                  onClick={() => selectCategoryFilter(category)}
                >
                  {category}
                  <span className="ingredient-category-filter-count">
                    {categoryCounts[category] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="ingredient-category-filter-note">
            ของใช้ได้จริง = หลังปอกเตรียม · ชุด = เตรียมครั้งใหญ่แล้วแบ่งใส่ม้วน · ตั้ง Yield ที่แก้ไขวัตถุดิบ
          </p>
        </div>

        <div className="app-card-header ingredient-card-header">
          <h2 className="app-section-title">
            {listTitle}
            <span className="ingredient-count-badge">{rows.length}</span>
          </h2>

          <div className="ingredient-list-toolbar">
            <div
              className={`ingredient-search ${searchExpanded ? "ingredient-search--open" : ""}`}
            >
              {searchExpanded ? (
                <div className="ingredient-search-field">
                  <Search
                    size={14}
                    className="ingredient-search-icon"
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
                    className="app-input ingredient-search-input"
                    placeholder="ค้นหา..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        closeSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ingredient-search-close"
                    aria-label="ปิดค้นหา"
                    onClick={closeSearch}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ingredient-search-toggle"
                  aria-label="ค้นหา"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={16} />
                </button>
              )}
            </div>

            <IngredientsPageClient
              mode="purchase"
              ingredients={ingredients}
              compact
              label="+ เติมสต็อก"
            />
            <StockControlModalButton
              ingredients={ingredients}
              products={products}
              recipeItems={recipeItems}
              purchases={purchases}
            />
            <IngredientsPageClient mode="add" ingredients={ingredients} compact />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="app-empty m-4">
            {search || categoryFilter !== "all"
              ? "ไม่พบรายการที่ค้นหา"
              : "ยังไม่มีวัตถุดิบ"}
          </div>
        ) : (
          <>
            <div className="hidden md:block ingredient-grid-list ingredient-grid-list--warehouse max-md:!hidden">
              <div className="ingredient-grid-head">
                <div className="ingredient-grid-cell ingredient-grid-cell--name">
                  <span className="ingredient-head-grip-spacer" aria-hidden />
                  วัตถุดิบ
                </div>
                <span className="ingredient-grid-cell ingredient-grid-cell--price">
                  ราคา / หน่วย
                </span>
                <span className="ingredient-grid-cell ingredient-grid-cell--stock">
                  สต็อก
                </span>
                <span className="ingredient-grid-cell ingredient-grid-cell--alert">
                  แจ้งเตือน
                </span>
              </div>
              <IngredientSortableList
                rows={rows}
                canReorder={canReorder}
                onReorder={handleReorderIds}
                onEdit={setEditingId}
                variant="desktop"
                allCategories={allCategories}
              />
            </div>

            <div className="ingredient-mobile-feed md:hidden">
              <IngredientSortableList
                rows={rows}
                canReorder={canReorder}
                onReorder={handleReorderIds}
                onEdit={setEditingId}
                variant="mobile"
                allCategories={allCategories}
              />
            </div>
          </>
        )}
      </div>

      {message && (
        <p
          className="mt-4 rounded px-3 py-2 text-xs"
          style={{
            color: message.includes("เรียบร้อย")
              ? "var(--success)"
              : "var(--warning)",
            background: message.includes("เรียบร้อย")
              ? "var(--success-muted)"
              : "var(--warning-muted)",
          }}
        >
          {message}
        </p>
      )}

      {editingRow && (
        <IngredientEditModal
          ingredient={editingRow.ingredient}
          quantityPerRoll={0}
          productId=""
          recipeMenus={editingRow.recipeMenus}
          onClose={() => setEditingId(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
