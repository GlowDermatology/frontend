import { z } from "zod";

import { appointmentDataCopy } from "@/domain/copy/appointments";
import {
  CANCEL_REASON_MAX,
  CUSTOMER_NAME_MAX,
  CUSTOMER_NAME_MIN,
  NOTE_MAX,
  SLOT_STEP_MIN,
  minutesOfDay,
} from "@/domain/appointment";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";
import { PHONE_PATTERN } from "@/lib/phone";

/**
 * Validation of the admin booking dialogs (contract §2.9 T10), shared by the
 * forms and the Server Actions. The backend stays the authority on the slot
 * itself (working hours, blocks, overlaps, races); these rules only catch
 * what can be known in the form. One set per admin language (`localized`):
 * Server Actions read `await getLocalized(appointmentSchemas)`, the dialogs
 * `useLocalized(appointmentSchemas)`; the Uzbek texts are the contract's.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const appointmentSchemas = localized(appointmentDataCopy, (m) => {
  const id = (message: string) => z.string().trim().min(1, message).max(64, message);
  const date = z
    .string()
    .regex(ISO_DATE, m.chooseDate)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00+05:00`)), {
      error: m.chooseDate,
    });
  const time = z
    .string()
    .regex(HH_MM, m.chooseTime)
    .refine((value) => minutesOfDay(value) % SLOT_STEP_MIN === 0, {
      error: m.timeStep(SLOT_STEP_MIN),
    });
  const nameMessage = m.customerName(CUSTOMER_NAME_MIN, CUSTOMER_NAME_MAX);
  // A walk-in's name: required by the dialog once the server says no customer has the phone.
  const walkInName = z
    .string()
    .trim()
    .min(CUSTOMER_NAME_MIN, nameMessage)
    .max(CUSTOMER_NAME_MAX, nameMessage);
  return {
    date,
    time,
    walkInName,
    create: z.object({
      specialistId: id(m.chooseSpecialist),
      locationId: id(m.chooseClinic),
      serviceId: id(m.chooseService),
      phone: z.string().trim().regex(PHONE_PATTERN, m.phone),
      // Sent only when given: the backend uses it to create the customer of an unknown phone.
      name: z
        .string()
        .trim()
        .refine(
          (value) =>
            value === "" ||
            (value.length >= CUSTOMER_NAME_MIN && value.length <= CUSTOMER_NAME_MAX),
          { error: nameMessage },
        )
        .optional(),
      date,
      time,
      note: z.string().trim().max(NOTE_MAX, m.maxChars(NOTE_MAX)),
    }),
    reschedule: z.object({
      specialistId: id(m.chooseSpecialist),
      locationId: id(m.chooseClinic),
      /** The target specialist's service, required by the backend with another specialist. */
      serviceId: id(m.chooseService).optional(),
      date,
      time,
      /** The specialist's own board: the customer agreed to the new clinic of a move. */
      customerAgreed: z.boolean().optional(),
    }),
    cancel: z.object({
      reason: z.string().trim().max(CANCEL_REASON_MAX, m.maxChars(CANCEL_REASON_MAX)),
    }),
  };
});

type AppointmentSchemas = LocalizedOf<typeof appointmentSchemas>;

export type CreateAppointmentValues = z.infer<AppointmentSchemas["create"]>;
export type RescheduleAppointmentValues = z.infer<AppointmentSchemas["reschedule"]>;
export type CancelAppointmentValues = z.infer<AppointmentSchemas["cancel"]>;

/** Uzbek aliases of the earlier single-language exports. */
export const bookingDateSchema = appointmentSchemas.uz.date;
export const bookingTimeSchema = appointmentSchemas.uz.time;
export const createAppointmentSchema = appointmentSchemas.uz.create;
export const rescheduleAppointmentSchema = appointmentSchemas.uz.reschedule;
export const cancelAppointmentSchema = appointmentSchemas.uz.cancel;
