"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectMenu, filterTriggerClass } from "@/components/ui/menu";
import type { ProductListQuery } from "@/data/products";
import { categoryLabel, type Category } from "@/domain/category";
import type { ProductStatus } from "@/domain/product";
import { cn } from "@/lib/cn";

import { useListNavigation } from "../shared/list-transition";
import { PRODUCT_STATUS_META } from "./labels";
import { hasActiveProductFilters, productListHref } from "./query";

type All = "all";

interface ProductsToolbarProps {
  query: ProductListQuery;
  /** Every category (active or not), ordered by position, for the filter. */
  categories: ReadonlyArray<Category>;
}

export function ProductsToolbar({ query, categories }: ProductsToolbarProps) {
  const { navigate } = useListNavigation();
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(productListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  const update = (patch: Partial<ProductListQuery>) =>
    navigate(productListHref({ ...query, ...patch, page: 1 }));

  const categoryTrigger =
    query.category === "none"
      ? "Tanlanmagan"
      : query.category
        ? categoryLabel(categories, query.category)
        : "Hammasi";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label="Nomi yoki shtrix-kod"
        placeholder="Nomi, SKU yoki shtrix-kod"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<string>
        label="Kategoriya"
        trigger={`Kategoriya: ${categoryTrigger}`}
        value={query.category ?? "all"}
        onValueChange={(value) => update({ category: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...categories.map((category) => ({ value: category.slug, label: category.name.uz })),
          { value: "none", label: "Tanlanmagan" },
        ]}
      />
      <SelectMenu<ProductStatus | All>
        label="Holat"
        trigger={`Holat: ${query.status ? PRODUCT_STATUS_META[query.status].label : "Hammasi"}`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "active", label: PRODUCT_STATUS_META.active.label },
          { value: "hidden", label: PRODUCT_STATUS_META.hidden.label },
        ]}
      />
      <SelectMenu<"yes" | "no" | All>
        label="Aksiya"
        trigger={`Aksiya: ${query.promo === "yes" ? "Aksiyada" : query.promo === "no" ? "Aksiyasiz" : "Hammasi"}`}
        value={query.promo ?? "all"}
        onValueChange={(value) => update({ promo: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "yes", label: "Aksiyada" },
          { value: "no", label: "Aksiyasiz" },
        ]}
      />
      <button
        type="button"
        aria-pressed={query.outOfStock}
        onClick={() => update({ outOfStock: !query.outOfStock })}
        className={cn(filterTriggerClass, "aria-pressed:border-ink aria-pressed:bg-danger-soft")}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-danger" />
        Faqat tugaganlar
      </button>
      {hasActiveProductFilters(query) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            lastSubmitted.current = "";
            navigate(productListHref({ sort: query.sort }));
          }}
          className="inline-flex h-11 items-center gap-2 rounded-md px-3.5 text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft"
        >
          <Icon name="close" size={18} />
          Filtrlarni tozalash
        </button>
      )}
    </div>
  );
}
