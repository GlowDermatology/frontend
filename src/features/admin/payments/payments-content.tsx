import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { listPayments } from "@/data/payments";
import { formatNumber } from "@/lib/format";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { PaymentPageSizeMenu, PaymentsToolbar } from "./payments-toolbar";
import { PaymentsTable } from "./payments-table";
import { parsePaymentQuery, paymentListHref, paymentQueryString } from "./query";

/** Data boundary of /admin/payments (filters, ordering and page in the URL, contract §2.12). */
export async function PaymentsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parsePaymentQuery(await searchParams);
  const page = await listPayments(query);
  // "Harakat kerak" merges three refund states; the API exports one at a time.
  const exportable = query.refund !== "needs_action";
  const exportQuery = paymentQueryString({ ...query, page: undefined, pageSize: undefined });

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(page.total)} ta to‘lov`}
        title="To‘lovlar"
        actions={exportable ? <ExportMenu href={`/admin/payments/export${exportQuery}`} /> : null}
      />
      <ListTransition className="group">
        <section
          aria-label="To‘lovlar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <PaymentsToolbar key={query.q ?? ""} query={query} />
          {page.items.length > 0 ? (
            <PaymentsTable
              payments={page.items}
              sortedAscending={query.sort === "date_asc"}
              sortHref={paymentListHref({
                ...query,
                sort: query.sort === "date_asc" ? "date_desc" : "date_asc",
                page: 1,
              })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="card" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">To‘lov topilmadi</p>
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
              hrefFor={(p): Route => paymentListHref({ ...query, page: p })}
            />
            <PaymentPageSizeMenu query={query} />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
