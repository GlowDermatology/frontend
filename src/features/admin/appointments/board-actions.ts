import {
  cancelAppointment,
  createAppointment,
  loadAppointmentDay,
  rescheduleAppointment,
  updateAppointment,
  type AppointmentAction,
} from "@/data/appointments.actions";
import type { AppointmentDay, DayAppointment } from "@/data/appointments";
import type {
  CancelAppointmentValues,
  CreateAppointmentValues,
  RescheduleAppointmentValues,
} from "@/data/appointments.schema";
import type { ActionResult } from "@/data/types";

/**
 * The writes and the one read of the appointments board (`VisitPanel`, `BookingDialog`). The
 * board never names a route: staff bind it to `appointments/…`, the specialist's own workspace
 * to `specialist/appointments/…`. Every write takes an Idempotency-Key (one per user intent)
 * and the CSRF token.
 *
 * The page (a Server Component) hands the set to the client board, so every member must be a
 * Server Action itself — a closure would not cross the server/client boundary. The specialist's
 * set therefore keeps the same signatures (its `reschedule` ignores the baseline specialist).
 */
export interface BoardActions {
  /** Confirm, reject or attend (`{id}/{action}/`). */
  update(
    id: string,
    action: AppointmentAction,
    key: string,
    csrf: string,
  ): Promise<ActionResult<DayAppointment>>;
  cancel(
    id: string,
    values: CancelAppointmentValues,
    key: string,
    csrf: string,
  ): Promise<ActionResult<DayAppointment>>;
  /** A confirmed booking by phone; `name` creates the customer of an unknown phone. */
  create(
    values: CreateAppointmentValues,
    key: string,
    csrf: string,
  ): Promise<ActionResult<DayAppointment>>;
  /** `baselineSpecialistId`: the visit's specialist when the dialog opened. */
  reschedule(
    id: string,
    values: RescheduleAppointmentValues,
    baselineSpecialistId: string,
    key: string,
    csrf: string,
  ): Promise<ActionResult<DayAppointment>>;
  /** Another day's schedule for the booking dialog's time list (a read: no key). */
  loadDay(date: string, csrf: string): Promise<ActionResult<AppointmentDay>>;
}

/** Staff on `/admin/appointments`. */
export const STAFF_BOARD_ACTIONS: BoardActions = {
  update: updateAppointment,
  cancel: cancelAppointment,
  create: createAppointment,
  reschedule: rescheduleAppointment,
  loadDay: loadAppointmentDay,
};
