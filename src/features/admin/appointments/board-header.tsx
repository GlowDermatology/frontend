"use client";

import Link from "next/link";
import type { Route } from "next";

import { Button, buttonStyles } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, type SelectOption } from "@/components/ui/select";
import type { Workspace } from "@/data/auth/next-param";
import type { BookingMeta, Specialist } from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { addDays, isIsoDate, startOfWeek } from "@/lib/datetime";
import type { AdminFormatter } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { appointmentsCopy, type AppointmentsCopy } from "./copy";
import { roleText } from "./labels";
import {
  BOARD_VIEWS,
  boardHref,
  isBoardView,
  noonOf,
  shiftDate,
  showsToday,
  type BoardState,
  type BoardView,
} from "./query";

/** A specialist the filter offers. */
export interface BoardSpecialist {
  id: string;
  name: string;
  role: Specialist["role"];
  isActive?: boolean;
}

/**
 * Why «Qabul qo‘shish» is off, and which page fixes it: staff have no bookable specialist; a
 * specialist's profile is unpublished (`appointments/meta/` lists nobody) or has no active
 * service.
 */
export type AddBlocker = "specialists" | "profile" | "services";

export function addBlockerOf(workspace: Workspace, meta: BookingMeta): AddBlocker | null {
  if (workspace === "admin") return meta.specialists.length > 0 ? null : "specialists";
  if (meta.specialists.length === 0) return "profile";
  return meta.specialists.some((s) => s.services.length > 0) ? null : "services";
}

const ADD_FIX: Record<AddBlocker, Route> = {
  specialists: "/admin/specialists",
  profile: "/admin/my-profile",
  services: "/admin/my-services",
};

