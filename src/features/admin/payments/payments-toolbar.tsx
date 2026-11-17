"use client";

import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { REFUND_STATES, type PaymentProvider, type PaymentStatus } from "@/domain/order";
import {
  PAYMENT_PAGE_SIZES,
  type PaymentListQuery,
  type PaymentPeriod,
  type RefundFilter,
} from "@/domain/payment";
import { useCopy } from "@/lib/i18n/admin-context";

import { DateRangeFields } from "../shared/date-range-fields";
import { useListNavigation } from "../shared/list-transition";
import { PROVIDER_LABEL } from "../shared/status";
import { paymentsCopy } from "./copy";
import { DEFAULT_PAYMENT_PERIOD, hasActivePaymentFilters, paymentListHref } from "./query";

type All = "all";

const STATUSES: ReadonlyArray<PaymentStatus> = ["pending", "paid", "failed", "refunded"];
const PERIODS: ReadonlyArray<PaymentPeriod> = ["today", "week", "month", "all"];

/**
 * Filters of the payments board (contract §2.12); every change is a URL
 * navigation inside the list transition. The period menu and the day range
 * are alternatives, as on the orders list: a day picked switches the period
 * to "Barcha sana" (the API ANDs both), a period picked clears the days.
 */
export function PaymentsToolbar({ query }: { query: PaymentListQuery }) {
  const t = useCopy(paymentsCopy).toolbar;
  const clear = useCopy(paymentsCopy).clearFilters;
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
      navigate(paymentListHref({ ...query, q: term || undefined, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query, navigate]);

  const update = (patch: Partial<PaymentListQuery>) =>
    navigate(paymentListHref({ ...query, ...patch, page: 1 }));

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
      <Select<PaymentStatus | All>
        variant="filter"
        aria-label={t.status}
        prefix={t.statusPrefix}
        value={query.status ?? "all"}
        onValueChange={(value) => update({ status: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          ...STATUSES.map((value) => ({ value, label: labels.paymentStatus[value] })),
        ]}
      />
      <Select<PaymentProvider | All>
        variant="filter"
        aria-label={t.provider}
        prefix={t.providerPrefix}
        value={query.provider ?? "all"}
        onValueChange={(value) => update({ provider: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "click", label: PROVIDER_LABEL.click },
          { value: "payme", label: PROVIDER_LABEL.payme },
        ]}
      />
      <Select<RefundFilter | All>
        variant="filter"
        aria-label={t.refund}
        prefix={t.refundPrefix}
        value={query.refund ?? "all"}
        onValueChange={(value) => update({ refund: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          { value: "needs_action", label: t.needsAction },
          ...REFUND_STATES.map((value) => ({ value, label: labels.refundState[value] })),
        ]}
      />
      <Select<PaymentPeriod>
        variant="filter"
        aria-label={t.period}
        prefix={<Icon name="calendar" size={18} />}
        value={query.period}
        onValueChange={(period) => update({ period, dateFrom: undefined, dateTo: undefined })}
        options={PERIODS.map((value) => ({ value, label: t.periods[value] }))}
      />
      <DateRangeFields
        from={query.dateFrom}
        to={query.dateTo}
        onCommit={(patch) => update({ ...patch, period: DEFAULT_PAYMENT_PERIOD })}
      />
      <span className="flex-1" />
      {hasActivePaymentFilters(query) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            lastSubmitted.current = "";
            navigate(paymentListHref({ pageSize: query.pageSize, sort: query.sort }));
          }}
          className="inline-flex h-11 items-center gap-2 rounded-md px-[18px] text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft"
        >
          <Icon name="close" size={18} />
          {clear}
        </button>
      )}
    </div>
  );
}

export function PaymentPageSizeMenu({ query }: { query: PaymentListQuery }) {
  const t = useCopy(paymentsCopy).toolbar;
  const { navigate } = useListNavigation();
  return (
    <Select<string>
      variant="filter"
      size="sm"
      align="end"
      aria-label={t.rows}
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(paymentListHref({ ...query, pageSize: Number(value), page: 1 }))
      }
      options={PAYMENT_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: t.rowsOption(size),
      }))}
      className="min-w-0"
    />
  );
}
