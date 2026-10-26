"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { SearchInput, TextInput } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/menu";
import type { OrderListQuery, OrderPeriod } from "@/data/orders";
import type { FulfilmentMethod, PaymentStatus } from "@/domain/order";

import { useListNavigation } from "../shared/list-transition";
import { FULFILMENT_LABEL, PAYMENT_STATUS_META } from "../shared/status";
import { DEFAULT_PERIOD, PAGE_SIZES, hasActiveFilters, orderListHref } from "./query";

type All = "all";

interface OrdersToolbarProps {
  query: OrderListQuery;
  periodLabels: Record<OrderPeriod, string>;
  /** Name of the customer the list is filtered to (`?customer=`), when known. */
  customerName?: string;
}

const dateInput = "h-11 w-[150px] text-[14px] tabular-nums";

/**
 * Filters of the orders list; every change is a URL navigation inside the
 * list transition. The period menu and the day range are alternatives: a
 * day picked switches the period to "Barcha sana" (the API ANDs both), and a
 * period picked clears the days.
 */
export function OrdersToolbar({ query, periodLabels, customerName }: OrdersToolbarProps) {
  const { navigate } = useListNavigation();
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  // Debounced search: update the URL 300 ms after typing stops.
  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(orderListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  const update = (patch: Partial<OrderListQuery>) =>
    navigate(orderListHref({ ...query, ...patch, page: 1 }));

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label="Buyurtma raqami, telefon yoki mijoz ismi"
        placeholder="№, telefon yoki ism"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<OrderPeriod>
        label="Davr"
        trigger={
          <>
            <Icon name="calendar" size={18} />
            <span className="tabular-nums">{periodLabels[query.period]}</span>
          </>
        }
        value={query.period}
        onValueChange={(period) => update({ period, dateFrom: undefined, dateTo: undefined })}
        options={(["today", "week", "month", "all"] as const).map((value) => ({
          value,
          label: periodLabels[value],
        }))}
      />
      <SelectMenu<FulfilmentMethod | All>
        label="Olish usuli"
        trigger={`Olish usuli: ${query.fulfilment ? FULFILMENT_LABEL[query.fulfilment] : "Hammasi"}`}
        value={query.fulfilment ?? "all"}
        onValueChange={(value) => update({ fulfilment: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "delivery", label: FULFILMENT_LABEL.delivery },
          { value: "pickup", label: FULFILMENT_LABEL.pickup },
        ]}
      />
      <SelectMenu<PaymentStatus | All>
        label="To‘lov holati"
        trigger={`To‘lov: ${query.payment ? PAYMENT_STATUS_META[query.payment].label : "Hammasi"}`}
        value={query.payment ?? "all"}
        onValueChange={(value) => update({ payment: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...(["pending", "paid", "failed", "refunded"] as const).map((value) => ({
            value,
            label: PAYMENT_STATUS_META[value].label,
          })),
        ]}
      />
      <label className="flex items-center gap-2">
        <span className="text-body-sm text-ink-muted">Sanadan</span>
        <TextInput
          type="date"
          name="date_from"
          aria-label="Sanadan"
          className={dateInput}
          value={query.dateFrom ?? ""}
          max={query.dateTo}
          onChange={(event) => update({ dateFrom: event.target.value || undefined, period: "all" })}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-body-sm text-ink-muted">gacha</span>
        <TextInput
          type="date"
          name="date_to"
          aria-label="Sanagacha"
          className={dateInput}
          value={query.dateTo ?? ""}
          min={query.dateFrom}
          onChange={(event) => update({ dateTo: event.target.value || undefined, period: "all" })}
        />
      </label>
      {query.customer && (
        <button
          type="button"
          onClick={() => update({ customer: undefined })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-label text-ink hover:bg-gold-soft"
        >
          Mijoz: {customerName ?? `#${query.customer}`}
          <Icon name="close" size={14} />
          <span className="sr-only">— filtrni olib tashlash</span>
        </button>
      )}
      <span className="flex-1" />
      <button
        type="button"
        disabled={!hasActiveFilters(query)}
        onClick={() => {
          setSearch("");
          lastSubmitted.current = "";
          navigate(orderListHref({ period: DEFAULT_PERIOD, pageSize: query.pageSize }));
        }}
        className="inline-flex h-11 items-center gap-2 rounded-md px-[18px] text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-transparent"
      >
        <Icon name="close" size={18} />
        Filtrlarni tozalash
      </button>
    </div>
  );
}

export function PageSizeMenu({ query }: { query: OrderListQuery }) {
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label="Sahifadagi qatorlar"
      align="end"
      trigger={`${query.pageSize} ta qator`}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(orderListHref({ ...query, pageSize: Number(value), page: 1 }))
      }
      options={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} ta qator` }))}
    />
  );
}
