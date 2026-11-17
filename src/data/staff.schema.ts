import { z } from "zod";

import { staffDataCopy } from "@/domain/copy/staff";
import {
  STAFF_FULL_NAME_MAX,
  STAFF_FULL_NAME_MIN,
  STAFF_PASSWORD_DELIVERIES,
} from "@/domain/staff";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * Validation of the staff dialogs (contract §2.16), shared by the forms (`useLocalized`) and the
 * Server Actions (`getLocalized`), with messages in the admin language.
 */

export const EMAIL_MAX = 254;

export const staffSchemas = localized(staffDataCopy, (m) => {
  const fullName = z
    .string()
    .trim()
    .min(STAFF_FULL_NAME_MIN, m.fullNameMin(STAFF_FULL_NAME_MIN))
    .max(STAFF_FULL_NAME_MAX, m.maxChars(STAFF_FULL_NAME_MAX));
  const delivery = z.enum(STAFF_PASSWORD_DELIVERIES, { error: m.delivery });
  return {
    invite: z.object({
      email: z
        .string()
        .trim()
        .toLowerCase()
        .max(EMAIL_MAX, m.maxChars(EMAIL_MAX))
        .pipe(z.email({ error: m.email })),
      fullName,
      isManager: z.boolean(),
      delivery,
      /** The new account's panel language (`StaffUser.language`); the inviter's by default. */
      language: z.enum(LOCALES).optional(),
    }),
    update: z.object({ fullName, isManager: z.boolean() }),
    reset: z.object({ delivery }),
  };
});

type StaffSchemas = LocalizedOf<typeof staffSchemas>;
export type InviteStaffValues = z.input<StaffSchemas["invite"]>;
export type InviteStaffData = z.output<StaffSchemas["invite"]>;
export type UpdateStaffValues = z.infer<StaffSchemas["update"]>;
export type ResetStaffValues = z.infer<StaffSchemas["reset"]>;

/** An API staff id (a positive integer). */
export const staffIdSchema = z.string().regex(/^[1-9]\d{0,17}$/);
