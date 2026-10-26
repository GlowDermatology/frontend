import type {
  AudienceSegment,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";

const t = (iso: string) => `${iso}+05:00`;

/** Devices with push enabled. */
export const TOTAL_DEVICES = 4751;

export const SEGMENTS: ReadonlyArray<AudienceSegment> = [
  // The ids of the seeded segments (`src/data/mock/segments.ts`, backend seed).
  { id: "1", name: "Doimiy mijozlar", size: 612 },
  { id: "2", name: "10 mln+ xarid", size: 318 },
];

/** Default schedule slot offered when "Rejalashtirish" is chosen. */
export const DEFAULT_SCHEDULE = t("2026-10-26T10:00:00");

export const NOTIFICATION_HISTORY: ReadonlyArray<NotificationRecord> = [
  {
    id: "n-4",
    at: t("2026-10-26T10:00:00"),
    kind: "general",
    title: "Yangi dermatolog qabuli ochildi",
    audienceLabel: "Doimiy mijozlar · 612",
    sent: null,
    failed: null,
    delivered: null,
    state: "scheduled",
    scheduledAt: t("2026-10-26T10:00:00"),
    sentAt: null,
    cancelledAt: null,
    author: "Administrator",
  },
  {
    id: "n-3",
    at: t("2026-10-24T12:00:00"),
    kind: "promo",
    title: "Kuzgi namlik to‘plami",
    audienceLabel: "Barcha · 4 751",
    sent: 4751,
    failed: 0,
    delivered: 4388,
    state: "sent",
    scheduledAt: t("2026-10-24T12:00:00"),
    sentAt: t("2026-10-24T12:02:00"),
    cancelledAt: null,
    author: "Administrator",
    linkLabel: "Seramidli namlantiruvchi krem",
  },
  {
    id: "n-2",
    at: t("2026-10-21T10:00:00"),
    kind: "general",
    title: "Yangi mahsulotlar keldi",
    audienceLabel: "Barcha · 4 740",
    sent: 4740,
    failed: 0,
    delivered: 4205,
    state: "sent",
    scheduledAt: t("2026-10-21T10:00:00"),
    sentAt: t("2026-10-21T10:02:00"),
    cancelledAt: null,
    author: "Administrator",
  },
  {
    id: "n-1",
    at: t("2026-10-18T16:30:00"),
    kind: "promo",
    title: "Quyoshdan himoya: 15% chegirma",
    audienceLabel: "10 mln+ xarid · 318",
    sent: 318,
    failed: 0,
    delivered: 301,
    state: "sent",
    scheduledAt: t("2026-10-18T16:30:00"),
    sentAt: t("2026-10-18T16:32:00"),
    cancelledAt: null,
    author: "Administrator",
  },
];

export const STATUS_TEMPLATES: ReadonlyArray<StatusTemplate> = [
  {
    status: "processing",
    text: "To‘lov qabul qilindi. Buyurtma №{raqam} tayyorlanmoqda.",
    translations: { uz: true, ru: true, en: true },
    texts: {
      uz: "To‘lov qabul qilindi. Buyurtma №{raqam} tayyorlanmoqda.",
      ru: "Оплата принята. Заказ №{raqam} готовится.",
      en: "Payment received. Order №{raqam} is being prepared.",
    },
    updatedAt: t("2026-10-10T10:00:00"),
    updatedBy: null,
  },
  {
    status: "handed_to_courier",
    text: "Buyurtma №{raqam} kuryerga topshirildi. Holatni ilovada kuzating.",
    translations: { uz: true, ru: true, en: true },
    texts: {
      uz: "Buyurtma №{raqam} kuryerga topshirildi. Holatni ilovada kuzating.",
      ru: "Заказ №{raqam} передан курьеру. Следите за статусом в приложении.",
      en: "Order №{raqam} has been handed to the courier. Track it in the app.",
    },
    updatedAt: t("2026-10-10T10:00:00"),
    updatedBy: null,
  },
  {
    status: "delivered",
    text: "Buyurtma №{raqam} yetkazildi. Xaridingiz uchun rahmat.",
    translations: { uz: true, ru: true, en: false },
    texts: {
      uz: "Buyurtma №{raqam} yetkazildi. Xaridingiz uchun rahmat.",
      ru: "Заказ №{raqam} доставлен. Спасибо за покупку.",
      en: "",
    },
    updatedAt: t("2026-10-10T10:00:00"),
    updatedBy: null,
  },
  {
    status: "cancelled",
    text: "Buyurtma №{raqam} bekor qilindi. To‘lov qaytariladi.",
    translations: { uz: true, ru: true, en: true },
    texts: {
      uz: "Buyurtma №{raqam} bekor qilindi. To‘lov qaytariladi.",
      ru: "Заказ №{raqam} отменён. Оплата будет возвращена.",
      en: "Order №{raqam} has been cancelled. The payment will be refunded.",
    },
    updatedAt: t("2026-10-10T10:00:00"),
    updatedBy: null,
  },
];

/** Screens a push can open when tapped. */
export const LINK_OPTIONS: ReadonlyArray<NotificationLink> = [
  { kind: "none" },
  { kind: "product", productId: "4", label: "Seramidli namlantiruvchi krem" },
  { kind: "product", productId: "1", label: "Gialuron kislotali serum" },
  { kind: "product", productId: "2", label: "Quyoshdan himoya kremi SPF 50" },
];

/** The admin's unsent draft, as on the design. */
export const DRAFT: NotificationDraft = {
  kind: "promo",
  title: "Kuzgi namlik to‘plami",
  body: "Tanlangan namlantiruvchi kremlarga 20% chegirma — 30-noyabrgacha.",
  link: { kind: "product", productId: "4", label: "Seramidli namlantiruvchi krem" },
};
