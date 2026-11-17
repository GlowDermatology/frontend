import { pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the staff sign-in plumbing outside the forms (DESIGN §G): the OAuth route handlers'
 * own refusals and notices (`src/data/auth/oauth*.ts`, `src/app/admin/auth/oauth/…`), the
 * "sign in with the password first" hint of the account card (`src/domain/settings.ts`) and the
 * minimal HTML answers of the auth routes (`src/data/auth/html-page.ts`). The route handlers pick
 * the admin language from the `gd_admin_language` cookie (`Path=/admin` covers `/admin/auth/*`).
 * Uzbek is the source language; the Uzbek texts are what the panel showed before.
 */
const uz = {
  oauthFailed: "Ijtimoiy tarmoq orqali kirish amalga oshmadi.",
  unreachable: "API bilan bog‘lanib bo‘lmadi.",
  unexpected: "Kutilmagan xato.",
  throttled: "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.",
  throttledFor: (seconds: number) =>
    `Juda ko‘p urinish. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
  /** The callback's own checks (`CallbackCheck` reasons). */
  callback: {
    stale: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
    denied: "Ijtimoiy tarmoq orqali kirish bekor qilindi.",
    failed: "Ijtimoiy tarmoq orqali kirish amalga oshmadi.",
  },
  linked: (provider: string) => `${provider} hisobi bog‘landi.`,
  demoNotLinked: (provider: string) =>
    `Demo rejimi: ${provider} hisobi bog‘lanmadi, ma’lumotlar saqlanmaydi.`,
  sessionEnded: "Sessiya tugadi. Qayta kiring.",
  linkNeedsPassword:
    "Ijtimoiy tarmoq orqali ochilgan sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.",
  linkNeedsNewSignIn:
    "Bu sessiyada hisob bog‘lab bo‘lmaydi. Chiqing, email va parol bilan qayta kiring, so‘ng «Bog‘lash»ni bosing.",
  staleForm: "Sahifani yangilab, qayta urinib ko‘ring.",
  refreshFailed: {
    title: "Glow Derma Admin — qayta urinib ko‘ring",
    heading: "Sessiyani yangilab bo‘lmadi",
    body: (seconds: number) =>
      `API vaqtincha javob bermadi. ${seconds} soniyadan so‘ng qayta urinib ko‘ring.`,
    retry: "Qayta urinish",
    signIn: "Qayta kirish",
  },
  page: {
    redirecting: "Yo‘naltirilmoqda…",
    continue: "Davom etish",
    notFoundTitle: "Topilmadi",
    notFoundBody: "Bu manzil mavjud emas.",
    toSignIn: "Kirish sahifasiga",
  },
};

export const authDataCopy = {
  uz,
  ru: {
    oauthFailed: "Не удалось войти через соцсеть.",
    unreachable: "Не удалось связаться с API.",
    unexpected: "Непредвиденная ошибка.",
    throttled: "Слишком много попыток. Попробуйте чуть позже.",
    throttledFor: (seconds: number) =>
      `Слишком много попыток. Повторите через ${seconds} ${pluralRu(seconds, ["секунду", "секунды", "секунд"])}.`,
    callback: {
      stale: "Запрос на вход устарел. Попробуйте ещё раз.",
      denied: "Вход через соцсеть отменён.",
      failed: "Не удалось войти через соцсеть.",
    },
    linked: (provider: string) => `Аккаунт ${provider} привязан.`,
    demoNotLinked: (provider: string) =>
      `Демо-режим: аккаунт ${provider} не привязан, данные не сохраняются.`,
    sessionEnded: "Сессия завершилась. Войдите снова.",
    linkNeedsPassword:
      "В сессии, открытой через соцсеть, привязать аккаунт нельзя. Выйдите, войдите по email и паролю, затем нажмите «Привязать».",
    linkNeedsNewSignIn:
      "В этой сессии привязать аккаунт нельзя. Выйдите, войдите по email и паролю, затем нажмите «Привязать».",
    staleForm: "Обновите страницу и попробуйте ещё раз.",
    refreshFailed: {
      title: "Glow Derma Admin — попробуйте ещё раз",
      heading: "Не удалось продлить сессию",
      body: (seconds: number) =>
        `API временно не ответил. Повторите через ${seconds} ${pluralRu(seconds, ["секунду", "секунды", "секунд"])}.`,
      retry: "Повторить",
      signIn: "Войти заново",
    },
    page: {
      redirecting: "Перенаправляем…",
      continue: "Продолжить",
      notFoundTitle: "Не найдено",
      notFoundBody: "Такого адреса нет.",
      toSignIn: "На страницу входа",
    },
  },
  en: {
    oauthFailed: "Social sign-in did not go through.",
    unreachable: "Could not reach the API.",
    unexpected: "Unexpected error.",
    throttled: "Too many attempts. Try again in a moment.",
    throttledFor: (seconds: number) =>
      `Too many attempts. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`,
    callback: {
      stale: "The sign-in request has expired. Try again.",
      denied: "Social sign-in was cancelled.",
      failed: "Social sign-in did not go through.",
    },
    linked: (provider: string) => `${provider} account linked.`,
    demoNotLinked: (provider: string) =>
      `Demo mode: the ${provider} account was not linked, nothing is saved.`,
    sessionEnded: "Your session has ended. Sign in again.",
    linkNeedsPassword:
      "An account cannot be linked in a session opened through a social network. Sign out, sign in with your email and password, then press “Link”.",
    linkNeedsNewSignIn:
      "An account cannot be linked in this session. Sign out, sign in with your email and password, then press “Link”.",
    staleForm: "Reload the page and try again.",
    refreshFailed: {
      title: "Glow Derma Admin — try again",
      heading: "Could not renew the session",
      body: (seconds: number) =>
        `The API did not answer for now. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`,
      retry: "Try again",
      signIn: "Sign in again",
    },
    page: {
      redirecting: "Redirecting…",
      continue: "Continue",
      notFoundTitle: "Not found",
      notFoundBody: "This address does not exist.",
      toSignIn: "To the sign-in page",
    },
  },
} satisfies CopySet<typeof uz>;

export type AuthDataCopy = (typeof authDataCopy)["uz"];
