"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import {
  cancelAppointment,
  updateAppointment,
  type AppointmentAction,
} from "@/data/appointments.actions";
import type { AppointmentDay, DayAppointment, PendingAppointments } from "@/data/appointments";
import {
  CANCEL_REASON_MAX,
  appointmentActions,
  canChangeAppointment,
  type AppointmentStatus,
  type BookingMeta,
  type Specialist,
} from "@/domain/appointment";
import { cn } from "@/lib/cn";
import {
  WEEKDAYS_SHORT,
  formatDateTimeShort,
  formatDayMonthShort,
  formatPhone,
  formatSom,
  formatTime,
  formatWeekdayDayMonth,
  formatWeekdayShortDateTime,
  tashkentParts,
  toLocalIsoDate,
} from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { BookingDialog } from "./booking-dialog";

/** Height of one hour row in the day grid, px (as drawn). */
const HOUR = 88;

const STATUS_LOOK: Record<
  AppointmentStatus,
  { label: string; tone: Tone; box: string; dot: string }
> = {
  requested: {
    label: "Tasdiq kutilmoqda",
    tone: "warning",
    box: "border-[1.5px] border-dashed border-warning bg-warning-soft",
    dot: "bg-warning",
  },
  confirmed: {
    label: "Tasdiqlangan",
    tone: "success",
    box: "border border-transparent bg-success-soft",
    dot: "bg-success",
  },
  rejected: {
    label: "Rad etildi",
    tone: "danger",
    box: "border border-transparent bg-danger-soft",
    dot: "bg-danger",
  },
  attended: {
    label: "Keldi",
    tone: "gold",
    box: "border border-transparent bg-gold-soft",
    dot: "bg-gold",
  },
  cancelled: {
    label: "Bekor qilindi",
    tone: "muted",
    box: "border border-dashed border-line-strong bg-surface opacity-75",
    dot: "bg-ink-muted",
  },
};

/** Cancelled and rejected visits are drawn first, so a new booking in their slot sits on top. */
const DRAW_ORDER: Record<AppointmentStatus, number> = {
  cancelled: 0,
  rejected: 0,
  requested: 1,
  confirmed: 1,
  attended: 1,
};

const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const minutesOfIso = (iso: string) => {
  const p = tashkentParts(iso);
  return p.hours * 60 + p.minutes;
};

interface AppointmentsViewProps {
  day: string;
  specialists: ReadonlyArray<Specialist>;
  appointments: DayAppointment[];
  /** Requests still ahead (`appointments/pending-summary/`), for the header line. */
  pendingSummary: PendingAppointments;
  /** What the booking dialogs offer (`appointments/meta/`). */
  meta: BookingMeta;
  /** Server render time (ISO): today's date and the earliest bookable start. */
  now: string;
  prevHref: Route;
  nextHref: Route;
}

type BookingState = { kind: "create" } | { kind: "reschedule"; appointment: DayAppointment } | null;

const requestedCount = (list: ReadonlyArray<DayAppointment>) =>
  list.filter((a) => a.status === "requested").length;

