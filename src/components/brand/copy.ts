import type { CopySet } from "@/lib/i18n/copy";

/** Texts of the brand components (the branded 404, the theme control). Uzbek is the source. */
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

/**
 * The colour theme control (`ThemeSegments`, `ThemeMenu` in `components/ui/theme-control.tsx`),
 * shared by the storefront, the sign-in pages and the admin panel. Pass `themeCopy[locale]` as the
 * controls' `labels`.
 */
const themeUz = {
  /** The row / group name and the compact menu's accessible name. */
  label: "Mavzu",
  light: "Yorug‘",
  dark: "Qorong‘i",
  /** Follows the device's light or dark setting. */
  system: "Qurilmadagidek",
};

export const themeCopy = {
  uz: themeUz,
  ru: {
    label: "Тема",
    light: "Светлая",
    dark: "Тёмная",
    system: "Как на устройстве",
  },
  en: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    system: "Match device",
  },
} satisfies CopySet<typeof themeUz>;
