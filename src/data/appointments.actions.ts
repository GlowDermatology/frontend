"use server";

import { z } from "zod";

import { tashkentStart } from "@/domain/appointment";
import { appointmentDataCopy, type AppointmentDataCopy } from "@/domain/copy/appointments";
import { copyFor, getLocalized } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  invalidFormMessage,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiAppointmentAction,
  apiAppointmentDayFresh,
  apiCancelAppointment,
  apiCreateAppointment,
  apiRescheduleAppointment,
} from "./api/admin";
import {
  BOOKING_FIELD_REMAP,
  RESCHEDULE_FIELD_REMAP,
  bookingFailure,
  mapAppointmentDay,
  mapDayAppointment,
} from "./api/mappers/appointments";
import { toActionResult } from "./api/mappers/errors";
import type { ApiAppointmentReschedule } from "./api/types";
import type { AppointmentDay, DayAppointment } from "./appointments";
import {
  appointmentSchemas,
  type CancelAppointmentValues,
  type CreateAppointmentValues,
  type RescheduleAppointmentValues,
} from "./appointments.schema";
import * as mock from "./mock/appointments.actions";
import * as mockQueries from "./mock/appointments.queries";
import { dataSource } from "./source";
import type { ActionFailure, ActionResult } from "./types";

/**
 * Appointment mutations from the admin schedule (contract §2.9):
 *
 * - `updateAppointment` posts `appointments/{id}/{confirm|reject|attend}/`
 *   with the board's `Idempotency-Key` (required; the backend pushes the
 *   customer on confirm and reject);
 * - `createAppointment`, `rescheduleAppointment` and `cancelAppointment` are
 *   the admin booking endpoints (T10). The key is optional there but sent,
 *   one per dialog opening. `start` is built here from the dialog's Tashkent
 *   date and time; its field errors and a 409 `conflict` race ("Bu vaqt
 *   band.") come back on the time field.
 *
 * Mock bodies live in `./mock/appointments.actions.ts` and answer the same
 * codes and messages from the fixtures. The actions' own messages and the
 * schemas' follow the admin language (`appointmentDataCopy`).
 */

export type AppointmentAction = "confirm" | "reject" | "attend";

const idSchema = z.string().trim().min(1).max(64);
const notFound = (m: AppointmentDataCopy): ActionFailure => ({
  ok: false,
  error: m.notFound,
  code: "not_found",
});
const specialistNotFound = (m: AppointmentDataCopy): ActionFailure => ({
  ok: false,
  error: m.specialistNotFound,
  fieldErrors: { specialistId: m.specialistNotFound },
});

const statusSchema = z.object({
  id: idSchema,
  action: z.enum(["confirm", "reject", "attend"]),
  key: idempotencyKeySchema,
});

/** Numeric API id, or `null` (a mock id such as `s-1` reaching api mode). */
const apiId = (value: string): number | null => (/^\d{1,12}$/.test(value) ? Number(value) : null);