export function AppointmentsView({
  day,
  specialists,
  appointments: initial,
  pendingSummary,
  meta,
  now,
  prevHref,
  nextHref,
}: AppointmentsViewProps) {
  const toast = useToast();
  // The server's day replaces the local copy whenever a newer one arrives
  // (the route refresh after an api-mode action, or a navigation back to the
  // kept-mounted route); actions update the local copy from their answer so
  // mock mode, which persists nothing, shows the change too.
  const [source, setSource] = useState(initial);
  const [appointments, setAppointments] = useState(initial);
  if (initial !== source) {
    setSource(initial);
    setAppointments(initial);
  }
  const [selectedId, setSelectedId] = useState(
    () => (initial.find((a) => a.status === "requested") ?? initial[0])?.id ?? null,
  );
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingState>(null);
  // Mounts a fresh booking dialog (and form) for every opening.
  const [bookingInstance, setBookingInstance] = useState(0);
  const [pending, startTransition] = useTransition();
  // One key per pending change; actions run one at a time (`pending` disables the buttons).
  const idempotency = useIdempotencyKey();
  // The dialogs' keys survive re-opens until a success (contract §1.7).
  const createKey = useIdempotencyKey();
  const rescheduleKey = useIdempotencyKey();
  const cancelKey = useIdempotencyKey();
  const dayData: AppointmentDay = { date: day, specialists, appointments };

  const openBooking = (state: Exclude<BookingState, null>) => {
    setBookingInstance((current) => current + 1);
    setBooking(state);
  };

  const dayStart = Math.min(...specialists.map((s) => minutesOf(s.workingHours.start)), 9 * 60);
  const dayEnd = Math.max(...specialists.map((s) => minutesOf(s.workingHours.end)), 18 * 60);
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 }, (_, i) => dayStart / 60 + i);
  const top = (minutes: number) => ((minutes - dayStart) * HOUR) / 60 + 2;
  const height = (from: number, to: number) => Math.max(40, ((to - from) * HOUR) / 60 - 4);

  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  // The server's count of requests still ahead, adjusted by what this board
  // changed locally since the server answered (0 once the refresh lands).
  const pendingCount = Math.max(
    0,
    pendingSummary.count + requestedCount(appointments) - requestedCount(source),
  );
  const specialistOf = (id: string) => specialists.find((s) => s.id === id);

  const focusVisit = (id: string) =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-appointment-id="${id}"]`)?.focus(),
    );

  const onBooked = (appointment: DayAppointment, kind: "create" | "reschedule") => {
    const sameDay = toLocalIsoDate(appointment.start) === day;
    setAppointments((current) => {
      const others = current.filter((a) => a.id !== appointment.id);
      return sameDay ? [...others, appointment] : others;
    });
    if (sameDay) {
      setSelectedId(appointment.id);
      focusVisit(appointment.id);
    }
    const when = formatWeekdayShortDateTime(appointment.start);
    toast(
      kind === "create"
        ? { title: "Qabul yozildi", description: `${appointment.customer.name} · ${when}` }
        : { title: "Qabul ko‘chirildi", description: `${appointment.customer.name} · ${when}` },
    );
  };

  const confirmCancel = () => {
    if (!selected) return;
    const { id } = selected;
    startTransition(async () => {
      setCancelError(null);
      const result = cancelKey.settle(
        await runAction((csrf) =>
          cancelAppointment(id, { reason: cancelReason }, cancelKey.key, csrf),
        ),
      );
      if (!result.ok) {
        setCancelError(result.fieldErrors?.reason ?? result.error);
        return;
      }
      setCancelOpen(false);
      setCancelReason("");
      setAppointments((current) => current.map((a) => (a.id === result.data.id ? result.data : a)));
      focusVisit(id);
      toast({
        title: "Qabul bekor qilindi",
        description: `${result.data.customer.name} · ${formatTime(result.data.start)}`,
      });
    });
  };

  const run = (action: AppointmentAction) => {
    if (!selected) return;
    const { id } = selected;
    startTransition(async () => {
      const result = idempotency.settle(
        await runAction((csrf) => updateAppointment(id, action, idempotency.key, csrf)),
      );
      setRejectOpen(false);
      if (!result.ok) {
        toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
        return;
      }
      setAppointments((current) => current.map((a) => (a.id === result.data.id ? result.data : a)));
      // The pressed action button disappears with the new status; keep focus on the visit.
      focusVisit(id);
      toast(
        action === "confirm"
          ? { title: "Qabul tasdiqlandi", description: "Mijozga push yuborildi" }
          : action === "reject"
            ? { title: "Qabul rad etildi", description: "Mijozga xabar yuborildi" }
            : {
                title: "Keldi deb belgilandi",
                description: `${result.data.customer.name} · ${formatTime(result.data.start)}`,
              },
      );
    });
  };

  const actions = selected ? appointmentActions(selected.status) : [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-muted tabular-nums" aria-live="polite">
            {pendingCount > 0
              ? `${pendingCount} ta so‘rov tasdiq kutmoqda`
              : "Barcha so‘rovlar ko‘rib chiqildi"}
            {pendingCount > 0 &&
              pendingSummary.nextAt &&
              pendingSummary.count === pendingCount &&
              ` · eng yaqini ${formatWeekdayShortDateTime(pendingSummary.nextAt)}`}
          </span>
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
            Qabullar
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={prevHref}
            aria-label="Oldingi kun"
            className="flex size-11 items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface"
          >
            <Icon name="chevron-left" size={20} />
          </Link>
          <span className="flex h-11 items-center gap-2 rounded-md border border-line bg-surface-raised px-4 text-[14px] font-bold text-ink tabular-nums">
            <Icon name="calendar" size={18} className="text-gold-ink" />
            <time dateTime={day}>{formatWeekdayDayMonth(`${day}T12:00:00+05:00`)}</time>
          </span>
          <Link
            href={nextHref}
            aria-label="Keyingi kun"
            className="flex size-11 items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface"
          >
            <Icon name="chevron-right" size={20} />
          </Link>
          <SegmentedControl<"day" | "week">
            label="Ko‘rinish"
            size="sm"
            value="day"
            onChange={() => undefined}
            options={[
              { value: "day", label: "Kun" },
              {
                value: "week",
                label: "Hafta",
                disabled: true,
                title: "Haftalik ko‘rinish keyingi bosqichda qo‘shiladi",
              },
            ]}
          />
          <Button
            onClick={() => openBooking({ kind: "create" })}
            disabled={meta.specialists.length === 0}
          >
            <Icon name="plus" size={18} />
            Qabul qo‘shish
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-label="Kunlik jadval"
          className="min-w-0 flex-[3_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <ul className="m-0 flex list-none flex-wrap gap-4 border-b border-line px-5 py-3.5 text-caption font-semibold text-ink">
            {(["requested", "confirmed", "rejected"] as const).map((status) => (
              <li key={status} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 rounded-full", STATUS_LOOK[status].dot)}
                />
                {status === "rejected" ? "Rad etilgan" : STATUS_LOOK[status].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-3.5 rounded-[3px] border border-line hatch"
              />
              Bo‘sh emas
            </li>
          </ul>

          <ScrollRegion label="Kunlik jadval">
            <div className="min-w-[720px]">
              <div
                className="grid border-b border-line"
                style={{
                  gridTemplateColumns: `64px repeat(${specialists.length}, minmax(0, 1fr))`,
                }}
              >
                <span />
                {specialists.map((specialist) => (
                  <span
                    key={specialist.id}
                    className="flex items-center gap-2.5 border-l border-line p-3"
                  >
                    <Avatar name={specialist.name} size={32} className="text-[12px]" />
                    <span className="flex flex-col">
                      <span className="text-body-sm font-bold text-ink">{specialist.name}</span>
                      <span className="text-caption font-normal text-ink-muted">
                        {specialist.role}
                      </span>
                    </span>
                  </span>
                ))}
              </div>

              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `64px repeat(${specialists.length}, minmax(0, 1fr))`,
                  height: hours.length * HOUR,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--gd-line) 0 1px, transparent 1px ${HOUR}px)`,
                }}
              >
                <div
                  aria-hidden="true"
                  className="relative text-[11px] leading-[14px] text-ink-muted tabular-nums"
                >
                  {hours.map((hour, index) => (
                    <span
                      key={hour}
                      className="absolute right-2.5"
                      style={{ top: index * HOUR + 4 }}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>

                {specialists.map((specialist) => (
                  <ol
                    key={specialist.id}
                    aria-label={`${specialist.name} jadvali`}
                    className="relative m-0 list-none border-l border-line p-0"
                  >
                    {specialist.blocks.map((block) => {
                      const from = minutesOf(block.start);
                      const to = minutesOf(block.end);
                      const tall = to - from >= 45;
                      return (
                        <li
                          key={block.start}
                          className={cn(
                            "absolute right-1.5 left-1.5 flex rounded-sm border border-line hatch px-2.5 text-caption font-semibold text-ink-muted",
                            tall ? "items-start py-2" : "items-center py-1",
                          )}
                          style={{ top: top(from), height: height(from, to) }}
                        >
                          {block.label}
                          <span className="sr-only">
                            , {block.start}–{block.end}
                          </span>
                        </li>
                      );
                    })}
                    {appointments
                      .filter((a) => a.specialistId === specialist.id)
                      .sort((a, b) => DRAW_ORDER[a.status] - DRAW_ORDER[b.status])
                      .map((appointment) => {
                        const from = minutesOfIso(appointment.start);
                        const to = minutesOfIso(appointment.end);
                        const tall = to - from >= 45;
                        const look = STATUS_LOOK[appointment.status];
                        const isSelected = appointment.id === selectedId;
                        return (
                          <li key={appointment.id}>
                            <button
                              type="button"
                              data-appointment-id={appointment.id}
                              onClick={() => setSelectedId(appointment.id)}
                              aria-pressed={isSelected}
                              aria-label={`${formatTime(appointment.start)}–${formatTime(appointment.end)} ${appointment.customer.name}, ${appointment.serviceShort}, ${look.label.toLowerCase()}`}
                              className={cn(
                                "absolute right-1.5 left-1.5 flex gap-2 rounded-sm px-2.5 text-left text-ink transition-shadow duration-150",
                                tall ? "items-start py-2" : "items-center py-1",
                                look.box,
                                isSelected &&
                                  "shadow-[0_0_0_2px_var(--gd-surface-raised),0_0_0_4px_var(--gd-gold-ink)]",
                              )}
                              style={{ top: top(from), height: height(from, to) }}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "size-2 shrink-0 rounded-full",
                                  look.dot,
                                  tall && "mt-1",
                                )}
                              />
                              <span className="flex min-w-0 flex-col">
                                {tall ? (
                                  <>
                                    <span className="text-caption font-bold tabular-nums">
                                      {formatTime(appointment.start)}–{formatTime(appointment.end)}
                                    </span>
                                    <span className="text-caption font-bold">
                                      {appointment.customer.name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="truncate text-caption font-bold tabular-nums">
                                    {formatTime(appointment.start)} · {appointment.customer.name}
                                  </span>
                                )}
                                <span className="truncate text-[11px] leading-[14px] text-ink-muted">
                                  {appointment.serviceShort}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                  </ol>
                ))}
              </div>
            </div>
          </ScrollRegion>
          {appointments.length === 0 && (
            <p className="m-0 border-t border-line px-5 py-3.5 text-body-sm text-ink-muted">
              Bu kunga qabullar yo‘q.
            </p>
          )}
        </section>

        <Card
          aria-labelledby="appointment-title"
          className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle id="appointment-title" className="text-heading">
              Qabul
            </CardTitle>
            {selected && (
              <Badge tone={STATUS_LOOK[selected.status].tone}>
                {STATUS_LOOK[selected.status].label}
              </Badge>
            )}
          </div>
          {selected ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={selected.customer.name} size={44} className="text-[14px]" />
                <span className="flex flex-col">
                  <Link
                    href={`/admin/customers/${selected.customer.id}` as Route}
                    className="text-[15px] leading-5 font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                  >
                    {selected.customer.name}
                  </Link>
                  <span className="text-body-sm text-ink-muted tabular-nums">
                    {formatPhone(selected.customer.phone)}
                  </span>
                </span>
              </div>
              <span aria-hidden="true" className="h-px bg-line" />
              <dl className="m-0 flex flex-col gap-3.5">
                <DetailRow label="Xizmat" className="leading-5">
                  {selected.service} · {selected.durationMin} daqiqa
                </DetailRow>
                <DetailRow label="Mutaxassis" className="leading-5">
                  {specialistOf(selected.specialistId)?.name ?? "—"}
                </DetailRow>
                <DetailRow label="Vaqt" className="leading-5">
                  <span className="tabular-nums">
                    {WEEKDAYS_SHORT[tashkentParts(selected.start).weekday]},{" "}
                    {formatDayMonthShort(selected.start)} · {formatTime(selected.start)}–
                    {formatTime(selected.end)}
                  </span>
                </DetailRow>
                <DetailRow label="Narx" className="leading-5">
                  <span className="tabular-nums">{formatSom(selected.price)} · bron paytidagi</span>
                </DetailRow>
                <DetailRow label="To‘lov" className="leading-5">
                  <span className="font-normal text-ink-muted">Qoida hali belgilanmagan</span>
                </DetailRow>
                <DetailRow label="So‘rov" className="leading-5">
                  <span className="tabular-nums">
                    {formatDateTimeShort(selected.requestedAt)} · {selected.requestedVia}
                  </span>
                </DetailRow>
              </dl>
              {actions.includes("confirm") && (
                <div className="mt-1 flex flex-col gap-2">
                  <Button onClick={() => run("confirm")} disabled={pending} aria-busy={pending}>
                    <Icon name="check" size={18} />
                    Tasdiqlash
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => openBooking({ kind: "reschedule", appointment: selected })}
                    >
                      Vaqtni o‘zgartirish
                    </Button>
                    <Button variant="danger" disabled={pending} onClick={() => setRejectOpen(true)}>
                      Rad etish
                    </Button>
                  </div>
                  <p className="m-0 text-caption font-normal text-ink-muted">
                    Tasdiqlangach mijozga push yuboriladi.
                  </p>
                </div>
              )}
              {actions.includes("attend") && (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Button variant="outline" disabled={pending} onClick={() => run("attend")}>
                    Keldi deb belgilash
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => openBooking({ kind: "reschedule", appointment: selected })}
                  >
                    Ko‘chirish
                  </Button>
                </div>
              )}
              {canChangeAppointment(selected.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="self-start text-danger-strong"
                  onClick={() => {
                    setCancelError(null);
                    setCancelOpen(true);
                  }}
                >
                  <Icon name="close" size={16} />
                  Qabulni bekor qilish
                </Button>
              )}
            </>
          ) : (
            <p className="m-0 text-body-sm text-ink-muted">Jadvaldan qabulni tanlang.</p>
          )}
        </Card>
      </div>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => !pending && setRejectOpen(open)}
        title="Qabulni rad etasizmi?"
        description={
          selected && (
            <p className="m-0 text-[14px] leading-5 text-ink">
              {selected.customer.name}ning {formatTime(selected.start)} dagi qabuli rad etiladi va
              mijozga xabar yuboriladi.
            </p>
          )
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending}
            onClick={() => run("reject")}
          >
            Rad etish
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => !pending && setCancelOpen(open)}
        title="Qabulni bekor qilasizmi?"
        description={
          selected && (
            <p className="m-0 text-[14px] leading-5 text-ink">
              {selected.customer.name}ning {formatWeekdayShortDateTime(selected.start)} dagi qabuli
              bekor qilinadi, vaqt bo‘shaydi va mijozga xabar yuboriladi.
            </p>
          )
        }
      >
        <Field
          label="Sabab (ixtiyoriy)"
          error={cancelError ?? undefined}
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
          <AlertDialogCancel disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending}
            onClick={confirmCancel}
          >
            {pending ? "Bekor qilinmoqda…" : "Qabulni bekor qilish"}
          </Button>
        </div>
      </AlertDialog>

      {booking && (
        <BookingDialog
          key={bookingInstance}
          open
          onOpenChange={(open) => {
            if (!open) setBooking(null);
          }}
          mode={booking}
          meta={meta}
          day={dayData}
          now={now}
          idempotency={booking.kind === "create" ? createKey : rescheduleKey}
          onSaved={(appointment) => onBooked(appointment, booking.kind)}
        />
      )}
    </>
  );
}
