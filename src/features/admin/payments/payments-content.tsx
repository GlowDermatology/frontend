import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { listPayments } from "@/data/payments";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { pageRangeText } from "../specialists/form-kit";
import { paymentsCopy } from "./copy";
import { PaymentPageSizeMenu, PaymentsToolbar } from "./payments-toolbar";
import { PaymentsTable } from "./payments-table";
import {
  hasActivePaymentFilters,
  parsePaymentQuery,
  paymentListHref,
  paymentQueryString,
} from "./query";

/** Data boundary of /admin/payments (filters, ordering and page in the URL, contract §2.12). */
export async function PaymentsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parsePaymentQuery(await searchParams);
  const [page, t, fmt] = await Promise.all([
    listPayments(query),
    copyFor(paymentsCopy),
    getFormat(),
  ]);
  const filtered = hasActivePaymentFilters(query);
  // "Harakat kerak" merges three refund states; the API exports one at a time.
  const exportable = query.refund !== "needs_action";
  const exportQuery = paymentQueryString({ ...query, page: undefined, pageSize: undefined });

  return (
    <>
      <PageHeader
        eyebrow={(filtered ? t.found : t.count)(page.total, fmt.number(page.total))}
        title={t.title}
        actions={
          exportable ? (
            <ExportMenu href={`/admin/payments/export${exportQuery}`} label={t.export} />
          ) : null
        }
      />
      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
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
              <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
              <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
                {filtered ? t.emptyFiltered : t.emptyAll}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRangeText(fmt, page.page, page.pageSize, page.total)}
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
