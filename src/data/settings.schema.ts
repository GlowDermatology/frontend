import { z } from "zod";

import { PICKUP_ADDRESS_MAX, RESERVATION_MAX, RESERVATION_MIN } from "@/domain/settings";
import { PHONE_PATTERN } from "@/lib/phone";

/**
 * Validation of the settings form (contract §2.11 `PATCH settings/`) and the
 * password change (§2.1 `auth/change-password/`), shared by the forms and
 * the Server Actions.
 */

const address = z
  .string()
  .trim()
  .max(PICKUP_ADDRESS_MAX, `${PICKUP_ADDRESS_MAX} belgidan oshmasin.`);

export const settingsFormSchema = z.object({
  reservationMinutes: z
    .number({ error: `${RESERVATION_MIN} dan ${RESERVATION_MAX} gacha daqiqa kiriting.` })
    .int(`${RESERVATION_MIN} dan ${RESERVATION_MAX} gacha daqiqa kiriting.`)
    .min(RESERVATION_MIN, `Qiymat ${RESERVATION_MIN} dan kam bo‘lmasin.`)
    .max(RESERVATION_MAX, `Qiymat ${RESERVATION_MAX} dan oshmasin.`),
  /** E.164, or `""` for "no support phone" (sent as `null`). */
  supportPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_PATTERN.test(value), {
      error: "Telefon raqamini to‘g‘ri kiriting.",
    }),
  pickupAddress: z.object({ uz: address, ru: address, en: address }),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

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
