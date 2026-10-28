/**
 * Error-page copy on its own, so the client error boundary imports these few
 * strings instead of the whole storefront dictionary.
 */
export const errorCopy = {
  uz: {
    notFoundTitle: "Sahifa topilmadi",
    notFoundBody: "Havola eskirgan yoki manzil noto‘g‘ri yozilgan bo‘lishi mumkin.",
    notFoundHome: "Bosh sahifaga qaytish",
    notFoundCatalog: "Katalogni ochish",
    errorTitle: "Sahifani yuklab bo‘lmadi",
    errorBody: "Server vaqtincha javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.",
    retry: "Qayta urinish",
  },
  ru: {
    notFoundTitle: "Страница не найдена",
    notFoundBody: "Ссылка устарела или адрес набран с ошибкой.",
    notFoundHome: "На главную",
    notFoundCatalog: "Открыть каталог",
    errorTitle: "Не удалось загрузить страницу",
    errorBody: "Сервер временно не ответил. Попробуйте ещё раз чуть позже.",
    retry: "Повторить",
  },
  en: {
    notFoundTitle: "Page not found",
    notFoundBody: "The link may be outdated or the address mistyped.",
    notFoundHome: "Back to the home page",
    notFoundCatalog: "Open the catalog",
    errorTitle: "This page could not be loaded",
    errorBody: "The server did not answer. Please try again in a moment.",
    retry: "Try again",
  },
} as const;

export type ErrorCopy = { [K in keyof (typeof errorCopy)["uz"]]: string };
