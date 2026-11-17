import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { getDashboard } from "@/data/dashboard";
import { requestNow } from "@/data/now";
import { getRecentOrders } from "@/data/orders";
import { orderLabelsCopy } from "@/domain/copy/orders";
import {
  validateCustomRange,
  type CustomRangeErrors,
  type DashboardQuery,
} from "@/domain/dashboard";
import { createFormatter, toLocalIsoDate } from "@/lib/format";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { PageHeader } from "../shared/page-header";
import type { SearchParams } from "../shared/url-state";
import { AttentionList } from "./attention-list";
import { parseDashboardQuery } from "./query";
import { DashboardCharts } from "./charts";
import { dashboardCopy } from "./copy";
import { FulfilmentBoard } from "./fulfilment-board";
import { RangeControl } from "./range-control";
import { RecentOrders } from "./recent-orders";
import { StatCard } from "./stat-card";

export async function DashboardContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const parsed = parseDashboardQuery(await searchParams);
  const [now, locale] = await Promise.all([requestNow(), getAdminLocale()]);
  const t = dashboardCopy[locale];
  const fmt = createFormatter(locale);
  const today = toLocalIsoDate(now);

  // A custom range is checked with the backend's rules first; the API stays
  // the authority (its 400 comes back as `errors`). An invalid range shows
  // today's numbers with the picker open on the errors.
  let rangeErrors: CustomRangeErrors = {};
  let query: DashboardQuery = { range: "today" };
  if (parsed.range !== "custom") query = parsed;
  else {
    rangeErrors = validateCustomRange(parsed.from, parsed.to, today, locale);
    if (!rangeErrors.from && !rangeErrors.to) {
      query = { range: "custom", from: parsed.from!, to: parsed.to! };
    }
  }
  const [result, recent] = await Promise.all([getDashboard(query), getRecentOrders(6)]);
  let data;
  if (result.ok) data = result.data;
  else {
    rangeErrors = result.errors;
    query = { range: "today" };
    const fallback = await getDashboard(query);
    if (!fallback.ok) throw new Error("dashboard: today refused by the API");
    data = fallback.data;
  }
  const invalidRange = Boolean(rangeErrors.from || rangeErrors.to);
  const shown: DashboardQuery =
    invalidRange && parsed.range === "custom" && parsed.from && parsed.to
      ? { range: "custom", from: parsed.from, to: parsed.to }
      : query;

  return (
    <>
      <PageHeader
        eyebrow={fmt.dayMonthWeekday(now)}
        title={t.title}
        actions={
          <RangeControl
            key={`${shown.range}:${"from" in shown ? `${shown.from}:${shown.to}` : ""}`}
            value={shown}
            today={today}
            errors={invalidRange ? rangeErrors : undefined}
          />
        }
      />

      {invalidRange && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-4 py-3 text-body-sm text-ink"
        >
          <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-warning" />
          {t.range.invalid((rangeErrors.from ?? rangeErrors.to ?? "").replace(/\.$/, ""))}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-4">
        <StatCard
          icon="receipt"
          label={t.stats.orders}
          value={fmt.number(data.stats.orders)}
          note={data.stats.ordersNote}
        />
        <StatCard
          icon="coins"
          label={t.stats.revenue}
          value={fmt.number(data.stats.revenue)}
          note={t.stats.revenueNote}
        />
        <StatCard
          icon="user"
          label={t.stats.newCustomers}
          value={fmt.number(data.stats.newCustomers)}
          note={t.stats.newCustomersNote}
        />
        <StatCard
          icon="users"
          label={t.stats.totalCustomers}
          value={fmt.number(data.stats.totalCustomers)}
          note={t.stats.deletedNote(data.stats.deletedCustomers)}
        />
        <StatCard
          icon="alert-triangle"
          alert={data.stats.outOfStock > 0}
          label={t.stats.outOfStock}
          value={fmt.number(data.stats.outOfStock)}
          href="/admin/products?out=1"
          note={
            <span className="flex items-center gap-1 font-bold text-ink">
              {t.stats.seeList}
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          }
        />
      </div>

      {data.fulfilment && <FulfilmentBoard counters={data.fulfilment} t={t.fulfilment} fmt={fmt} />}

      <DashboardCharts series={data.series} axisNote={data.axisNote} axisLabels={data.axisLabels} />

      <div className="flex flex-wrap items-start gap-4">
        <RecentOrders
          orders={recent}
          now={now}
          t={t.recent}
          labels={orderLabelsCopy[locale]}
          fmt={fmt}
        />
        <AttentionList attention={data.attention} t={t.attention} fmt={fmt} />
      </div>
    </>
  );
}
