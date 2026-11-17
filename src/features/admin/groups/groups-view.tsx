"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, IconButton } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import type { Page } from "@/data/types";
import { deleteSegment } from "@/data/segments.actions";
import { segmentRulesSummary, type Segment } from "@/domain/segment";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { upsertRow } from "../shared/use-ordered-list";
import { groupsCopy } from "./copy";
import { SegmentDialog } from "./segment-dialog";

type DialogState = { mode: "create" } | { mode: "edit"; segment: Segment } | null;

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink";

const groupHref = (id: string) => `/admin/customers/groups/${id}` as Route;
const pageHref = (page: number) =>
  (page > 1 ? `/admin/customers/groups?page=${page}` : "/admin/customers/groups") as Route;

const numericHead = "text-right! uppercase";

/**
 * Customer groups (contract §2.8 segments): the list with the rules in words,
 * member and push-device counts, create/edit dialogs, delete confirmation
 * (409 while a scheduled campaign targets the group) and the CSV/XLSX export.
 * Rows live in local state, updated from each action's answer (mock mode
 * persists nothing); a newer server page replaces them.
 */
export function GroupsView({ page }: { page: Page<Segment> }) {
  const t = useCopy(groupsCopy);
  const l = t.list;
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useToast();
  const [source, setSource] = useState(page);
  const [rows, setRows] = useState(page.items);
  const [total, setTotal] = useState(page.total);
  if (page !== source) {
    setSource(page);
    setRows(page.items);
    setTotal(page.total);
  }
  const [dialog, setDialog] = useState<DialogState>(null);
  const [instance, setInstance] = useState(0);
  const idempotency = useIdempotencyKey();
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteInFlight = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const deletedId = useRef<string | null>(null);

  const openDialog = (state: Exclude<DialogState, null>) => {
    setInstance((current) => current + 1);
    setDialog(state);
  };

  const confirmDelete = async () => {
    if (!deleting || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await runAction((csrf) => deleteSegment(deleting.id, csrf));
    deleteInFlight.current = false;
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      toast({ tone: "danger", title: l.deleteFailed, description: result.error });
      return;
    }
    const { id, name } = deleting;
    deletedId.current = id;
    setRows((current) => current.filter((row) => row.id !== id));
    setTotal((current) => Math.max(0, current - 1));
    setDeleting(null);
    toast({ tone: "success", title: l.deleted, description: name });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Breadcrumbs
          items={[
            { label: t.crumbs.customers, href: "/admin/customers" },
            { label: t.crumbs.groups },
          ]}
        />
        <PageHeader
          eyebrow={l.count(total)}
          title={l.title}
          actions={
            <>
              <ExportMenu href="/admin/customers/groups/export" />
              <Button ref={addButton} onClick={() => openDialog({ mode: "create" })}>
                <Icon name="plus" size={18} />
                {l.create}
              </Button>
            </>
          }
        />
      </div>

      <section
        aria-label={l.sectionLabel}
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {rows.length > 0 ? (
          <ScrollRegion label={l.tableLabel}>
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col" className="uppercase">
                    {l.columns.name}
                  </th>
                  <th scope="col" className="uppercase">
                    {l.columns.rules}
                  </th>
                  <th scope="col" className={numericHead}>
                    {l.columns.members}
                  </th>
                  <th scope="col" className={numericHead}>
                    {l.columns.devices}
                  </th>
                  <th scope="col">
                    <span className="sr-only">{l.columns.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((segment) => (
                  <tr key={segment.id}>
                    <td>
                      <Link
                        href={groupHref(segment.id)}
                        className="font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                      >
                        {segment.name}
                      </Link>
                    </td>
                    <td className="text-ink-muted">{segmentRulesSummary(segment.rules, locale)}</td>
                    <td className="text-right tabular-nums">
                      {fmt.number(segment.memberCount)}
                      <span className="block text-[12px] text-ink-muted">
                        {l.manualCount(fmt.number(segment.manualMemberCount))}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{fmt.number(segment.size)}</td>
                    <td>
                      <span className="flex justify-end gap-0.5">
                        <Link
                          href={groupHref(segment.id)}
                          aria-label={l.membersOf(segment.name)}
                          className={iconButtonClass}
                        >
                          <Icon name="users" size={18} />
                        </Link>
                        <IconButton
                          size="sm"
                          aria-label={l.editOf(segment.name)}
                          onClick={() => openDialog({ mode: "edit", segment })}
                        >
                          <Icon name="pencil" size={18} />
                        </IconButton>
                        <IconButton
                          size="sm"
                          aria-label={l.deleteOf(segment.name)}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(segment);
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
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Icon name="users" size={22} />
            </span>
            <p className="m-0 text-subheading text-ink">{l.emptyTitle}</p>
            <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">{l.emptyText}</p>
            <Button variant="secondary" onClick={() => openDialog({ mode: "create" })}>
              <Icon name="plus" size={18} />
              {l.create}
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
            <Icon name="info" size={14} />
            {l.devicesNote}
          </span>
          {page.pageCount > 1 && (
            <span className="flex items-center gap-3">
              <span className="text-body-sm text-ink-muted tabular-nums">
                {rangeLabel(page.page, page.pageSize, total, fmt)}
              </span>
              <Pagination page={page.page} pageCount={page.pageCount} hrefFor={pageHref} />
            </span>
          )}
        </div>
      </section>

      <SegmentDialog
        key={instance}
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        segment={dialog?.mode === "edit" ? dialog.segment : null}
        idempotency={idempotency}
        onSaved={(segment, mode) => {
          setRows((current) => upsertRow(current, segment, (row) => row.id));
          if (mode === "create") setTotal((current) => current + 1);
          toast({
            tone: "success",
            title: mode === "create" ? l.created : l.saved,
            description: segment.name,
          });
        }}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (deleteBusy) return;
          if (!open) setDeleting(null);
        }}
        onCloseAutoFocus={(event) => {
          if (deletedId.current) {
            event.preventDefault();
            deletedId.current = null;
            addButton.current?.focus();
          }
        }}
        title={deleting ? l.deleteTitle(deleting.name) : ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{l.deleteText}</p>}
      >
        {deleteError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {deleteError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={deleteBusy && t.busyReason}>
              {t.cancel}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirmDelete} busy={deleteBusy}>
            {deleteBusy ? l.deleting : l.delete}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
