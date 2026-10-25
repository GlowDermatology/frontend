"use client";

import Link from "next/link";
import type { Route } from "next";
import { Fragment, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { auditActionLabel, auditDataText, auditObjectLabel, type AuditEntry } from "@/domain/audit";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, tashkentParts } from "@/lib/format";

/**
 * Audit rows. Each row expands to its `data` payload as indented JSON,
 * rendered as text (React escapes it; never HTML), since the payload carries
 * user-entered strings such as adjustment reasons.
 */
export function AuditTable({
  entries,
  sortHref,
  ascending,
}: {
  entries: ReadonlyArray<AuditEntry>;
  sortHref: Route;
  ascending: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ScrollRegion label="Harakatlar jurnali jadvali">
      <table className="data-table min-w-[1040px] transition-opacity duration-150 group-data-[pending]:opacity-60">
        <thead>
          <tr>
            <th scope="col" aria-sort={ascending ? "ascending" : "descending"}>
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-inherit no-underline"
              >
                SANA
                <Icon name={ascending ? "chevron-up" : "chevron-down"} size={14} />
                <span className="sr-only">
                  {ascending ? ", eskisidan yangisiga" : ", yangisidan eskisiga"}
                </span>
              </Link>
            </th>
            <th scope="col">XODIM</th>
            <th scope="col">AMAL</th>
            <th scope="col">OBYEKT</th>
            <th scope="col">OBYEKT ID</th>
            <th scope="col">IP</th>
            <th scope="col">SO‘ROV ID</th>
            <th scope="col">
              <span className="sr-only">Tafsilotlar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const expanded = open.has(entry.id);
            const label = auditActionLabel(entry.action);
            return (
              <Fragment key={entry.id}>
                <tr data-audit-id={entry.id}>
                  <td className="text-ink-muted! tabular-nums">
                    <time dateTime={entry.at}>
                      {formatDateTimeShort(entry.at)} {tashkentParts(entry.at).year}
                    </time>
                  </td>
                  <td className={cn(!entry.actor && "text-ink-muted!")}>
                    {entry.actor ?? "Tizim"}
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span className="font-semibold">{label}</span>
                      {label !== entry.action && (
                        <span className="font-mono text-[11px] text-ink-muted">{entry.action}</span>
                      )}
                    </span>
                  </td>
                  <td>{auditObjectLabel(entry.objectType)}</td>
                  <td className="font-mono text-[12px]">{entry.objectId || "—"}</td>
                  <td className="font-mono text-[12px] text-ink-muted!">{entry.ip ?? "—"}</td>
                  <td
                    className="max-w-[160px] truncate font-mono text-[12px] text-ink-muted!"
                    title={entry.requestId}
                  >
                    {entry.requestId}
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`audit-data-${entry.id}`}
                      aria-label={`${label} — ma’lumotlar`}
                      onClick={() => toggle(entry.id)}
                      className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                    >
                      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} />
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr id={`audit-data-${entry.id}`}>
                    <td colSpan={8} className="bg-surface">
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
