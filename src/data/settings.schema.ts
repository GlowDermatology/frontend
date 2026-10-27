import { z } from "zod";

import {
  characterCount,
  LEGAL_TEXT_MAX,
  PICKUP_ADDRESS_MAX,
  RESERVATION_MAX,
  RESERVATION_MIN,
  type LegalDocument,
} from "@/domain/settings";
import { contactUrlError } from "@/lib/link-url";
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

/** E.164, or `""` for none (sent as `null`). */
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || PHONE_PATTERN.test(value), {
    error: "Telefon raqamini to‘g‘ri kiriting.",
  });

function contactUrl(kind: "telegram" | "instagram" | "website") {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = contactUrlError(value, kind);
      if (message) ctx.addIssue({ code: "custom", message });
    });
}

/**
 * The contacts card (gap X-SET-CONTACTS, contract §2.11): two phones and
 * three `https` links; `""` clears a value (sent as `null`).
 */
export const contactsFormSchema = z.object({
  storePhone: optionalPhone,
  cosmetologistPhone: optionalPhone,
  telegramUrl: contactUrl("telegram"),
  instagramUrl: contactUrl("instagram"),
  websiteUrl: contactUrl("website"),
});

export type ContactsFormValues = z.infer<typeof contactsFormSchema>;

function legalText(document: LegalDocument) {
  const max = LEGAL_TEXT_MAX[document];
  return z.string().refine((value) => characterCount(value.trim()) <= max, {
    error: `${max} belgidan oshmasin.`,
  });
}

function legalTexts(document: LegalDocument) {
  return z.object({ uz: legalText(document), ru: legalText(document), en: legalText(document) });
}

/**
 * The legal texts card (gap X-SET-LEGAL): the terms and privacy DRAFTS and
 * the booking policy, per language. Saving never publishes.
 */
export const legalTextsFormSchema = z.object({
  terms: legalTexts("terms"),
  privacyPolicy: legalTexts("privacyPolicy"),
  bookingPolicy: legalTexts("bookingPolicy"),
});

export type LegalTextsFormValues = z.infer<typeof legalTextsFormSchema>;

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