interface BoardHeaderProps {
  /** Staff see every specialist and a filter; a specialist only their own board. */
  workspace: Workspace;
  board: BoardState;
  /** The default day (today in api mode, the design day in mock mode). */
  today: string;
  /** Requests still waiting for an answer, and the earliest one's start. */
  pendingCount: number;
  pendingNextAt: string | null;
  specialists: ReadonlyArray<BoardSpecialist>;
  /** Why nothing can be booked (`addBlockerOf`), or `null`. */
  addBlocker: AddBlocker | null;
  onAdd: () => void;
  /** A board navigation is in flight (the switch, the filter, the date jump). */
  navigating: boolean;
  /** Goes to `href`, the board `next` describes (shown in the header before the server answers). */
  navigate: (href: Route, next: BoardState) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The shown period in words: the day, the Monday–Sunday week, or the month. */
export function periodLabel(fmt: AdminFormatter, view: BoardView, date: string): string {
  if (view === "day") return fmt.weekdayDayMonth(noonOf(date));
  if (view === "month") return capitalize(fmt.monthYear(noonOf(date)));
  const from = startOfWeek(date);
  return `${fmt.dayMonthShort(noonOf(from))} – ${fmt.dayMonthShort(noonOf(addDays(from, 6)))}`;
}

const squareLink =
  "flex size-11 shrink-0 items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink";

/**
 * The board's header (DESIGN §B): the pending-requests line and the title, then one toolbar with
 * the period (previous / next, «Bugun», a date jump), the day / week / month switch, the
 * specialist filter (staff only) and «Qabul qo‘shish» (explained and pointed at the page that
 * fixes it when nothing can be booked). Every control is a URL change, so the board stays
 * shareable.
 */
export function BoardHeader({
  workspace,
  board,
  today,
  pendingCount,
  pendingNextAt,
  specialists,
  addBlocker,
  onAdd,
  navigating,
  navigate,
}: BoardHeaderProps) {
  const copy = useCopy(appointmentsCopy);
  const t = copy.header;
  const fmt = useFormat();
  const href = (patch: Partial<BoardState>) => boardHref({ ...board, ...patch }, today, workspace);
  const go = (patch: Partial<BoardState>) => navigate(href(patch), { ...board, ...patch });
  const atToday = showsToday(board.view, board.date, today);
  const period = periodLabel(fmt, board.view, board.date);

  const specialistOptions: Array<SelectOption> = [
    { value: "", label: t.allSpecialists },
    ...specialists.map((specialist) => ({
      value: specialist.id,
      label: specialist.name,
      description: [
        roleText(copy, specialist.role),
        specialist.isActive === false ? copy.inactive : "",
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  ];
  const addFix =
    addBlocker === "profile"
      ? { reason: t.addDisabledProfile, link: t.profileLink }
      : addBlocker === "services"
        ? { reason: t.addDisabledServices, link: t.servicesLink }
        : { reason: t.addDisabled, link: t.specialistsLink };

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <PendingLine copy={copy} count={pendingCount} nextAt={pendingNextAt} fmt={fmt} />
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
            {copy.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          {addBlocker && (
            <Link
              href={ADD_FIX[addBlocker]}
              className="text-body-sm font-semibold text-gold-ink underline decoration-gold/60 underline-offset-4 hover:decoration-gold"
            >
              {addFix.link}
            </Link>
          )}
          <Button onClick={onAdd} disabledReason={addBlocker !== null && addFix.reason}>
            <Icon name="plus" size={18} />
            {t.add}
          </Button>
        </div>
      </div>

      <div
        role="group"
        aria-label={t.toolbar}
        aria-busy={navigating || undefined}
        className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-lg bg-surface-raised p-2.5 shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href({ date: shiftDate(board.view, board.date, -1) })}
            aria-label={t.prev[board.view]}
            className={squareLink}
          >
            <Icon name="chevron-left" size={20} />
          </Link>
          <p
            aria-live="polite"
            className="m-0 flex h-11 min-w-0 items-center gap-2 px-2 text-[15px] leading-5 font-bold text-ink tabular-nums"
          >
            <Icon name="calendar" size={18} className="shrink-0 text-gold-ink" />
            <span className="sr-only">{t.period}: </span>
            <time dateTime={board.date} className="truncate">
              {period}
            </time>
          </p>
          <Link
            href={href({ date: shiftDate(board.view, board.date, 1) })}
            aria-label={t.next[board.view]}
            className={squareLink}
          >
            <Icon name="chevron-right" size={20} />
          </Link>
        </div>

        {atToday ? (
          <Button variant="outline" disabledReason={t.showsToday}>
            {t.today}
          </Button>
        ) : (
          <Link href={href({ date: today })} className={buttonStyles({ variant: "outline" })}>
            {t.today}
          </Link>
        )}

        <DatePicker
          aria-label={t.jumpTo}
          value={board.date}
          commit="settle"
          today={today}
          className="w-[168px]"
          onValueChange={(value) => {
            if (isIsoDate(value) && value !== board.date) go({ date: value });
          }}
        />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SegmentedControl<BoardView>
            label={t.viewSwitch}
            value={board.view}
            onChange={(value) => {
              if (isBoardView(value) && value !== board.view) go({ view: value });
            }}
            options={BOARD_VIEWS.map((view) => ({ value: view, label: t.views[view] }))}
          />
          {workspace === "admin" && (
            <Select
              variant="filter"
              aria-label={t.specialist}
              value={board.specialist}
              options={specialistOptions}
              className="min-w-[200px]"
              onValueChange={(value) => {
                if (value !== board.specialist) go({ specialist: value });
              }}
            />
          )}
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        {navigating ? t.loading : ""}
      </span>
    </header>
  );
}

function PendingLine({
  copy,
  count,
  nextAt,
  fmt,
}: {
  copy: AppointmentsCopy;
  count: number;
  nextAt: string | null;
  fmt: AdminFormatter;
}) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-body-sm tabular-nums",
        count > 0 ? "font-semibold text-ink" : "text-ink-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", count > 0 ? "bg-warning" : "bg-success")}
      />
      {count > 0 ? copy.pending(count) : copy.pendingNone}
      {count > 0 && nextAt && ` · ${copy.pendingNext(fmt.weekdayShortDateTime(nextAt))}`}
    </span>
  );
}
