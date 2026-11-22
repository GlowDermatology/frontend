"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useOptimistic, useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import type {
  AppointmentDay,
  AppointmentRangeDay,
  DayAppointment,
  PendingAppointments,
} from "@/data/appointments";
import type { Workspace } from "@/data/auth/next-param";
import type { BookingMeta } from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { useIdempotencyKey } from "../shared/idempotency";
import type { BoardActions } from "./board-actions";
import { BoardHeader, addBlockerOf, type BoardSpecialist } from "./board-header";
import { BookingDialog } from "./booking-dialog";
import { appointmentsCopy } from "./copy";
import { DayGrid } from "./day-grid";
import { customerName } from "./labels";
import { MonthGrid } from "./month-grid";
import { boardRange, dayHref, type BoardState } from "./query";
import { VisitPanel } from "./visit-panel";
import { WeekGrid } from "./week-grid";

/** What the server loaded for the shown view. */
export type BoardData =
  | { view: "day"; day: AppointmentDay }
  | {
      view: "week";
      days: ReadonlyArray<AppointmentRangeDay>;
      schedules: ReadonlyArray<AppointmentDay>;
    }
  | { view: "month"; days: ReadonlyArray<AppointmentRangeDay> };

interface AppointmentsViewProps {
  /** Staff's board of every specialist, or a specialist's own. */
  workspace: Workspace;
  /** The board's writes for that workspace (Server Actions only: they cross from the page). */
  actions: BoardActions;
  board: BoardState;
  /** The default day (today in api mode, the design day in mock mode). */
  today: string;
  data: BoardData;
  /** Specialists the filter offers. */
  specialists: ReadonlyArray<BoardSpecialist>;
  /** Requests still ahead (`appointments/pending-summary/`), for the header line. */
  pendingSummary: PendingAppointments;
  /** What the booking dialogs offer (`appointments/meta/`). */
  meta: BookingMeta;
  /** Server render time (ISO): the now-line and the earliest bookable start. */
  now: string;
}

type BookingState = { kind: "create" } | { kind: "reschedule"; appointment: DayAppointment } | null;

const requestedCount = (list: ReadonlyArray<DayAppointment>) =>
  list.filter((a) => a.status === "requested").length;

function visitsOf(data: BoardData): DayAppointment[] {
  if (data.view === "day") return data.day.appointments;
  if (data.view === "week") return data.schedules.flatMap((day) => day.appointments);
  return [];
}

/**
 * The appointments board (DESIGN §B): the header, then the day, week or month grid and — for the
 * day and week — the selected visit's panel, plus the booking dialog. It keeps a local copy of
 * the shown visits so an action's answer shows at once (mock mode persists nothing); a newer
 * server answer (the refresh after an api-mode action) replaces it.
 */
