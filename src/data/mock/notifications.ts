import type {
  AudienceSegment,
  CampaignTest,
  NotificationDraft,
  NotificationLink,
  NotificationRecord,
  StatusTemplate,
  TestDevice,
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

const ADMIN = { author: "Administrator", authorId: "1" } as const;
const STAFF = { author: "Dilnoza Yusupova", authorId: "2" } as const;

const ALL_AUDIENCE = { type: "all" } as const;

/** A history record with every workflow field at its "nothing happened" value; fixtures override. */
export function campaignRecord(
  record: Pick<NotificationRecord, "id" | "at" | "kind" | "title" | "body" | "createdAt"> &
    Partial<NotificationRecord>,
): NotificationRecord {
  return {
    audienceLabel: `Barcha · ${formatNumber(TOTAL_DEVICES)}`,
    recipientCount: TOTAL_DEVICES,
    audience: ALL_AUDIENCE,
    link: { kind: "none" },
    imageUrl: null,
    sent: null,
    failed: null,
    attempted: null,
    delivered: null,
    state: "draft",
    revision: 1,
    testedRevision: null,
    testConfirmedAt: null,
    approvedAt: null,
    approvedBy: null,
    approvedRevision: null,
    dispatchAfter: null,
    scheduledAt: null,
    startedAt: null,
    sentAt: null,
    stopRequestedAt: null,
    stoppedAt: null,
    failedAt: null,
    cancelledAt: null,
    lastError: null,
    updatedAt: record.createdAt,
    authorId: null,
    tests: [],
    ...record,
  };
}

/** The test devices a superuser registered (`notifications/test-devices/`). */
export const TEST_DEVICES: ReadonlyArray<TestDevice> = [
  {
    id: "1",
    phone: "+998901234567",
    label: "Dilnoza iPhone",
    isPushable: true,
    registeredBy: "Administrator",
    registeredAt: t("2026-10-20T09:30:00"),
  },
  {
    id: "2",
    phone: "+998935550011",
    label: "Sardor Android",
    isPushable: false,
    registeredBy: "Administrator",
    registeredAt: t("2026-10-21T15:10:00"),
  },
];

/** A test push FCM accepted on «Dilnoza iPhone», confirmed three minutes after it was sent. */
const confirmedTest = (id: string, revision: number, sentAt: string): CampaignTest => ({
  id,
  revision,
  deviceLabel: "Dilnoza iPhone",
  phone: "+998901234567",
  sentAt: t(sentAt),
  sentBy: "Administrator",
  fcmOk: true,
  fcmError: null,
  confirmedAt: new Date(Date.parse(t(sentAt)) + 3 * 60_000).toISOString(),
  confirmedBy: "Administrator",
});

/**
 * One campaign in every state of the approval workflow, newest first, so
 * the demo shows each badge and every control: a draft by the demo's
 * Administrator (the signed-in account, so its «Tahrirlash» is offered to
 * an ordinary admin too), a tested one by another admin, the approved one
 * waiting for its send, a send in progress, one being stopped, a stopped
 * one, the three sent ones of the design, a cancelled one and a failed one.
 */
const DESIGN_HISTORY: ReadonlyArray<NotificationRecord> = [
  campaignRecord({
    id: "n-9",
    at: t("2026-10-24T11:40:00"),
    createdAt: t("2026-10-24T11:40:00"),
    kind: "promo",
    title: "Qish uchun namlantiruvchi to‘plam",
    body: "Qishki parvarish to‘plamiga 15% chegirma — faqat shu hafta.",
    link: { kind: "product", productId: "1", label: "Gialuron kislotali serum" },
    linkLabel: "Gialuron kislotali serum",
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-8",
    at: t("2026-10-24T11:20:00"),
    createdAt: t("2026-10-23T17:05:00"),
    updatedAt: t("2026-10-24T11:20:00"),
    kind: "general",
    title: "Yangi mahsulotlar: qishki parvarish",
    body: "Do‘konga yangi qishki parvarish vositalari keldi. Ilovada ko‘ring.",
    state: "tested",
    revision: 2,
    testedRevision: 2,
    testConfirmedAt: t("2026-10-24T11:20:00"),
    tests: [
      { ...confirmedTest("t-1", 1, "2026-10-23T17:10:00"), confirmedAt: null, confirmedBy: null },
      confirmedTest("t-2", 2, "2026-10-24T11:17:00"),
    ],
    ...STAFF,
  }),
  campaignRecord({
    id: "n-4",
    at: t("2026-10-26T10:00:00"),
    createdAt: t("2026-10-24T09:10:00"),
    updatedAt: t("2026-10-24T09:30:00"),
    kind: "general",
    title: "Yangi dermatolog qabuli ochildi",
    body: "Yangi dermatolog qabuliga yozilish ochildi. Ilova orqali qulay vaqtni band qiling.",
    audienceLabel: "Doimiy mijozlar · 612",
    recipientCount: 612,
    audience: { type: "group", segmentId: "1" },
    state: "scheduled",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-24T09:20:00"),
    approvedAt: t("2026-10-24T09:30:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-26T10:00:00"),
    scheduledAt: t("2026-10-26T10:00:00"),
    tests: [confirmedTest("t-3", 1, "2026-10-24T09:17:00")],
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-7",
    at: t("2026-10-24T11:50:00"),
    createdAt: t("2026-10-24T11:00:00"),
    updatedAt: t("2026-10-24T11:58:00"),
    kind: "promo",
    title: "Shanba aksiyasi: serumlarga 10%",
    body: "Bugun soat 20:00 gacha barcha serumlarga 10% chegirma.",
    state: "sending",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-24T11:30:00"),
    approvedAt: t("2026-10-24T11:45:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-24T11:50:00"),
    startedAt: t("2026-10-24T11:50:00"),
    sent: 1200,
    failed: 3,
    attempted: 1203,
    tests: [confirmedTest("t-4", 1, "2026-10-24T11:27:00")],
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-11",
    at: t("2026-10-24T11:30:00"),
    createdAt: t("2026-10-24T10:40:00"),
    updatedAt: t("2026-10-24T11:55:00"),
    kind: "general",
    title: "Ilova yangilandi",
    body: "Ilovaning yangi versiyasi chiqdi: tezroq buyurtma va qabulga yozilish.",
    state: "stopping",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-24T11:00:00"),
    approvedAt: t("2026-10-24T11:25:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-24T11:30:00"),
    startedAt: t("2026-10-24T11:30:00"),
    stopRequestedAt: t("2026-10-24T11:55:00"),
    sent: 2400,
    failed: 1,
    attempted: 2401,
    tests: [confirmedTest("t-5", 1, "2026-10-24T10:57:00")],
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-6",
    at: t("2026-10-23T18:00:00"),
    createdAt: t("2026-10-23T16:00:00"),
    updatedAt: t("2026-10-23T18:04:00"),
    kind: "promo",
    title: "Kechki chegirma: tonerlar",
    body: "Soat 22:00 gacha tonerlarga 20% chegirma.",
    state: "partially_sent",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-23T17:30:00"),
    approvedAt: t("2026-10-23T17:55:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-23T18:00:00"),
    startedAt: t("2026-10-23T18:00:00"),
    stopRequestedAt: t("2026-10-23T18:03:00"),
    stoppedAt: t("2026-10-23T18:04:00"),
    sent: 900,
    failed: 2,
    attempted: 902,
    delivered: 811,
    tests: [confirmedTest("t-6", 1, "2026-10-23T17:27:00")],
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-3",
    at: t("2026-10-24T12:00:00"),
    createdAt: t("2026-10-24T09:40:00"),
    updatedAt: t("2026-10-24T12:02:00"),
    kind: "promo",
    title: "Kuzgi namlik to‘plami",
    body: "Tanlangan namlantiruvchi kremlarga 20% chegirma — 30-noyabrgacha.",
    state: "sent",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-24T09:50:00"),
    approvedAt: t("2026-10-24T09:55:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-24T12:00:00"),
    scheduledAt: t("2026-10-24T12:00:00"),
    startedAt: t("2026-10-24T12:00:00"),
    sentAt: t("2026-10-24T12:02:00"),
    sent: 4751,
    failed: 0,
    attempted: 4751,
    delivered: 4388,
    link: { kind: "product", productId: "4", label: "Seramidli namlantiruvchi krem" },
    linkLabel: "Seramidli namlantiruvchi krem",
    tests: [confirmedTest("t-7", 1, "2026-10-24T09:47:00")],
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-2",
    at: t("2026-10-21T10:00:00"),
    createdAt: t("2026-10-20T15:00:00"),
    updatedAt: t("2026-10-21T10:02:00"),
    kind: "general",
    title: "Yangi mahsulotlar keldi",
    body: "Katalogda yangi mahsulotlar: tonerlar, essensiyalar va niqoblar.",
    audienceLabel: "Barcha · 4 740",
    recipientCount: 4740,
    state: "sent",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-20T15:20:00"),
    approvedAt: t("2026-10-20T15:30:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-21T10:00:00"),
    scheduledAt: t("2026-10-21T10:00:00"),
    startedAt: t("2026-10-21T10:00:00"),
    sentAt: t("2026-10-21T10:02:00"),
    sent: 4740,
    failed: 0,
    attempted: 4740,
    delivered: 4205,
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-1",
    at: t("2026-10-18T16:30:00"),
    createdAt: t("2026-10-18T12:00:00"),
    updatedAt: t("2026-10-18T16:32:00"),
    kind: "promo",
    title: "Quyoshdan himoya: 15% chegirma",
    body: "SPF 50 kremlarga 15% chegirma — 10 mln+ xarid qilgan mijozlar uchun.",
    audienceLabel: "10 mln+ xarid · 318",
    recipientCount: 318,
    audience: { type: "group", segmentId: "2" },
    state: "sent",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-18T12:20:00"),
    approvedAt: t("2026-10-18T12:30:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-18T16:30:00"),
    scheduledAt: t("2026-10-18T16:30:00"),
    startedAt: t("2026-10-18T16:30:00"),
    sentAt: t("2026-10-18T16:32:00"),
    sent: 318,
    failed: 0,
    attempted: 318,
    delivered: 301,
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-5",
    at: t("2026-10-17T10:00:00"),
    createdAt: t("2026-10-16T14:00:00"),
    updatedAt: t("2026-10-16T18:40:00"),
    kind: "promo",
    title: "Hafta oxiri aksiyasi",
    body: "Shanba va yakshanba kunlari barcha niqoblarga 25% chegirma.",
    state: "cancelled",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-16T14:20:00"),
    approvedAt: t("2026-10-16T14:30:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-17T10:00:00"),
    scheduledAt: t("2026-10-17T10:00:00"),
    cancelledAt: t("2026-10-16T18:40:00"),
    ...ADMIN,
  }),
  campaignRecord({
    id: "n-10",
    at: t("2026-10-15T09:00:00"),
    createdAt: t("2026-10-14T16:00:00"),
    updatedAt: t("2026-10-15T09:06:00"),
    kind: "general",
    title: "Dermatolog maslahati: kuzgi parvarish",
    body: "Kuzda terini qanday parvarish qilish kerak — dermatologimiz tavsiyalari.",
    state: "failed",
    revision: 1,
    testedRevision: 1,
    testConfirmedAt: t("2026-10-14T16:20:00"),
    approvedAt: t("2026-10-14T16:30:00"),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t("2026-10-15T09:00:00"),
    scheduledAt: t("2026-10-15T09:00:00"),
    startedAt: t("2026-10-15T09:00:00"),
    failedAt: t("2026-10-15T09:06:00"),
    sent: 400,
    failed: 4351,
    attempted: 4751,
    lastError: "FCM: xizmat vaqtincha ishlamadi (503).",
    ...ADMIN,
  }),
];

/**
 * Older campaigns before the design's, one a week back to spring, so the
 * history pages (20 rows) and its filters have something to show in the
 * demo. Every one went out to everybody; promo and general alternate.
 */
const OLDER_TITLES: ReadonlyArray<[string, string, NotificationRecord["kind"]]> = [
  [
    "Haftalik tavsiyalar: teri parvarishi",
    "Bu haftaning parvarish tavsiyalari ilovada.",
    "general",
  ],
  ["Serumlarga 10% chegirma", "Barcha serumlarga 10% chegirma — hafta oxirigacha.", "promo"],
  [
    "Dermatolog maslahati: kuzgi parvarish",
    "Kuzgi parvarish bo‘yicha dermatolog maslahati.",
    "general",
  ],
  [
    "Ikkinchi mahsulotga 20% chegirma",
    "Ikkita mahsulot oling, ikkinchisiga 20% chegirma.",
    "promo",
  ],
  ["Yangi toner va essensiyalar", "Katalogda yangi tonerlar va essensiyalar.", "general"],
  ["Hafta oxiri aksiyasi", "Shanba-yakshanba: tanlangan mahsulotlarga chegirma.", "promo"],
];

const OLDER_HISTORY: ReadonlyArray<NotificationRecord> = Array.from({ length: 22 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 9, 11) - i * 7 * 86_400_000).toISOString().slice(0, 10);
  const [title, body, kind] = OLDER_TITLES[i % OLDER_TITLES.length]!;
  const sent = 4700 - i * 37;
  return campaignRecord({
    id: `n-old-${i + 1}`,
    at: t(`${day}T11:00:00`),
    createdAt: t(`${day}T09:00:00`),
    updatedAt: t(`${day}T11:02:00`),
    kind,
    title,
    body,
    audienceLabel: `Barcha · ${formatNumber(sent)}`,
    recipientCount: sent,
    state: "sent",
    testedRevision: 1,
    testConfirmedAt: t(`${day}T09:20:00`),
    approvedAt: t(`${day}T09:30:00`),
    approvedBy: "Administrator",
    approvedRevision: 1,
    dispatchAfter: t(`${day}T11:00:00`),
    scheduledAt: t(`${day}T11:00:00`),
    startedAt: t(`${day}T11:00:00`),
    sentAt: t(`${day}T11:02:00`),
    sent,
    failed: 0,
    attempted: sent,
    delivered: Math.round(sent * 0.9),
    ...ADMIN,
  });
});

/** The history, newest `at` first, as the API orders it. */
export const NOTIFICATION_HISTORY: ReadonlyArray<NotificationRecord> = [
  ...DESIGN_HISTORY,
  ...OLDER_HISTORY,
].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

/** The configured approval delay (`CAMPAIGN_APPROVAL_DELAY_MINUTES`, the backend's default). */
export const APPROVAL_DELAY_MINUTES = 5;

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
