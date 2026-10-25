"use server";

import { z } from "zod";

import { tashkentStart } from "@/domain/appointment";

import {
  apiMutation,
  fieldErrorsFrom,
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
  bookingDateSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
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
 * codes and messages from the fixtures.
 */

export type AppointmentAction = "confirm" | "reject" | "attend";

const idSchema = z.string().trim().min(1).max(64);
const NOT_FOUND: ActionFailure = { ok: false, error: "Qabul topilmadi.", code: "not_found" };

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
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (apiId(parsed.data.id) === null) return NOT_FOUND;
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
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = createAppointmentSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    const specialistId = apiId(input.specialistId);
    const serviceId = apiId(input.serviceId);
    if (specialistId === null) {
      return {
        ok: false,
        error: "Mutaxassis topilmadi.",
        fieldErrors: { specialistId: "Mutaxassis topilmadi." },
      };
    }
    if (serviceId === null) {
      return {
        ok: false,
        error: "Xizmat topilmadi.",
        fieldErrors: { serviceId: "Xizmat topilmadi." },
      };
    }
    return apiMutation("createAppointment", async () => {
      try {
        const { data } = await apiCreateAppointment(
          sessionToken(guard.session),
          {
            specialist_id: specialistId,
            service_id: serviceId,
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
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = rescheduleAppointmentSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    if (apiId(parsedId.data) === null) return NOT_FOUND;
    const body: ApiAppointmentReschedule = { start: tashkentStart(input.date, input.time) };
    if (input.specialistId !== baselineSpecialistId) {
      const specialistId = apiId(input.specialistId);
      if (specialistId === null) {
        return {
          ok: false,
          error: "Mutaxassis topilmadi.",
          fieldErrors: { specialistId: "Mutaxassis topilmadi." },
        };
      }
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
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = cancelAppointmentSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    if (apiId(parsedId.data) === null) return NOT_FOUND;
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
  const parsed = bookingDateSchema.safeParse(date);
  if (!parsed.success) return { ok: false, error: "Sanani tanlang." };
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
