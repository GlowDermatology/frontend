import type { AudienceOption, NotificationRecord, StatusTemplate } from "@/domain/notification";

const t = (iso: string) => `${iso}+05:00`;

export const AUDIENCES: ReadonlyArray<AudienceOption> = [
  { id: "all", label: "Barcha mijozlar", detail: "4 751 ta qurilma" },
  { id: "group", label: "Guruh", detail: "Doimiy mijozlar · 612" },
  { id: "one", label: "Bitta mijoz", detail: "Telefon bo‘yicha qidirish" },
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

/** Product linked in the draft ("Bosilganda: mahsulot"). */
export const DRAFT_LINK = { kind: "product" as const, label: "Seramidli namlantiruvchi krem" };
