"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/menu";
import type { OrderAttention, OrderListQuery, OrderPeriod } from "@/data/orders";
import { orderLabelsCopy } from "@/domain/copy/orders";
import {
  SHIPMENT_STAGES,
  type DeliveryProvider,
  type FulfilmentMethod,
  type PaymentStatus,
  type ShipmentStage,
} from "@/domain/order";
import { useCopy } from "@/lib/i18n/admin-context";

import { DateRangeFields } from "../shared/date-range-fields";
import { useListNavigation } from "../shared/list-transition";
import { ordersCopy } from "./copy";
import { DEFAULT_PERIOD, PAGE_SIZES, hasActiveFilters, orderListHref } from "./query";

type All = "all";

const PROVIDER_FILTER_LABEL: Record<DeliveryProvider, string> = { yandex: "Yandex", bts: "BTS" };
const PAYMENTS: ReadonlyArray<PaymentStatus> = ["pending", "paid", "failed", "refunded"];

interface OrdersToolbarProps {
  query: OrderListQuery;
  periodLabels: Record<OrderPeriod, string>;
  /** Name of the customer the list is filtered to (`?customer=`), when known. */
  customerName?: string;
}

/**
 * Filters of the orders list; every change is a URL navigation inside the
 * list transition. The period menu and the day range are alternatives: a
 * day picked switches the period to "Barcha sana" (the API ANDs both), and a
 * period picked clears the days.
 */
export function OrdersToolbar({ query, periodLabels, customerName }: OrdersToolbarProps) {
  const t = useCopy(ordersCopy);
  const tb = t.toolbar;
  const labels = useCopy(orderLabelsCopy);
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
        label={tb.searchLabel}
        placeholder={tb.searchPlaceholder}
        value={search}
        maxLength={100}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<OrderPeriod>
        label={tb.period}
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
        label={tb.fulfilment}
        trigger={`${tb.fulfilmentPrefix} ${query.fulfilment ? labels.fulfilment[query.fulfilment] : t.all}`}
        value={query.fulfilment ?? "all"}
        onValueChange={(value) => update({ fulfilment: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "delivery", label: labels.fulfilment.delivery },
          { value: "pickup", label: labels.fulfilment.pickup },
        ]}
      />
      <SelectMenu<PaymentStatus | All>
        label={tb.payment}
        trigger={`${tb.paymentPrefix} ${query.payment ? labels.paymentStatus[query.payment] : t.all}`}
        value={query.payment ?? "all"}
        onValueChange={(value) => update({ payment: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          ...PAYMENTS.map((value) => ({ value, label: labels.paymentStatus[value] })),
        ]}
      />
      <SelectMenu<DeliveryProvider | All>
        label={tb.provider}
        trigger={`${tb.providerPrefix} ${query.provider ? PROVIDER_FILTER_LABEL[query.provider] : t.all}`}
        value={query.provider ?? "all"}
        onValueChange={(value) =>
          // A stage is a Yandex stage: it goes with any other choice.
          update({
            provider: value === "all" ? undefined : value,
            stage: value === "yandex" ? query.stage : undefined,
          })
        }
        options={[
          { value: "all", label: t.all },
          { value: "yandex", label: PROVIDER_FILTER_LABEL.yandex },
          { value: "bts", label: PROVIDER_FILTER_LABEL.bts },
        ]}
      />
      {query.provider === "yandex" && (
        <SelectMenu<ShipmentStage | All>
          label={tb.stage}
          trigger={`${tb.stagePrefix} ${query.stage ? labels.shipmentStage[query.stage] : t.all}`}
          value={query.stage ?? "all"}
          onValueChange={(value) => update({ stage: value === "all" ? undefined : value })}
          options={[
            { value: "all", label: t.all },
            ...SHIPMENT_STAGES.map((value) => ({ value, label: labels.shipmentStage[value] })),
          ]}
        />
      )}
      <SelectMenu<OrderAttention | All>
        label={tb.attention}
        trigger={`${tb.attentionPrefix} ${
          query.attention === "open"
            ? tb.attentionOpen
            : query.attention === "urgent"
              ? tb.attentionUrgent
              : t.all
        }`}
        value={query.attention ?? "all"}
        onValueChange={(value) => update({ attention: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "open", label: tb.attentionOpen },
          { value: "urgent", label: tb.attentionUrgent },
        ]}
      />
      <DateRangeFields
        from={query.dateFrom}
        to={query.dateTo}
        onCommit={(patch) => update({ ...patch, period: "all" })}
      />
      {query.customer && (
        <button
          type="button"
          onClick={() => update({ customer: undefined })}
          className="inline-flex h-9 max-w-[280px] items-center gap-1.5 rounded-full border border-line-strong px-3 text-label text-ink hover:bg-gold-soft"
        >
          <span className="truncate">{tb.customer(customerName ?? `#${query.customer}`)}</span>
          <Icon name="close" size={14} className="shrink-0" />
          <span className="sr-only">{tb.removeFilter}</span>
        </button>
      )}
      <span className="flex-1" />
      <Button
        variant="ghost"
        disabledReason={!hasActiveFilters(query) && tb.clearReason}
        onClick={() => {
          setSearch("");
          lastSubmitted.current = "";
          navigate(orderListHref({ period: DEFAULT_PERIOD, pageSize: query.pageSize }));
        }}
      >
        <Icon name="close" size={18} />
        {tb.clear}
      </Button>
    </div>
  );
}

export function PageSizeMenu({ query }: { query: OrderListQuery }) {
  const t = useCopy(ordersCopy);
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label={t.toolbar.pageSize}
      align="end"
      trigger={t.toolbar.rows(query.pageSize)}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(orderListHref({ ...query, pageSize: Number(value), page: 1 }))
      }
      options={PAGE_SIZES.map((size) => ({ value: String(size), label: t.toolbar.rows(size) }))}
    />
  );
}
