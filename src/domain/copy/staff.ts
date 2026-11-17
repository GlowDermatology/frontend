import { pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the staff data layer (contract §2.16, DESIGN §E): the dialogs' schemas (shared by
 * the forms and the Server Actions), the actions' own refusals and the mock branch's imitation of
 * the backend's answers (`src/data/mock/staff.actions.ts`). Uzbek is the source language and
 * matches the backend's texts.
 */
const uz = {
  fullNameMin: (min: number) => `Kamida ${min} ta belgi kiriting.`,
  maxChars: (max: number) => `${max} belgidan oshmasin.`,
  email: "Email manzilini to‘g‘ri kiriting.",
  delivery: "Kirish usulini tanlang.",
  requestKey: "Noto‘g‘ri so‘rov kaliti.",
  badRequest: "Noto‘g‘ri so‘rov.",
  notFound: "Xodim topilmadi.",
  checkFields: "Maydonlarni tekshiring.",
  refusals: {
    selfDemote: "O‘zingizni menejerlikdan chiqara olmaysiz.",
    lastManager: "Kamida bitta faol menejer qolishi kerak. Avval boshqa xodimni menejer qiling.",
    selfDeactivate: "O‘z hisobingizni faolsizlantira olmaysiz.",
    selfReset: "O‘z parolingizni «Parolni o‘zgartirish» orqali almashtiring.",
    emailTaken: "Bu email bilan xodim allaqachon bor (nofaol bo‘lsa, uni qayta faollashtiring).",
    emailDelivery: "E-pochta orqali yuborish sozlanmagan: vaqtinchalik parolni tanlang.",
    selfLink: "O‘zingizga havola «Parolni o‘zgartirish» sahifasidan so‘raladi.",
    inactiveLink: "Nofaol hisobga havola yuborilmaydi. Avval uni qayta faollashtiring.",
    emailUnavailable: "E-pochta orqali yuborish sozlanmagan.",
  },
};

export const staffDataCopy = {
  uz,
  ru: {
    fullNameMin: (min: number) =>
      `Введите не менее ${min} ${pluralRu(min, ["символа", "символов", "символов"])}.`,
    maxChars: (max: number) =>
      `Не более ${max} ${pluralRu(max, ["символа", "символов", "символов"])}.`,
    email: "Введите правильный адрес электронной почты.",
    delivery: "Выберите способ входа.",
    requestKey: "Неверный ключ запроса.",
    badRequest: "Неверный запрос.",
    notFound: "Сотрудник не найден.",
    checkFields: "Проверьте поля.",
    refusals: {
      selfDemote: "Нельзя снять с себя роль менеджера.",
      lastManager:
        "Должен остаться хотя бы один активный менеджер. Сначала назначьте менеджером другого сотрудника.",
      selfDeactivate: "Нельзя деактивировать собственную учётную запись.",
      selfReset: "Смените свой пароль через «Сменить пароль».",
      emailTaken: "Сотрудник с таким адресом уже есть (если он неактивен, активируйте его снова).",
      emailDelivery: "Отправка по электронной почте не настроена: выберите временный пароль.",
      selfLink: "Ссылку для себя запросите на странице «Сменить пароль».",
      inactiveLink:
        "Неактивной учётной записи ссылка не отправляется. Сначала активируйте её снова.",
      emailUnavailable: "Отправка по электронной почте не настроена.",
    },
  },
  en: {
    fullNameMin: (min: number) => `Enter at least ${min} characters.`,
    maxChars: (max: number) => `No more than ${max} characters.`,
    email: "Enter a valid email address.",
    delivery: "Choose how they sign in.",
    requestKey: "Invalid request key.",
    badRequest: "Invalid request.",
    notFound: "Staff member not found.",
    checkFields: "Check the fields.",
    refusals: {
      selfDemote: "You cannot remove your own manager role.",
      lastManager:
        "At least one active manager must remain. Make another staff member a manager first.",
      selfDeactivate: "You cannot deactivate your own account.",
      selfReset: "Change your own password with “Change password”.",
      emailTaken:
        "A staff member with this email already exists (if inactive, reactivate them instead).",
      emailDelivery: "Sending by email is not set up: choose a temporary password.",
      selfLink: "Request a link for yourself on the “Change password” page.",
      inactiveLink: "Links are not sent to inactive accounts. Reactivate the account first.",
      emailUnavailable: "Sending by email is not set up.",
    },
  },
} satisfies CopySet<typeof uz>;
