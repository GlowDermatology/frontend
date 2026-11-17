"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import type { SegmentOption } from "@/data/segments";
import { customerDataCopy } from "@/domain/copy/customers";
import {
  CUSTOMER_PAGE_SIZES,
  CUSTOMER_SORTS,
  type CustomerListQuery,
  type CustomerSort,
  type CustomerStatus,
} from "@/domain/customer";
import { useCopy } from "@/lib/i18n/admin-context";

import { useListNavigation } from "../shared/list-transition";
import { customersCopy } from "./copy";
import { customerListHref, hasActiveCustomerFilters } from "./query";

type All = "all";

interface CustomersToolbarProps {
  query: CustomerListQuery;
  /** Every customer group, for the group filter. */
  groups: ReadonlyArray<SegmentOption>;
}

/**
 * Filters of the customers list (contract §2.6): the search (name, or ≥ 3
 * digits of the phone) is debounced; every change is a URL navigation inside
 * the list transition, so the rows dim instead of flashing a skeleton.
 */
export function CustomersToolbar({ query, groups }: CustomersToolbarProps) {
  const t = useCopy(customersCopy).toolbar;
  const domain = useCopy(customerDataCopy);
  const { navigate } = useListNavigation();
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(customerListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  const update = (patch: Partial<CustomerListQuery>) =>
    navigate(customerListHref({ ...query, ...patch, page: 1 }));

  // A group id from the URL that the options do not list (deleted, or the read failed) stays
  // choosable as "#id", so the trigger never shows a blank value.
  const groupOptions = [
    { value: "all", label: t.all },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
    ...(query.group && !groups.some((group) => group.id === query.group)
      ? [{ value: query.group, label: `#${query.group}` }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label={t.search}
        placeholder={t.searchPlaceholder}
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <Select<CustomerStatus | All>
        variant="filter"
        aria-label={t.status}
        prefix={`${t.status}:`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "active", label: domain.status.active },
          { value: "deleted", label: domain.status.deleted },
        ]}
      />
      <Select<string>
        variant="filter"
        aria-label={t.group}
        prefix={`${t.group}:`}
        value={query.group ?? "all"}
        onValueChange={(value) => update({ group: value === "all" ? undefined : value })}
        options={groupOptions}
        className="max-w-[300px]"
      />
      <Select<CustomerSort>
        variant="filter"
        aria-label={t.sort}
        prefix={`${t.sort}:`}
        value={query.sort}
        onValueChange={(value) => update({ sort: value })}
        options={CUSTOMER_SORTS.map((sort) => ({ value: sort, label: domain.sort[sort] }))}
      />
      {hasActiveCustomerFilters(query) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            lastSubmitted.current = "";
            navigate(customerListHref({ sort: query.sort, pageSize: query.pageSize }));
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

/** Rows per page (contract §1.5: 20 or 50). */
export function CustomerPageSizeMenu({ query }: { query: CustomerListQuery }) {
  const t = useCopy(customersCopy).toolbar;
  const { navigate } = useListNavigation();
  return (
    <Select<string>
      variant="filter"
      size="sm"
      align="end"
      aria-label={t.rows}
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(
          customerListHref({
            ...query,
            pageSize: Number(value) as CustomerListQuery["pageSize"],
            page: 1,
          }),
        )
      }
      options={CUSTOMER_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: t.rowsOption(size),
      }))}
      className="min-w-0"
    />
  );
}
