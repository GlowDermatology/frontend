import { z } from "zod";

import { passwordDataCopy } from "@/domain/copy/password";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

/**
 * Validation of the staff password change in Settings (contract §2.1 `auth/change-password/`),
 * shared by the account card (`useLocalized`) and the Server Action (`getLocalized`). Messages:
 * `passwordDataCopy` (the same rules as the forced change, DESIGN §E). The backend's password
 * validators (common, numeric, similar) answer on `newPassword` after these pass.
 */

export const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

export const changePasswordSchemas = localized(passwordDataCopy, (m) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, m.currentRequired)
        .max(PASSWORD_MAX, m.maxChars(PASSWORD_MAX)),
      newPassword: z
        .string()
        .min(1, m.newRequired)
        .min(PASSWORD_MIN, m.minChars(PASSWORD_MIN))
        .max(PASSWORD_MAX, m.maxChars(PASSWORD_MAX)),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      error: m.mismatch,
    }),
);

export type ChangePasswordValues = z.infer<LocalizedOf<typeof changePasswordSchemas>>;
