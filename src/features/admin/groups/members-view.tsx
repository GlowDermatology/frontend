"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId, useRef, useState, type ClipboardEvent, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, Dialog, DialogClose } from "@/components/ui/dialog";
import { TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { addSegmentMembers, removeSegmentMember } from "@/data/segments.actions";
import type { Page } from "@/data/types";
import {
  SEGMENT_MEMBERS_MAX,
  segmentRulesSummary,
  splitMemberList,
  type Segment,
  type SegmentMember,
} from "@/domain/segment";
import { cn } from "@/lib/cn";
import { formatNumber, formatPhone, formatSom } from "@/lib/format";

import { percentLabel, registeredLabel as registered } from "../customers/labels";
import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger";

/**
 * One group's members (contract §2.8 `segments/{id}/members/`, customer
 * rows): add customers by id or phone (≤500, manual membership), remove a
 * manual member (409 "Mijoz guruhga qoida orqali kiradi." for a rule-only
 * member) and export `guruh-azolari`. Members are customer list rows
 * (contract §2.6 `CustomerListItem`): balance and rate come from the server.
 */
export function MembersView({
  segment: initialSegment,
  page,
}: {
  segment: Segment;
  page: Page<SegmentMember>;
}) {
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

  const base = `/admin/customers/groups/${segment.id}`;
  const pageHref = (n: number) => (n > 1 ? `${base}?page=${n}` : base) as Route;

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
      return;
    }
    const { id, name } = removing;
    setRows((current) => current.filter((row) => row.id !== id));
    setSegment((current) => ({
      ...current,
      memberCount: Math.max(0, current.memberCount - 1),
      manualMemberCount: Math.max(0, current.manualMemberCount - 1),
    }));
    setRemoving(null);
    toast({ title: "Mijoz guruhdan chiqarildi", description: name });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Breadcrumbs
          items={[
            { label: "Mijozlar", href: "/admin/customers" },
            { label: "Guruhlar", href: "/admin/customers/groups" },
            { label: segment.name },
          ]}
        />
        <PageHeader
          eyebrow={`${formatNumber(segment.memberCount)} ta a’zo · ${formatNumber(segment.size)} ta push qurilma`}
          title={segment.name}
          actions={
            <>
              <ExportMenu href={`${base}/export`} />
              <Button
                onClick={() => {
                  setAddInstance((current) => current + 1);
                  setAdding(true);
                }}
              >
                <Icon name="plus" size={18} />
                Mijoz qo‘shish
              </Button>
            </>
          }
        />
      </div>

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
        <span className="flex items-center gap-2 text-ink">
          <Icon name="sliders" size={18} className="text-gold-ink" />
          {segmentRulesSummary(segment.rules)}
        </span>
        <span className="text-ink-muted tabular-nums">
          Qo‘lda qo‘shilgan: {formatNumber(segment.manualMemberCount)}
        </span>
      </Card>

      <section
        aria-label="Guruh a’zolari"
        className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
      >
        {rows.length > 0 ? (
          <ScrollRegion label="Guruh a’zolari jadvali">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">MIJOZ</th>
                  <th scope="col">TELEFON</th>
                  <th scope="col">RO‘YXATDAN O‘TGAN</th>
                  <th scope="col" className="text-right!">
                    JAMI XARIDLAR
                  </th>
                  <th scope="col" className="text-right!">
                    ONLAYN BUYURTMALAR
                  </th>
                  <th scope="col" className="text-right!">
                    CASHBACK
                  </th>
                  <th scope="col" className="text-right!">
                    BALANS
                  </th>
                  <th scope="col">
                    <span className="sr-only">Amallar</span>
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
                        <span className="block text-[12px] text-ink-muted">O‘chirilgan</span>
                      )}
                    </td>
                    <td className="tabular-nums">{formatPhone(member.phone)}</td>
                    <td className="text-ink-muted tabular-nums">
                      {registered(member.registeredAt)}
                    </td>
                    <td className="text-right tabular-nums">{formatSom(member.lifetimeTotal)}</td>
                    <td className="text-right tabular-nums">
                      {formatNumber(member.onlineOrdersCount)}
                    </td>
                    <td className="text-right tabular-nums">{percentLabel(member.percent)}</td>
                    <td className="text-right tabular-nums">{formatSom(member.balance)}</td>
                    <td>
                      <span className="flex justify-end">
                        <button
                          type="button"
                          aria-label={`${member.name} — guruhdan chiqarish`}
                          onClick={() => {
                            setRemoveError(null);
                            setRemoving(member);
                          }}
                          className={iconButtonClass}
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
          <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">
            Guruhda hali mijoz yo‘q. Qoidaga mos mijozlar avtomatik kiradi yoki ularni qo‘lda
            qo‘shing.
          </p>
        )}
        {page.pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
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
              title: "Mijozlar qo‘shildi",
              description:
                added > 0 ? `${formatNumber(added)} ta yangi a’zo` : "Ular allaqachon guruhda edi",
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
        title={removing ? `${removing.name}ni guruhdan chiqarasizmi?` : ""}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Faqat qo‘lda qo‘shilgan a’zolik olib tashlanadi. Mijoz qoida orqali kirsa, u guruhda
            qoladi.
          </p>
        }
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
          <AlertDialogCancel disabled={removeBusy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirmRemove}
            disabled={removeBusy}
            aria-busy={removeBusy}
          >
            {removeBusy ? "Chiqarilmoqda…" : "Guruhdan chiqarish"}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}

