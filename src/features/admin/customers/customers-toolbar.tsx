"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import type { SegmentOption } from "@/data/segments";
import {
  CUSTOMER_PAGE_SIZES,
  CUSTOMER_SORTS,
  CUSTOMER_SORT_LABEL,
  type CustomerListQuery,
  type CustomerSort,
  type CustomerStatus,
} from "@/domain/customer";

import { useListNavigation } from "../shared/list-transition";
import { customerListHref, hasActiveCustomerFilters } from "./query";

type All = "all";

const STATUS_LABEL: Record<CustomerStatus, string> = { active: "Faol", deleted: "O‘chirilgan" };

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

  const groupName = query.group
    ? (groups.find((group) => group.id === query.group)?.name ?? `#${query.group}`)
    : "Hammasi";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label="Ism yoki telefon"
        placeholder="Ism yoki telefon raqami"
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<CustomerStatus | All>
        label="Holat"
        trigger={`Holat: ${query.status ? STATUS_LABEL[query.status] : "Hammasi"}`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "active", label: STATUS_LABEL.active },
          { value: "deleted", label: STATUS_LABEL.deleted },
        ]}
      />
      <SelectMenu<string>
        label="Guruh"
        trigger={`Guruh: ${groupName}`}
        value={query.group ?? "all"}
        onValueChange={(value) => update({ group: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...groups.map((group) => ({ value: group.id, label: group.name })),
        ]}
      />
      <SelectMenu<CustomerSort>
        label="Saralash"
        trigger={`Saralash: ${CUSTOMER_SORT_LABEL[query.sort]}`}
        value={query.sort}
        onValueChange={(value) => update({ sort: value })}
        options={CUSTOMER_SORTS.map((sort) => ({ value: sort, label: CUSTOMER_SORT_LABEL[sort] }))}
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
          Filtrlarni tozalash
        </button>
      )}
    </div>
  );
}

/** Rows per page (contract §1.5: 20 or 50). */
export function CustomerPageSizeMenu({ query }: { query: CustomerListQuery }) {
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label="Sahifadagi qatorlar"
      align="end"
      trigger={`${query.pageSize} ta qator`}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
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
        label: `${size} ta qator`,
      }))}
    />
  );
}
