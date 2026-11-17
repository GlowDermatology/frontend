import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the shared admin data layer (DESIGN §G): the Server Action prologue
 * (`action-guard.ts`), the API client's own transport/parse failures (`api/client.ts`,
 * `api/errors.ts`), the API error → `ActionResult` mapping (`api/mappers/errors.ts`) and the
 * export plumbing (`export.ts`, `export-csv.ts`). Uzbek is the source language and matches the
 * backend's texts; the backend's own `message`s arrive already translated (Accept-Language).
 */
const uz = {
  sessionExpired: "Sessiya tugadi. Qayta kiring.",
  csrf: "Xavfsizlik tekshiruvi o‘tmadi. Sahifani yangilang.",
  notWired: "Bu amal API bilan hali ulanmagan.",
  invalidForm: "Maydonlarni tekshiring.",
  permissionDenied: "Ruxsat yo‘q.",
  /** A transport failure on the server (Django unreachable, timeout). */
  network: "API bilan bog‘lanib bo‘lmadi.",
  unexpected: "Kutilmagan xato.",
  throttled: (seconds: number) =>
    `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
  notAuthenticated: "Avtorizatsiya talab qilinadi.",
  yes: "Ha",
  no: "Yo‘q",
};

export const dataCopy = {
  uz,
  ru: {
    sessionExpired: "Сессия завершилась. Войдите снова.",
    csrf: "Проверка безопасности не пройдена. Обновите страницу.",
    notWired: "Это действие ещё не подключено к API.",
    invalidForm: "Проверьте поля.",
    permissionDenied: "Нет доступа.",
    network: "Не удалось связаться с API.",
    unexpected: "Непредвиденная ошибка.",
    throttled: (seconds: number) => `Слишком много попыток. Повторите через ${seconds} с.`,
    notAuthenticated: "Требуется авторизация.",
    yes: "Да",
    no: "Нет",
  },
  en: {
    sessionExpired: "Your session has ended. Sign in again.",
    csrf: "The security check failed. Reload the page.",
    notWired: "This action is not connected to the API yet.",
    invalidForm: "Check the fields.",
    permissionDenied: "Permission denied.",
    network: "Could not reach the API.",
    unexpected: "Unexpected error.",
    throttled: (seconds: number) => `Too many attempts. Try again in ${seconds} s.`,
    notAuthenticated: "Authentication required.",
    yes: "Yes",
    no: "No",
  },
} satisfies CopySet<typeof uz>;

export type DataCopy = (typeof dataCopy)["uz"];
