"use server";

import { z } from "zod";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
import type { DayAppointment } from "./appointments";
import * as mock from "./mock/appointments.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Appointment status changes from the admin schedule (contract §2.9). The
 * mock body lives in `./mock/appointments.actions.ts`; the api branch (F2)
 * posts to `appointments/{id}/{confirm|reject|attend}/` with `Idempotency-Key`
 * (the backend sends the customer's push notification).
 */

export type AppointmentAction = "confirm" | "reject" | "attend";

const schema = z.object({
  id: z.string().trim().min(1).max(64),
  action: z.enum(["confirm", "reject", "attend"]),
  key: idempotencyKeySchema,
});

export async function updateAppointment(
  id: string,
  action: AppointmentAction,
  key: string,
  csrf: string,
): Promise<ActionResult<DayAppointment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = schema.safeParse({ id, action, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") return apiMutation("updateAppointment");
  return mock.updateAppointment(parsed.data.id, parsed.data.action);
}
