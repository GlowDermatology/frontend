import { optionalRead } from "@/data/api/optional-read";
import { requireStaff } from "@/data/auth";
import {
  defaultAppointmentDay,
  getAppointmentDay,
  getAppointmentRange,
  getBookingMeta,
  getPendingAppointments,
} from "@/data/appointments";
import { getSpecialist } from "@/data/clinic";
import { requestNow } from "@/data/now";
import { SPECIALIST_ROLE_LABEL } from "@/domain/clinic";

import type { SearchParams } from "../shared/url-state";
import { AppointmentsView, type BoardData } from "./appointments-view";
import { STAFF_BOARD_ACTIONS } from "./board-actions";
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
  // A bookable specialist can be the filter; so can a paused (unpublished) profile, e.g. the
  // visits left after its account was changed to Staff. An unknown id falls back to everyone.
  const paused =
    parsed.specialist && !meta.specialists.some((s) => s.id === parsed.specialist)
      ? await optionalRead("paused specialist filter", () => getSpecialist(parsed.specialist), null)
      : null;
  const board: BoardState =
    meta.specialists.some((s) => s.id === parsed.specialist) || paused
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
  if (paused) {
    specialists.push({
      id: paused.id,
      name: paused.name || paused.account?.displayName || paused.id,
      // The board shows the Uzbek role label (a draft may have none yet).
      role: (paused.role ? SPECIALIST_ROLE_LABEL[paused.role] : "") as BoardSpecialist["role"],
      isActive: false,
    });
  }

  return (
    <AppointmentsView
      key={`${board.view}:${board.date}:${board.specialist}`}
      workspace="admin"
      actions={STAFF_BOARD_ACTIONS}
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
