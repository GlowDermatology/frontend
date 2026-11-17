import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the Settings data layer (`src/data/settings.actions.ts` and its mock branch): the
 * refusals that are not password rules (those are in `passwordDataCopy`). Uzbek matches the
 * backend's texts.
 */
const uz = {
  notFound: "Topilmadi.",
  notAllowed: "Ruxsat etilmagan qiymat.",
};

export const settingsDataCopy = {
  uz,
  ru: { notFound: "Не найдено.", notAllowed: "Недопустимое значение." },
  en: { notFound: "Not found.", notAllowed: "This value is not allowed." },
} satisfies CopySet<typeof uz>;
