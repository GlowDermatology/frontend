import type { CopySet } from "@/lib/i18n/copy";

/**
 * The «Ekranlarga moslash» dialog and the image tiles' shape and source badges (backend 0bcf0a5
 * renditions) in the admin languages.
 */
const uz = {
  menuItem: "Ekranlarga moslash",
  saveFirst: "Avval saqlang: yangi rasmni saqlangandan keyin moslash mumkin.",
  title: "Ekranlarga moslash",
  lead: (label: string) =>
    `«${label}»: sayt va ilova uchun 4:5 hamda kvadrat kesim. Asl rasm o‘zgarmaydi.`,
  shapes: {
    portrait: {
      title: "4:5 — kartochkalar, mahsulot sahifasi, savat",
      label: "4:5 kesim",
    },
    square: {
      title: "1:1 — bosh sahifa, lenta, kichik rasmlar",
      label: "Kvadrat kesim",
    },
  },
  hint: "Sudrab suring yoki strelkalar bilan siljiting (Shift bilan tezroq). + va − bilan yaqinlashtiring.",
  zoom: (shape: string) => `${shape}: yaqinlashtirish`,
  zoomText: (percent: number) => `${percent} foiz`,
  stored: {
    manual: "Saqlangan: qo‘lda kesilgan",
    auto: "Saqlangan: avtomatik",
    none: "Hali kesilmagan: rasmning o‘zi ko‘rsatiladi",
  },
  auto: "Avtomatik",
  autoNote: "Saqlanganda server mahsulot atrofidan o‘zi kesadi.",
  remove: "Olib tashlash",
  removeNote: "Saqlanganda bu kesim olib tashlanadi: rasmning o‘zi ko‘rsatiladi.",
  manual: "Qo‘lda kesish",
  unknownSize: "Rasm o‘lchami noma’lum: faqat avtomatik kesish mumkin.",
  save: "Saqlash",
  saving: "Saqlanmoqda…",
  cancel: "Bekor qilish",
  nothingChanged: "Hech narsa o‘zgarmadi: kesimni suring yoki «Avtomatik»ni tanlang.",
  savedToast: "Ekran kesimlari saqlandi",
  savedLead: "Sayt va ilova yangi kesimlarni ko‘rsatadi.",
  failedToast: "Kesimlar saqlanmadi",
  badges: {
    shapesLabel: (shapes: string) => `Ekran kesimlari: ${shapes}`,
    portrait: "4:5",
    square: "1:1",
    source: {
      studio: "Studiya",
      ai_scene: "AI sahna",
    },
  },
};

export const renditionsCopy = {
  uz,
  ru: {
    menuItem: "Подогнать под экраны",
    saveFirst: "Сначала сохраните: новое изображение можно подогнать после сохранения.",
    title: "Подогнать под экраны",
    lead: (label: string) =>
      `«${label}»: кадры 4:5 и квадрат для сайта и приложения. Исходное изображение не меняется.`,
    shapes: {
      portrait: {
        title: "4:5 — карточки, страница товара, корзина",
        label: "Кадр 4:5",
      },
      square: {
        title: "1:1 — главная, лента, миниатюры",
        label: "Квадратный кадр",
      },
    },
    hint: "Перетаскивайте или двигайте стрелками (с Shift быстрее). + и − меняют масштаб.",
    zoom: (shape: string) => `${shape}: масштаб`,
    zoomText: (percent: number) => `${percent} процентов`,
    stored: {
      manual: "Сохранено: кадр вручную",
      auto: "Сохранено: автоматически",
      none: "Кадра ещё нет: показывается само изображение",
    },
    auto: "Автоматически",
    autoNote: "При сохранении сервер сам кадрирует вокруг товара.",
    remove: "Убрать",
    removeNote: "При сохранении кадр будет убран: покажется само изображение.",
    manual: "Кадрировать вручную",
    unknownSize: "Размер изображения неизвестен: доступно только автоматическое кадрирование.",
    save: "Сохранить",
    saving: "Сохранение…",
    cancel: "Отмена",
    nothingChanged: "Ничего не изменилось: сдвиньте кадр или выберите «Автоматически».",
    savedToast: "Кадры для экранов сохранены",
    savedLead: "Сайт и приложение покажут новые кадры.",
    failedToast: "Кадры не сохранены",
    badges: {
      shapesLabel: (shapes: string) => `Кадры для экранов: ${shapes}`,
      portrait: "4:5",
      square: "1:1",
      source: {
        studio: "Студия",
        ai_scene: "AI-сцена",
      },
    },
  },
  en: {
    menuItem: "Fit to screens",
    saveFirst: "Save first: a new image can be fitted once it is saved.",
    title: "Fit to screens",
    lead: (label: string) =>
      `“${label}”: 4:5 and square crops for the website and the app. The original stays as it is.`,
    shapes: {
      portrait: {
        title: "4:5 — cards, product page, cart",
        label: "4:5 crop",
      },
      square: {
        title: "1:1 — home page, feed, thumbnails",
        label: "Square crop",
      },
    },
    hint: "Drag, or move with the arrow keys (faster with Shift). + and − zoom.",
    zoom: (shape: string) => `${shape}: zoom`,
    zoomText: (percent: number) => `${percent} percent`,
    stored: {
      manual: "Saved: cropped by hand",
      auto: "Saved: automatic",
      none: "Not cropped yet: the image itself is shown",
    },
    auto: "Automatic",
    autoNote: "On save the server crops around the product itself.",
    remove: "Remove",
    removeNote: "On save this crop is removed: the image itself is shown.",
    manual: "Crop by hand",
    unknownSize: "The image size is unknown: only the automatic crop is possible.",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    nothingChanged: "Nothing changed: move a crop or choose “Automatic”.",
    savedToast: "Screen crops saved",
    savedLead: "The website and the app show the new crops.",
    failedToast: "Crops not saved",
    badges: {
      shapesLabel: (shapes: string) => `Screen crops: ${shapes}`,
      portrait: "4:5",
      square: "1:1",
      source: {
        studio: "Studio",
        ai_scene: "AI scene",
      },
    },
  },
} satisfies CopySet<typeof uz>;

export type RenditionsCopy = (typeof renditionsCopy)["uz"];
