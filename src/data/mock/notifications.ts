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
  { id: "regular", name: "Doimiy mijozlar", size: 612 },
  { id: "10m", name: "10 mln+ xarid", size: 318 },
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
    delivered: null,
    state: "scheduled",
  },
  {
    id: "n-3",
    at: t("2026-10-24T12:00:00"),
    kind: "promo",
    title: "Kuzgi namlik to‘plami",
    audienceLabel: "Barcha · 4 751",
    sent: 4751,
    delivered: 4388,
    state: "sent",
  },
  {
    id: "n-2",
    at: t("2026-10-21T10:00:00"),
    kind: "general",
    title: "Yangi mahsulotlar keldi",
    audienceLabel: "Barcha · 4 740",
    sent: 4740,
    delivered: 4205,
    state: "sent",
  },
  {
    id: "n-1",
    at: t("2026-10-18T16:30:00"),
    kind: "promo",
    title: "Quyoshdan himoya: 15% chegirma",
    audienceLabel: "10 mln+ xarid · 318",
    sent: 318,
    delivered: 301,
    state: "sent",
  },
];

export const STATUS_TEMPLATES: ReadonlyArray<StatusTemplate> = [
  {
    status: "processing",
    text: "To‘lov qabul qilindi. Buyurtma №{raqam} tayyorlanmoqda.",
    translations: { uz: true, ru: true, en: true },
  },
  {
    status: "handed_to_courier",
    text: "Buyurtma №{raqam} kuryerga topshirildi. Holatni ilovada kuzating.",
    translations: { uz: true, ru: true, en: true },
  },
  {
    status: "delivered",
    text: "Buyurtma №{raqam} yetkazildi. Xaridingiz uchun rahmat.",
    translations: { uz: true, ru: true, en: false },
  },
  {
    status: "cancelled",
    text: "Buyurtma №{raqam} bekor qilindi. To‘lov qaytariladi.",
    translations: { uz: true, ru: true, en: true },
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
