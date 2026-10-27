import { z } from "zod";

import { STAFF_FULL_NAME_MAX, STAFF_FULL_NAME_MIN } from "@/domain/staff";

/** Validation of the staff dialogs (contract §2.16), shared by the forms and the Server Actions. */

const fullName = z
  .string()
  .trim()
  .min(STAFF_FULL_NAME_MIN, "Kamida 2 ta belgi kiriting.")
  .max(STAFF_FULL_NAME_MAX, `${STAFF_FULL_NAME_MAX} belgidan oshmasin.`);

export const inviteStaffSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "254 belgidan oshmasin.")
    .pipe(z.email({ error: "Email manzilini to‘g‘ri kiriting." })),
  fullName,
  isManager: z.boolean(),
});
export type InviteStaffValues = z.input<typeof inviteStaffSchema>;

export const updateStaffSchema = z.object({ fullName, isManager: z.boolean() });
export type UpdateStaffValues = z.infer<typeof updateStaffSchema>;

/** An API staff id (a positive integer). */
export const staffIdSchema = z.string().regex(/^[1-9]\d{0,17}$/);
