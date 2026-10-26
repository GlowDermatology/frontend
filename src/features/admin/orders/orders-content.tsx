import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { requestNow } from "@/data/now";
import { getOrderStatusCounts, listOrders, type OrderPeriod } from "@/data/orders";
import { formatNumber } from "@/lib/format";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { OrdersTable } from "./orders-table";
import { OrdersToolbar, PageSizeMenu } from "./orders-toolbar";
import { orderListHref, parseOrderQuery, periodLabel } from "./query";
import { StatusTabs } from "./status-tabs";

export async function OrdersContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseOrderQuery(await searchParams);
  const [page, counts, now] = await Promise.all([
    listOrders(query),
    getOrderStatusCounts(query),
    requestNow(),
  ]);
  const periodLabels = Object.fromEntries(
    (["today", "week", "month", "all"] as const).map((p) => [p, periodLabel(p, now)]),
  ) as Record<OrderPeriod, string>;
  const exportHref = orderListHref(
    { ...query, page: undefined, pageSize: undefined },
    "/admin/orders/export",
  );

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(counts.all)} ta buyurtma`}
        title="Buyurtmalar"
        actions={<ExportMenu href={exportHref} />}
      />

      <StatusTabs query={query} counts={counts} />

      <ListTransition className="group">
        <section
          aria-label="Buyurtmalar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <OrdersToolbar
            key={query.q ?? ""}
            query={query}
            periodLabels={periodLabels}
            customerName={
              query.customer && page.items[0]?.customer.id === query.customer
                ? page.items[0].customer.name
                : undefined
            }
          />
          {page.items.length > 0 ? (
            <OrdersTable
              orders={page.items}
              sortedAscending={query.sort === "date_asc"}
              sortHref={orderListHref({
                ...query,
                sort: query.sort === "date_asc" ? "date_desc" : "date_asc",
                page: 1,
              })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="search" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">Buyurtma topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                Qidiruv yoki filtrlarni o‘zgartirib ko‘ring.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => orderListHref({ ...query, page: p })}
            />
            <PageSizeMenu query={query} />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
