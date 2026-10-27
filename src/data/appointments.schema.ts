import { z } from "zod";

import { CANCEL_REASON_MAX, NOTE_MAX, SLOT_STEP_MIN, minutesOfDay } from "@/domain/appointment";
import { PHONE_PATTERN } from "@/lib/phone";

/**
 * Validation of the admin booking dialogs (contract §2.9 T10), shared by the
 * forms and the Server Actions. The backend stays the authority on the slot
 * itself (working hours, blocks, overlaps, races); these rules only catch
 * what can be known in the form. Messages are the contract's.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const id = (message: string) => z.string().trim().min(1, message).max(64, message);

export const bookingDateSchema = z
  .string()
  .regex(ISO_DATE, "Sanani tanlang.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00+05:00`)), {
    error: "Sanani tanlang.",
  });

export const bookingTimeSchema = z
  .string()
  .regex(HH_MM, "Vaqtni tanlang.")
  .refine((value) => minutesOfDay(value) % SLOT_STEP_MIN === 0, {
    error: "Vaqt 5 daqiqalik qadamda bo‘lsin.",
  });

export const createAppointmentSchema = z.object({
  specialistId: id("Mutaxassisni tanlang."),
  serviceId: id("Xizmatni tanlang."),
  phone: z.string().trim().regex(PHONE_PATTERN, "Telefon raqamini to‘g‘ri kiriting."),
  date: bookingDateSchema,
  time: bookingTimeSchema,
  note: z.string().trim().max(NOTE_MAX, `${NOTE_MAX} belgidan oshmasin.`),
});
export type CreateAppointmentValues = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  specialistId: id("Mutaxassisni tanlang."),
  date: bookingDateSchema,
  time: bookingTimeSchema,
});
export type RescheduleAppointmentValues = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(CANCEL_REASON_MAX, `${CANCEL_REASON_MAX} belgidan oshmasin.`),
});
export type CancelAppointmentValues = z.infer<typeof cancelAppointmentSchema>;