/** Blank input lines the dialog opens with. */
const INITIAL_ROWS = 3;

function AddMembersDialog({
  segment,
  idempotencyKey,
  onClose,
  onAdded,
}: {
  segment: Segment;
  idempotencyKey: ReturnType<typeof useIdempotencyKey>;
  onClose: () => void;
  onAdded: (segment: Segment) => void;
}) {
  const idBase = useId();
  // One customer id or phone per line; a pasted list is split into lines.
  const [rows, setRows] = useState<string[]>(() => Array.from({ length: INITIAL_ROWS }, () => ""));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);

  const focusRow = (index: number) =>
    window.requestAnimationFrame(() =>
      listRef.current?.querySelectorAll<HTMLInputElement>("input")[index]?.focus(),
    );

  const clearErrors = () => {
    setRowErrors({});
    setError(null);
  };

  const setRow = (index: number, value: string) => {
    clearErrors();
    setRows((current) => current.map((row, i) => (i === index ? value : row)));
  };

  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!/[,;\n\r]/.test(text)) return; // one entry: the browser pastes it
    event.preventDefault();
    const entries = splitMemberList(text);
    if (entries.length === 0) return;
    clearErrors();
    setRows((current) => {
      const before = current.slice(0, index);
      const after = current.slice(index + 1).filter((row) => row.trim() !== "");
      return [...before, ...entries, ...after].slice(0, SEGMENT_MEMBERS_MAX);
    });
    focusRow(Math.min(index + entries.length - 1, SEGMENT_MEMBERS_MAX - 1));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    clearErrors();
    const entries = rows;
    const result = idempotencyKey.settle(
      await runAction((csrf) => addSegmentMembers(segment.id, entries, idempotencyKey.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      // `entries.{i}` → the line that named that id or phone; the rest is the form message.
      const lines: Record<number, string> = {};
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        const match = /^entries\.(\d+)$/.exec(key);
        if (match) lines[Number(match[1])] = message;
      }
      setRowErrors(lines);
      const firstLine = Object.keys(lines)
        .map(Number)
        .sort((a, b) => a - b)[0];
      if (firstLine !== undefined) focusRow(firstLine);
      const rest = partitionFieldErrors(
        result,
        Object.keys(result.fieldErrors ?? {}).filter((key) => key.startsWith("entries.")),
      ).formError;
      setError(rest);
      return;
    }
    onAdded(result.data);
    onClose();
  };

  const errorCount = Object.keys(rowErrors).length;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={`«${segment.name}» guruhiga qo‘shish`}
      description={`Har qatorga bitta mijoz ID raqami yoki telefoni (masalan 5, +998 90 123 45 67 yoki 90 123 45 67). Vergul yoki yangi qator bilan ajratilgan ro‘yxatni joylashtirsangiz, u qatorlarga bo‘linadi. Ko‘pi bilan ${SEGMENT_MEMBERS_MAX} ta.`}
      className="max-w-[520px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-label font-bold text-ink">Mijozlar</legend>
          <ol
            ref={listRef}
            className="m-0 flex max-h-[min(50vh,360px)] list-none flex-col gap-2 overflow-y-auto p-0.5"
          >
            {rows.map((row, index) => {
              const rowError = rowErrors[index];
              const errorId = `${idBase}-row-${index}-error`;
              return (
                <li key={index} className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <TextInput
                      name={`entries.${index}`}
                      aria-label={`${index + 1}-mijoz: ID yoki telefon`}
                      aria-invalid={rowError ? true : undefined}
                      aria-describedby={rowError ? errorId : undefined}
                      placeholder="ID yoki telefon"
                      autoComplete="off"
                      maxLength={64}
                      value={row}
                      onChange={(event) => setRow(index, event.target.value)}
                      onPaste={(event) => onPaste(index, event)}
                      className="font-mono text-[14px]"
                    />
                    <button
                      type="button"
                      aria-label={`${index + 1}-qatorni o‘chirish`}
                      disabled={rows.length === 1}
                      onClick={() => {
                        clearErrors();
                        setRows((current) => current.filter((_, i) => i !== index));
                      }}
                      className={cn(iconButtonClass, "shrink-0 disabled:opacity-40")}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </span>
                  {rowError && (
                    <span id={errorId} className="text-body-sm font-semibold text-danger">
                      {rowError}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {rows.length < SEGMENT_MEMBERS_MAX && (
            <button
              type="button"
              onClick={() => {
                setRows((current) => [...current, ""]);
                focusRow(rows.length);
              }}
              className="inline-flex h-10 items-center gap-2 self-start rounded-md px-2 text-label font-bold text-ink transition-colors duration-150 hover:bg-gold-soft"
            >
              <Icon name="plus" size={18} />
              Yana qator
            </button>
          )}
        </fieldset>
        {(error || errorCount > 0) && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {error ?? `${errorCount} ta qatorni tekshiring.`}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? "Qo‘shilmoqda…" : "Qo‘shish"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
