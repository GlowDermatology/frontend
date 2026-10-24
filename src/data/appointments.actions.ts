/**
 * Appointment status changes from the admin schedule.
 *
 * Demo mode: checks the transition and returns the updated appointment after
 * a short delay; nothing is persisted or sent. With the API this becomes a
 * Server Action posting to `POST /api/v1/admin/appointments/{id}/{action}/`
 * (the backend sends the customer's push notification).
 */
import { appointmentActions, type Appointment, type AppointmentStatus } from "@/domain/appointment";

import type { ActionResult } from "./types";

export type AppointmentAction = "confirm" | "reject" | "attend";

const NEXT_STATUS: Record<AppointmentAction, AppointmentStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  attend: "attended",
};

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

export async function updateAppointment<T extends Appointment>(
  appointment: T,
  action: AppointmentAction,
): Promise<ActionResult<T>> {
  await delay();
  if (!appointmentActions(appointment.status).includes(action)) {
    return { ok: false, error: "Bu amal ushbu holatda mumkin emas." };
  }
  return { ok: true, data: { ...appointment, status: NEXT_STATUS[action] } };
}
