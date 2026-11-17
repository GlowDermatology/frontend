import type { Route } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { requestNow } from "@/data/now";
import { getOrderStatusCounts, listOrders, type OrderPeriod } from "@/data/orders";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { ordersCopy } from "./copy";
import { customerName as displayName } from "./labels";
import { OrdersTable } from "./orders-table";
import { OrdersToolbar, PageSizeMenu } from "./orders-toolbar";
import {
  DEFAULT_PERIOD,
  hasActiveFilters,
  orderListHref,
  pageRangeLabel,
  parseOrderQuery,
  periodLabel,
} from "./query";
import { StatusTabs } from "./status-tabs";

export async function OrdersContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseOrderQuery(await searchParams);
  const [page, counts, now, t, labels, fmt] = await Promise.all([
    listOrders(query),
    getOrderStatusCounts(query),
    requestNow(),
    copyFor(ordersCopy),
    copyFor(orderLabelsCopy),
    getFormat(),
  ]);
  const periodLabels = Object.fromEntries(
    (["today", "week", "month", "all"] as const).map((p) => [p, periodLabel(p, now, t, fmt)]),
  ) as Record<OrderPeriod, string>;
  const filtered = hasActiveFilters(query);
  const exportHref = orderListHref(
    { ...query, page: undefined, pageSize: undefined },
    "/admin/orders/export",
  );

  return (
    <>
      <PageHeader
        eyebrow={t.count(counts.all)}
        title={t.title}
        actions={<ExportMenu href={exportHref} label={t.export} />}
      />

      <StatusTabs query={query} counts={counts} t={t} labels={labels} fmt={fmt} />

      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <OrdersToolbar
            key={query.q ?? ""}
            query={query}
            periodLabels={periodLabels}
            customerName={
              query.customer && page.items[0]?.customer.id === query.customer
                ? displayName(page.items[0].customer.name, labels)
                : undefined
            }
          />
          {page.items.length > 0 ? (
            <OrdersTable
              orders={page.items}
              t={t}
              labels={labels}
              fmt={fmt}
              sortedAscending={query.sort === "date_asc"}
              sortHref={orderListHref({
                ...query,
                sort: query.sort === "date_asc" ? "date_desc" : "date_asc",
                page: 1,
              })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name="search" size={26} />
              </span>
              <p className="m-0 mt-1 text-subheading text-ink">{t.empty}</p>
              <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
                {filtered ? t.emptyHint : t.emptyNoFilters}
              </p>
              {filtered && (
                <Link
                  href={orderListHref({ period: DEFAULT_PERIOD, pageSize: query.pageSize })}
                  scroll={false}
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-label font-bold text-ink no-underline hover:bg-gold-soft"
                >
                  <Icon name="close" size={16} />
                  {t.toolbar.clear}
                </Link>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRangeLabel(page.page, page.pageSize, page.total, fmt)}
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
