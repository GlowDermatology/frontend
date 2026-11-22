"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { AppointmentAction } from "@/data/appointments.actions";
import type { DayAppointment } from "@/data/appointments";
import type { Workspace } from "@/data/auth/next-param";
import { CANCEL_REASON_MAX, visitActions, type VisitAction } from "@/domain/appointment";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import type { BoardActions } from "./board-actions";
import { appointmentsCopy } from "./copy";
import { customerName, viaText } from "./labels";
import { STATUS_LOOK } from "./status";

interface VisitPanelProps {
  /** A specialist sees no customer link, no specialist row and the server's allowed actions. */
  workspace: Workspace;
  actions: BoardActions;
  selected: DayAppointment | null;
  /** The selected visit's specialist, as the board knows them. */
  specialistName: string | null;
  /** A status change or a cancellation the server accepted. */
  onChanged: (appointment: DayAppointment) => void;
  onReschedule: (appointment: DayAppointment) => void;
  /** Server render time (ISO): the clock the specialist's actions start from. */
  now: string;
}

const alertBody = "m-0 text-[14px] leading-5 text-ink";

/**
 * The selected visit (DESIGN §B, «visit-panel»): who, what, when and the price snapshot, plus
 * the actions its status allows — confirm / reschedule / reject a request, mark a confirmed visit
 * attended or move it, cancel either — each final step behind a confirmation dialog. Shared by
 * the day and week boards of both workspaces; on the specialist's own board the actions are the
 * server's `allowedActions`, re-narrowed by the clock while the page stays open.
 */
