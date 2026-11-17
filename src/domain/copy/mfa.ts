import { pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the admin panel MFA data layer (DESIGN §E "MFA"): the zod schemas of the settings
 * dialogs and the sign-in's second step, the Server Actions' own refusals and the mock branch's
 * imitation of the backend (`mfa_code_invalid`, `mfa_challenge_invalid`, `password_incorrect`,
 * 409). Uzbek matches the backend's texts (`accounts/errors.py`).
 */
const uz = {
  passwordRequired: "Joriy parolni kiriting.",
  codeRequired: "Ilovadagi 6 xonali kodni kiriting.",
  codeFormat: "Kod 6 ta raqamdan iborat.",
  recoveryRequired: "Zaxira kodni kiriting.",
  recoveryFormat: "Zaxira kod 10 ta harf va raqamdan iborat: xxxxx-xxxxx.",
  codeOrRecoveryRequired: "Ilovadagi kodni yoki zaxira kodni kiriting.",
  codeOrRecoveryFormat: "6 xonali kodni yoki xxxxx-xxxxx ko‘rinishidagi zaxira kodni kiriting.",
  checkFields: "Maydonlarni tekshiring.",
  badRequest: "So‘rov noto‘g‘ri. Sahifani yangilab, qayta urinib ko‘ring.",
  staleForm: "Sahifani yangilab, qayta urinib ko‘ring.",
  unreachable: "API bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",
  throttled: "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.",
  throttledFor: (seconds: number) =>
    `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
  /** Mock imitations of the backend (`accounts/errors.py`, `mfa.py`). */
  passwordIncorrect: "Joriy parol noto‘g‘ri.",
  codeInvalid: "Kod noto‘g‘ri yoki allaqachon ishlatilgan. Ilovadagi yangi kodni kiriting.",
  challengeInvalid: "Kirish muddati tugadi yoki bekor qilindi. Email va parolni qaytadan kiriting.",
  alreadyOn: "Ikki bosqichli himoya allaqachon yoqilgan.",
  notOn: "Ikki bosqichli himoya yoqilmagan.",
  resetSelf: "O‘z ikki bosqichli himoyangizni «Sozlamalar»da o‘chiring.",
  resetNotOn: "Bu xodimda ikki bosqichli himoya yoqilmagan.",
  notFound: "Topilmadi.",
  reasonTooLong: (max: number) => `Sabab ${max} belgidan oshmasin.`,
};

export const mfaDataCopy = {
  uz,
  ru: {
    passwordRequired: "Введите текущий пароль.",
    codeRequired: "Введите 6-значный код из приложения.",
    codeFormat: "Код состоит из 6 цифр.",
    recoveryRequired: "Введите резервный код.",
    recoveryFormat: "Резервный код состоит из 10 букв и цифр: xxxxx-xxxxx.",
    codeOrRecoveryRequired: "Введите код из приложения или резервный код.",
    codeOrRecoveryFormat: "Введите 6-значный код или резервный код вида xxxxx-xxxxx.",
    checkFields: "Проверьте поля.",
    badRequest: "Неверный запрос. Обновите страницу и попробуйте ещё раз.",
    staleForm: "Обновите страницу и попробуйте ещё раз.",
    unreachable: "Не удалось связаться с API. Попробуйте ещё раз.",
    throttled: "Слишком много попыток. Попробуйте чуть позже.",
    throttledFor: (seconds: number) =>
      `Слишком много попыток. Повторите через ${seconds} ${pluralRu(seconds, ["секунду", "секунды", "секунд"])}.`,
    passwordIncorrect: "Текущий пароль неверный.",
    codeInvalid: "Код неверный или уже использован. Введите новый код из приложения.",
    challengeInvalid: "Время входа истекло или вход отменён. Введите email и пароль ещё раз.",
    alreadyOn: "Двухэтапная защита уже включена.",
    notOn: "Двухэтапная защита не включена.",
    resetSelf: "Свою двухэтапную защиту отключите в «Настройках».",
    resetNotOn: "У этого сотрудника двухэтапная защита не включена.",
    notFound: "Не найдено.",
    reasonTooLong: (max: number) =>
      `Причина — не более ${max} ${pluralRu(max, ["символа", "символов", "символов"])}.`,
  },
  en: {
    passwordRequired: "Enter your current password.",
    codeRequired: "Enter the 6-digit code from your app.",
    codeFormat: "The code is 6 digits.",
    recoveryRequired: "Enter a recovery code.",
    recoveryFormat: "A recovery code is 10 letters and digits: xxxxx-xxxxx.",
    codeOrRecoveryRequired: "Enter the code from your app or a recovery code.",
    codeOrRecoveryFormat: "Enter the 6-digit code or a recovery code like xxxxx-xxxxx.",
    checkFields: "Check the fields.",
    badRequest: "The request is invalid. Reload the page and try again.",
    staleForm: "Reload the page and try again.",
    unreachable: "Could not reach the API. Try again.",
    throttled: "Too many attempts. Try again in a moment.",
    throttledFor: (seconds: number) =>
      `Too many attempts. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`,
    passwordIncorrect: "The current password is incorrect.",
    codeInvalid: "The code is wrong or was already used. Enter the new code from your app.",
    challengeInvalid: "The sign-in expired or was cancelled. Enter your email and password again.",
    alreadyOn: "Two-step protection is already on.",
    notOn: "Two-step protection is not on.",
    resetSelf: "Turn off your own two-step protection in Settings.",
    resetNotOn: "This staff member does not have two-step protection on.",
    notFound: "Not found.",
    reasonTooLong: (max: number) => `The reason must be at most ${max} characters.`,
  },
} satisfies CopySet<typeof uz>;

export type MfaDataCopy = (typeof mfaDataCopy)["uz"];
