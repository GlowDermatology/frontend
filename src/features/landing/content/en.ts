import type { LandingDictionary } from "./uz";

/**
 * English copy. The design only contains Uzbek; this translation was written
 * during implementation and needs review by the business before launch
 * (see README → Known limitations).
 */
export const en = {
  meta: {
    title: "Glow Derma — skincare, specialist appointments and cashback in one app",
    description:
      "Skincare chosen by dermatologists and cosmetologists, specialist appointments and cashback on every purchase — all in the Glow Derma app.",
    ogAlt: "Glow Derma — cosmetology and dermatology",
  },
  skipLink: "Skip to main content",
  header: {
    home: "Glow Derma — home",
    navLabel: "Main menu",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    languageLabel: "Language",
    download: "Download the app",
  },
  nav: {
    catalog: "Catalog",
    cashback: "Cashback",
    specialists: "Specialists",
    delivery: "Delivery",
    qr: "QR code",
  },
  hero: {
    eyebrow: "Cosmetology and dermatology",
    titleStart: "Your skin deserves",
    titleEmphasis: "to glow",
    titleEnd: "",
    lead: "Skincare chosen by dermatologists and cosmetologists, specialist appointments and cashback on every purchase — all in one app.",
    primaryCta: "Download the app",
    secondaryCta: "Book an appointment",
    platforms: "iOS and Android",
    languages: "O‘zbekcha, Русский, English",
    mockupLabel: "Glow Derma app: catalog screen",
    toastTitle: "Appointment confirmed",
    toastBody: "Tomorrow, 10:30 · Dermatologist",
    balanceLabel: "Cashback balance",
    balanceValue: "48,600 UZS",
    balanceNote: "6.4M UZS to go to the 2% tier",
  },
  phone: {
    promoEyebrow: "Sale",
    promoTitle: "Autumn hydration set",
    promoBody: "20% off selected creams",
    search: "Search products",
    categories: ["Cleansing", "Hydration", "Serums", "SPF"],
    products: [
      { name: "Hyaluronic acid serum", meta: "30 ml · Korea", price: "185,000 UZS" },
      { name: "Ceramide moisturising cream", meta: "50 ml · Germany", price: "312,000 UZS" },
    ],
    quantityLabel: "Quantity",
  },
  pillars: {
    title: "From skincare to appointments — in one app",
    lead: "Glow Derma brings together the store, specialists and your cashback account. Your online and in-store purchases come together in one profile.",
    items: [
      {
        title: "Skincare products",
        body: "Every product comes with its ingredients and directions for use. Stock is synced with the store’s database — if you can see it, it’s available.",
      },
      {
        title: "Specialist appointments",
        body: "Choose a dermatologist or cosmetologist, a service and a free slot. You’ll be notified once the appointment is confirmed.",
      },
      {
        title: "QR in store",
        body: "Show your personal QR code at the checkout — in-store purchases are added to your account too. The code refreshes every 60 seconds.",
      },
      {
        title: "Cashback",
        body: "Get 1% to 3% back on every purchase. Cashback never expires: spend it in store or in the app.",
      },
    ],
  },
  catalog: {
    eyebrow: "Catalog",
    title: "Shop by skin need",
    link: "Open the catalog in the app",
    categories: ["Cleansing", "Moisturising", "Serums", "Sun protection", "Toners"],
  },
  cashback: {
    eyebrow: "Cashback programme",
    title: "Every purchase pays you back",
    lead: "Your rate grows with the total of all your purchases — store and app purchases count towards one account. Use your balance to pay for part of your next purchase.",
    chips: ["Never expires", "In store and in the app"],
    tiers: [
      { name: "Starter", range: "Total purchases up to 20M UZS" },
      { name: "Second tier", range: "20–30M UZS" },
      { name: "Third tier", range: "30–50M UZS" },
    ],
    note: "New customers start at 1%. Promotional products do not earn cashback.",
  },
  qr: {
    eyebrow: "Shopping in store",
    title: "One QR at the checkout — the purchase is on your account",
    lead: "You keep your cashback when you shop in store too. No need to keep the receipt or give your phone number.",
    cardLabel: "Personal QR code",
    codeLabel: "Sample QR code",
    refreshNote: "Code refreshes in 42 seconds",
    steps: [
      { title: "Open the QR section in the app", body: "It’s in the bottom menu — one tap away." },
      {
        title: "Show it to the cashier",
        body: "The cashier scans the code and the purchase is linked to your profile.",
      },
      {
        title: "Cashback lands in your balance",
        body: "The purchase and the amount earned appear in your history in the app.",
      },
    ],
    security: "For your security, the code refreshes every 60 seconds and works only once.",
  },
  specialists: {
    eyebrow: "Specialist appointments",
    title: "Dermatologist and cosmetologist — in a few taps",
    lead: "Specialist profiles, services and prices are in the app. Pick a free slot — the specialist confirms your request and you get a notification.",
    benefits: [
      "Service length and price shown upfront",
      "Reschedule or cancel in the app",
      "A reminder before your appointment",
    ],
    cta: "Book an appointment",
    booking: {
      label: "Booking example",
      specialistName: "[Specialist name]",
      specialistRole: "Dermatologist · [Branch name]",
      serviceLabel: "Service",
      services: [
        { name: "Consultation", duration: "30 minutes", price: "[PRICE]" },
        { name: "Follow-up visit", duration: "20 minutes", price: "[PRICE]" },
      ],
      dateLabel: "Date",
      days: [
        { weekday: "Mo", day: "26" },
        { weekday: "Tu", day: "27" },
        { weekday: "We", day: "28" },
        { weekday: "Th", day: "29" },
        { weekday: "Fr", day: "30" },
        { weekday: "Sa", day: "31" },
      ],
      timeLabel: "Time",
      unavailable: "booked",
      submit: "Book",
    },
  },
  delivery: {
    eyebrow: "Delivery and payment",
    title: "Always know where your order is",
    lead: "When you tap Pay, the products are reserved for you. You’ll get a notification at every following step.",
    options: [
      {
        title: "Delivery to your door",
        body: "By BTS courier. The price depends on your address and is calculated at checkout.",
      },
      {
        title: "Store pickup",
        body: "We’ll let you know when your order is ready. Address: [Store address].",
      },
      {
        title: "Click or Payme",
        body: "You pay inside those apps. Card details are never entered or stored in Glow Derma.",
      },
    ],
    tracker: {
      order: "Order №10248",
      status: "Handed to courier",
      currentStep: "current step",
      steps: [
        { title: "Awaiting payment", body: "Products are reserved for a few minutes" },
        { title: "Processing", body: "Payment confirmed, the order is being packed" },
        { title: "Handed to courier", body: "The BTS courier is on the way" },
        { title: "Delivered", body: "The order is in your hands" },
      ],
    },
  },
  download: {
    eyebrow: "Glow Derma app",
    title: "Everything for your skin — in one app",
    lead: "All you need to sign up is your phone number. Cashback starts with your first purchase.",
    appStore: "Download on the App Store",
    googlePlay: "Get it on Google Play",
  },
  footer: {
    tagline:
      "Cosmetology and dermatology store. Products, specialists and cashback — in one app.",
    appHeading: "App",
    contactHeading: "Contact",
    address: "[Store address]",
    phone: "[Phone number]",
    docsHeading: "Legal",
    privacy: "Privacy policy",
    terms: "Terms of use",
    copyright: "© 2026 Glow Derma",
    languages: "O‘zbekcha · Русский · English",
  },
} satisfies LandingDictionary;
