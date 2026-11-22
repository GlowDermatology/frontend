"use server";

import { z } from "zod";

import { tashkentStart } from "@/domain/appointment";
import { appointmentDataCopy, type AppointmentDataCopy } from "@/domain/copy/appointments";
import { copyFor, getLocalized } from "@/lib/i18n/admin-locale";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
import {
  BOOKING_FIELD_REMAP,
  RESCHEDULE_FIELD_REMAP,
  bookingFailure,
  mapAppointmentDay,
  mapDayAppointment,
} from "./api/mappers/appointments";
import { toActionResult } from "./api/mappers/errors";
import {
  apiCancelOwnAppointment,
  apiCreateOwnAppointment,
  apiOwnAppointmentAction,
  apiOwnAppointmentDay,
  apiRescheduleOwnAppointment,
} from "./api/specialist";
import type { ApiSpecialistReschedule } from "./api/types";
import type { AppointmentDay, DayAppointment } from "./appointments";
import type { AppointmentAction } from "./appointments.actions";
import {
  appointmentSchemas,
  type CancelAppointmentValues,
  type CreateAppointmentValues,
  type RescheduleAppointmentValues,
} from "./appointments.schema";
import { getMe } from "./auth";
import { dataCopy } from "./copy";
import type { ActionFailure, ActionResult } from "./types";

/**
 * The specialist's own appointments board (`specialist/appointments/…`): the same signatures as
 * the staff actions (`BoardActions`), so `AppointmentsView` runs unchanged on
 * `/admin/my-appointments`. The backend scopes every route to the caller (another specialist's
 * visit answers 404) and keeps the specialist's time rules: confirm, reject, reschedule and
 * cancel before the start, attend from the start on. Every write requires its Idempotency-Key.
 *
 * Differences from staff: a booking never names the specialist and carries no note (the note is
 * a staff note the specialist could not read back); a move never changes the specialist, and a
 * clinic move carries `customer_agreed`. API only: mock mode is always an administrator.
 */

const idSchema = z.string().regex(/^\d{1,12}$/);
const statusSchema = z.enum(["confirm", "reject", "attend"]);

/** `permission_denied` unless an api-mode session of a Specialist; else the bearer token. */
async function guardSpecialist(
  csrf: string,
): Promise<{ ok: true; token: string; m: AppointmentDataCopy } | ActionFailure> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  if (guard.session.mode !== "api" || (await getMe())?.role !== "specialist") {
    return {
      ok: false,
      code: "permission_denied",
      error: (await copyFor(dataCopy)).permissionDenied,
    };
  }
  return { ok: true, token: guard.session.token, m: await copyFor(appointmentDataCopy) };
}

const notFound = (m: AppointmentDataCopy): ActionFailure => ({
  ok: false,
  error: m.notFound,
  code: "not_found",
});

export async function updateMyAppointment(
  id: string,
  action: AppointmentAction,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardSpecialist(csrf);
  if (!guard.ok) return guard;
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: guard.m.requestKey };
  const parsedAction = statusSchema.safeParse(action);
  if (!idSchema.safeParse(id).success || !parsedAction.success) return notFound(guard.m);
  return apiMutation("updateMyAppointment", async () => {
    try {
      const { data } = await apiOwnAppointmentAction(guard.token, id, parsedAction.data, key);
      return { ok: true, data: mapDayAppointment(data) };
    } catch (error) {
      return toActionResult(error);
    }
  });
}

/** A confirmed visit by phone; `name` creates the customer of an unknown phone (a walk-in). */
export async function createMyAppointment(
  values: CreateAppointmentValues,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardSpecialist(csrf);
  if (!guard.ok) return guard;
  const { m } = guard;
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: m.requestKey };
  const parsed = (await getLocalized(appointmentSchemas)).create.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if (!idSchema.safeParse(input.locationId).success) {
    return { ok: false, error: m.chooseClinic, fieldErrors: { locationId: m.chooseClinic } };
  }
  if (!idSchema.safeParse(input.serviceId).success) {
    return { ok: false, error: m.serviceNotFound, fieldErrors: { serviceId: m.serviceNotFound } };
  }
  return apiMutation("createMyAppointment", async () => {
    try {
      const { data } = await apiCreateOwnAppointment(
        guard.token,
        {
          service_id: Number(input.serviceId),
          location_id: Number(input.locationId),
          phone: input.phone,
          start: tashkentStart(input.date, input.time),
          ...(input.name ? { name: input.name } : {}),
        },
        key,
      );
      return { ok: true, data: mapDayAppointment(data) };
    } catch (error) {
      return bookingFailure(error);
    }
  });
}

/**
 * A new time and/or clinic of the caller's own visit. `_baselineSpecialistId` keeps the staff
 * signature: the specialist never changes, so `values.specialistId` and `serviceId` are ignored.
 */
export async function rescheduleMyAppointment(
  id: string,
  values: RescheduleAppointmentValues,
  _baselineSpecialistId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardSpecialist(csrf);
  if (!guard.ok) return guard;
  const { m } = guard;
  if (!idSchema.safeParse(id).success) return notFound(m);
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: m.requestKey };
  const parsed = (await getLocalized(appointmentSchemas)).reschedule.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if (!idSchema.safeParse(input.locationId).success) {
    return { ok: false, error: m.chooseClinic, fieldErrors: { locationId: m.chooseClinic } };
  }
  const body: ApiSpecialistReschedule = {
    start: tashkentStart(input.date, input.time),
    location_id: Number(input.locationId),
    customer_agreed: input.customerAgreed === true,
  };
  return apiMutation("rescheduleMyAppointment", async () => {
    try {
      const { data } = await apiRescheduleOwnAppointment(guard.token, id, body, key);
      return { ok: true, data: mapDayAppointment(data) };
    } catch (error) {
      return bookingFailure(error, RESCHEDULE_FIELD_REMAP);
    }
  });
}

/** The optional reason is kept for staff only; the specialist never reads it back. */
export async function cancelMyAppointment(
  id: string,
  values: CancelAppointmentValues,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardSpecialist(csrf);
  if (!guard.ok) return guard;
  const { m } = guard;
  if (!idSchema.safeParse(id).success) return notFound(m);
  if (!idempotencyKeySchema.safeParse(key).success) return { ok: false, error: m.requestKey };
  const parsed = (await getLocalized(appointmentSchemas)).cancel.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  return apiMutation("cancelMyAppointment", async () => {
    try {
      const { data } = await apiCancelOwnAppointment(
        guard.token,
        id,
        parsed.data.reason ? { reason: parsed.data.reason } : {},
        key,
      );
      return { ok: true, data: mapDayAppointment(data) };
    } catch (error) {
      return toActionResult(error, BOOKING_FIELD_REMAP);
    }
  });
}

/** Another day of the caller's own board, for the booking dialog's time list (no key). */
export async function loadMyAppointmentDay(
  date: string,
  csrf: string,
): Promise<ActionResult<AppointmentDay>> {
  const guard = await guardSpecialist(csrf);
  if (!guard.ok) return guard;
  const parsed = (await getLocalized(appointmentSchemas)).date.safeParse(date);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "" };
  try {
    const { data } = await apiOwnAppointmentDay(guard.token, parsed.data);
    return { ok: true, data: mapAppointmentDay(data) };
  } catch (error) {
    return toActionResult(error);
  }
}
