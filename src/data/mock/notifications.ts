import type {
  AudienceSegment,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
} from "@/domain/notification";
import { formatNumber } from "@/lib/format";

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

const DESIGN_HISTORY: ReadonlyArray<NotificationRecord> = [
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

/**
 * Older campaigns before the design's four, one a week back to spring, so
 * the history pages (20 rows) and its filters have something to show in the
 * demo. Every one went out to everybody; promo and general alternate.
 */
const OLDER_TITLES: ReadonlyArray<[string, NotificationRecord["kind"]]> = [
  ["Haftalik tavsiyalar: teri parvarishi", "general"],
  ["Serumlarga 10% chegirma", "promo"],
  ["Dermatolog maslahati: kuzgi parvarish", "general"],
  ["Ikkinchi mahsulotga 20% chegirma", "promo"],
  ["Yangi toner va essensiyalar", "general"],
  ["Hafta oxiri aksiyasi", "promo"],
];

const OLDER_HISTORY: ReadonlyArray<NotificationRecord> = Array.from({ length: 22 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 9, 11) - i * 7 * 86_400_000).toISOString().slice(0, 10);
  const [title, kind] = OLDER_TITLES[i % OLDER_TITLES.length]!;
  const sent = 4700 - i * 37;
  return {
    id: `n-old-${i + 1}`,
    at: t(`${day}T11:00:00`),
    kind,
    title,
    audienceLabel: `Barcha · ${formatNumber(sent)}`,
    sent,
    failed: 0,
    delivered: Math.round(sent * 0.9),
    state: "sent",
    scheduledAt: t(`${day}T11:00:00`),
    sentAt: t(`${day}T11:02:00`),
    cancelledAt: null,
    author: "Administrator",
  };
});

export const NOTIFICATION_HISTORY: ReadonlyArray<NotificationRecord> = [
  ...DESIGN_HISTORY,
  ...OLDER_HISTORY,
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
