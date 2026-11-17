"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { resolveDeliveryIssue } from "@/data/delivery-issues.actions";
import { issueDetailLines, type DeliveryIssue } from "@/domain/delivery-issue";
import { issueKindLabel } from "@/domain/order";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { formatGrams } from "../orders/delivery-view";
import { issuesCopy } from "./copy";
import { NoteDialog } from "./note-dialog";

function DetailList({ issue }: { issue: DeliveryIssue }) {
  const fmt = useFormat();
  const lines = issueDetailLines(issue.details, fmt.locale);
  if (lines.length === 0) return null;
  return (
    <dl className="m-0 flex flex-col gap-0.5 text-[12px] leading-[18px] text-ink-muted">
      {lines.map((line) => (
        <div key={line.key} className="flex min-w-0 flex-wrap gap-x-1.5">
          <dt>{line.label}:</dt>
          <dd className="m-0 min-w-0 font-semibold break-all text-ink tabular-nums">
            {line.kind === "money" && typeof line.value === "number"
              ? fmt.som(line.value)
              : line.kind === "grams" && typeof line.value === "number"
                ? formatGrams(line.value, fmt.locale)
                : String(line.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The queue's rows. "Hal qilish" asks for a note and posts
 * `delivery/issues/{id}/resolve/`; the answered row replaces the local one
 * at once (api mode also refreshes the route, so the open list and the
 * badge follow). A 404 or 409 (already resolved) is toasted and re-reads.
 */
export function IssuesTable({ issues }: { issues: DeliveryIssue[] }) {
  const locale = useAdminLocale();
  const t = useCopy(issuesCopy);
  const fmt = useFormat();
  const kind = (value: string) => issueKindLabel(value, locale);
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [answers, setAnswers] = useState<ReadonlyMap<number, DeliveryIssue>>(new Map());
  const [source, setSource] = useState(issues);
  const [resolving, setResolving] = useState<DeliveryIssue | null>(null);
  const [shown, setShown] = useState<DeliveryIssue | null>(null);
  // New rows from the server (navigation, the action's refresh) replace the local answers.
  if (source !== issues) {
    setSource(issues);
    setAnswers(new Map());
  }
  if (resolving !== null && resolving !== shown) setShown(resolving);

  const rows = issues.map((issue) => answers.get(issue.id) ?? issue);

  return (
    <>
      <ScrollRegion
        label={t.table.label}
        className="transition-opacity duration-150 group-data-[pending]:opacity-60"
      >
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th scope="col">{t.table.issue}</th>
              <th scope="col">{t.table.order}</th>
              <th scope="col">{t.table.opened}</th>
              <th scope="col">{t.table.details}</th>
              <th scope="col">{t.table.state}</th>
              <th scope="col">
                <span className="sr-only">{t.table.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((issue) => (
              <tr
                key={issue.id}
                className={cn(issue.urgent && issue.state === "open" && "bg-danger-soft")}
              >
                <td>
                  <span className="flex flex-col items-start gap-1">
                    <span className="flex items-center gap-1.5 font-bold">
                      {issue.urgent && (
                        <Icon name="alert-triangle" size={16} className="shrink-0 text-danger" />
                      )}
                      {kind(issue.kind)}
                    </span>
                    <code className="text-[12px] break-all text-ink-muted">{issue.code}</code>
                  </span>
                </td>
                <td>
                  <Link
                    href={`/admin/orders/${issue.orderId}` as Route}
                    className="font-bold text-ink tabular-nums underline decoration-gold underline-offset-4"
                  >
                    №{issue.orderId}
                  </Link>
                </td>
                <td className="text-ink-muted tabular-nums">
                  <span className="flex flex-col">
                    <time dateTime={issue.openedAt}>{fmt.dateTimeShort(issue.openedAt)}</time>
                    {issue.reminders > 0 && (
                      <span className="text-[12px]">{t.table.reminders(issue.reminders)}</span>
                    )}
                  </span>
                </td>
                <td className="max-w-[320px]">
                  <span className="flex flex-col gap-1">
                    {issue.note && (
                      <span className="text-body-sm break-words text-ink">{issue.note}</span>
                    )}
                    <DetailList issue={issue} />
                  </span>
                </td>
                <td>
                  {issue.state === "open" ? (
                    <Badge tone={issue.urgent ? "danger" : "warning"}>
                      {issue.urgent ? t.table.urgent : t.table.open}
                    </Badge>
                  ) : (
                    <span className="flex max-w-[260px] flex-col items-start gap-1">
                      <Badge tone="success">{t.table.resolved}</Badge>
                      <span className="text-[12px] leading-4 text-ink-muted">
                        {issue.resolvedBy?.name ?? t.table.system}
                        {issue.resolvedAt ? ` · ${fmt.dateTimeShort(issue.resolvedAt)}` : ""}
                      </span>
                      {issue.resolutionNote && (
                        <span className="text-[12px] leading-4 break-words text-ink">
                          {issue.resolutionNote}
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td>
                  {issue.state === "open" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setResolving(issue)}
                      aria-label={t.table.resolveLabel(issue.orderId, kind(issue.kind))}
                    >
                      <Icon name="check" size={16} />
                      {t.table.resolve}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>

      {/* One dialog (and idempotency key) per issue: a retry reuses it, another issue gets its own. */}
      <NoteDialog<DeliveryIssue>
        key={shown?.id ?? "none"}
        open={resolving !== null}
        onOpenChange={(open) => {
          if (!open) setResolving(null);
        }}
        title={shown ? t.resolve.title(shown.orderId) : ""}
        description={shown ? t.resolve.description(kind(shown.kind), shown.code) : undefined}
        label={t.resolve.label}
        placeholder={t.resolve.placeholder}
        submitLabel={t.resolve.submit}
        pendingLabel={t.resolve.saving}
        submit={(note, key) => {
          const id = resolving?.id ?? 0;
          return runAction((csrf) => resolveDeliveryIssue(id, note, key, csrf));
        }}
        onDone={(resolved) => {
          setResolving(null);
          setAnswers((current) => new Map(current).set(resolved.id, resolved));
          toast({
            tone: "success",
            title: t.resolve.done,
            description: t.resolve.doneLine(resolved.orderId, kind(resolved.kind)),
          });
        }}
        onStale={(message) => {
          setResolving(null);
          toast({ tone: "danger", title: t.failed, description: message });
          startTransition(() => router.refresh());
        }}
      />
    </>
  );
}
