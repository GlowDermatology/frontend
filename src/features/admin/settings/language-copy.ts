import type { CopySet } from "@/lib/i18n/copy";

/**
 * Strings of the Settings language card (`language-card.tsx`). Kept apart from the settings
 * screen's own copy so the card can ship before the screen's sweep; fold it into
 * `settings/copy.ts` then if that reads better. Uzbek is the source language.
 */
const uz = {
  title: "Interfeys tili",
  description:
    "Admin panel shu tilda ko‘rsatiladi. Tanlov hisobingizga saqlanadi va boshqa qurilmalarda ham qo‘llanadi.",
  /** The languages named in the interface's language (the option's own name is shown above it). */
  names: { uz: "O‘zbek tili", ru: "Rus tili", en: "Ingliz tili" },
  current: "Hozirgi",
  save: "Saqlash",
  unchanged: "Bu til hozir ishlatilmoqda. Boshqa tilni belgilang.",
  /** Shown in the NEW language once it is saved. */
  saved: "Til saqlandi",
  savedDescription: "Admin panel endi o‘zbek tilida.",
  failed: "Til saqlanmadi",
};

export const languageCopy = {
  uz,
  ru: {
    title: "Язык интерфейса",
    description:
      "На этом языке показывается админка. Выбор сохраняется в вашей учётной записи и действует на других устройствах.",
    names: { uz: "Узбекский", ru: "Русский", en: "Английский" },
    current: "Текущий",
    save: "Сохранить",
    unchanged: "Этот язык уже используется. Отметьте другой.",
    saved: "Язык сохранён",
    savedDescription: "Админка теперь на русском языке.",
    failed: "Язык не сохранён",
  },
  en: {
    title: "Interface language",
    description:
      "The admin panel is shown in this language. The choice is saved to your account and applies on your other devices too.",
    names: { uz: "Uzbek", ru: "Russian", en: "English" },
    current: "Current",
    save: "Save",
    unchanged: "This language is already in use. Choose another one.",
    saved: "Language saved",
    savedDescription: "The admin panel is now in English.",
    failed: "Language not saved",
  },
} satisfies CopySet<typeof uz>;
