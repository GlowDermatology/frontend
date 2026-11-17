import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { getDispatchSuspension, listDeliveryIssues } from "@/data/delivery-issues";
import { requestNow } from "@/data/now";
import { ISSUE_STATES } from "@/domain/delivery-issue";
import { cn } from "@/lib/cn";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { pageRangeLabel } from "../orders/query";
import { Pagination } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { issuesCopy } from "./copy";
import { IssuesTable } from "./issues-table";
import { IssuesToolbar } from "./issues-toolbar";
import { hasIssueFilters, issueListHref, parseIssueQuery } from "./query";
import { SuspensionCard } from "./suspension-card";

/**
 * Data boundary of /admin/delivery-issues ("Muammolar", Yandex Delivery
 * plan §3.9 / §4): the courier-dispatch switch and the exception queue with
 * its filters in the URL. The Telegram bot links here.
 */
export async function IssuesContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseIssueQuery(await searchParams);
  const [page, suspension, now, t, fmt] = await Promise.all([
    listDeliveryIssues(query),
    getDispatchSuspension(),
    requestNow(),
    copyFor(issuesCopy),
    getFormat(),
  ]);
  const filtered = hasIssueFilters(query);

  return (
    <>
      <PageHeader
        eyebrow={query.state === "open" ? t.openCount(page.total) : t.resolvedCount(page.total)}
        title={t.title}
      />

      <SuspensionCard key={suspension.updatedAt} initial={suspension} now={now.toISOString()} />

      <nav aria-label={t.stateNav}>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {ISSUE_STATES.map((state) => {
            const active = state === query.state;
            return (
              <li key={state}>
                <Link
                  href={issueListHref({ ...query, state, page: 1 })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full px-3.5 text-label no-underline transition-colors duration-150",
                    active
                      ? "bg-gold text-on-gold"
                      : "border border-line-strong text-ink hover:bg-surface-raised",
                  )}
                >
                  {t.states[state]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <IssuesToolbar query={query} />
          {page.items.length > 0 ? (
            <IssuesTable issues={page.items} />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
                <Icon name="check" size={26} />
              </span>
              <p className="m-0 mt-1 text-subheading text-ink">
                {query.state === "open" ? t.emptyOpen : t.emptyResolved}
              </p>
              <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
                {filtered ? t.emptyFiltered : t.emptyHint}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRangeLabel(page.page, page.pageSize, page.total, fmt)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => issueListHref({ ...query, page: p })}
            />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
