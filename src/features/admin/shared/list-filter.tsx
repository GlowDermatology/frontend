"use client";

import { useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { searchKey } from "@/lib/search";

export type StatusFilter = "all" | "active" | "inactive";

/**
 * In-page filter of a fully loaded ordered list (Kategoriyalar, Bannerlar;
 * gap X-LIST-SEARCH-SORT): a name search folded like the server's (case,
 * diacritics and the o‘/g‘ apostrophes) and an active/inactive switch. The
 * API filters these lists by `is_active` only and orders them by position,
 * and a reorder must send the whole set, so the page filters what it holds
 * and reordering pauses while a filter is on.
 */
export function useListFilter<T>(texts: (item: T) => string[], active: (item: T) => boolean) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const term = searchKey(query);
  const filtered = Boolean(term) || status !== "all";
  const matches = (item: T) =>
    (status === "all" || active(item) === (status === "active")) &&
    (!term || texts(item).some((text) => searchKey(text).includes(term)));
  return { query, setQuery, status, setStatus, filtered, matches };
}

interface FilterControls {
  query: string;
  setQuery: (value: string) => void;
  status: StatusFilter;
  setStatus: (value: StatusFilter) => void;
  filtered: boolean;
}

export function ListFilterBar({ label, filter }: { label: string; filter: FilterControls }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label={label}
        placeholder={label}
        value={filter.query}
        maxLength={64}
        onChange={(event) => filter.setQuery(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_220px] gap-2 bg-transparent px-3"
      />
      <SegmentedControl<StatusFilter>
        label="Holat"
        value={filter.status}
        onChange={filter.setStatus}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "active", label: "Faol" },
          { value: "inactive", label: "Faol emas" },
        ]}
      />
      {filter.filtered && (
        <span className="flex items-center gap-1.5 text-caption font-normal text-ink-muted">
          <Icon name="info" size={14} />
          Tartibni o‘zgartirish uchun filtrlarni tozalang.
        </span>
      )}
    </div>
  );
}
