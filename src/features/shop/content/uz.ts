import { errorCopy } from "./errors";

/**
 * Storefront copy — Uzbek (Latin), the default language. The o‘/g‘ mark is
 * always U+2018 (‘) and the tutuq belgisi U+2019 (’), as in the landing.
 * Eyebrows and badges are written in sentence case and uppercased with CSS.
 */
export const uz = {
  localeName: "O‘zbekcha",
  skipLink: "Asosiy kontentga o‘tish",
  meta: {
    siteName: "Glow Derma",
    homeTitle: "Glow Derma — dermokosmetika do‘koni va dermatolog qabuli Toshkentda",
    homeDescription:
      "Dermatolog va kosmetologlar tanlagan parvarish vositalari, mutaxassis qabuli va har bir xariddan cashback. Toshkent bo‘ylab yetkazib berish yoki do‘kondan olib ketish.",
    catalogTitle: "Katalog — parvarish vositalari",
    catalogDescription:
      "Glow Derma katalogi: serumlar, kremlar, tozalash vositalari va quyoshdan himoya. Narxlar so‘mda, qoldiq do‘kon bazasidan.",
    searchTitle: (query: string) => `«${query}» bo‘yicha qidiruv`,
    pageSuffix: (page: number) => `${page}-sahifa`,
    categoryTitle: (name: string) => `${name} — parvarish vositalari`,
    categoryDescription: (name: string, count: number) =>
      `${name}: Glow Derma katalogida ${count} ta mahsulot. Dermatologlar tanlagan vositalar, narxlar so‘mda, Toshkent bo‘ylab yetkazib berish.`,
    productDescription: (parts: {
      name: string;
      volume: string;
      category: string | null;
      price: string;
    }) =>
      [
        `${parts.name}${parts.volume ? `, ${parts.volume}` : ""}`,
        parts.category ? `${parts.category} toifasidan` : null,
        `narxi ${parts.price}`,
        "Glow Derma do‘konida, cashback va yetkazib berish bilan",
      ]
        .filter(Boolean)
        .join(" — ") + ".",
    specialistsTitle: "Mutaxassislar — dermatolog va kosmetologlar",
    specialistsDescription:
      "Glow Derma klinikasining dermatolog va kosmetologlari: tajriba, xizmatlar va narxlar. Qabulga onlayn yoziling.",
    specialistTitle: (name: string, role: string) => `${name} — ${role}`,
    specialistDescription: (name: string, role: string, services: string) =>
      `${name}, ${role.toLowerCase()} — Glow Derma klinikasi.${services ? ` Xizmatlar: ${services}.` : ""} Qabulga yoziling.`,
    servicesTitle: "Xizmatlar va narxlar — dermatologiya va kosmetologiya",
    servicesDescription:
      "Dermatolog konsultatsiyasi, yuzni tozalash va boshqa muolajalar: davomiyligi va narxlari. Glow Derma klinikasi, Toshkent.",
    termsTitle: "Foydalanish shartlari",
    privacyTitle: "Maxfiylik siyosati",
    bookingPolicyTitle: "Qabul qoidalari",
    legalDescription: (title: string) => `Glow Derma: ${title.toLowerCase()}.`,
    ogAlt: "Glow Derma — kosmetologiya va dermatologiya",
    searchAction: "Glow Derma katalogidan qidirish",
  },
  header: {
    home: "Glow Derma — bosh sahifa",
    navLabel: "Asosiy menyu",
    menuOpen: "Menyuni ochish",
    menuClose: "Menyuni yopish",
    languageLabel: "Til",
    catalog: "Katalog",
    specialists: "Mutaxassislar",
    services: "Xizmatlar",
    search: "Qidirish",
    account: "Hisob",
    signIn: "Kirish",
    cart: "Savat",
  },
  footer: {
    tagline:
      "Dermatolog va kosmetologlar tanlagan parvarish, mutaxassis qabuli va har bir xariddan cashback.",
    shopHeading: "Do‘kon",
    clinicHeading: "Klinika",
    docsHeading: "Hujjatlar",
    contactsHeading: "Aloqa",
    allProducts: "Barcha mahsulotlar",
    copyright: (year: number) => `© ${year} Glow Derma`,
    languages: "O‘zbekcha · Русский · English",
    support: "Qo‘llab-quvvatlash",
    store: "Do‘kon",
    clinic: "Kosmetolog",
  },
  home: {
    heroEyebrow: "Kosmetologiya va dermatologiya",
    heroTitleStart: "Teringiz",
    heroTitleEmphasis: "porlashga",
    heroTitleEnd: "loyiq",
    heroLead:
      "Dermatolog va kosmetologlar tanlagan parvarish vositalari, mutaxassis qabuli va har bir xariddan qaytadigan cashback.",
    heroCatalog: "Katalogga o‘tish",
    heroBook: "Qabulga yozilish",
    bannersLabel: "Aksiyalar",
    categoriesEyebrow: "Toifalar",
    categoriesTitle: "Teringiz uchun kerakli parvarish",
    categoriesLink: "Barcha mahsulotlar",
    featuredEyebrow: "Tanlov",
    featuredTitle: "Mutaxassislar tavsiya qiladi",
    featuredLink: "Katalogni ochish",
    specialistsEyebrow: "Klinika",
    specialistsTitle: "Shifokorlarimiz bilan tanishing",
    specialistsLink: "Barcha mutaxassislar",
    clinicEyebrow: "Tashrif",
    clinicTitle: "Do‘kon va klinika bir manzilda",
    clinicLead:
      "Buyurtmani do‘kondan olib keting yoki mutaxassis qabuliga yoziling — barchasi bitta joyda.",
    addressLabel: "Manzil",
    phonesLabel: "Telefonlar",
    servicesLink: "Xizmatlar va narxlar",
  },
  catalog: {
    title: "Katalog",
    lead: "Dermatolog va kosmetologlar tanlagan parvarish vositalari.",
    searchLabel: "Mahsulot qidirish",
    searchPlaceholder: "Masalan, ko‘pik yoki SPF",
    searchSubmit: "Qidirish",
    clearSearch: "Qidiruvni tozalash",
    filtersLabel: "Saralash va filtrlar",
    categoryLabel: "Toifa",
    allCategories: "Barchasi",
    sortLabel: "Tartib",
    sorts: {
      default: "Yangilari",
      price: "Arzonroq",
      "-price": "Qimmatroq",
      name: "Nomi bo‘yicha",
    },
    sortApply: "Qo‘llash",
    inStock: "Faqat mavjudlari",
    results: (count: number) => `${count} ta mahsulot`,
    resultsFor: (count: number, query: string) => `«${query}» bo‘yicha ${count} ta mahsulot`,
    shortQuery: "Kamida 2 ta harf kiriting.",
    emptyTitle: "Hech narsa topilmadi",
    emptyBody: "So‘rovni o‘zgartirib ko‘ring yoki filtrlarni olib tashlang.",
    emptyCategory: "Bu toifada hozircha mahsulot yo‘q.",
    resetFilters: "Filtrlarni tozalash",
    paginationLabel: "Sahifalar",
    previous: "Oldingi",
    next: "Keyingi",
    pageLabel: (page: number) => `${page}-sahifa`,
    pageOf: (page: number, total: number) => `${total} sahifadan ${page}-si`,
  },
  product: {
    breadcrumbHome: "Bosh sahifa",
    breadcrumbCatalog: "Katalog",
    breadcrumbLabel: "Sahifa yo‘li",
    volume: "Hajmi",
    brand: "Brend",
    category: "Toifa",
    inStock: "Mavjud",
    lowStock: (count: number) => `Oz qoldi: ${count} ta`,
    outOfStock: "Tugagan",
    promo: "Aksiya",
    oldPrice: "Avvalgi narx:",
    description: "Tavsif",
    ingredients: "Tarkibi",
    usage: "Qo‘llash tartibi",
    addToCart: "Savatga qo‘shish",
    soldOut: "Hozircha mavjud emas",
    salesOff:
      "Onlayn buyurtma vaqtincha mavjud emas. Mahsulotni do‘konimizdan xarid qilishingiz mumkin.",
    pickupNote: "Do‘kondan olib ketish yoki Toshkent bo‘ylab yetkazib berish",
    cashbackNote: "Har bir xariddan cashback",
    related: "Shu toifadan",
    alternatives: "Sotuvda bor o‘xshash mahsulotlar",
    galleryLabel: "Mahsulot rasmlari",
    imageLabel: (index: number, total: number) => `${total} ta rasmdan ${index}-si`,
    noImage: "Rasm hali qo‘shilmagan",
  },
  specialists: {
    title: "Mutaxassislar",
    lead: "Glow Derma klinikasining dermatolog va kosmetologlari.",
    experience: (years: number) => `${years} yillik tajriba`,
    services: "Xizmatlar",
    book: "Qabulga yozilish",
    viewProfile: "Batafsil",
    location: "Qabul joyi",
    qualifications: "Malaka va sertifikatlar",
    about: "Shifokor haqida",
    empty: "Mutaxassislar ro‘yxati tez orada e’lon qilinadi.",
    servicesCount: (count: number) => `${count} ta xizmat`,
    priceFrom: (price: string) => `${price}dan`,
    serviceColumns: { service: "Xizmat", duration: "Davomiyligi", price: "Narxi" },
    others: "Boshqa mutaxassislar",
    bookService: (name: string) => `${name}: qabulga yozilish`,
  },
  services: {
    title: "Xizmatlar va narxlar",
    lead: "Dermatologiya va kosmetologiya muolajalari, davomiyligi va narxlari.",
    duration: "Davomiyligi",
    price: "Narxi",
    priceRange: (from: string, to: string) => `${from} — ${to}`,
    offeredBy: "Mutaxassislar",
    book: "Qabulga yozilish",
    empty: "Xizmatlar ro‘yxati tez orada e’lon qilinadi.",
  },
  legal: {
    updated: (date: string) => `Tahrir: ${date}`,
    version: (version: string) => `Versiya ${version}`,
    empty: "Matn hali e’lon qilinmagan.",
    docsLabel: "Boshqa hujjatlar",
  },
  placeholder: {
    cartTitle: "Savat",
    cartBody:
      "Saytdan buyurtma berish tez orada ishga tushadi. Hozircha mahsulotlarni Glow Derma ilovasi orqali yoki do‘konimizdan xarid qilishingiz mumkin.",
    signInTitle: "Hisobga kirish",
    signInBody:
      "Saytda hisobga kirish tez orada ishga tushadi. Hozircha buyurtma, qabul va cashback Glow Derma ilovasida.",
    bookingTitle: "Qabulga yozilish",
    bookingBody:
      "Saytdan qabulga yozilish tez orada ishga tushadi. Hozircha ilova orqali yoki telefon bilan yoziling.",
    backToCatalog: "Katalogga qaytish",
    callUs: "Qo‘ng‘iroq qilish",
    appStore: "App Store",
    googlePlay: "Google Play",
  },
  errors: errorCopy.uz,
  stock: {
    in_stock: "Mavjud",
    low: "Oz qoldi",
    out_of_stock: "Tugagan",
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type ShopDictionary = Widen<typeof uz>;
