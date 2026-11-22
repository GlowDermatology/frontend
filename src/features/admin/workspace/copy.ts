import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/** Strings of the specialist workspace pages (`src/app/admin/(specialist)/**`). */
const uz = {
  unavailable: {
    /** 403: the account is not a specialist any more (changed to Staff while signed in). */
    paused:
      "Mutaxassis profilingiz hozir to‘xtatilgan. Savollar bo‘lsa, administratorga murojaat qiling.",
    failed: "Ma’lumotlarni yuklab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.",
    retry: "Qayta urinish",
  },
  schedule: {
    eyebrow: "Toshkent vaqti · 5 daqiqalik qadam",
    noClinic: "Ish vaqtini kiritish uchun klinika kerak: uni administrator biriktiradi.",
  },
  profile: {
    eyebrow: "Saytdagi profilingiz",
    published: "E’lon qilingan",
    draft: "Qoralama",
    clinicBlocker: "Klinika biriktirilmagan: administratorga murojaat qiling",
  },
  services: {
    count: (active: number, total: number) => `${active} ta faol · jami ${total} ta`,
  },
};

export const workspaceCopy = {
  uz,
  ru: {
    unavailable: {
      paused:
        "Ваш профиль специалиста сейчас приостановлен. По вопросам обратитесь к администратору.",
      failed: "Не удалось загрузить данные. Попробуйте ещё раз чуть позже.",
      retry: "Повторить",
    },
    schedule: {
      eyebrow: "Время Ташкента · шаг 5 минут",
      noClinic: "Чтобы задать рабочее время, нужна клиника: её назначает администратор.",
    },
    profile: {
      eyebrow: "Ваш профиль на сайте",
      published: "Опубликован",
      draft: "Черновик",
      clinicBlocker: "Клиника не назначена: обратитесь к администратору",
    },
    services: {
      count: (active: number, total: number) =>
        `${active} ${pluralRu(active, ["активная", "активные", "активных"])} · всего ${total}`,
    },
  },
  en: {
    unavailable: {
      paused: "Your specialist profile is paused right now. Please contact an administrator.",
      failed: "Could not load the data. Please try again in a moment.",
      retry: "Try again",
    },
    schedule: {
      eyebrow: "Tashkent time · 5-minute steps",
      noClinic: "Working hours need a clinic: an administrator assigns it.",
    },
    profile: {
      eyebrow: "Your profile on the website",
      published: "Published",
      draft: "Draft",
      clinicBlocker: "No clinic assigned: please contact an administrator",
    },
    services: {
      count: (active: number, total: number) =>
        `${active} active · ${total} ${pluralEn(total, ["service", "services"])}`,
    },
  },
} satisfies CopySet<typeof uz>;
