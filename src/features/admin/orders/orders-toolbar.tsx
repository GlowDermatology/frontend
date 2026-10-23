"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/field";
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
}

export function OrdersToolbar({ query, periodLabels }: OrdersToolbarProps) {
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
        label="Buyurtma raqami yoki telefon"
        placeholder="№ yoki telefon raqami"
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
        onValueChange={(period) => update({ period })}
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
