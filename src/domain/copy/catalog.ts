import { pluralEn, pluralRu } from "@/lib/format";
import type { CopySet } from "@/lib/i18n/copy";

/**
 * Messages of the catalog data layer (products, categories, banners, website SEO; DESIGN §G):
 * the zod schemas shared by the editors and the Server Actions, the actions' own refusals, the
 * mock branch's imitation of the backend's answers, and the domain labels (status, link kind,
 * last change, «SEO holati» issues). Uzbek is the source language and matches the backend's
 * texts word for word (the mock answers what Django answers).
 */

type Lang = "uz" | "ru" | "en";

const uz = {
  /* Shared rules */
  maxChars: (max: number) => `${max} belgidan oshmasin.`,
  checkFields: "Maydonlarni tekshiring.",
  checkImage: "Rasmni tekshiring.",
  checkOrder: "Tartibni tekshiring.",
  listMismatch: "Ro‘yxat joriy elementlarga mos emas.",
  notFoundShort: "Topilmadi.",
  valueTaken: "Bu qiymat band.",

  /* Image files */
  imageTooLarge: "Rasm 5 MB dan oshmasin.",
  imageType: "Faqat JPEG, PNG yoki WebP rasm.",
  imageFileRequired: "Rasm faylini tanlang.",
  tooManyImages: (max: number) => `Ko‘pi bilan ${max} ta rasm qo‘shish mumkin.`,
  imagesRepeated: "Rasmlar takrorlanmoqda.",
  checkImageOrder: "Rasmlar tartibini tekshiring.",

  /* Products */
  productNotFound: "Mahsulot topilmadi.",
  nameUzRequired: "O‘zbekcha nomni kiriting (kamida 2 belgi).",
  priceRequired: "Narxni kiriting.",
  priceInteger: "Narxni butun so‘mda kiriting.",
  priceMin: "Narx kamida 1 000 so‘m bo‘lsin.",
  priceMax: "Narx juda katta.",
  categoryUnknown: "Kategoriya topilmadi.",
  billzIdInvalid: "Billz ID yoki shtrix-kod 6–14 ta raqamdan iborat bo‘lsin.",
  activeNeedsCategory: "Faol mahsulot uchun kategoriyani tanlang.",
  activeNeedsImage: "Faol mahsulotda kamida bitta rasm bo‘lsin.",
  billzUnavailable:
    "Billz javob bermadi: mahsulot saqlanmadi. Kiritilgan ma’lumotlar joyida — birozdan so‘ng «Saqlash»ni qayta bosing.",
  productSlugTaken: "Bu manzil (slug) boshqa mahsulotda bor.",
  jobNotFound: "Jarayon topilmadi.",
  systemActor: "Tizim",
  lastChange: {
    created: "mahsulot yaratildi",
    priceChanged: (from: string, to: string) => `narx ${from} → ${to}`,
    activated: "faollashtirildi",
    hidden: "yashirildi",
    promoAdded: "aksiyaga qo‘shildi",
    promoRemoved: "aksiyadan olindi",
    updated: "ma’lumotlar yangilandi",
  },
  neverSynced: "hali sinxronlanmagan",

  /* Website slugs */
  slugInvalid: "Faqat lotin kichik harflari, raqamlar va chiziqcha (faqat raqam emas).",

  /* Categories */
  categorySlugInvalid: "Slug 2–40 ta kichik lotin harfi, raqam yoki defisdan iborat bo‘lsin.",
  slugReserved: "Bu slug band.",
  categoryNameUzRequired: "O‘zbekcha nomni kiriting (kamida 2 belgi).",
  categoryNotFound: "Kategoriya topilmadi.",
  slugsRepeated: "Sluglar takrorlanmoqda.",
  categoryHasProducts: "Kategoriyada mahsulotlar bor.",

  /* Banners */
  bannerTitleUzRequired: "O‘zbekcha sarlavhani kiriting.",
  dateTimeIncomplete: "Sana va vaqtni to‘liq kiriting.",
  dateInvalid: "Noto‘g‘ri sana.",
  chooseProduct: "Mahsulotni tanlang.",
  chooseCategory: "Kategoriyani tanlang.",
  enterUrl: "Havolani kiriting.",
  urlHttps: "Havolani https:// bilan to‘liq kiriting.",
  endAfterStart: "Tugash vaqti boshlanish vaqtidan keyin bo‘lsin.",
  bannerNotFound: "Banner topilmadi.",
  bannersRepeated: "Bannerlar takrorlanmoqda.",
  bannerImageRequired: "Banner rasmini tanlang.",
  linkKind: {
    none: "Havolasiz",
    product: "Mahsulot",
    category: "Kategoriya",
    url: "Havola (URL)",
  },
  linkProduct: (id: string) => `Mahsulot #${id}`,
  linkCategory: (name: string) => `Kategoriya: ${name}`,

  /* «SEO holati» */
  seo: {
    severity: { error: "Xatolar", warning: "Ogohlantirishlar", info: "Maslahatlar" },
    language: { uz: "o‘zbekcha", ru: "ruscha", en: "inglizcha" },
    titleMissing: (lang: string) => `SEO sarlavha (${lang}) yo‘q: sayt nomdan foydalanadi.`,
    titleShort: (lang: string, min: number) =>
      `SEO sarlavha (${lang}) juda qisqa: kamida ${min} belgi yozing.`,
    titleLong: (lang: string, max: number) =>
      `SEO sarlavha (${lang}) ${max} belgidan uzun: qidiruvda kesiladi.`,
    descriptionMissing: (lang: string) => `SEO tavsif (${lang}) yo‘q: sayt uni tavsifdan yasaydi.`,
    descriptionShort: (lang: string, min: number) =>
      `SEO tavsif (${lang}) juda qisqa: kamida ${min} belgi yozing.`,
    descriptionLong: (lang: string, max: number) =>
      `SEO tavsif (${lang}) ${max} belgidan uzun: qidiruvda kesiladi.`,
    nameMissing: "O‘zbekcha nom yo‘q: sahifa Billz nomi bilan chiqadi.",
    nameTranslationMissing: (lang: string) => `Nomning ${lang} tarjimasi yo‘q.`,
    productDescriptionMissing: (lang: string) => `Tavsif (${lang}) yo‘q.`,
    productDescriptionShort: (lang: string, min: number) =>
      `Tavsif (${lang}) juda qisqa: kamida ${min} belgi yozing.`,
    imagesMissing: "Mahsulotda rasm yo‘q.",
    altTextFallback: "Rasmlarning alt matni mahsulot nomidan olinadi: o‘zbekcha nomni kiriting.",
    categoryMissing: "Kategoriya tanlanmagan: sahifa katalog yo‘lida ko‘rinmaydi.",
    imageMissing: "Kategoriya rasmi yo‘q: ijtimoiy tarmoqlarda umumiy rasm chiqadi.",
    noActiveProducts: "Kategoriyada faol mahsulot yo‘q: sahifa bo‘sh ko‘rinadi.",
  },
};

