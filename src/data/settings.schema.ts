import { z } from "zod";

/**
 * Validation of the staff password change (contract §2.1
 * `auth/change-password/`), shared by the account card and the Server Action.
 */

export const PASSWORD_MIN = 12;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Joriy parolni kiriting.").max(128),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Kamida ${PASSWORD_MIN} ta belgi.`)
      .max(128, "128 belgidan oshmasin."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    error: "Parollar mos emas.",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
