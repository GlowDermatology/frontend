import type { CopySet } from "@/lib/i18n/copy";

/** Strings of the specialist workspace pages (`src/app/admin/(specialist)/**`). */
const uz = {
  placeholder: {
    title: "Bu bo‘lim tayyorlanmoqda",
    description: "Hozircha qabullaringiz va ish vaqtingiz «Qabullar» sahifasida.",
    open: "Qabullarni ochish",
  },
};

export const workspaceCopy = {
  uz,
  ru: {
    placeholder: {
      title: "Этот раздел готовится",
      description: "Пока ваши приёмы и рабочее время находятся на странице «Приёмы».",
      open: "Открыть приёмы",
    },
  },
  en: {
    placeholder: {
      title: "This section is being prepared",
      description: "For now, your appointments and working hours are on the «Appointments» page.",
      open: "Open appointments",
    },
  },
} satisfies CopySet<typeof uz>;
