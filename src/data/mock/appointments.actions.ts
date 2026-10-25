import {
  appointmentActions,
  bookingProblem,
  canChangeAppointment,
  minutesOfDay,
  specialistSchedule,
  tashkentStart,
  type AppointmentStatus,
} from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

import type { DayAppointment } from "../appointments";
import type { AppointmentAction } from "../appointments.actions";
import type { CreateAppointmentValues, RescheduleAppointmentValues } from "../appointments.schema";
import { referenceNow } from "../config";
import type { ActionFailure, ActionResult } from "../types";
import { delay } from "./delay";
import { APPOINTMENTS, BOOKING_META, SPECIALISTS, type MockAppointment } from "./appointments";
import { CUSTOMERS } from "./people";

/**
 * Mock implementation of `src/data/appointments.actions.ts`: the appointment
 * is looked up by id in the fixture week and the change checked with the
 * domain rules and the backend's own field codes and messages (contract §2.9),
 * so the dialogs behave offline as they do against Django; nothing is
 * persisted or sent.
 */

const NEXT_STATUS: Record<AppointmentAction, AppointmentStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  attend: "attended",
};

const INVALID_TRANSITION: ActionFailure = {
  ok: false,
  error: "Bu amal ushbu holatda mumkin emas.",
  code: "invalid_transition",
};
const NOT_FOUND: ActionFailure = { ok: false, error: "Qabul topilmadi.", code: "not_found" };

const fieldError = (field: string, message: string): ActionFailure => ({
  ok: false,
  error: "Maydonlarni tekshiring.",
  code: "validation_error",
  fieldErrors: { [field]: message },
});

const START_MESSAGES = {
  invalid_step: "Vaqt 5 daqiqalik qadamda bo‘lsin.",
  in_past: "Kelajakdagi vaqtni tanlang.",
  outside_working_hours: "Mutaxassis bu vaqtda ishlamaydi.",
  slot_unavailable: "Bu vaqt band.",
} as const;

const endOf = (start: string, durationMin: number) =>
  new Date(Date.parse(start) + durationMin * 60_000).toISOString().replace(".000Z", "Z");

/** The `start` problem of a booking on the fixture day, as a `time` field error. */
function startFailure(
  specialistId: string,
  date: string,
  time: string,
  durationMin: number,
  excludeId?: string,
): ActionFailure | null {
  const start = tashkentStart(date, time);
  const day = {
    specialists: SPECIALISTS,
    appointments: APPOINTMENTS.filter((a) => toLocalIsoDate(a.start) === date),
  };
  const problem = bookingProblem(
    specialistSchedule(day, specialistId),
    minutesOfDay(time),
    durationMin,
    { inPast: Date.parse(start) <= referenceNow().getTime(), excludeId },
  );
  return problem ? fieldError("time", START_MESSAGES[problem]) : null;
}

/** ISO with the Tashkent offset, the API's spelling (`2026-10-26T09:30:00+05:00`). */
function tashkentIso(iso: string): string {
  const shifted = new Date(Date.parse(iso) + 5 * 3_600_000).toISOString();
  return `${shifted.slice(0, 19)}+05:00`;
}

export async function updateAppointment(
  id: string,
  action: AppointmentAction,
): Promise<ActionResult<MockAppointment>> {
  await delay(450);
  const appointment = APPOINTMENTS.find((a) => a.id === id);
  if (!appointment) return NOT_FOUND;
  if (!appointmentActions(appointment.status).includes(action)) return INVALID_TRANSITION;
  return { ok: true, data: { ...appointment, status: NEXT_STATUS[action] } };
}

export async function createAppointment(
  values: CreateAppointmentValues,
): Promise<ActionResult<DayAppointment>> {
  await delay(450);
  const specialist = BOOKING_META.specialists.find((s) => s.id === values.specialistId);
  if (!specialist) return fieldError("specialistId", "Mutaxassis topilmadi.");
  const service = specialist.services.find((s) => s.id === values.serviceId);
  if (!service) return fieldError("serviceId", "Mutaxassis bu xizmatni ko‘rsatmaydi.");
  const customer = CUSTOMERS.find((c) => c.phone === values.phone);
  if (!customer) return fieldError("phone", "Bu raqam bilan mijoz topilmadi.");
  const failure = startFailure(specialist.id, values.date, values.time, service.durationMin);
  if (failure) return failure;
  const start = tashkentStart(values.date, values.time);
  return {
    ok: true,
    data: {
      id: `a-new-${crypto.randomUUID()}`,
      specialistId: specialist.id,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      serviceId: service.id,
      service: service.name,
      serviceShort: service.shortName,
      durationMin: service.durationMin,
      start,
      end: tashkentIso(endOf(start, service.durationMin)),
      price: service.price,
      status: "confirmed",
      requestedAt: tashkentIso(referenceNow().toISOString()),
      requestedVia: "administrator",
    },
  };
}

export async function rescheduleAppointment(
  id: string,
  values: RescheduleAppointmentValues,
): Promise<ActionResult<DayAppointment>> {
  await delay(450);
  const appointment = APPOINTMENTS.find((a) => a.id === id);
  if (!appointment) return NOT_FOUND;
  if (!canChangeAppointment(appointment.status)) return INVALID_TRANSITION;
  const specialist = BOOKING_META.specialists.find((s) => s.id === values.specialistId);
  if (!specialist) return fieldError("specialistId", "Mutaxassis topilmadi.");
  // Changing the specialist re-snapshots duration and price from that link.
  const service = specialist.services.find((s) => s.id === appointment.serviceId);
  if (!service) return fieldError("specialistId", "Mutaxassis bu xizmatni ko‘rsatmaydi.");
  const failure = startFailure(specialist.id, values.date, values.time, service.durationMin, id);
  if (failure) return failure;
  const start = tashkentStart(values.date, values.time);
  const changedSpecialist = specialist.id !== appointment.specialistId;
  return {
    ok: true,
    data: {
      ...appointment,
      specialistId: specialist.id,
      durationMin: changedSpecialist ? service.durationMin : appointment.durationMin,
      price: changedSpecialist ? service.price : appointment.price,
      start,
      end: tashkentIso(
        endOf(start, changedSpecialist ? service.durationMin : appointment.durationMin),
      ),
    },
  };
}

/** The reason is recorded on the backend's event; the demo has nowhere to keep it. */
export async function cancelAppointment(id: string): Promise<ActionResult<DayAppointment>> {
  await delay(450);
  const appointment = APPOINTMENTS.find((a) => a.id === id);
  if (!appointment) return NOT_FOUND;
  if (!canChangeAppointment(appointment.status)) return INVALID_TRANSITION;
  return { ok: true, data: { ...appointment, status: "cancelled" } };
}
