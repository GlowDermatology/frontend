import type { CopySet } from "@/lib/i18n/copy";
import { pluralRu } from "@/lib/format";

/**
 * Validation messages shared by the admin zod schemas (`localized(validationCopy, (m) => …)`), so
 * the same rule reads the same everywhere. Feature-specific messages ("Kategoriyani tanlang.") live
 * in the feature's own copy module. Uzbek is the source language.
 */
const uz = {
  required: "Majburiy maydon.",
  invalid: "Noto‘g‘ri qiymat.",
  notAllowed: "Ruxsat etilmagan qiymat.",
  integer: "Butun son kiriting.",
  chooseDate: "Sanani tanlang.",
  chooseTime: "Vaqtni tanlang.",
  phone: "Telefon raqamini to‘g‘ri kiriting.",
  email: "Email manzilini to‘g‘ri kiriting.",
  url: "Havolani to‘g‘ri kiriting (https://…).",
  requestKey: "Noto‘g‘ri so‘rov kaliti.",
  minChars: (min: number) => `Kamida ${min} ta belgi kiriting.`,
  maxChars: (max: number) => `${max} belgidan oshmasin.`,
  minValue: (min: string) => `${min} dan kam bo‘lmasin.`,
  maxValue: (max: string) => `${max} dan oshmasin.`,
};

export const validationCopy = {
  uz,
  ru: {
    required: "Обязательное поле.",
    invalid: "Неверное значение.",
    notAllowed: "Недопустимое значение.",
    integer: "Введите целое число.",
    chooseDate: "Выберите дату.",
    chooseTime: "Выберите время.",
    phone: "Введите правильный номер телефона.",
    email: "Введите правильный адрес электронной почты.",
    url: "Введите правильную ссылку (https://…).",
    requestKey: "Неверный ключ запроса.",
    minChars: (min: number) =>
      `Введите не менее ${min} ${pluralRu(min, ["символа", "символов", "символов"])}.`,
    maxChars: (max: number) =>
      `Не более ${max} ${pluralRu(max, ["символа", "символов", "символов"])}.`,
    minValue: (min: string) => `Не меньше ${min}.`,
    maxValue: (max: string) => `Не больше ${max}.`,
  },
  en: {
    required: "Required field.",
    invalid: "Invalid value.",
    notAllowed: "Value not allowed.",
    integer: "Enter a whole number.",
    chooseDate: "Choose a date.",
    chooseTime: "Choose a time.",
    phone: "Enter a valid phone number.",
    email: "Enter a valid email address.",
    url: "Enter a valid link (https://…).",
    requestKey: "Invalid request key.",
    minChars: (min: number) => `Enter at least ${min} ${min === 1 ? "character" : "characters"}.`,
    maxChars: (max: number) => `No more than ${max} ${max === 1 ? "character" : "characters"}.`,
    minValue: (min: string) => `Must be at least ${min}.`,
    maxValue: (max: string) => `Must not exceed ${max}.`,
  },
} satisfies CopySet<typeof uz>;
