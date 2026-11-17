"use client";

import type { Route } from "next";
import { useId, type RefObject } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Select } from "@/components/ui/select";
import { notificationDataCopy } from "@/domain/copy/notifications";
import type { Page } from "@/data/types";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_PAGE_SIZES,
  NOTIFICATION_STATES,
  audienceText,
  isNotificationState,
  notificationStateLabel,
  type NotificationHistoryQuery,
  type NotificationKind,
  type NotificationRecord,
  type NotificationState,
} from "@/domain/notification";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition, useListNavigation } from "../shared/list-transition";
import { Pagination, rangeLabel } from "../shared/pagination";
import { notificationsCopy } from "./copy";
import { hasNotificationFilters, notificationListHref } from "./query";

/**
 * The campaign history (contract §2.8; gap X-NOTIF-HISTORY): the page the
 * URL names with its state and kind filters, the export, and «Batafsil» on
 * every row, which opens the campaign panel. Each row shows the title and
 * the body, so staff see what was (or will be) sent without opening it.
 */

const STATE_TONE: Record<NotificationState, Tone> = {
  draft: "muted",
  tested: "gold",
  scheduled: "gold",
  sending: "warning",
  stopping: "warning",
  sent: "success",
  partially_sent: "warning",
  cancelled: "neutral",
  failed: "danger",
};

/** The badge of a state; a state this build does not know gets a neutral one with the raw value. */
export function StateBadge({ state }: { state: string }) {
  const locale = useAdminLocale();
  const tone = isNotificationState(state) ? STATE_TONE[state] : "neutral";
  return <Badge tone={tone}>{notificationStateLabel(state, locale)}</Badge>;
}

/** The small time under the badge: when the campaign reached its state. */
function stateTime(record: NotificationRecord): string | null {
  switch (record.state) {
    case "cancelled":
      return record.cancelledAt;
    case "sent":
      return record.sentAt;
    case "partially_sent":
      return record.stoppedAt ?? record.failedAt;
    case "failed":
      return record.failedAt;
    case "sending":
    case "stopping":
      return record.startedAt;
    case "tested":
      return record.testConfirmedAt;
    default:
      return null;
  }
}

/** The id of a row's «Batafsil» button, where focus returns when the panel closes. */
export const detailsButtonId = (campaignId: string) => `campaign-details-${campaignId}`;

export interface HistoryTableProps {
  /** The rows shown (the page's items, with the board's local changes). */
  history: ReadonlyArray<NotificationRecord>;
  /** The page the URL names, for the range and the pagination. */
  page: Page<NotificationRecord>;
  query: NotificationHistoryQuery;
  customerParam?: string;
  selectedId: string | null;
  onSelect: (record: NotificationRecord) => void;
  regionRef: RefObject<HTMLDivElement | null>;
}

