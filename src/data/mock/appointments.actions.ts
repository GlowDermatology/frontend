import { appointmentActions, type AppointmentStatus } from "@/domain/appointment";

import type { AppointmentAction } from "../appointments.actions";
import type { ActionResult } from "../types";
import { APPOINTMENTS, type MockAppointment } from "./appointments";

/**
 * Mock implementation of `src/data/appointments.actions.ts`: the appointment
 * is looked up by id in the fixture week and the transition checked with the
 * domain rule; nothing is persisted or sent.
 */

const NEXT_STATUS: Record<AppointmentAction, AppointmentStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  attend: "attended",
};

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

export async function updateAppointment(
  id: string,
  action: AppointmentAction,
): Promise<ActionResult<MockAppointment>> {
  await delay();
  const appointment = APPOINTMENTS.find((a) => a.id === id);
  if (!appointment) return { ok: false, error: "Qabul topilmadi.", code: "not_found" };
  if (!appointmentActions(appointment.status).includes(action)) {
    return { ok: false, error: "Bu amal ushbu holatda mumkin emas." };
  }
  return { ok: true, data: { ...appointment, status: NEXT_STATUS[action] } };
}
