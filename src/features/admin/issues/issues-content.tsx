import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { getDispatchSuspension, listDeliveryIssues } from "@/data/delivery-issues";
import { requestNow } from "@/data/now";
import { ISSUE_STATES, type IssueState } from "@/domain/delivery-issue";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { IssuesTable } from "./issues-table";
import { IssuesToolbar } from "./issues-toolbar";
import { issueListHref, parseIssueQuery } from "./query";
import { SuspensionCard } from "./suspension-card";

const STATE_LABEL: Record<IssueState, string> = { open: "Ochiq", resolved: "Hal qilingan" };

/**
 * Data boundary of /admin/delivery-issues ("Muammolar", Yandex Delivery
 * plan §3.9 / §4): the courier-dispatch switch and the exception queue with
 * its filters in the URL. The Telegram bot links here.
 */
export async function IssuesContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseIssueQuery(await searchParams);
  const [page, suspension, now] = await Promise.all([
    listDeliveryIssues(query),
    getDispatchSuspension(),
    requestNow(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(page.total)} ta ${query.state === "open" ? "ochiq" : "hal qilingan"} muammo`}
        title="Muammolar"
      />

      <SuspensionCard key={suspension.updatedAt} initial={suspension} now={now.toISOString()} />

      <nav aria-label="Muammo holati">
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
                  {STATE_LABEL[state]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ListTransition className="group">
        <section
          aria-label="Muammolar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <IssuesToolbar query={query} />
          {page.items.length > 0 ? (
            <IssuesTable issues={page.items} />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="check" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">
                {query.state === "open" ? "Ochiq muammo yo‘q" : "Hal qilingan muammo topilmadi"}
              </p>
              <p className="m-0 text-body-sm text-ink-muted">
                Yangi muammo paydo bo‘lsa, yuqoridagi belgida va bildirishnomada ko‘rinadi.
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
              hrefFor={(p): Route => issueListHref({ ...query, page: p })}
            />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