const ruChars = (n: number) => pluralRu(n, ["символ", "символа", "символов"]);
const enChars = (n: number) => pluralEn(n, ["character", "characters"]);

export const catalogDataCopy = {
  uz,
  ru: {
    maxChars: (max: number) =>
      `Не более ${max} ${pluralRu(max, ["символа", "символов", "символов"])}.`,
    checkFields: "Проверьте поля.",
    checkImage: "Проверьте изображение.",
    checkOrder: "Проверьте порядок.",
    listMismatch: "Список не совпадает с текущими элементами.",
    notFoundShort: "Не найдено.",
    valueTaken: "Это значение уже занято.",

    imageTooLarge: "Изображение должно быть не больше 5 МБ.",
    imageType: "Только изображения JPEG, PNG или WebP.",
    imageFileRequired: "Выберите файл изображения.",
    tooManyImages: (max: number) =>
      `Можно добавить не более ${max} ${pluralRu(max, ["изображения", "изображений", "изображений"])}.`,
    imagesRepeated: "Изображения повторяются.",
    checkImageOrder: "Проверьте порядок изображений.",

    productNotFound: "Товар не найден.",
    nameUzRequired: "Введите название на узбекском (не менее 2 символов).",
    priceRequired: "Введите цену.",
    priceInteger: "Введите цену в целых сумах.",
    priceMin: "Цена должна быть не меньше 1 000 сум.",
    priceMax: "Слишком большая цена.",
    categoryUnknown: "Категория не найдена.",
    billzIdInvalid: "Billz ID или штрихкод должен состоять из 6–14 цифр.",
    activeNeedsCategory: "Для активного товара выберите категорию.",
    activeNeedsImage: "У активного товара должно быть хотя бы одно изображение.",
    billzUnavailable:
      "Billz не ответил: товар не сохранён. Введённые данные на месте — через минуту снова нажмите «Сохранить».",
    productSlugTaken: "Этот адрес (slug) уже занят другим товаром.",
    jobNotFound: "Задача не найдена.",
    systemActor: "Система",
    lastChange: {
      created: "товар создан",
      priceChanged: (from: string, to: string) => `цена ${from} → ${to}`,
      activated: "активирован",
      hidden: "скрыт",
      promoAdded: "добавлен в акцию",
      promoRemoved: "убран из акции",
      updated: "данные обновлены",
    },
    neverSynced: "ещё не синхронизировано",

    slugInvalid: "Только строчные латинские буквы, цифры и дефис (не только цифры).",

    categorySlugInvalid: "Slug: 2–40 строчных латинских букв, цифр или дефисов.",
    slugReserved: "Этот slug занят.",
    categoryNameUzRequired: "Введите название на узбекском (не менее 2 символов).",
    categoryNotFound: "Категория не найдена.",
    slugsRepeated: "Slug-и повторяются.",
    categoryHasProducts: "В категории есть товары.",

    bannerTitleUzRequired: "Введите заголовок на узбекском.",
    dateTimeIncomplete: "Введите дату и время полностью.",
    dateInvalid: "Неверная дата.",
    chooseProduct: "Выберите товар.",
    chooseCategory: "Выберите категорию.",
    enterUrl: "Введите ссылку.",
    urlHttps: "Введите полную ссылку, начинающуюся с https://.",
    endAfterStart: "Время окончания должно быть позже времени начала.",
    bannerNotFound: "Баннер не найден.",
    bannersRepeated: "Баннеры повторяются.",
    bannerImageRequired: "Выберите изображение баннера.",
    linkKind: {
      none: "Без ссылки",
      product: "Товар",
      category: "Категория",
      url: "Ссылка (URL)",
    },
    linkProduct: (id: string) => `Товар #${id}`,
    linkCategory: (name: string) => `Категория: ${name}`,

    seo: {
      severity: { error: "Ошибки", warning: "Предупреждения", info: "Советы" },
      language: { uz: "узбекский", ru: "русский", en: "английский" },
      titleMissing: (lang: string) => `Нет SEO-заголовка (${lang}): сайт использует название.`,
      titleShort: (lang: string, min: number) =>
        `SEO-заголовок (${lang}) слишком короткий: напишите не менее ${min} ${ruChars(min)}.`,
      titleLong: (lang: string, max: number) =>
        `SEO-заголовок (${lang}) длиннее ${max} ${ruChars(max)}: в поиске он будет обрезан.`,
      descriptionMissing: (lang: string) =>
        `Нет SEO-описания (${lang}): сайт составит его из описания.`,
      descriptionShort: (lang: string, min: number) =>
        `SEO-описание (${lang}) слишком короткое: напишите не менее ${min} ${ruChars(min)}.`,
      descriptionLong: (lang: string, max: number) =>
        `SEO-описание (${lang}) длиннее ${max} ${ruChars(max)}: в поиске оно будет обрезано.`,
      nameMissing: "Нет названия на узбекском: страница выйдет с названием из Billz.",
      nameTranslationMissing: (lang: string) => `Нет перевода названия (${lang}).`,
      productDescriptionMissing: (lang: string) => `Нет описания (${lang}).`,
      productDescriptionShort: (lang: string, min: number) =>
        `Описание (${lang}) слишком короткое: напишите не менее ${min} ${ruChars(min)}.`,
      imagesMissing: "У товара нет изображений.",
      altTextFallback:
        "Alt-текст изображений берётся из названия товара: введите название на узбекском.",
      categoryMissing: "Категория не выбрана: страница не появится в разделах каталога.",
      imageMissing: "Нет изображения категории: в соцсетях появится общая картинка.",
      noActiveProducts: "В категории нет активных товаров: страница будет пустой.",
    },
  },
  en: {
    maxChars: (max: number) => `No more than ${max} ${enChars(max)}.`,
    checkFields: "Check the fields.",
    checkImage: "Check the image.",
    checkOrder: "Check the order.",
    listMismatch: "The list does not match the current items.",
    notFoundShort: "Not found.",
    valueTaken: "This value is already taken.",

    imageTooLarge: "The image must not exceed 5 MB.",
    imageType: "JPEG, PNG or WebP images only.",
    imageFileRequired: "Choose an image file.",
    tooManyImages: (max: number) =>
      `You can add up to ${max} ${pluralEn(max, ["image", "images"])}.`,
    imagesRepeated: "The images repeat.",
    checkImageOrder: "Check the image order.",

    productNotFound: "Product not found.",
    nameUzRequired: "Enter the Uzbek name (at least 2 characters).",
    priceRequired: "Enter the price.",
    priceInteger: "Enter the price in whole sums.",
    priceMin: "The price must be at least 1,000 UZS.",
    priceMax: "The price is too high.",
    categoryUnknown: "Category not found.",
    billzIdInvalid: "The Billz ID or barcode must be 6–14 digits.",
    activeNeedsCategory: "Choose a category for an active product.",
    activeNeedsImage: "An active product needs at least one image.",
    billzUnavailable:
      "Billz did not respond, so the product was not saved. Everything you entered is still here — press “Save” again in a moment.",
    productSlugTaken: "Another product already uses this address (slug).",
    jobNotFound: "Job not found.",
    systemActor: "System",
    lastChange: {
      created: "product created",
      priceChanged: (from: string, to: string) => `price ${from} → ${to}`,
      activated: "activated",
      hidden: "hidden",
      promoAdded: "added to the promotion",
      promoRemoved: "removed from the promotion",
      updated: "details updated",
    },
    neverSynced: "not synced yet",

    slugInvalid: "Lowercase Latin letters, digits and hyphens only (not digits alone).",

    categorySlugInvalid: "The slug must be 2–40 lowercase Latin letters, digits or hyphens.",
    slugReserved: "This slug is reserved.",
    categoryNameUzRequired: "Enter the Uzbek name (at least 2 characters).",
    categoryNotFound: "Category not found.",
    slugsRepeated: "The slugs repeat.",
    categoryHasProducts: "The category has products.",

    bannerTitleUzRequired: "Enter the Uzbek title.",
    dateTimeIncomplete: "Enter the full date and time.",
    dateInvalid: "Invalid date.",
    chooseProduct: "Choose a product.",
    chooseCategory: "Choose a category.",
    enterUrl: "Enter the link.",
    urlHttps: "Enter the full link starting with https://.",
    endAfterStart: "The end must be later than the start.",
    bannerNotFound: "Banner not found.",
    bannersRepeated: "The banners repeat.",
    bannerImageRequired: "Choose the banner image.",
    linkKind: {
      none: "No link",
      product: "Product",
      category: "Category",
      url: "Link (URL)",
    },
    linkProduct: (id: string) => `Product #${id}`,
    linkCategory: (name: string) => `Category: ${name}`,

    seo: {
      severity: { error: "Errors", warning: "Warnings", info: "Tips" },
      language: { uz: "Uzbek", ru: "Russian", en: "English" },
      titleMissing: (lang: string) => `No SEO title (${lang}): the website uses the name.`,
      titleShort: (lang: string, min: number) =>
        `The SEO title (${lang}) is too short: write at least ${min} ${enChars(min)}.`,
      titleLong: (lang: string, max: number) =>
        `The SEO title (${lang}) is longer than ${max} ${enChars(max)}: search results cut it off.`,
      descriptionMissing: (lang: string) =>
        `No SEO description (${lang}): the website builds one from the description.`,
      descriptionShort: (lang: string, min: number) =>
        `The SEO description (${lang}) is too short: write at least ${min} ${enChars(min)}.`,
      descriptionLong: (lang: string, max: number) =>
        `The SEO description (${lang}) is longer than ${max} ${enChars(max)}: search results cut it off.`,
      nameMissing: "No Uzbek name: the page shows the Billz name.",
      nameTranslationMissing: (lang: string) => `The name has no ${lang} translation.`,
      productDescriptionMissing: (lang: string) => `No description (${lang}).`,
      productDescriptionShort: (lang: string, min: number) =>
        `The description (${lang}) is too short: write at least ${min} ${enChars(min)}.`,
      imagesMissing: "The product has no images.",
      altTextFallback: "The image alt text comes from the product name: enter the Uzbek name.",
      categoryMissing: "No category chosen: the page does not appear in the catalog sections.",
      imageMissing: "No category image: social networks show a generic picture.",
      noActiveProducts: "The category has no active products: the page looks empty.",
    },
  },
} satisfies CopySet<typeof uz>;

export type CatalogDataCopy = (typeof catalogDataCopy)[Lang];