export function VisitPanel({
  workspace,
  actions: board,
  selected,
  specialistName,
  onChanged,
  onReschedule,
  now,
}: VisitPanelProps) {
  const copy = useCopy(appointmentsCopy);
  const t = copy.panel;
  const fmt = useFormat();
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  // ADM-14.1: «Keldi» is final (no action follows it).
  const [attendOpen, setAttendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // One key per pending change; actions run one at a time (`pending` holds the buttons).
  const idempotency = useIdempotencyKey();
  // The cancel dialog's key survives re-opens until a success (contract §1.7).
  const cancelKey = useIdempotencyKey();
  // The specialist's actions depend on whether the visit has started: keep the clock moving.
  const [clock, setClock] = useState(() => Date.parse(now));
  useEffect(() => {
    if (workspace !== "specialist") return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [workspace]);

  const focusVisit = (id: string) =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-appointment-id="${id}"]`)?.focus(),
    );

  const run = (action: AppointmentAction) => {
    if (!selected) return;
    const { id } = selected;
    startTransition(async () => {
      const result = idempotency.settle(
        await runAction((csrf) => board.update(id, action, idempotency.key, csrf)),
      );
      setRejectOpen(false);
      setAttendOpen(false);
      if (!result.ok) {
        toast({ tone: "danger", title: copy.toast.failed, description: result.error });
        return;
      }
      onChanged(result.data);
      // The pressed action button disappears with the new status; keep focus on the visit.
      focusVisit(id);
      const who = `${customerName(copy, result.data.customer.name)} · ${fmt.time(result.data.start)}`;
      toast(
        action === "confirm"
          ? { tone: "success", title: copy.toast.confirmed, description: copy.toast.confirmedBody }
          : action === "reject"
            ? { tone: "success", title: copy.toast.rejected, description: copy.toast.rejectedBody }
            : { tone: "success", title: copy.toast.attended, description: who },
      );
    });
  };

  const confirmCancel = () => {
    if (!selected) return;
    const { id } = selected;
    startTransition(async () => {
      setCancelError(null);
      const result = cancelKey.settle(
        await runAction((csrf) => board.cancel(id, { reason: cancelReason }, cancelKey.key, csrf)),
      );
      if (!result.ok) {
        setCancelError(result.fieldErrors?.reason ?? result.error);
        return;
      }
      setCancelOpen(false);
      setCancelReason("");
      onChanged(result.data);
      focusVisit(id);
      toast({
        tone: "success",
        title: copy.toast.cancelled,
        description: `${customerName(copy, result.data.customer.name)} · ${fmt.time(result.data.start)}`,
      });
    });
  };

  const allowed: ReadonlySet<VisitAction> = selected
    ? visitActions(selected, workspace, clock)
    : new Set();
  const specialistMode = workspace === "specialist";
  const name = selected ? customerName(copy, selected.customer.name) : "";

  return (
    <>
      <Card
        aria-labelledby="appointment-title"
        className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 self-start lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle id="appointment-title" className="text-heading">
            {t.title}
          </CardTitle>
          {selected && (
            <Badge tone={STATUS_LOOK[selected.status].tone}>{copy.status[selected.status]}</Badge>
          )}
        </div>
        {selected ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={name} size={44} className="text-[14px]" />
              <span className="flex min-w-0 flex-col">
                {specialistMode ? (
                  <span className="truncate text-[15px] leading-5 font-bold text-ink">{name}</span>
                ) : (
                  <Link
                    href={`/admin/customers/${selected.customer.id}` as Route}
                    className="truncate text-[15px] leading-5 font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                  >
                    {name}
                  </Link>
                )}
                <span className="text-body-sm text-ink-muted tabular-nums">
                  {fmt.phone(selected.customer.phone)}
                </span>
              </span>
            </div>
            <span aria-hidden="true" className="h-px bg-line" />
            <dl className="m-0 flex flex-col gap-3.5">
              <DetailRow label={t.service} className="leading-5">
                {selected.service} · {fmt.duration(selected.durationMin)}
              </DetailRow>
              {!specialistMode && (
                <DetailRow label={t.specialist} className="leading-5">
                  {specialistName ?? "—"}
                </DetailRow>
              )}
              <DetailRow label={t.clinic} className="leading-5">
                <span className="flex flex-col gap-1">
                  <span>{selected.location.name}</span>
                  <span className="font-normal text-ink-muted">{selected.location.address}</span>
                </span>
              </DetailRow>
              <DetailRow label={t.time} className="leading-5">
                <span className="tabular-nums">
                  {fmt.weekdayShortDateTime(selected.start)}–{fmt.time(selected.end)}
                </span>
              </DetailRow>
              <DetailRow label={t.price} className="leading-5">
                <span className="tabular-nums">
                  {fmt.som(selected.price)} · {t.atBooking}
                </span>
              </DetailRow>
              <DetailRow label={t.payment} className="leading-5">
                <span className="font-normal text-ink-muted">{t.paymentNotSet}</span>
              </DetailRow>
              <DetailRow label={t.request} className="leading-5">
                <span className="tabular-nums">
                  {fmt.dateTimeShort(selected.requestedAt)} · {viaText(copy, selected.requestedVia)}
                </span>
              </DetailRow>
              {selected.customerNote && (
                <DetailRow label={t.customerNote} className="leading-5">
                  <span className="font-normal break-words whitespace-pre-line">
                    {selected.customerNote}
                  </span>
                </DetailRow>
              )}
            </dl>
            {selected.status === "requested" &&
              (allowed.has("confirm") || allowed.has("reschedule") || allowed.has("reject")) && (
                <div className="mt-1 flex flex-col gap-2">
                  {allowed.has("confirm") && (
                    <Button onClick={() => run("confirm")} busy={pending}>
                      <Icon name="check" size={18} />
                      {t.confirm}
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {allowed.has("reschedule") && (
                      <Button
                        variant="outline"
                        busy={pending}
                        onClick={() => onReschedule(selected)}
                      >
                        {t.reschedule}
                      </Button>
                    )}
                    {allowed.has("reject") && (
                      <Button variant="danger" busy={pending} onClick={() => setRejectOpen(true)}>
                        {t.reject}
                      </Button>
                    )}
                  </div>
                  {allowed.has("confirm") && (
                    <p className="m-0 text-caption font-normal text-ink-muted">{t.confirmHint}</p>
                  )}
                </div>
              )}
            {selected.status === "confirmed" &&
              (allowed.has("attend") || allowed.has("reschedule")) && (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {allowed.has("attend") && (
                    <Button variant="outline" busy={pending} onClick={() => setAttendOpen(true)}>
                      {t.attend}
                    </Button>
                  )}
                  {allowed.has("reschedule") && (
                    <Button variant="outline" busy={pending} onClick={() => onReschedule(selected)}>
                      {t.move}
                    </Button>
                  )}
                </div>
              )}
            {allowed.has("cancel") && (
              <Button
                variant="ghost"
                size="sm"
                busy={pending}
                className="self-start text-danger-strong"
                onClick={() => {
                  setCancelError(null);
                  setCancelOpen(true);
                }}
              >
                <Icon name="close" size={16} />
                {t.cancel}
              </Button>
            )}
          </>
        ) : (
          <p className="m-0 flex items-center gap-2 text-body-sm text-ink-muted">
            <Icon name="calendar" size={18} className="shrink-0 text-gold-ink" />
            {t.choose}
          </p>
        )}
      </Card>

      <AlertDialog
        open={attendOpen}
        onOpenChange={(open) => !pending && setAttendOpen(open)}
        title={t.attendTitle}
        description={
          selected && <p className={alertBody}>{t.attendBody(name, fmt.time(selected.start))}</p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" busy={pending}>
              {t.back}
            </Button>
          </AlertDialogCancel>
          <Button busy={pending} onClick={() => run("attend")}>
            {t.attend}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => !pending && setRejectOpen(open)}
        title={t.rejectTitle}
        description={
          selected && <p className={alertBody}>{t.rejectBody(name, fmt.time(selected.start))}</p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" busy={pending}>
              {t.back}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" busy={pending} onClick={() => run("reject")}>
            {t.reject}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => !pending && setCancelOpen(open)}
        title={t.cancelTitle}
        description={
          selected && (
            <p className={alertBody}>
              {t.cancelBody(name, fmt.weekdayShortDateTime(selected.start))}
            </p>
          )
        }
      >
        <Field
          label={t.reason}
          error={cancelError ?? undefined}
          hint={workspace === "specialist" ? t.reasonHint : undefined}
          aside={
            <span className="text-caption text-ink-muted tabular-nums">
              {cancelReason.length} / {CANCEL_REASON_MAX}
            </span>
          }
        >
          {(c) => (
            <TextArea
              {...c}
              rows={2}
              maxLength={CANCEL_REASON_MAX}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          )}
        </Field>
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" busy={pending}>
              {t.back}
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" busy={pending} onClick={confirmCancel}>
            {pending ? t.cancelling : t.cancel}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
