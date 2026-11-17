import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Texts of the pieces shared by the admin sections (`features/admin/shared`): the page loading
 * placeholder, pagination, the export menu, the in-page list filter and reorder buttons, the
 * client side of the Server Action plumbing and the website SEO fields. Uzbek is the source
 * language (the e2e specs drive the Uzbek labels).
 */
const uz = {
  loading: "Yuklanmoqda…",
  /** The synthetic `network_error` of a Server Action call that never reached the server. */
  network: "API bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.",

  pagination: {
    nav: "Sahifalar",
    previous: "Oldingi sahifa",
    next: "Keyingi sahifa",
    page: (n: number) => `${n}-sahifa`,
    firstPage: "Bu birinchi sahifa.",
    lastPage: "Bu oxirgi sahifa.",
  },

  export: {
    button: "Eksport",
    menu: "Eksport formati",
    preparing: "Tayyorlanmoqda…",
    csvHint: "Excel ochadi; UTF-8",
    failedTitle: "Eksport bajarilmadi",
    throttledTitle: "Biroz kuting",
    failed: "Eksport bajarilmadi. Qayta urinib ko‘ring.",
    sessionEnded: "Sessiya tugadi. Qaytadan kiring.",
  },

  listFilter: {
    status: "Holat",
    all: "Hammasi",
    active: "Faol",
    inactive: "Faol emas",
    reorderPaused: "Tartibni o‘zgartirish uchun filtrlarni tozalang.",
  },

  reorder: {
    up: (subject: string) => `«${subject}» yuqoriga`,
    down: (subject: string) => `«${subject}» pastga`,
    first: "Birinchi o‘rinda turibdi.",
    last: "Oxirgi o‘rinda turibdi.",
    moved: (subject: string, place: number) => `${subject} ${place}-o‘ringa ko‘chirildi.`,
  },

  seo: {
    slugLabel: "Manzil (slug)",
    slugHintNew:
      "Bo‘sh qoldirilsa, saqlanganda nomdan yasaladi. Lotin kichik harflari, raqamlar va chiziqcha.",
    slugHintSaved: "Lotin kichik harflari, raqamlar va chiziqcha; faqat raqamdan iborat bo‘lmasin.",
    slugPlaceholder: "masalan, gialuron-serum",
    fromName: "Nomdan yasash",
    publicAddress: "Saytdagi manzil:",
    afterSave: "saqlangandan keyin ko‘rinadi",
    slugChanged: (path: string) =>
      `Manzil o‘zgarsa, eski havola (${path}) ishlamay qoladi: saytda qayta yo‘naltirish saqlanmaydi.`,
    title: "SEO sarlavha",
    titleFallback: "Bo‘sh bo‘lsa, sayt nomdan foydalanadi.",
    description: "SEO tavsif",
    descriptionFallback: "Bo‘sh bo‘lsa, sayt tavsifdan yasaydi.",
    ideal: (min: number, max: number) => `Ideal: ${min}–${max} belgi.`,
    counter: {
      empty: "Bo‘sh — sayt o‘zi yasaydi",
      short: "Juda qisqa",
      ideal: "Ideal uzunlik",
      long: "Qidiruvda kesiladi",
    },
    snippet: "Qidiruvdagi ko‘rinishi",
    noDescription: "Tavsif yo‘q: sayt sahifa ma’lumotlaridan yasaydi.",
    fallbackNote: "Bo‘sh maydonlar o‘rniga sayt avtomatik matn ko‘rsatadi.",
    status: "SEO holati",
    allGood: "Hammasi joyida",
    errors: (n: number) => `${n} xato`,
    warnings: (n: number) => `${n} ogohlantirish`,
    notChecked: "Saqlangandan keyin tekshiriladi.",
    ready: "Hammasi joyida: sahifa qidiruv uchun tayyor.",
    language: (chip: string) => `Til: ${chip}`,
  },
};

