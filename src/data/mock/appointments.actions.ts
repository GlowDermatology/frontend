import {
  appointmentActions,
  bookingProblem,
  canChangeAppointment,
  minutesOfDay,
  specialistSchedule,
  tashkentStart,
  type AppointmentStatus,
} from "@/domain/appointment";
import { appointmentDataCopy, type AppointmentDataCopy } from "@/domain/copy/appointments";
import { copyFor } from "@/lib/i18n/admin-locale";

import type { DayAppointment } from "../appointments";
import type { AppointmentAction } from "../appointments.actions";
import type { CreateAppointmentValues, RescheduleAppointmentValues } from "../appointments.schema";
import { referenceNow } from "../config";
import type { ActionFailure, ActionResult } from "../types";
import { delay } from "./delay";
import { BOOKING_META, findAppointment, type MockAppointment } from "./appointments";
import { getAppointmentDay } from "./appointments.queries";
import { CUSTOMERS } from "./people";

/**
 * Mock implementation of `src/data/appointments.actions.ts`: the appointment
 * is looked up by id in the fixture week and the change checked with the
 * domain rules and the backend's own field codes and messages (contract §2.9,
 * in the admin language like the backend's `Accept-Language` answers), so the
 * dialogs behave offline as they do against Django; nothing is persisted or
 * sent.
 */

const NEXT_STATUS: Record<AppointmentAction, AppointmentStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  attend: "attended",
};

const invalidTransition = (m: AppointmentDataCopy): ActionFailure => ({
  ok: false,
  error: m.invalidTransition,
  code: "invalid_transition",
});
const notFound = (m: AppointmentDataCopy): ActionFailure => ({
  ok: false,
  error: m.notFound,
  code: "not_found",
});

const fieldError = (m: AppointmentDataCopy, field: string, message: string): ActionFailure => ({
  ok: false,
  error: m.checkFields,
  code: "validation_error",
  fieldErrors: { [field]: message },
});

const startMessage = (
  m: AppointmentDataCopy,
  problem: NonNullable<ReturnType<typeof bookingProblem>>,
): string =>
  ({
    invalid_step: m.timeStep(BOOKING_META.slotStepMin),
    in_past: m.inPast,
    outside_working_hours: m.outsideWorkingHours,
    slot_unavailable: m.slotUnavailable,
  })[problem];

const endOf = (start: string, durationMin: number) =>
  new Date(Date.parse(start) + durationMin * 60_000).toISOString().replace(".000Z", "Z");

/** The `start` problem of a booking on the mock day, as a `time` field error. */
async function startFailure(
  m: AppointmentDataCopy,
  specialistId: string,
  date: string,
  time: string,
  durationMin: number,
  excludeId?: string,
): Promise<ActionFailure | null> {
  const start = tashkentStart(date, time);
  const problem = bookingProblem(
    specialistSchedule(await getAppointmentDay(date), specialistId),
    minutesOfDay(time),
    durationMin,
    { inPast: Date.parse(start) <= referenceNow().getTime(), excludeId },
  );
  return problem ? fieldError(m, "time", startMessage(m, problem)) : null;
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
  const m = await copyFor(appointmentDataCopy);
  const appointment = findAppointment(id);
  if (!appointment) return notFound(m);
  if (!appointmentActions(appointment.status).includes(action)) return invalidTransition(m);
  return { ok: true, data: { ...appointment, status: NEXT_STATUS[action] } };
}

export async function createAppointment(
  values: CreateAppointmentValues,
): Promise<ActionResult<DayAppointment>> {
  await delay(450);
  const m = await copyFor(appointmentDataCopy);
  const specialist = BOOKING_META.specialists.find((s) => s.id === values.specialistId);
  if (!specialist) return fieldError(m, "specialistId", m.specialistNotFound);
  const service = specialist.services.find((s) => s.id === values.serviceId);
  if (!service) return fieldError(m, "serviceId", m.serviceNotOffered);
  const customer = CUSTOMERS.find((c) => c.phone === values.phone);
  if (!customer) return fieldError(m, "phone", m.customerNotFound);
  const failure = await startFailure(
    m,
    specialist.id,
    values.date,
    values.time,
    service.durationMin,
  );
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
  const m = await copyFor(appointmentDataCopy);
  const appointment = findAppointment(id);
  if (!appointment) return notFound(m);
  if (!canChangeAppointment(appointment.status)) return invalidTransition(m);
  const specialist = BOOKING_META.specialists.find((s) => s.id === values.specialistId);
  if (!specialist) return fieldError(m, "specialistId", m.specialistNotFound);
  // Changing the specialist re-snapshots duration and price from that link.
  const service = specialist.services.find((s) => s.id === appointment.serviceId);
  if (!service) return fieldError(m, "specialistId", m.serviceNotOffered);
  const failure = await startFailure(
    m,
    specialist.id,
    values.date,
    values.time,
    service.durationMin,
    id,
  );
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
  const m = await copyFor(appointmentDataCopy);
  const appointment = findAppointment(id);
  if (!appointment) return notFound(m);
  if (!canChangeAppointment(appointment.status)) return invalidTransition(m);
  return { ok: true, data: { ...appointment, status: "cancelled" } };
}
