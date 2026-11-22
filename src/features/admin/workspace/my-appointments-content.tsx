import { requireSpecialist } from "@/data/auth";
import { requestNow } from "@/data/now";
import {
  getMyAppointmentDay,
  getMyAppointmentRange,
  getMyBookingMeta,
  getMyPendingSummary,
  getMyProfile,
} from "@/data/specialist";
import { SPECIALIST_ROLE_LABEL } from "@/domain/clinic";
import { toLocalIsoDate } from "@/lib/format";
import { copyFor } from "@/lib/i18n/admin-locale";

import { AppointmentsView, type BoardData } from "../appointments/appointments-view";
import { SPECIALIST_BOARD_ACTIONS } from "../appointments/board-actions";
import type { BoardSpecialist } from "../appointments/board-header";
import { boardRange, parseBoard, type BoardState } from "../appointments/query";
import type { SearchParams } from "../shared/url-state";
import { shellCopy } from "../shell/copy";
import { specialistRead, WorkspaceUnavailable } from "./unavailable";

/**
 * `/admin/my-appointments`: the admin appointments board on the signed-in specialist's own visits
 * (`specialist/appointments/…`): day, week and month, the visit actions the server allows, and
 * phone or walk-in bookings once the profile is published. The board never shows a customer's
 * e-mail or a staff note (the API sends neither).
 */
export async function MyAppointmentsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await requireSpecialist();
  const [params, now] = await Promise.all([searchParams, requestNow()]);
  const today = toLocalIsoDate(now);
  // The board is always the caller's own: no specialist filter.
  const board: BoardState = { ...parseBoard(params, today), specialist: "" };
  const read = await specialistRead(() =>
    Promise.all([
      getMyProfile(token),
      loadMyBoard(token, board),
      getMyBookingMeta(token),
      getMyPendingSummary(token),
    ]),
  );
  if (!read.ok) {
    const title = (await copyFor(shellCopy)).specialistNav["my-appointments"];
    return (
      <WorkspaceUnavailable title={title} status={read.status} retry="/admin/my-appointments" />
    );
  }
  const [{ profile }, data, meta, pendingSummary] = read.data;
  const self: BoardSpecialist = {
    id: profile.id,
    name: profile.name || profile.account?.displayName || profile.id,
    // The board shows the Uzbek role label (a draft may have none yet).
    role: (profile.role ? SPECIALIST_ROLE_LABEL[profile.role] : "") as BoardSpecialist["role"],
    ...(profile.isActive ? {} : { isActive: false }),
  };
  return (
    <AppointmentsView
      key={`${board.view}:${board.date}`}
      workspace="specialist"
      actions={SPECIALIST_BOARD_ACTIONS}
      board={board}
      today={today}
      data={data}
      specialists={[self]}
      pendingSummary={pendingSummary}
      meta={meta}
      now={now.toISOString()}
    />
  );
}

async function loadMyBoard(token: string, board: BoardState): Promise<BoardData> {
  if (board.view === "day") {
    return { view: "day", day: await getMyAppointmentDay(token, board.date) };
  }
  const range = await getMyAppointmentRange(token, {
    ...boardRange(board.view, board.date),
    detail: board.view === "week" ? "full" : "counts",
  });
  return board.view === "week"
    ? { view: "week", days: range.days, schedules: range.schedules ?? [] }
    : { view: "month", days: range.days };
}
