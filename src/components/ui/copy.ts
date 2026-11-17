import type { CopySet } from "@/lib/i18n/copy";

/** Russian plural form: 1 поле, 2 поля, 5 полей. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Strings of the shared UI kit (`src/components/ui`). Uzbek is the source language. */
const uz = {
  close: "Yopish",
  /** Name of the breadcrumb landmark. */
  breadcrumbs: "Yo‘l",
  select: {
    placeholder: "Tanlang",
  },
  combobox: {
    placeholder: "Qidirish…",
    empty: "Hech narsa topilmadi",
  },
  formErrors: {
    summaryTitle: (count: number) => `${count} ta maydonni tekshiring`,
    summaryLead: "Saqlashdan oldin quyidagilarni to‘g‘rilang:",
    toastTitle: "Saqlanmadi",
    toastDescription: (count: number) => `${count} ta maydonda xato bor`,
  },
  recommended: {
    title: "Ba’zi maydonlar bo‘sh",
    description:
      "Bu maydonlar majburiy emas, lekin to‘ldirilsa mijozlar uchun ma’lumot to‘liqroq bo‘ladi.",
    save: "Baribir saqlash",
    fix: "To‘ldirish",
  },
};

export const kitCopy = {
  uz,
  ru: {
    close: "Закрыть",
    breadcrumbs: "Навигационная цепочка",
    select: {
      placeholder: "Выберите",
    },
    combobox: {
      placeholder: "Поиск…",
      empty: "Ничего не найдено",
    },
    formErrors: {
      summaryTitle: (count: number) =>
        `Проверьте ${count} ${ruPlural(count, "поле", "поля", "полей")}`,
      summaryLead: "Перед сохранением исправьте следующее:",
      toastTitle: "Не сохранено",
      toastDescription: (count: number) =>
        `Ошибки в ${count} ${ruPlural(count, "поле", "полях", "полях")}`,
    },
    recommended: {
      title: "Некоторые поля не заполнены",
      description: "Эти поля необязательны, но с ними информация для клиентов будет полнее.",
      save: "Всё равно сохранить",
      fix: "Заполнить",
    },
  },
  en: {
    close: "Close",
    breadcrumbs: "Breadcrumb",
    select: {
      placeholder: "Choose",
    },
    combobox: {
      placeholder: "Search…",
      empty: "Nothing found",
    },
    formErrors: {
      summaryTitle: (count: number) => `Check ${count} ${count === 1 ? "field" : "fields"}`,
      summaryLead: "Before saving, correct the following:",
      toastTitle: "Not saved",
      toastDescription: (count: number) =>
        `${count} ${count === 1 ? "field has an error" : "fields have errors"}`,
    },
    recommended: {
      title: "Some fields are empty",
      description:
        "These fields are optional, but filling them in gives customers more complete information.",
      save: "Save anyway",
      fix: "Fill in",
    },
  },
} satisfies CopySet<typeof uz>;