export async function updateAppointment(
  id: string,
  action: AppointmentAction,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = statusSchema.safeParse({ id, action, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, await invalidFormMessage());
  if ((await dataSource()) === "api") {
    if (apiId(parsed.data.id) === null) return notFound(await copyFor(appointmentDataCopy));
    return apiMutation("updateAppointment", async () => {
      try {
        const { data } = await apiAppointmentAction(
          sessionToken(guard.session),
          parsed.data.id,
          parsed.data.action,
          parsed.data.key,
        );
        return { ok: true, data: mapDayAppointment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateAppointment(parsed.data.id, parsed.data.action);
}

export async function createAppointment(
  values: CreateAppointmentValues,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const [m, schemas] = await Promise.all([
    copyFor(appointmentDataCopy),
    getLocalized(appointmentSchemas),
  ]);
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: m.requestKey };
  const parsed = schemas.create.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, await invalidFormMessage());
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    const specialistId = apiId(input.specialistId);
    const serviceId = apiId(input.serviceId);
    const locationId = apiId(input.locationId);
    if (specialistId === null) return specialistNotFound(m);
    if (locationId === null)
      return { ok: false, error: m.chooseClinic, fieldErrors: { locationId: m.chooseClinic } };
    if (serviceId === null) {
      return { ok: false, error: m.serviceNotFound, fieldErrors: { serviceId: m.serviceNotFound } };
    }
    return apiMutation("createAppointment", async () => {
      try {
        const { data } = await apiCreateAppointment(
          sessionToken(guard.session),
          {
            specialist_id: specialistId,
            service_id: serviceId,
            location_id: locationId,
            phone: input.phone,
            start: tashkentStart(input.date, input.time),
            note: input.note,
          },
          parsedKey.data,
        );
        return { ok: true, data: mapDayAppointment(data) };
      } catch (error) {
        return bookingFailure(error);
      }
    });
  }
  return mock.createAppointment(input);
}

/**
 * `baselineSpecialistId` is the specialist the dialog opened with: the
 * request carries `specialist_id` only when the admin picked another one
 * (that re-snapshots duration and price on the backend).
 */
export async function rescheduleAppointment(
  id: string,
  values: RescheduleAppointmentValues,
  baselineSpecialistId: string,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const [m, schemas] = await Promise.all([
    copyFor(appointmentDataCopy),
    getLocalized(appointmentSchemas),
  ]);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return notFound(m);
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: m.requestKey };
  const parsed = schemas.reschedule.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, await invalidFormMessage());
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    if (apiId(parsedId.data) === null) return notFound(m);
    const locationId = apiId(input.locationId);
    if (locationId === null)
      return { ok: false, error: m.chooseClinic, fieldErrors: { locationId: m.chooseClinic } };
    const body: ApiAppointmentReschedule = {
      start: tashkentStart(input.date, input.time),
      location_id: locationId,
    };
    if (input.specialistId !== baselineSpecialistId) {
      const specialistId = apiId(input.specialistId);
      if (specialistId === null) return specialistNotFound(m);
      body.specialist_id = specialistId;
    }
    return apiMutation("rescheduleAppointment", async () => {
      try {
        const { data } = await apiRescheduleAppointment(
          sessionToken(guard.session),
          parsedId.data,
          body,
          parsedKey.data,
        );
        return { ok: true, data: mapDayAppointment(data) };
      } catch (error) {
        return bookingFailure(error, RESCHEDULE_FIELD_REMAP);
      }
    });
  }
  return mock.rescheduleAppointment(parsedId.data, input);
}

export async function cancelAppointment(
  id: string,
  values: CancelAppointmentValues,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const [m, schemas] = await Promise.all([
    copyFor(appointmentDataCopy),
    getLocalized(appointmentSchemas),
  ]);
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return notFound(m);
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: m.requestKey };
  const parsed = schemas.cancel.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, await invalidFormMessage());
  if ((await dataSource()) === "api") {
    if (apiId(parsedId.data) === null) return notFound(m);
    return apiMutation("cancelAppointment", async () => {
      try {
        const { data } = await apiCancelAppointment(
          sessionToken(guard.session),
          parsedId.data,
          parsed.data.reason ? { reason: parsed.data.reason } : {},
          parsedKey.data,
        );
        return { ok: true, data: mapDayAppointment(data) };
      } catch (error) {
        return toActionResult(error, BOOKING_FIELD_REMAP);
      }
    });
  }
  return mock.cancelAppointment(parsedId.data);
}

/**
 * Read for the booking dialogs: the schedule of another day than the one the
 * board shows (working hours, blocks and held visits), so the time list
 * follows the chosen date. Not a mutation: no key, no refresh.
 */
export async function loadAppointmentDay(
  date: string,
  csrf: string,
): Promise<ActionResult<AppointmentDay>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = (await getLocalized(appointmentSchemas)).date.safeParse(date);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "" };
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiAppointmentDayFresh(sessionToken(guard.session), parsed.data);
      return { ok: true, data: mapAppointmentDay(data) };
    } catch (error) {
      return toActionResult(error);
    }
  }
  return { ok: true, data: await mockQueries.getAppointmentDay(parsed.data) };
}
