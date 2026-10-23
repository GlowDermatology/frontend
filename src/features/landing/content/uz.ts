/**
 * Landing page copy — Uzbek (Latin), verbatim from the design.
 *
 * Bracketed values such as "[Do‘kon manzili]" are placeholders in the design
 * itself: the business has not supplied them yet. They are kept as-is and
 * listed in the README so they are not shipped by accident.
 *
 * Eyebrows and badges are written in sentence case and uppercased with CSS so
 * screen readers do not spell them out.
 */
export const uz = {
  meta: {
    title: "Glow Derma — parvarish, mutaxassis qabuli va cashback bitta ilovada",
    description:
      "Dermatolog va kosmetologlar tanlagan parvarish vositalari, mutaxassis qabuli va har bir xariddan qaytadigan cashback — barchasi Glow Derma ilovasida.",
    ogAlt: "Glow Derma — kosmetologiya va dermatologiya",
  },
  skipLink: "Asosiy kontentga o‘tish",
  header: {
    home: "Glow Derma — bosh sahifa",
    navLabel: "Asosiy menyu",
    menuOpen: "Menyuni ochish",
    menuClose: "Menyuni yopish",
    languageLabel: "Til",
    download: "Ilovani yuklab olish",
  },
  nav: {
    catalog: "Katalog",
    cashback: "Cashback",
    specialists: "Mutaxassislar",
    delivery: "Yetkazib berish",
    qr: "QR kod",
  },
  hero: {
    eyebrow: "Kosmetologiya va dermatologiya",
    titleStart: "Teringiz",
    titleEmphasis: "porlashga",
    titleEnd: "loyiq",
    lead: "Dermatolog va kosmetologlar tanlagan parvarish vositalari, mutaxassis qabuli va har bir xariddan qaytadigan cashback — barchasi bitta ilovada.",
    primaryCta: "Ilovani yuklab olish",
    secondaryCta: "Qabulga yozilish",
    platforms: "iOS va Android",
    languages: "O‘zbekcha, Русский, English",
    mockupLabel: "Glow Derma ilovasi: katalog ekrani",
    toastTitle: "Qabul tasdiqlandi",
    toastBody: "Ertaga, 10:30 · Dermatolog",
    balanceLabel: "Cashback balansi",
    balanceValue: "48 600 so‘m",
    balanceNote: "2% darajagacha 6,4 mln so‘m qoldi",
  },
  phone: {
    promoEyebrow: "Aksiya",
    promoTitle: "Kuzgi namlik to‘plami",
    promoBody: "Tanlangan kremlarga 20% chegirma",
    search: "Mahsulot qidirish",
    categories: ["Tozalash", "Namlik", "Serumlar", "SPF"],
    products: [
      { name: "Gialuron kislotali serum", meta: "30 ml · Koreya", price: "185 000 so‘m" },
      // Shown already in the cart, so the mockup renders a quantity stepper.
      { name: "Seramidli namlantiruvchi krem", meta: "50 ml · Germaniya", price: "312 000 so‘m" },
    ],
    quantityLabel: "Soni",
  },
  pillars: {
    title: "Parvarishdan qabulgacha — bitta ilovada",
    lead: "Glow Derma do‘kon, mutaxassislar va sizning cashback hisobingizni birlashtiradi. Onlayn va do‘kondagi xaridlaringiz bitta profilda jamlanadi.",
    items: [
      {
        title: "Parvarish vositalari",
        body: "Har bir mahsulot tarkibi va qo‘llash tartibi bilan. Qoldiq do‘kon bazasi bilan doimiy yangilanadi — ko‘rganingiz mavjud.",
      },
      {
        title: "Mutaxassis qabuli",
        body: "Dermatolog yoki kosmetologni tanlang, xizmat va bo‘sh vaqtni belgilang. Qabul tasdiqlangach bildirishnoma olasiz.",
      },
      {
        title: "Do‘konda QR",
        body: "Kassada shaxsiy QR kodingizni ko‘rsating — do‘kondagi xarid ham hisobingizga yoziladi. Kod har 60 soniyada yangilanadi.",
      },
      {
        title: "Cashback",
        body: "Har bir xariddan 1% dan 3% gacha qaytadi. Cashback muddatsiz saqlanadi: do‘konda ham, ilovada ham ishlating.",
      },
    ],
  },
  catalog: {
    eyebrow: "Katalog",
    title: "Teri ehtiyojiga qarab tanlang",
    link: "Katalogni ilovada ochish",
    categories: ["Tozalash", "Namlantirish", "Serumlar", "Quyoshdan himoya", "Tonerlar"],
  },
  cashback: {
    eyebrow: "Cashback dasturi",
    title: "Har bir xarid sizga qaytadi",
    lead: "Foiz barcha xaridlaringiz yig‘indisiga qarab o‘sadi — do‘kondagi va ilovadagi xaridlar bitta hisobda jamlanadi. Balansdan keyingi xaridning bir qismini to‘lashingiz mumkin.",
    chips: ["Muddati tugamaydi", "Do‘konda va ilovada"],
    tiers: [
      { name: "Boshlang‘ich", range: "Jami xaridlar 20 mln so‘mgacha" },
      { name: "Ikkinchi daraja", range: "20–30 mln so‘m" },
      { name: "Uchinchi daraja", range: "30–50 mln so‘m" },
    ],
    note: "Yangi mijozlar 1% dan boshlaydi. Aksiyadagi mahsulotlarga cashback hisoblanmaydi.",
  },
  qr: {
    eyebrow: "Do‘konda xarid",
    title: "Kassada bitta QR — xarid hisobingizda",
    lead: "Do‘kondan xarid qilganingizda ham cashback yo‘qolmaydi. Chek raqamini saqlash yoki telefon raqamini aytish shart emas.",
    cardLabel: "Shaxsiy QR kod",
    codeLabel: "Namuna QR kod",
    refreshNote: "Kod 42 soniyadan so‘ng yangilanadi",
    steps: [
      { title: "Ilovada QR bo‘limini oching", body: "Pastki menyuda — bitta bosishda." },
      {
        title: "Kassirga ko‘rsating",
        body: "Kassir kodni skanerlaydi va xarid profilingizga bog‘lanadi.",
      },
      {
        title: "Cashback balansga tushadi",
        body: "Xarid va hisoblangan summa ilovadagi tarixda ko‘rinadi.",
      },
    ],
    security: "Xavfsizlik uchun kod har 60 soniyada yangilanadi va faqat bir marta ishlaydi.",
  },
  specialists: {
    eyebrow: "Mutaxassis qabuli",
    title: "Dermatolog va kosmetolog — bir necha bosishda",
    lead: "Mutaxassislar profili, xizmatlari va narxlari ilovada. Bo‘sh vaqtni tanlang — so‘rovingizni mutaxassis tasdiqlaydi va sizga bildirishnoma keladi.",
    benefits: [
      "Xizmat davomiyligi va narxi oldindan ko‘rinadi",
      "Qabulni ilovada ko‘chirish yoki bekor qilish",
      "Qabul oldidan eslatma",
    ],
    cta: "Qabulga yozilish",
    booking: {
      label: "Qabulga yozilish namunasi",
      specialistName: "[Mutaxassis ismi]",
      specialistRole: "Dermatolog · [Filial nomi]",
      serviceLabel: "Xizmat",
      services: [
        { name: "Konsultatsiya", duration: "30 daqiqa", price: "[NARX]" },
        { name: "Qayta ko‘rik", duration: "20 daqiqa", price: "[NARX]" },
      ],
      dateLabel: "Sana",
      days: [
        { weekday: "Du", day: "26" },
        { weekday: "Se", day: "27" },
        { weekday: "Ch", day: "28" },
        { weekday: "Pa", day: "29" },
        { weekday: "Ju", day: "30" },
        { weekday: "Sh", day: "31" },
      ],
      timeLabel: "Vaqt",
      unavailable: "band",
      submit: "Bron qilish",
    },
  },
  delivery: {
    eyebrow: "Yetkazib berish va to‘lov",
    title: "Buyurtmangiz qayerdaligini doim bilasiz",
    lead: "To‘lov tugmasini bosganingizda mahsulotlar siz uchun band qilinadi. Keyingi har bir bosqich haqida bildirishnoma keladi.",
    options: [
      {
        title: "Uyingizgacha yetkazish",
        body: "BTS kuryeri orqali. Narx manzilingizga qarab buyurtma paytida hisoblanadi.",
      },
      {
        title: "Do‘kondan olib ketish",
        body: "Buyurtma tayyor bo‘lgach xabar beramiz. Manzil: [Do‘kon manzili].",
      },
      {
        title: "Click yoki Payme",
        body: "To‘lov o‘sha ilovalarning o‘zida. Karta ma’lumotlari Glow Derma’da kiritilmaydi va saqlanmaydi.",
      },
    ],
    tracker: {
      order: "Buyurtma №10248",
      status: "Kuryerga topshirildi",
      currentStep: "joriy bosqich",
      steps: [
        { title: "To‘lov kutilmoqda", body: "Mahsulotlar bir necha daqiqaga band qilinadi" },
        { title: "Jarayonda", body: "To‘lov tasdiqlandi, buyurtma yig‘ilmoqda" },
        { title: "Kuryerga topshirildi", body: "BTS kuryeri yo‘lda" },
        { title: "Yetkazildi", body: "Buyurtma qo‘lingizda" },
      ],
    },
  },
  download: {
    eyebrow: "Glow Derma ilovasi",
    title: "Teringiz uchun hammasi — bitta ilovada",
    lead: "Ro‘yxatdan o‘tish uchun telefon raqamingiz kifoya. Cashback birinchi xariddan boshlanadi.",
    appStore: "App Store’dan yuklab olish",
    googlePlay: "Google Play’dan yuklab olish",
  },
  footer: {
    tagline:
      "Kosmetologiya va dermatologiya do‘koni. Mahsulotlar, mutaxassislar va cashback — bitta ilovada.",
    appHeading: "Ilova",
    contactHeading: "Aloqa",
    address: "[Do‘kon manzili]",
    phone: "[Telefon raqami]",
    docsHeading: "Hujjatlar",
    privacy: "Maxfiylik siyosati",
    terms: "Foydalanish shartlari",
    copyright: "© 2026 Glow Derma",
    languages: "O‘zbekcha · Русский · English",
  },
};

export type LandingDictionary = typeof uz;
