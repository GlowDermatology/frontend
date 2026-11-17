import { pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the own-password flows (DESIGN §E): the forced change at `/admin/change-password`
 * (`auth/change-password/`, `auth/password-link/`) and the e-mailed link at
 * `/admin/set-password` (`auth/password-token/check|set/`). Schemas, Server Action refusals and
 * the mock branch's imitation of the backend. Uzbek matches the backend's texts.
 */
const uz = {
  currentRequired: "Joriy parolni kiriting.",
  newRequired: "Yangi parolni kiriting.",
  minChars: (min: number) => `Kamida ${min} ta belgi.`,
  maxChars: (max: number) => `${max} belgidan oshmasin.`,
  mismatch: "Parollar mos emas.",
  sameAsCurrent: "Yangi parol eskisidan farq qilsin.",
  checkFields: "Maydonlarni tekshiring.",
  tokenInvalid: "Havola yaroqsiz yoki muddati o‘tgan. Menejerdan yangi havola so‘rang.",
  notPending: "Parolingiz o‘rnatilgan: uni «Parolni o‘zgartirish» orqali almashtiring.",
  emailUnavailable: "E-pochta orqali yuborish sozlanmagan.",
  sessionExpired: "Sessiya tugadi. Qayta kiring.",
  staleForm: "Sahifani yangilab, qayta urinib ko‘ring.",
  unreachable: "API bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",
};

export const passwordDataCopy = {
  uz,
  ru: {
    currentRequired: "Введите текущий пароль.",
    newRequired: "Введите новый пароль.",
    minChars: (min: number) =>
      `Не менее ${min} ${pluralRu(min, ["символа", "символов", "символов"])}.`,
    maxChars: (max: number) =>
      `Не более ${max} ${pluralRu(max, ["символа", "символов", "символов"])}.`,
    mismatch: "Пароли не совпадают.",
    sameAsCurrent: "Новый пароль должен отличаться от текущего.",
    checkFields: "Проверьте поля.",
    tokenInvalid: "Ссылка недействительна или устарела. Попросите менеджера отправить новую.",
    notPending: "Ваш пароль уже установлен: смените его через «Сменить пароль».",
    emailUnavailable: "Отправка по электронной почте не настроена.",
    sessionExpired: "Сессия завершилась. Войдите снова.",
    staleForm: "Обновите страницу и попробуйте ещё раз.",
    unreachable: "Не удалось связаться с API. Попробуйте ещё раз.",
  },
  en: {
    currentRequired: "Enter your current password.",
    newRequired: "Enter a new password.",
    minChars: (min: number) => `At least ${min} characters.`,
    maxChars: (max: number) => `No more than ${max} characters.`,
    mismatch: "The passwords do not match.",
    sameAsCurrent: "The new password must differ from the current one.",
    checkFields: "Check the fields.",
    tokenInvalid: "This link is invalid or has expired. Ask a manager for a new one.",
    notPending: "Your password is already set: change it with “Change password”.",
    emailUnavailable: "Sending by email is not set up.",
    sessionExpired: "Your session has ended. Sign in again.",
    staleForm: "Reload the page and try again.",
    unreachable: "Could not reach the API. Try again.",
  },
} satisfies CopySet<typeof uz>;
