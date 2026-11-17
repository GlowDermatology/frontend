import type { CopySet } from "@/lib/i18n/copy";

/** Texts of the brand components (the branded 404). Uzbek is the source. */
const uz = {
  notFound: {
    title: "Sahifa topilmadi",
    lead: "Havola eskirgan yoki manzil noto‘g‘ri yozilgan bo‘lishi mumkin.",
    home: "Bosh sahifaga qaytish",
  },
};

export const brandCopy = {
  uz,
  ru: {
    notFound: {
      title: "Страница не найдена",
      lead: "Возможно, ссылка устарела или адрес набран с ошибкой.",
      home: "Вернуться на главную",
    },
  },
  en: {
    notFound: {
      title: "Page not found",
      lead: "The link may be out of date, or the address may have a typo.",
      home: "Back to the home page",
    },
  },
} satisfies CopySet<typeof uz>;
