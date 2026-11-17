"use client";

import Link from "next/link";
import type { Route } from "next";
import { Fragment, useState } from "react";

import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useOptionalToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import {
  auditActionLabel,
  auditActorLabel,
  auditDataText,
  auditObjectLabel,
  parseAuditRequestId,
  type AuditEntry,
  type AuditFilters,
} from "@/domain/audit";
import { cn } from "@/lib/cn";
import { tashkentParts } from "@/lib/format";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { auditLogCopy } from "./copy";
import { auditRequestHref } from "./query";

/**
 * Audit rows (DESIGN §D). Each row expands to its `data` payload as indented JSON, rendered as
 * text (React escapes it; never HTML), since the payload carries user-entered strings such as
 * adjustment reasons. The request id is shown whole (monospace, wrapping) with a copy button and
 * a link to every entry of that request. The IP column exists only for viewers who may see IPs.
 */
export function AuditTable({
  entries,
  sortHref,
  ascending,
  ipVisible,
  filters,
}: {
  entries: ReadonlyArray<AuditEntry>;
  sortHref: Route;
  ascending: boolean;
  ipVisible: boolean;
  filters: AuditFilters;
}) {
  const t = useCopy(auditLogCopy).table;
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useOptionalToast();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyRequestId = async (requestId: string) => {
    try {
      await navigator.clipboard.writeText(requestId);
      toast?.({ tone: "success", title: t.copied, description: requestId });
    } catch {
      toast?.({ tone: "danger", title: t.copyFailed, description: t.copyFailedText });
    }
  };

  const columns = ipVisible ? 8 : 7;

  return (
    <ScrollRegion label={t.label}>
      <table
        className={cn(
          "data-table transition-opacity duration-150 group-data-[pending]:opacity-60 motion-reduce:transition-none",
          ipVisible ? "min-w-[1180px]" : "min-w-[1060px]",
        )}
      >
        <thead>
          <tr>
            <th scope="col" aria-sort={ascending ? "ascending" : "descending"}>
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-inherit uppercase no-underline"
              >
                {t.at}
                <Icon name={ascending ? "chevron-up" : "chevron-down"} size={14} />
                <span className="sr-only">{ascending ? t.ascending : t.descending}</span>
              </Link>
            </th>
            <th scope="col" className="uppercase">
              {t.actor}
            </th>
            <th scope="col" className="uppercase">
              {t.action}
            </th>
            <th scope="col" className="uppercase">
              {t.object}
            </th>
            <th scope="col" className="uppercase">
              {t.objectId}
            </th>
            {ipVisible && (
              <th scope="col" className="uppercase">
                {t.ip}
              </th>
            )}
            <th scope="col" className="uppercase">
              {t.requestId}
            </th>
            <th scope="col">
              <span className="sr-only">{t.details}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const expanded = open.has(entry.id);
            const label = auditActionLabel(entry.action, locale);
            const linkable = parseAuditRequestId(entry.requestId);
            const filtered = linkable !== undefined && filters.requestId === linkable;
            return (
              <Fragment key={entry.id}>
                <tr data-audit-id={entry.id} className={cn(filtered && "bg-gold-soft/40")}>
                  <td className="whitespace-nowrap text-ink-muted! tabular-nums">
                    <time dateTime={entry.at}>
                      {fmt.dayMonthShort(entry.at)} {tashkentParts(entry.at).year},{" "}
                      {fmt.time(entry.at)}
                    </time>
                  </td>
                  <td className={cn(!entry.actor && "text-ink-muted!")}>
                    {auditActorLabel(entry.actor, locale)}
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span className="font-semibold">{label}</span>
                      {label !== entry.action && (
                        <span className="font-mono text-[11px] text-ink-muted">{entry.action}</span>
                      )}
                    </span>
                  </td>
                  <td>{auditObjectLabel(entry.objectType, locale)}</td>
                  <td className="font-mono text-[12px]">{entry.objectId || t.none}</td>
                  {ipVisible && (
                    <td className="font-mono text-[12px] whitespace-nowrap text-ink-muted!">
                      {entry.ip ?? t.none}
                    </td>
                  )}
                  <td className="w-[260px] min-w-[220px]">
                    {entry.requestId ? (
                      <span className="flex flex-col gap-1">
                        <span className="flex items-start gap-1">
                          <code
                            data-request-id
                            className="min-w-0 flex-1 rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[12px] leading-[18px] break-all text-ink"
                          >
                            {entry.requestId}
                          </code>
                          <Tooltip content={t.copy}>
                            <IconButton
                              size="sm"
                              aria-label={t.copyRequestId}
                              onClick={() => void copyRequestId(entry.requestId)}
                              className="size-7 shrink-0"
                            >
                              <Icon name="copy" size={16} />
                            </IconButton>
                          </Tooltip>
                        </span>
                        {linkable && !filtered && (
                          <Link
                            href={auditRequestHref(filters, linkable)}
                            scroll={false}
                            aria-label={t.sameRequestOf(linkable)}
                            className="inline-flex items-center gap-1 self-start rounded-sm text-[12px] font-semibold text-gold-ink no-underline transition-colors duration-150 hover:text-ink hover:underline hover:decoration-gold hover:underline-offset-4 motion-reduce:transition-none"
                          >
                            <Icon name="link" size={14} />
                            {t.sameRequest}
                          </Link>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-muted">{t.none}</span>
                    )}
                  </td>
                  <td>
                    <IconButton
                      size="sm"
                      aria-expanded={expanded}
                      aria-controls={`audit-data-${entry.id}`}
                      aria-label={t.detailsOf(label)}
                      onClick={() => toggle(entry.id)}
                    >
                      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} />
                    </IconButton>
                  </td>
                </tr>
                {expanded && (
                  <tr id={`audit-data-${entry.id}`}>
                    <td colSpan={columns} className="bg-surface">
                      <pre className="m-0 max-h-[320px] overflow-auto rounded-md bg-surface-raised p-3 font-mono text-[12px] leading-[18px] whitespace-pre-wrap text-ink">
                        {auditDataText(entry.data)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
