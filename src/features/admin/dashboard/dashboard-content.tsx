import { DASHBOARD_RANGES } from "@/domain/dashboard";
import { requireStaff } from "@/data/auth";
import { getDashboard } from "@/data/dashboard";
import { requestNow } from "@/data/now";
import { getRecentOrders } from "@/data/orders";
import { formatDayMonthWeekday, formatNumber } from "@/lib/format";

import { PageHeader } from "../shared/page-header";
import { firstParam, oneOf, type SearchParams } from "../shared/url-state";
import { AttentionList } from "./attention-list";
import { DashboardCharts } from "./charts";
import { RangeControl } from "./range-control";
import { RecentOrders } from "./recent-orders";
import { StatCard } from "./stat-card";

export async function DashboardContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const range = oneOf(firstParam(await searchParams, "range"), DASHBOARD_RANGES) ?? "today";
  const [data, recent, now] = await Promise.all([
    getDashboard(range),
    getRecentOrders(6),
    requestNow(),
  ]);
  const orders = data.series.reduce((sum, p) => sum + p.orders, 0);
  const revenue = data.series.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <>
      <PageHeader
        eyebrow={formatDayMonthWeekday(now)}
        title="Dashboard"
        actions={<RangeControl value={range} />}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-4">
        <StatCard
          icon="receipt"
          label="Buyurtmalar"
          value={formatNumber(orders)}
          note={data.stats.ordersNote}
        />
        <StatCard
          icon="coins"
          label="Tushum"
          value={formatNumber(revenue)}
          note="so‘m · to‘langan buyurtmalar"
        />
        <StatCard
          icon="user"
          label="Yangi mijozlar"
          value={formatNumber(data.stats.newCustomers)}
          note="ilovada ro‘yxatdan o‘tgan"
        />
        <StatCard
          icon="users"
          label="Jami mijozlar"
          value={formatNumber(data.stats.totalCustomers)}
          note={`shundan ${data.stats.deletedCustomers} tasi o‘chirilgan`}
        />
        <StatCard
          icon="alert-triangle"
          alert
          label="Tugagan mahsulotlar"
          value={formatNumber(data.stats.outOfStock)}
          href="/admin/products?out=1"
          note={
            <span className="flex items-center gap-1 font-bold text-ink">
              Ro‘yxatni ko‘rish
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

      <DashboardCharts series={data.series} axisNote={data.axisNote} axisLabels={data.axisLabels} />

      <div className="flex flex-wrap items-start gap-4">
        <RecentOrders orders={recent} now={now} />
        <AttentionList attention={data.attention} />
      </div>
    </>
  );
}