export function HistoryTable({
  history,
  page,
  query,
  customerParam,
  selectedId,
  onSelect,
  regionRef,
}: HistoryTableProps) {
  const idBase = useId();
  const t = useCopy(notificationsCopy);
  const h = t.history;
  const locale = useAdminLocale();
  const kinds = notificationDataCopy[locale].kind;
  const fmt = useFormat();
  return (
    <ListTransition className="group">
      <section
        id="history"
        aria-labelledby={`${idBase}-history`}
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex flex-col gap-1">
            <CardTitle id={`${idBase}-history`} className="text-heading">
              {h.title}
            </CardTitle>
            <span className="text-caption font-normal text-ink-muted">{h.note}</span>
          </div>
          <ExportMenu
            label={h.export}
            href={notificationListHref(
              { state: query.state, kind: query.kind },
              "/admin/notifications/export",
            )}
          />
        </div>
        <HistoryToolbar query={query} customerParam={customerParam} />
        <ScrollRegion ref={regionRef} label={h.region}>
          <table className="data-table min-w-[960px]">
            <thead>
              <tr>
                <th scope="col">{h.columns.date}</th>
                <th scope="col">{h.columns.kind}</th>
                <th scope="col">{h.columns.content}</th>
                <th scope="col">{h.columns.audience}</th>
                <th scope="col" className="text-right!">
                  {h.columns.sent}
                </th>
                <th scope="col" className="text-right!">
                  {h.columns.delivered}
                </th>
                <th scope="col">{h.columns.state}</th>
                <th scope="col">
                  <span className="sr-only">{h.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const time = stateTime(record);
                return (
                  <tr
                    key={record.id}
                    aria-selected={record.id === selectedId || undefined}
                    className={cn(record.id === selectedId && "bg-gold-soft/40")}
                  >
                    <td className="text-ink-muted! tabular-nums">
                      <time dateTime={record.at}>{fmt.dateTimeShort(record.at)}</time>
                    </td>
                    <td>{kinds[record.kind]}</td>
                    <td className="max-w-[360px]">
                      <span className="flex min-w-0 flex-col whitespace-normal">
                        <span className="line-clamp-2 font-semibold [overflow-wrap:anywhere] break-words">
                          {record.title}
                        </span>
                        <span className="line-clamp-2 text-[12px] font-normal [overflow-wrap:anywhere] break-words whitespace-normal text-ink">
                          {record.body}
                        </span>
                        {(record.linkLabel || record.linkUrl || record.author) && (
                          <span className="text-[12px] break-all text-ink-muted">
                            {[
                              record.linkLabel && `→ ${record.linkLabel}`,
                              record.linkUrl && `→ ${record.linkUrl}`,
                              record.author,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="max-w-[220px] whitespace-normal tabular-nums">
                      {audienceText(record, locale)}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        record.sent === null && "text-ink-muted!",
                      )}
                    >
                      {record.sent === null ? "—" : fmt.number(record.sent)}
                      {record.failed ? (
                        <span className="block text-[12px] text-danger-strong">
                          {h.failures(record.failed)}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        record.delivered === null && "text-ink-muted!",
                      )}
                    >
                      {record.delivered === null ? "—" : fmt.number(record.delivered)}
                    </td>
                    <td>
                      <StateBadge state={record.state} />
                      {time && (
                        <time
                          dateTime={time}
                          className="mt-1 block text-[12px] text-ink-muted tabular-nums"
                        >
                          {fmt.dateTimeShort(time)}
                        </time>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        id={detailsButtonId(record.id)}
                        variant="outline"
                        size="sm"
                        aria-label={h.detailsOf(record.title)}
                        aria-pressed={record.id === selectedId}
                        onClick={() => onSelect(record)}
                      >
                        {h.details}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icon name="bell" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">{h.empty}</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {hasNotificationFilters(query) ? h.emptyFiltered : h.emptyAll}
              </p>
            </div>
          )}
        </ScrollRegion>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="text-body-sm text-ink-muted tabular-nums">
            {rangeLabel(page.page, page.pageSize, page.total, fmt)}
          </span>
          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            hrefFor={(p): Route =>
              `${notificationListHref({ ...query, page: p, customer: customerParam })}#history` as Route
            }
          />
          <HistoryPageSizeMenu query={query} customerParam={customerParam} />
        </div>
      </section>
    </ListTransition>
  );
}

/** The history's state and kind filters (contract §2.8; the API has no search). */
function HistoryToolbar({
  query,
  customerParam,
}: {
  query: NotificationHistoryQuery;
  customerParam?: string;
}) {
  const h = useCopy(notificationsCopy).history;
  const words = notificationDataCopy[useAdminLocale()];
  const { navigate } = useListNavigation();
  const update = (patch: Partial<NotificationHistoryQuery>) =>
    navigate(notificationListHref({ ...query, ...patch, page: 1, customer: customerParam }));
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-5 py-3">
      <Select<NotificationState | "all">
        variant="filter"
        aria-label={h.state}
        prefix={h.statePrefix}
        value={query.state ?? "all"}
        onValueChange={(value) => update({ state: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: h.all },
          ...NOTIFICATION_STATES.map((state) => ({ value: state, label: words.state[state] })),
        ]}
      />
      <Select<NotificationKind | "all">
        variant="filter"
        aria-label={h.kind}
        prefix={h.kindPrefix}
        value={query.kind ?? "all"}
        onValueChange={(value) => update({ kind: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: h.all },
          ...NOTIFICATION_KINDS.map((kind) => ({ value: kind, label: words.kind[kind] })),
        ]}
      />
      {hasNotificationFilters(query) && (
        <button
          type="button"
          onClick={() =>
            navigate(notificationListHref({ pageSize: query.pageSize, customer: customerParam }))
          }
          className="inline-flex h-11 items-center gap-2 rounded-md px-3.5 text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft"
        >
          <Icon name="close" size={18} />
          {h.clear}
        </button>
      )}
    </div>
  );
}

/** Rows per page of the history (contract §1.5: 20 or 50). */
function HistoryPageSizeMenu({
  query,
  customerParam,
}: {
  query: NotificationHistoryQuery;
  customerParam?: string;
}) {
  const h = useCopy(notificationsCopy).history;
  const { navigate } = useListNavigation();
  return (
    <Select<string>
      variant="filter"
      size="sm"
      align="end"
      aria-label={h.pageSize}
      value={String(query.pageSize)}
      onValueChange={(value) =>
        navigate(
          notificationListHref({
            ...query,
            pageSize: Number(value) as NotificationHistoryQuery["pageSize"],
            page: 1,
            customer: customerParam,
          }),
        )
      }
      options={NOTIFICATION_PAGE_SIZES.map((size) => ({
        value: String(size),
        label: h.rows(size),
      }))}
    />
  );
}
