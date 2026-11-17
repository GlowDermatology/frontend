import { requireStaff } from "@/data/auth";
import {
  defaultAppointmentDay,
  getAppointmentDay,
  getAppointmentRange,
  getBookingMeta,
  getPendingAppointments,
} from "@/data/appointments";
import { requestNow } from "@/data/now";

import type { SearchParams } from "../shared/url-state";
import { AppointmentsView, type BoardData } from "./appointments-view";
import type { BoardSpecialist } from "./board-header";
import { boardRange, parseBoard, type BoardState } from "./query";

/**
 * The appointments page body (DESIGN §B): reads `?view=day|week|month&date=&specialist=`, loads
 * the day (`appointments/?date=`), the week (`appointments/range/?detail=full`) or the month's
 * six-week page (`appointments/range/?detail=counts`), and hands them to the client board.
 */
export async function AppointmentsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const [params, today, meta] = await Promise.all([
    searchParams,
    defaultAppointmentDay(),
    getBookingMeta(),
  ]);
  const parsed = parseBoard(params, today);
  // Only a bookable specialist can be the filter; an unknown id falls back to everyone.
  const board: BoardState = meta.specialists.some((s) => s.id === parsed.specialist)
    ? parsed
    : { ...parsed, specialist: "" };
  const [data, pendingSummary, now] = await Promise.all([
    loadBoard(board),
    getPendingAppointments(),
    requestNow(),
  ]);
  const specialists: BoardSpecialist[] = meta.specialists.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }));

  return (
    <AppointmentsView
      key={`${board.view}:${board.date}:${board.specialist}`}
      board={board}
      today={today}
      data={data}
      specialists={specialists}
      pendingSummary={pendingSummary}
      meta={meta}
      now={now.toISOString()}
    />
  );
}

async function loadBoard(board: BoardState): Promise<BoardData> {
  if (board.view === "day") return { view: "day", day: await getAppointmentDay(board.date) };
  const range = await getAppointmentRange({
    ...boardRange(board.view, board.date),
    detail: board.view === "week" ? "full" : "counts",
    ...(board.specialist ? { specialistId: board.specialist } : {}),
  });
  return board.view === "week"
    ? { view: "week", days: range.days, schedules: range.schedules ?? [] }
    : { view: "month", days: range.days };
}
