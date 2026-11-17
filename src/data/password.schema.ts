import { z } from "zod";

import { passwordDataCopy } from "@/domain/copy/password";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

import { PASSWORD_MIN } from "./settings.schema";

/**
 * Validation of the own-password forms (DESIGN §E): the forced change (`/admin/change-password`)
 * and the e-mailed link (`/admin/set-password`), shared by the forms (`useLocalized`) and their
 * Server Actions (`getLocalized`). The backend's password validators (common, numeric, similar,
 * unchanged) answer on `newPassword` after these pass.
 */

export { PASSWORD_MIN };
export const PASSWORD_MAX = 128;

export const passwordSchemas = localized(passwordDataCopy, (m) => {
  const newPassword = z
    .string()
    .min(1, m.newRequired)
    .min(PASSWORD_MIN, m.minChars(PASSWORD_MIN))
    .max(PASSWORD_MAX, m.maxChars(PASSWORD_MAX));
  const matching = <T extends { newPassword: string; confirmPassword: string }>(values: T) =>
    values.newPassword === values.confirmPassword;
  return {
    change: z
      .object({
        currentPassword: z
          .string()
          .min(1, m.currentRequired)
          .max(PASSWORD_MAX, m.maxChars(PASSWORD_MAX)),
        newPassword,
        confirmPassword: z.string(),
      })
      .refine(matching, { path: ["confirmPassword"], error: m.mismatch })
      .refine((values) => values.newPassword !== values.currentPassword, {
        path: ["newPassword"],
        error: m.sameAsCurrent,
      }),
    set: z
      .object({ newPassword, confirmPassword: z.string() })
      .refine(matching, { path: ["confirmPassword"], error: m.mismatch }),
  };
});

type PasswordSchemas = LocalizedOf<typeof passwordSchemas>;
export type ChangeOwnPasswordValues = z.infer<PasswordSchemas["change"]>;
export type SetPasswordValues = z.infer<PasswordSchemas["set"]>;
