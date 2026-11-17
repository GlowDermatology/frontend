"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId, useRef, useState } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { removeSegmentMember } from "@/data/segments.actions";
import type { Page } from "@/data/types";
import { segmentRulesSummary, type Segment, type SegmentMember } from "@/domain/segment";
import { tashkentParts } from "@/lib/format";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { AddMembersDialog } from "./add-members-dialog";
import { groupsCopy } from "./copy";

const headClass = "uppercase";
const numericHead = "text-right! uppercase";

/**
 * One group's members (contract §2.8 `segments/{id}/members/`, customer rows): add customers
 * through the search-and-pick dialog (or a pasted list), remove a manual member (409 for a
 * rule-only member) and export `guruh-azolari`. Members are customer list rows (contract §2.6
 * `CustomerListItem`): balance and rate come from the server.
 */
export function MembersView({
  segment: initialSegment,
  page,
}: {
  segment: Segment;
  page: Page<SegmentMember>;
}) {
  const t = useCopy(groupsCopy);
  const m = t.members;
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useToast();
  const [source, setSource] = useState({ initialSegment, page });
  const [segment, setSegment] = useState(initialSegment);
  const [rows, setRows] = useState(page.items);
  if (source.initialSegment !== initialSegment || source.page !== page) {
    setSource({ initialSegment, page });
    setSegment(initialSegment);
    setRows(page.items);
  }
  const [adding, setAdding] = useState(false);
  const [addInstance, setAddInstance] = useState(0);
  const addKey = useIdempotencyKey();
  const [removing, setRemoving] = useState<SegmentMember | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const removeInFlight = useRef(false);
  /** Set after a successful removal: the row and its button are gone, so focus moves to the table. */
  const removedMember = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const addButtonId = useId();

  const base = `/admin/customers/groups/${segment.id}`;
  const pageHref = (n: number) => (n > 1 ? `${base}?page=${n}` : base) as Route;
  const registered = (iso: string) => `${fmt.dayMonthShort(iso)} ${tashkentParts(iso).year}`;
  const percent = (value: string | null) =>
    value === null || !Number.isFinite(Number(value)) ? m.none : fmt.percent(Number(value));

  const confirmRemove = async () => {
    if (!removing || removeInFlight.current) return;
    removeInFlight.current = true;
    setRemoveBusy(true);
    setRemoveError(null);
    const result = await runAction((csrf) => removeSegmentMember(segment.id, removing.id, csrf));
    removeInFlight.current = false;
    setRemoveBusy(false);
    if (!result.ok) {
      setRemoveError(result.error);
      toast({ tone: "danger", title: m.removeFailed, description: result.error });
      return;
    }
    const { id, name } = removing;
    removedMember.current = true;
    setRows((current) => current.filter((row) => row.id !== id));
    setSegment((current) => ({
      ...current,
      memberCount: Math.max(0, current.memberCount - 1),
      manualMemberCount: Math.max(0, current.manualMemberCount - 1),
    }));
    setRemoving(null);
    toast({ tone: "success", title: m.removed, description: name });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Breadcrumbs
          items={[
            { label: t.crumbs.customers, href: "/admin/customers" },
            { label: t.crumbs.groups, href: "/admin/customers/groups" },
            { label: segment.name },
          ]}
        />
        <PageHeader
          eyebrow={m.count(segment.memberCount, segment.size)}
          title={segment.name}
          actions={
            <>
              <ExportMenu href={`${base}/export`} />
              <Button
                id={addButtonId}
                onClick={() => {
                  setAddInstance((current) => current + 1);
                  setAdding(true);
                }}
              >
                <Icon name="plus" size={18} />
                {m.add}
              </Button>
            </>
          }
        />
      </div>

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
        <span className="flex items-center gap-2 text-ink">
          <Icon name="sliders" size={18} className="text-gold-ink" />
          {segmentRulesSummary(segment.rules, locale)}
        </span>
        <span className="text-ink-muted tabular-nums">
          {m.manual(fmt.number(segment.manualMemberCount))}
        </span>
      </Card>

      <section
        aria-label={m.sectionLabel}
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {rows.length > 0 ? (
          <ScrollRegion ref={tableRef} label={m.tableLabel}>
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col" className={headClass}>
                    {m.columns.customer}
                  </th>
                  <th scope="col" className={headClass}>
                    {m.columns.phone}
                  </th>
                  <th scope="col" className={headClass}>
                    {m.columns.registered}
                  </th>
                  <th scope="col" className={numericHead}>
                    {m.columns.total}
                  </th>
                  <th scope="col" className={numericHead}>
                    {m.columns.online}
                  </th>
                  <th scope="col" className={numericHead}>
                    {m.columns.cashback}
                  </th>
                  <th scope="col" className={numericHead}>
                    {m.columns.balance}
                  </th>
                  <th scope="col">
                    <span className="sr-only">{m.columns.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link
                        href={`/admin/customers/${member.id}` as Route}
                        className="font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                      >
                        {member.name}
                      </Link>
                      {member.status === "deleted" && (
                        <span className="block text-[12px] text-ink-muted">{m.deletedBadge}</span>
                      )}
                    </td>
                    <td className="tabular-nums">{fmt.phone(member.phone)}</td>
                    <td className="text-ink-muted tabular-nums">
                      {registered(member.registeredAt)}
                    </td>
                    <td className="text-right tabular-nums">{fmt.som(member.lifetimeTotal)}</td>
                    <td className="text-right tabular-nums">
                      {fmt.number(member.onlineOrdersCount)}
                    </td>
                    <td className="text-right tabular-nums">{percent(member.percent)}</td>
                    <td className="text-right tabular-nums">{fmt.som(member.balance)}</td>
                    <td>
                      <span className="flex justify-end">
                        <IconButton
                          size="sm"
                          aria-label={m.removeOf(member.name)}
                          onClick={() => {
                            setRemoveError(null);
                            setRemoving(member);
                          }}
                          className="hover:bg-danger-soft hover:text-danger"
                        >
                          <Icon name="trash" size={18} />
                        </IconButton>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Icon name="users" size={22} />
            </span>
            <p className="m-0 max-w-[460px] text-body-sm text-ink-muted">{m.empty}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setAddInstance((current) => current + 1);
                setAdding(true);
              }}
            >
              <Icon name="plus" size={18} />
              {m.add}
            </Button>
          </div>
        )}
        {page.pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total, fmt)}
            </span>
            <Pagination page={page.page} pageCount={page.pageCount} hrefFor={pageHref} />
          </div>
        )}
      </section>

      {adding && (
        <AddMembersDialog
          key={addInstance}
          segment={segment}
          idempotencyKey={addKey}
          onClose={() => setAdding(false)}
          onAdded={(updated) => {
            const added = updated.memberCount - segment.memberCount;
            setSegment(updated);
            toast({
              tone: "success",
              title: m.added,
              description: added > 0 ? m.addedCount(added) : m.addedNone,
            });
          }}
        />
      )}

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (removeBusy) return;
          if (!open) setRemoving(null);
        }}
        onCloseAutoFocus={(event) => {
          if (!removedMember.current) return;
          removedMember.current = false;
          const target = tableRef.current ?? document.getElementById(addButtonId);
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
        title={removing ? m.removeTitle(removing.name) : ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{m.removeText}</p>}
      >
        {removeError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {removeError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          {/* Radix starts focus on the cancel control (least destructive). */}
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={removeBusy && t.busyReason}>
              {t.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmRemove} busy={removeBusy}>
            {removeBusy ? m.removing : m.remove}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
