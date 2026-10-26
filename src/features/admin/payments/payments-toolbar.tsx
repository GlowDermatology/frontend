"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import {
  REFUND_STATE_LABEL,
  REFUND_STATES,
  type PaymentProvider,
  type PaymentStatus,
} from "@/domain/order";
import {
  PAYMENT_PAGE_SIZES,
  type PaymentListQuery,
  type PaymentPeriod,
  type RefundFilter,
} from "@/domain/payment";

import { useListNavigation } from "../shared/list-transition";
import { PAYMENT_STATUS_META, PROVIDER_LABEL } from "../shared/status";
import { DEFAULT_PAYMENT_PERIOD, hasActivePaymentFilters, paymentListHref } from "./query";

type All = "all";

export const PAYMENT_PERIOD_LABEL: Record<PaymentPeriod, string> = {
  today: "Bugun",
  week: "Oxirgi 7 kun",
  month: "Shu oy",
  all: "Barcha sana",
};

export const REFUND_FILTER_LABEL: Record<RefundFilter, string> = {
  needs_action: "Harakat kerak",
  ...REFUND_STATE_LABEL,
};

const dateInput = "h-11 w-[150px] text-[14px] tabular-nums";

/**
 * Filters of the payments board (contract §2.12); every change is a URL
 * navigation inside the list transition. The period menu and the day range
 * are alternatives, as on the orders list: a day picked switches the period
 * to "Barcha sana" (the API ANDs both), a period picked clears the days.
 */
export function PaymentsToolbar({ query }: { query: PaymentListQuery }) {
  const { navigate } = useListNavigation();
  const [search, setSearch] = useState(query.q ?? "");
  const lastSubmitted = useRef(query.q ?? "");

  // Debounced search: update the URL 300 ms after typing stops.
  useEffect(() => {
    const term = search.trim();
    if (term === lastSubmitted.current) return;
    const timer = window.setTimeout(() => {
      lastSubmitted.current = term;
      navigate(paymentListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  const update = (patch: Partial<PaymentListQuery>) =>
    navigate(paymentListHref({ ...query, ...patch, page: 1 }));

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SearchInput
        label="Buyurtma №, tranzaksiya yoki telefon"
        placeholder="№, tranzaksiya yoki telefon"
        value={search}
        maxLength={64}
        onChange={(event) => setSearch(event.target.value)}
        wrapperClassName="max-w-[320px] flex-[1_1_240px] gap-2 bg-transparent px-3"
      />
      <SelectMenu<PaymentStatus | All>
        label="To‘lov holati"
        trigger={`Holat: ${query.status ? PAYMENT_STATUS_META[query.status].label : "Hammasi"}`}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...(["pending", "paid", "failed", "refunded"] as const).map((value) => ({
            value,
            label: PAYMENT_STATUS_META[value].label,
          })),
        ]}
      />
      <SelectMenu<PaymentProvider | All>
        label="To‘lov usuli"
        trigger={`Usul: ${query.provider ? PROVIDER_LABEL[query.provider] : "Hammasi"}`}
        value={query.provider ?? "all"}
        onValueChange={(value) => update({ provider: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "click", label: "Click" },
          { value: "payme", label: "Payme" },
        ]}
      />
      <SelectMenu<RefundFilter | All>
        label="Qaytarish holati"
        trigger={`Qaytarish: ${query.refund ? REFUND_FILTER_LABEL[query.refund] : "Hammasi"}`}
        value={query.refund ?? "all"}
        onValueChange={(value) => update({ refund: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          { value: "needs_action", label: REFUND_FILTER_LABEL.needs_action },
          ...REFUND_STATES.map((value) => ({ value, label: REFUND_STATE_LABEL[value] })),
        ]}
      />
      <SelectMenu<PaymentPeriod>
        label="Davr"
        trigger={
          <>
            <Icon name="calendar" size={18} />
            {PAYMENT_PERIOD_LABEL[query.period]}
          </>
        }
        value={query.period}
        onValueChange={(period) => update({ period, dateFrom: undefined, dateTo: undefined })}
        options={(["today", "week", "month", "all"] as const).map((value) => ({
          value,
          label: PAYMENT_PERIOD_LABEL[value],
        }))}
      />
      <label className="flex items-center gap-2">
        <span className="text-body-sm text-ink-muted">Sanadan</span>
        <TextInput
          type="date"
          name="date_from"
          className={dateInput}
          value={query.dateFrom ?? ""}
          max={query.dateTo}
          onChange={(event) =>
            update({ dateFrom: event.target.value || undefined, period: DEFAULT_PAYMENT_PERIOD })
          }
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-body-sm text-ink-muted">gacha</span>
        <TextInput
          type="date"
          name="date_to"
          className={dateInput}
          value={query.dateTo ?? ""}
          min={query.dateFrom}
          onChange={(event) =>
            update({ dateTo: event.target.value || undefined, period: DEFAULT_PAYMENT_PERIOD })
          }
        />
      </label>
      <span className="flex-1" />
      <button
        type="button"
        disabled={!hasActivePaymentFilters(query)}
        onClick={() => {
          setSearch("");
          lastSubmitted.current = "";
          navigate(paymentListHref({ pageSize: query.pageSize, sort: query.sort }));
        }}
        className="inline-flex h-11 items-center gap-2 rounded-md px-[18px] text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-transparent"
      >
        <Icon name="close" size={18} />
        Filtrlarni tozalash
      </button>
    </div>
  );
}

export function PaymentPageSizeMenu({ query }: { query: PaymentListQuery }) {
  const { navigate } = useListNavigation();
  return (
    <SelectMenu<string>
      label="Sahifadagi qatorlar"
      align="end"
      trigger={`${query.pageSize} ta qator`}
      triggerClassName="h-9 gap-1.5 px-3 text-[13px] leading-[18px] font-semibold"
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(paymentListHref({ ...query, pageSize: Number(value), page: 1 }))
      }
      options={PAYMENT_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: `${size} ta qator`,
      }))}
    />
  );
}