export const sharedCopy = {
  uz,
  ru: {
    loading: "Загрузка…",
    network: "Не удалось связаться с API. Попробуйте ещё раз.",

    pagination: {
      nav: "Страницы",
      previous: "Предыдущая страница",
      next: "Следующая страница",
      page: (n: number) => `Страница ${n}`,
      firstPage: "Это первая страница.",
      lastPage: "Это последняя страница.",
    },

    export: {
      button: "Экспорт",
      menu: "Формат экспорта",
      preparing: "Готовится…",
      csvHint: "Открывается в Excel; UTF-8",
      failedTitle: "Экспорт не выполнен",
      throttledTitle: "Подождите немного",
      failed: "Экспорт не выполнен. Попробуйте ещё раз.",
      sessionEnded: "Сессия завершилась. Войдите снова.",
    },

    listFilter: {
      status: "Статус",
      all: "Все",
      active: "Активные",
      inactive: "Неактивные",
      reorderPaused: "Чтобы изменить порядок, сбросьте фильтры.",
    },

    reorder: {
      up: (subject: string) => `«${subject}»: выше`,
      down: (subject: string) => `«${subject}»: ниже`,
      first: "Уже на первом месте.",
      last: "Уже на последнем месте.",
      moved: (subject: string, place: number) => `${subject} перемещён на место ${place}.`,
    },

    seo: {
      slugLabel: "Адрес (slug)",
      slugHintNew:
        "Если оставить пустым, адрес будет создан из названия при сохранении. Строчные латинские буквы, цифры и дефис.",
      slugHintSaved: "Строчные латинские буквы, цифры и дефис; не только цифры.",
      slugPlaceholder: "например, gialuron-serum",
      fromName: "Создать из названия",
      publicAddress: "Адрес на сайте:",
      afterSave: "появится после сохранения",
      slugChanged: (path: string) =>
        `Если адрес изменится, старая ссылка (${path}) перестанет работать: перенаправление на сайте не сохраняется.`,
      title: "SEO-заголовок",
      titleFallback: "Если пусто, сайт использует название.",
      description: "SEO-описание",
      descriptionFallback: "Если пусто, сайт составит его из описания.",
      ideal: (min: number, max: number) => `Оптимально: ${min}–${max} ${ruChars(max)}.`,
      counter: {
        empty: "Пусто — сайт заполнит сам",
        short: "Слишком коротко",
        ideal: "Оптимальная длина",
        long: "Обрежется в поиске",
      },
      snippet: "Как это выглядит в поиске",
      noDescription: "Описания нет: сайт составит его из данных страницы.",
      fallbackNote: "Вместо пустых полей сайт покажет автоматический текст.",
      status: "SEO-статус",
      allGood: "Всё в порядке",
      errors: (n: number) => `${n} ${pluralRu(n, ["ошибка", "ошибки", "ошибок"])}`,
      warnings: (n: number) =>
        `${n} ${pluralRu(n, ["предупреждение", "предупреждения", "предупреждений"])}`,
      notChecked: "Проверяется после сохранения.",
      ready: "Всё в порядке: страница готова для поиска.",
      language: (chip: string) => `Язык: ${chip}`,
    },
  },
  en: {
    loading: "Loading…",
    network: "Could not reach the API. Please try again.",

    pagination: {
      nav: "Pages",
      previous: "Previous page",
      next: "Next page",
      page: (n: number) => `Page ${n}`,
      firstPage: "This is the first page.",
      lastPage: "This is the last page.",
    },

    export: {
      button: "Export",
      menu: "Export format",
      preparing: "Preparing…",
      csvHint: "Opens in Excel; UTF-8",
      failedTitle: "Export failed",
      throttledTitle: "Please wait a moment",
      failed: "The export failed. Please try again.",
      sessionEnded: "Your session has ended. Sign in again.",
    },

    listFilter: {
      status: "Status",
      all: "All",
      active: "Active",
      inactive: "Inactive",
      reorderPaused: "Clear the filters to change the order.",
    },

    reorder: {
      up: (subject: string) => `Move “${subject}” up`,
      down: (subject: string) => `Move “${subject}” down`,
      first: "Already in first place.",
      last: "Already in last place.",
      moved: (subject: string, place: number) => `${subject} moved to place ${place}.`,
    },

    seo: {
      slugLabel: "Address (slug)",
      slugHintNew:
        "If left empty, it is made from the name on save. Lowercase Latin letters, digits and hyphens.",
      slugHintSaved: "Lowercase Latin letters, digits and hyphens; not digits only.",
      slugPlaceholder: "e.g. gialuron-serum",
      fromName: "Make from name",
      publicAddress: "Address on the website:",
      afterSave: "shown after saving",
      slugChanged: (path: string) =>
        `If the address changes, the old link (${path}) stops working: the website keeps no redirect.`,
      title: "SEO title",
      titleFallback: "If empty, the website uses the name.",
      description: "SEO description",
      descriptionFallback: "If empty, the website builds it from the description.",
      ideal: (min: number, max: number) =>
        `Ideal: ${min}–${max} ${pluralEn(max, ["character", "characters"])}.`,
      counter: {
        empty: "Empty — the website fills it in",
        short: "Too short",
        ideal: "Ideal length",
        long: "Cut off in search",
      },
      snippet: "How it looks in search",
      noDescription: "No description: the website builds one from the page data.",
      fallbackNote: "The website shows automatic text in place of empty fields.",
      status: "SEO status",
      allGood: "All good",
      errors: (n: number) => `${n} ${pluralEn(n, ["error", "errors"])}`,
      warnings: (n: number) => `${n} ${pluralEn(n, ["warning", "warnings"])}`,
      notChecked: "Checked after saving.",
      ready: "All good: the page is ready for search.",
      language: (chip: string) => `Language: ${chip}`,
    },
  },
} satisfies CopySet<typeof uz>;

function ruChars(n: number): string {
  return pluralRu(n, ["символ", "символа", "символов"]);
}

export type SharedCopy = (typeof sharedCopy)["uz"];
