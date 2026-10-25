"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { addSegmentMembers, removeSegmentMember } from "@/data/segments.actions";
import type { Page } from "@/data/types";
import {
  SEGMENT_MEMBERS_MAX,
  segmentRulesSummary,
  type Segment,
  type SegmentMember,
} from "@/domain/segment";
import {
  formatDayMonthShort,
  formatNumber,
  formatPhone,
  formatSom,
  tashkentParts,
} from "@/lib/format";

import { runAction } from "../shared/action-client";
import { ExportMenu } from "../shared/export-menu";
import { useIdempotencyKey } from "../shared/idempotency";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger";

/** "1.00" → "1 %", "1.50" → "1,5 %" (contract §5 `PCT`); `null` → "—". */
function percentLabel(percent: string | null): string {
  if (percent === null) return "—";
  const trimmed = percent.replace(/\.?0+$/, "").replace(".", ",");
  return `${trimmed} %`;
}

const registered = (iso: string) => `${formatDayMonthShort(iso)} ${tashkentParts(iso).year}`;

/**
 * One group's members (contract §2.8 `segments/{id}/members/`, customer
 * rows): add customers by id or phone (≤500, manual membership), remove a
 * manual member (409 "Mijoz guruhga qoida orqali kiradi." for a rule-only
 * member) and export `guruh-azolari`. Balance and percent stay 0 / "—" until
 * the customers slice lands on the backend.
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
  const [list, setList] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const result = idempotencyKey.settle(
      await runAction((csrf) => addSegmentMembers(segment.id, list, idempotencyKey.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result.fieldErrors?.members ?? result.error);
      return;
    }
    onAdded(result.data);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={`«${segment.name}» guruhiga qo‘shish`}
      description={`Mijoz ID raqamlari yoki telefonlarini vergul, bo‘sh joy yoki yangi qator bilan ajrating (ko‘pi bilan ${SEGMENT_MEMBERS_MAX} ta).`}
      className="max-w-[520px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Mijozlar" error={error ?? undefined} hint="Masalan: 5, 12, +998901234567">
          {(c) => (
            <TextArea
              {...c}
              name="members"
              rows={4}
              value={list}
              onChange={(event) => setList(event.target.value)}
              className="font-mono text-[14px]"
            />
          )}
        </Field>
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