export function AppointmentsView({
  workspace,
  actions,
  board,
  today,
  data,
  specialists,
  pendingSummary,
  meta,
  now,
}: AppointmentsViewProps) {
  const copy = useCopy(appointmentsCopy);
  const fmt = useFormat();
  const toast = useToast();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const initial = visitsOf(data);
  const [source, setSource] = useState(data);
  const [appointments, setAppointments] = useState(initial);
  if (data !== source) {
    setSource(data);
    setAppointments(initial);
  }
  const [selectedId, setSelectedId] = useState(
    () => (initial.find((a) => a.status === "requested") ?? initial[0])?.id ?? null,
  );
  const [booking, setBooking] = useState<BookingState>(null);
  // Mounts a fresh booking dialog (and form) for every opening.
  const [bookingInstance, setBookingInstance] = useState(0);
  // The dialogs' keys survive re-opens until a success (contract §1.7).
  const createKey = useIdempotencyKey();
  const rescheduleKey = useIdempotencyKey();

  const range = boardRange(board.view, board.date);
  const filter = (list: ReadonlyArray<DayAppointment>) =>
    board.specialist ? list.filter((a) => a.specialistId === board.specialist) : [...list];
  const shown = filter(appointments);
  const selected = shown.find((a) => a.id === selectedId) ?? null;
  // The server's count of requests still ahead, adjusted by what this board changed locally
  // since the server answered (0 once the refresh lands).
  const pendingCount = Math.max(
    0,
    pendingSummary.count + requestedCount(appointments) - requestedCount(initial),
  );

  const scheduleSpecialists =
    data.view === "day"
      ? data.day.specialists
      : data.view === "week"
        ? data.schedules.flatMap((day) => day.specialists)
        : [];
  const specialistName = (id: string) =>
    scheduleSpecialists.find((s) => s.id === id)?.name ??
    specialists.find((s) => s.id === id)?.name ??
    null;

  // The header shows the chosen view / date / specialist at once (the segmented switch, the
  // Select and the date picker are controlled by `board`); the grid follows when the server
  // answers the navigation.
  const [shownBoard, showBoard] = useOptimistic(board);
  const navigate = (href: Route, next: BoardState) =>
    startNavigation(() => {
      showBoard(next);
      router.push(href, { scroll: false });
    });

  const openBooking = (state: Exclude<BookingState, null>) => {
    setBookingInstance((current) => current + 1);
    setBooking(state);
  };

  const focusVisit = (id: string) =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-appointment-id="${id}"]`)?.focus(),
    );

  const replace = (appointment: DayAppointment) =>
    setAppointments((current) => current.map((a) => (a.id === appointment.id ? appointment : a)));

  const onBooked = (appointment: DayAppointment, kind: "create" | "reschedule") => {
    const date = toLocalIsoDate(appointment.start);
    const visible =
      data.view !== "month" &&
      date >= range.from &&
      date <= range.to &&
      (!board.specialist || appointment.specialistId === board.specialist);
    setAppointments((current) => {
      const others = current.filter((a) => a.id !== appointment.id);
      return visible ? [...others, appointment] : others;
    });
    if (visible) {
      setSelectedId(appointment.id);
      focusVisit(appointment.id);
    }
    toast({
      tone: "success",
      title: kind === "create" ? copy.toast.booked : copy.toast.moved,
      description: `${customerName(copy, appointment.customer.name)} · ${fmt.weekdayShortDateTime(appointment.start)}`,
      ...(visible
        ? {}
        : {
            action: {
              label: copy.toast.showDay,
              href: dayHref(date, today, board.specialist, workspace),
            },
          }),
    });
  };

  // The dialog's schedule of the anchor day, when the board holds it whole (else it loads it).
  const dialogDay: AppointmentDay | null =
    data.view === "day"
      ? { ...data.day, appointments }
      : data.view === "week" && !board.specialist
        ? (() => {
            const day = data.schedules.find((s) => s.date === board.date);
            return day
              ? {
                  ...day,
                  appointments: appointments.filter((a) => toLocalIsoDate(a.start) === board.date),
                }
              : null;
          })()
        : null;

  const dayColumns =
    data.view === "day"
      ? board.specialist
        ? data.day.specialists.filter((s) => s.id === board.specialist)
        : data.day.specialists
      : [];

  return (
    <>
      <BoardHeader
        workspace={workspace}
        board={shownBoard}
        today={today}
        pendingCount={pendingCount}
        pendingNextAt={
          pendingCount > 0 && pendingSummary.count === pendingCount ? pendingSummary.nextAt : null
        }
        specialists={specialists}
        addBlocker={addBlockerOf(workspace, meta)}
        onAdd={() => openBooking({ kind: "create" })}
        navigating={navigating}
        navigate={navigate}
      />

      <div
        aria-busy={navigating || undefined}
        className={cn(
          "flex flex-wrap items-start gap-4 motion-safe:transition-opacity motion-safe:duration-200",
          navigating && "opacity-60",
        )}
      >
        {data.view === "day" && (
          <DayGrid
            date={board.date}
            specialists={dayColumns}
            appointments={shown}
            selectedId={selectedId}
            onSelect={setSelectedId}
            now={now}
          />
        )}
        {data.view === "week" && (
          <WeekGrid
            days={data.days}
            schedules={data.schedules}
            appointments={shown}
            selectedId={selectedId}
            onSelect={setSelectedId}
            now={now}
            today={today}
            specialist={board.specialist}
            workspace={workspace}
          />
        )}
        {data.view === "month" && (
          <MonthGrid
            date={board.date}
            days={data.days}
            today={today}
            specialist={board.specialist}
            workspace={workspace}
          />
        )}
        {data.view !== "month" && (
          <VisitPanel
            workspace={workspace}
            actions={actions}
            selected={selected}
            specialistName={selected ? specialistName(selected.specialistId) : null}
            onChanged={replace}
            onReschedule={(appointment) => openBooking({ kind: "reschedule", appointment })}
            now={now}
          />
        )}
      </div>

      {booking && (
        <BookingDialog
          key={bookingInstance}
          workspace={workspace}
          actions={actions}
          open
          onOpenChange={(open) => {
            if (!open) setBooking(null);
          }}
          mode={booking}
          meta={meta}
          date={board.date}
          day={dialogDay}
          defaultSpecialistId={board.specialist}
          now={now}
          idempotency={booking.kind === "create" ? createKey : rescheduleKey}
          onSaved={(appointment) => onBooked(appointment, booking.kind)}
        />
      )}
    </>
  );
}
