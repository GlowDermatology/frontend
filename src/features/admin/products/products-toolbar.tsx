"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { filterTriggerClass, Select, type SelectOption } from "@/components/ui/select";
import type { ProductListQuery } from "@/data/products";
import type { Category } from "@/domain/category";
import type { ProductStatus } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { useListNavigation } from "../shared/list-transition";
import { productsCopy } from "./copy";
import { hasActiveProductFilters, productListHref } from "./query";

type All = "all";

interface ProductsToolbarProps {
  query: ProductListQuery;
  /** Every category (active or not), ordered by position, for the filter. */
  categories: ReadonlyArray<Category>;
}

export function ProductsToolbar({ query, categories }: ProductsToolbarProps) {
  const copy = useCopy(productsCopy);
  const t = copy.toolbar;
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

  const categoryOptions: SelectOption[] = [
    { value: "all", label: t.all },
    ...categories.map((category) => ({
      value: category.slug,
      label: category.name.uz || category.slug,
      ...(category.isActive ? {} : { description: copy.editor.inactiveCategory }),
    })),
    { value: "none", label: t.noCategory },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label={t.search}
        placeholder={t.searchPlaceholder}
        value={search}
        maxLength={200}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <Select<string>
        variant="filter"
        aria-label={t.category}
        prefix={`${t.category}:`}
        value={query.category ?? "all"}
        onValueChange={(value) => update({ category: value === "all" ? undefined : value })}
        options={categoryOptions}
        className="max-w-[300px]"
      />
      <Select<ProductStatus | All>
        variant="filter"
        aria-label={t.status}
        prefix={`${t.status}:`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "active", label: copy.status.active },
          { value: "hidden", label: copy.status.hidden },
        ]}
      />
      <Select<"yes" | "no" | All>
        variant="filter"
        aria-label={t.promo}
        prefix={`${t.promo}:`}
        value={query.promo ?? "all"}
        onValueChange={(value) => update({ promo: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "yes", label: t.inPromo },
          { value: "no", label: t.notInPromo },
        ]}
      />
      <button
        type="button"
        aria-pressed={query.outOfStock}
        onClick={() => update({ outOfStock: !query.outOfStock })}
        className={cn(filterTriggerClass, "aria-pressed:border-ink aria-pressed:bg-danger-soft")}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-danger" />
        {t.outOfStock}
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
          {t.clear}
        </button>
      )}
    </div>
  );
}
