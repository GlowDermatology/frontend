"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import type { Page } from "@/data/types";
import { deleteSegment } from "@/data/segments.actions";
import { segmentRulesSummary, type Segment } from "@/domain/segment";
import { formatNumber } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import { upsertRow } from "../shared/use-ordered-list";
import { SegmentDialog } from "./segment-dialog";

type DialogState = { mode: "create" } | { mode: "edit"; segment: Segment } | null;

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink";

const groupHref = (id: string) => `/admin/customers/groups/${id}` as Route;
const pageHref = (page: number) =>
  (page > 1 ? `/admin/customers/groups?page=${page}` : "/admin/customers/groups") as Route;

/**
 * Guruhlar (contract §2.8 segments): the list with the rules in words,
 * member and push-device counts, create/edit dialogs, delete confirmation
 * (409 while a scheduled campaign targets the group) and the CSV/XLSX export.
 * Rows live in local state, updated from each action's answer (mock mode
 * persists nothing); a newer server page replaces them.
 */
export function GroupsView({ page }: { page: Page<Segment> }) {
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
      return;
    }
    const { id, name } = deleting;
    deletedId.current = id;
    setRows((current) => current.filter((row) => row.id !== id));
    setTotal((current) => Math.max(0, current - 1));
    setDeleting(null);
    toast({ title: "Guruh o‘chirildi", description: name });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Breadcrumbs
          items={[{ label: "Mijozlar", href: "/admin/customers" }, { label: "Guruhlar" }]}
        />
        <PageHeader
          eyebrow={`${formatNumber(total)} ta guruh`}
          title="Guruhlar"
          actions={
            <>
              <ExportMenu href="/admin/customers/groups/export" />
              <button
                type="button"
                ref={addButton}
                onClick={() => openDialog({ mode: "create" })}
                className={buttonStyles()}
              >
                <Icon name="plus" size={18} />
                Guruh yaratish
              </button>
            </>
          }
        />
      </div>

      <section
        aria-label="Guruhlar ro‘yxati"
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {rows.length > 0 ? (
          <ScrollRegion label="Guruhlar jadvali">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">NOMI</th>
                  <th scope="col">QOIDALAR</th>
                  <th scope="col" className="text-right!">
                    A’ZOLAR
                  </th>
                  <th scope="col" className="text-right!">
                    PUSH QURILMALAR
                  </th>
                  <th scope="col">
                    <span className="sr-only">Amallar</span>
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
                    <td className="text-ink-muted">{segmentRulesSummary(segment.rules)}</td>
                    <td className="text-right tabular-nums">
                      {formatNumber(segment.memberCount)}
                      <span className="block text-[12px] text-ink-muted">
                        {formatNumber(segment.manualMemberCount)} ta qo‘lda
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(segment.size)}</td>
                    <td>
                      <span className="flex justify-end gap-0.5">
                        <Link
                          href={groupHref(segment.id)}
                          aria-label={`«${segment.name}» — a’zolar`}
                          className={iconButtonClass}
                        >
                          <Icon name="users" size={18} />
                        </Link>
                        <button
                          type="button"
                          aria-label={`«${segment.name}» — tahrirlash`}
                          onClick={() => openDialog({ mode: "edit", segment })}
                          className={iconButtonClass}
                        >
                          <Icon name="pencil" size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label={`«${segment.name}» — o‘chirish`}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(segment);
                          }}
                          className={`${iconButtonClass} hover:text-danger`}
                        >
                          <Icon name="trash" size={18} />
                        </button>
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
            <p className="m-0 text-subheading text-ink">Hali guruh yo‘q</p>
            <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
              Guruhlar bildirishnomalarni tanlangan mijozlarga yuborish uchun kerak.
            </p>
            <Button variant="secondary" onClick={() => openDialog({ mode: "create" })}>
              <Icon name="plus" size={18} />
              Guruh yaratish
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
            <Icon name="info" size={14} />
            Push qurilmalar — guruhga yuborilgan xabar yetadigan mijozlar soni.
          </span>
          {page.pageCount > 1 && (
            <span className="flex items-center gap-3">
              <span className="text-body-sm text-ink-muted tabular-nums">
                {rangeLabel(page.page, page.pageSize, total)}
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
            title: mode === "create" ? "Guruh yaratildi" : "Guruh saqlandi",
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
        title={deleting ? `«${deleting.name}» guruhini o‘chirasizmi?` : ""}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Mijozlar o‘chirilmaydi, faqat guruh va qo‘lda qo‘shilganlar ro‘yxati yo‘qoladi.
            Rejalashtirilgan xabar shu guruhga yuborilishi kerak bo‘lsa, server o‘chirishni rad
            etadi.
          </p>
        }
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
          <AlertDialogCancel disabled={deleteBusy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleteBusy}
            aria-busy={deleteBusy}
          >
            {deleteBusy ? "O‘chirilmoqda…" : "O‘chirish"}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
