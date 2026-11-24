import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { clinicSchemas } from "@/data/clinic.schema";
import {
  formatPercent,
  ledgerNoteText,
  ledgerSourceText,
  tierWarningsText,
  type LedgerEntry,
} from "@/domain/cashback";
import {
  locationRecommendedMissing,
  locationRecommendedToAsk,
  serviceRecommendedMissing,
  serviceRecommendedToAsk,
  specialistRecommendedMissing,
  specialistRecommendedToAsk,
  workingDayLabel,
  workingDaysShort,
} from "@/domain/clinic";
import { DELETED_CUSTOMER_LABEL } from "@/domain/customer";
import type { Refund } from "@/domain/order";
import type { PaymentRecord } from "@/domain/payment";
import { createFormatter } from "@/lib/format";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { customersCopy } from "../customers/copy";
import { CustomersTable } from "../customers/customers-table";
import { balanceNote, customerDisplayName, percentLabel } from "../customers/labels";
import { LedgerTable } from "../customers/ledger";
import { paymentsCopy } from "../payments/copy";
import { dialogCopy, rowItems } from "../payments/payments-table";
import { successToast } from "../payments/refund-dialog";
import { specialistsCopy } from "./copy";
import { errorItems, issuesToErrors, pageRangeText } from "./form-kit";
import { placeDayErrors } from "./hours-card";
import { locationFieldLabel } from "./location-card";
import {
  firstTextErrorLanguage,
  profileFieldLabel,
  specialistRecommendedFields,
} from "./profile-fields";
import { periodLabel } from "./schedule-cards";
import { serviceFieldLabel } from "./service-dialog";
import { serviceText } from "./services-card";
import { servicesCardCopy } from "./services-copy";

/**
 * The specialists, services, customers, cashback and payments sweep (DESIGN §A, §G): the pure
 * helpers behind the error summaries and reveals, the recommended fields, the localized domain
 * texts and a few static renders in Russian and English.
 */

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale) =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));
const NBSP = " ";

describe("form kit", () => {
  it("prints the page range in each language's number format", () => {
    expect(pageRangeText(createFormatter("en"), 2, 20, 1248)).toBe("21–40 / 1,248");
    expect(pageRangeText(createFormatter("ru"), 63, 20, 1248)).toBe(
      `1${NBSP}241–1${NBSP}248 / 1${NBSP}248`,
    );
    expect(pageRangeText(createFormatter("uz"), 1, 20, 0)).toBe("0 / 0");
    // A page beyond the last (a stale URL) never prints from > to.
    expect(pageRangeText(createFormatter("en"), 9, 20, 30)).toBe("30–30 / 30");
  });

  it("keeps the first message per path and orders the summary like the form", () => {
    const result = clinicSchemas.en.specialistService.safeParse({
      name: { uz: "", ru: "", en: "" },
      shortName: { uz: "", ru: "", en: "" },
      description: { uz: "", ru: "", en: "" },
      category: "dermatology",
      price: -1,
      durationMin: 43,
      isActive: true,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = issuesToErrors(result.error);
    expect(errors).toMatchObject({
      price: "The price cannot be below 0.",
      durationMin: "The duration must be a multiple of 5 minutes.",
    });
    expect(errors["name.uz"]).toBeDefined();
    const items = errorItems(
      { b: "B", a: "A", z: "Z" },
      (name) => (name === "z" ? undefined : name.toUpperCase()),
      ["a", "b"],
    );
    expect(items.map((item) => [item.name, item.label])).toEqual([
      ["a", "A"],
      ["b", "B"],
      ["z", "z"],
    ]);
  });
});

describe("clinic schemas and domain texts in three languages", () => {
  it("words the rules in the admin language and keeps the Uzbek texts", () => {
    const week = (locale: Locale) =>
      clinicSchemas[locale].week.safeParse({
        days: [
          {
            weekday: 0,
            locationId: "1",
            start: "09:00",
            end: "18:03",
            breakStart: null,
            breakEnd: null,
          },
        ],
      });
    const messages = (locale: Locale) => {
      const parsed = week(locale);
      return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    };
    expect(messages("uz")).toContain("Vaqt 5 daqiqalik qadamda bo‘lsin.");
    expect(messages("ru")).toContain("Время должно быть кратно 5 минутам.");
    expect(messages("en")).toContain("Use a 5-minute step for the time.");
    const location = clinicSchemas.ru.location.safeParse({
      name: { uz: "", ru: "", en: "" },
      address: { uz: "", ru: "", en: "" },
      directions: { uz: "", ru: "", en: "" },
      isActive: true,
      phone: "+99890",
      latitude: 41.3,
      longitude: null,
    });
    expect(location.success).toBe(false);
    if (!location.success) {
      expect(issuesToErrors(location.error)).toMatchObject({
        "name.uz": "Укажите название клиники.",
        "address.uz": "Укажите адрес клиники.",
        phone: "Введите правильный номер телефона.",
        longitude: "Укажите и широту, и долготу.",
      });
    }
  });

  it("requires a clinic for a working day and for an open override", () => {
    const { week, override } = clinicSchemas.en;
    const day = {
      weekday: 0,
      locationId: "",
      start: "09:00",
      end: "18:00",
      breakStart: null,
      breakEnd: null,
    };
    expect(week.safeParse({ days: [day] }).success).toBe(false);
    const values = {
      date: "2026-11-20",
      locationId: "",
      dayOff: false,
      start: "09:00",
      end: "18:00",
      note: "",
    };
    expect(override.safeParse(values).success).toBe(false);
    expect(override.safeParse({ ...values, locationId: "2" }).success).toBe(true);
    expect(override.safeParse({ ...values, dayOff: true }).success).toBe(true);
  });

  it("prints weekdays and working days per language", () => {
    const days = [
      {
        weekday: 2,
        locationId: "1",
        start: "09:00",
        end: "18:00",
        breakStart: null,
        breakEnd: null,
      },
      {
        weekday: 0,
        locationId: "1",
        start: "09:00",
        end: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      },
    ];
    expect(workingDaysShort(days)).toBe("Du, Ch");
    expect(workingDaysShort(days, "en")).toBe("Mon, Wed");
    expect(workingDayLabel(days[1], "ru")).toBe("09:00–18:00 (перерыв 13:00–14:00)");
    expect(workingDayLabel(undefined, "en")).toBe("Day off");
  });

  it("names the recommended fields of the clinic forms", () => {
    const empty = { uz: "", ru: "", en: "" };
    expect(
      serviceRecommendedMissing({ name: { ...empty, uz: "Ko‘rik" }, description: empty }),
    ).toEqual(["name.ru", "name.en", "description.uz"]);
    expect(specialistRecommendedMissing({ qualifications: empty, bio: empty }, false)).toEqual([
      "photo",
      "qualifications.uz",
      "bio.uz",
    ]);
    expect(specialistRecommendedMissing({ qualifications: empty, bio: empty })).toEqual([
      "qualifications.uz",
      "bio.uz",
    ]);
    expect(
      locationRecommendedMissing({ address: { ...empty, uz: "Toshkent" }, phone: "" }),
    ).toEqual(["phone"]);
    expect(
      specialistRecommendedFields(["photo", "bio.uz"], specialistsCopy.en).map((f) => f.label),
    ).toEqual(["Photo", "Short bio (Uzbek)"]);
  });

  it("asks about the clinic forms only when it is news", () => {
    const empty = { uz: "", ru: "", en: "" };
    const service = { name: { ...empty, uz: "Ko‘rik" }, description: empty, isActive: true };
    expect(serviceRecommendedToAsk(service, service)).toEqual([]);
    expect(serviceRecommendedToAsk(service, null)).toEqual([
      "name.ru",
      "name.en",
      "description.uz",
    ]);
    expect(serviceRecommendedToAsk({ ...service, isActive: false }, null)).toEqual([]);
    expect(
      serviceRecommendedToAsk({ ...service, name: { ...service.name, uz: "Maslahat" } }, service),
    ).toEqual(["name.ru", "name.en"]);
    const profile = { qualifications: empty, bio: { ...empty, uz: "Tajribali" }, isActive: true };
    expect(specialistRecommendedToAsk(profile, profile, false)).toEqual([]);
    expect(specialistRecommendedToAsk({ ...profile, bio: empty }, profile, true)).toEqual([
      "bio.uz",
    ]);
    expect(specialistRecommendedToAsk(profile, { ...profile, isActive: false }, false)).toEqual([
      "photo",
      "qualifications.uz",
    ]);
    expect(specialistRecommendedToAsk({ ...profile, isActive: false }, profile, false)).toEqual([]);
    const card = { address: { ...empty, uz: "Toshkent" }, phone: "" };
    expect(locationRecommendedToAsk(card, card)).toEqual([]);
    expect(locationRecommendedToAsk(card, null)).toEqual(["phone"]);
    expect(locationRecommendedToAsk(card, { ...card, phone: "+998901234567" })).toEqual(["phone"]);
  });
});

describe("specialist forms", () => {
  it("labels the summary rows and finds the language tab of a text error", () => {
    expect(profileFieldLabel("qualifications.ru", specialistsCopy.uz)).toBe("Malakasi (ruscha)");
    expect(profileFieldLabel("bio.en", specialistsCopy.ru)).toBe(
      "Кратко о специалисте (английский)",
    );
    expect(profileFieldLabel("slotStepMin", specialistsCopy.en)).toBe("Booking step");
    expect(firstTextErrorLanguage({ name: "x", "bio.en": "y", "qualifications.ru": "z" })).toBe(
      "ru",
    );
    expect(firstTextErrorLanguage({ name: "x" })).toBeNull();
    expect(locationFieldLabel("address.ru", specialistsCopy.en)).toBe("Address (Russian)");
    expect(serviceFieldLabel("shortName.uz", servicesCardCopy.ru)).toBe(
      "Краткое название (узбекский)",
    );
    expect(serviceFieldLabel("durationMin", servicesCardCopy.en)).toBe("Duration");
  });

  it("puts the week's indexed errors on the weekday rows", () => {
    expect(
      placeDayErrors(
        { "days.1.end": "late", "days.0.breakStart": "inside", days: "twice" },
        [0, 4],
      ),
    ).toEqual({ errors: { "4.end": "late", "0.breakStart": "inside" }, unplaced: "twice" });
  });

  it("shows a service in the admin language when it has a name there", () => {
    const name = { uz: "Ko‘rik", ru: "Осмотр", en: "" };
    expect(serviceText(name, "ru")).toBe("Осмотр");
    expect(serviceText(name, "en")).toBe("Ko‘rik");
  });

  it("prints a blocked period on one day or across days", () => {
    const fmt = createFormatter("en");
    expect(
      periodLabel({ start: "2026-10-26T16:00:00+05:00", end: "2026-10-26T16:30:00+05:00" }, fmt),
    ).toBe(`26${NBSP}Oct, 16:00 – 16:30`);
    expect(
      periodLabel({ start: "2026-10-26T16:00:00+05:00", end: "2026-10-27T10:00:00+05:00" }, fmt),
    ).toBe(`26${NBSP}Oct, 16:00 – 27${NBSP}Oct, 10:00`);
  });
});

const ledgerRow = (patch: Partial<LedgerEntry>): LedgerEntry => ({
  id: "1",
  at: "2026-10-21T11:47:00+05:00",
  kind: "credit",
  source: "Billz savdo S-1",
  note: "Chek 231 000 so‘m · 1%",
  amount: 2_310,
  balanceAfter: 2_310,
  ...patch,
});

describe("customer card texts", () => {
  it("words the ledger from its structured origin and keeps reasons as written", () => {
    const sale = ledgerRow({
      origin: {
        type: "billz_sale",
        ref: "S-1",
        actor: null,
        base: 231_000,
        percent: "1.50",
        reason: null,
      },
    });
    expect(ledgerSourceText(sale, "ru")).toBe("Продажа Billz S-1");
    expect(ledgerNoteText(sale, "en")).toBe("Receipt 231,000 UZS · 1.5%");
    expect(ledgerNoteText(sale)).toBe(`Chek 231${NBSP}000 so‘m · 1,5%`);
    const adjustment = ledgerRow({
      kind: "adjustment",
      origin: {
        type: "admin",
        ref: "",
        actor: null,
        base: null,
        percent: null,
        reason: "QR o‘qilmadi",
      },
    });
    expect(ledgerSourceText(adjustment, "ru")).toBe("Администратор");
    expect(ledgerNoteText(adjustment, "en")).toBe("QR o‘qilmadi");
    // A row without an origin shows its strings as they are.
    expect(ledgerSourceText(ledgerRow({}), "en")).toBe("Billz savdo S-1");
  });

  it("prints percents, holds and the deleted customer per language", () => {
    expect(formatPercent("1.50", "en")).toBe("1.5");
    expect(percentLabel("1.50", "ru")).toBe("1,5 %");
    expect(percentLabel(null, "en")).toBe("—");
    expect(balanceNote(1_200, 4_480, customersCopy.en, createFormatter("en"))).toBe(
      `On hold: 1,200${NBSP}UZS · available: 4,480${NBSP}UZS`,
    );
    expect(customerDisplayName(DELETED_CUSTOMER_LABEL, "ru")).toBe("Удалённый клиент");
    expect(customerDisplayName("Malika", "en")).toBe("Malika");
    expect(tierWarningsText([{ code: "uncovered_above", from: 50_000_000, to: null }], "en")).toBe(
      "No rate is set for purchases above 50M UZS.",
    );
  });

  it("renders the customers table and the ledger in Russian", () => {
    const table = render(
      createElement(CustomersTable, {
        customers: [
          {
            id: "7",
            name: DELETED_CUSTOMER_LABEL,
            phone: "+998901234567",
            registeredAt: "2025-03-12T10:20:00+05:00",
            lifetimeTotal: 13_580_000,
            onlineOrdersCount: 12,
            percent: "1.00",
            balance: 48_600,
            status: "deleted",
          } as never,
        ],
        t: customersCopy.ru,
        fmt: createFormatter("ru"),
        locale: "ru",
      }),
      "ru",
    );
    expect(table).toContain("Удалённый клиент");
    expect(table).toContain("Удалён");
    expect(table).toContain(`13${NBSP}580${NBSP}000${NBSP}сум`);
    expect(table).toContain("12 мар 2025".replace(" ", NBSP));
    const ledger = render(
      createElement(LedgerTable, {
        rows: [
          ledgerRow({
            orderId: 10248,
            kind: "credit",
            policyVersion: 3,
            origin: {
              type: "order",
              ref: "10248",
              actor: null,
              base: 568_000,
              percent: 1,
              reason: null,
            },
          }),
        ],
      }),
      "ru",
    );
    expect(ledger).toContain("Заказ №10248");
    expect(ledger).toContain("Начислено");
    expect(ledger).toContain("Начислено по политике кешбэка v3");
    expect(ledger).not.toMatch(/Buyurtma|Hisoblandi/);
  });
});

describe("payments board", () => {
  const refund = (patch: Partial<Refund> = {}): Refund =>
    ({
      id: 9,
      state: "failed",
      provider: "click",
      amount: 120_000,
      requestedAt: "2026-10-20T10:00:00+05:00",
      updatedAt: "2026-10-20T10:00:00+05:00",
      ...patch,
    }) as Refund;
  const payment = (refunds: Refund[]): PaymentRecord => ({
    id: 3,
    orderId: 10100,
    customer: { id: "5", name: "Malika", phone: "+998901234567" } as PaymentRecord["customer"],
    provider: "click",
    status: "paid",
    amount: 120_000,
    createdAt: "2026-10-20T09:00:00+05:00",
    refunds,
  });

  it("explains why a refund operation waits while another one runs", () => {
    const fmt = createFormatter("en");
    const items = rowItems(
      payment([refund()]),
      () => {},
      true,
      new Set(),
      paymentsCopy.en,
      fmt,
      "en",
    );
    expect(items.map((item) => item.label)).toEqual(["Send again", "Close"]);
    expect(items.every((item) => item.disabledReason === paymentsCopy.en.items.busyReason)).toBe(
      true,
    );
    const idle = rowItems(
      payment([refund()]),
      () => {},
      false,
      new Set([9]),
      paymentsCopy.ru,
      createFormatter("ru"),
      "ru",
    );
    expect(idle.map((item) => item.label)).toEqual([
      "Отправить повторно",
      "Завершить",
      "Выплачено вручную",
    ]);
    expect(idle.every((item) => !item.disabledReason)).toBe(true);
  });

  it("words the confirmation and the success toast in the admin language", () => {
    const op = {
      kind: "close" as const,
      manualPayout: false,
      payment: payment([refund()]),
      refund: refund(),
    };
    const text = dialogCopy(op, paymentsCopy.en, createFormatter("en"));
    expect(text.title).toBe("Close the refund?");
    expect(text.body).toContain(`120,000${NBSP}UZS`);
    expect(successToast(op, paymentsCopy.ru)).toEqual({
      title: "Возврат завершён",
      description: "Заказ №10100: Click вернул деньги клиенту — выплачивать вручную не нужно.",
    });
    // The Uzbek default keeps the earlier texts.
    expect(successToast(op).title).toBe("Qaytarish yakunlandi");
  });

  it("treats a failed Uzum refund like Click's retry, never like a Payme cabinet refund", () => {
    const fmt = createFormatter("en");
    const failed = refund({ provider: "uzum" });
    const row = { ...payment([failed]), provider: "uzum" as const };
    // Retry only: closing a failed refund asks Click, which knows nothing of Uzum's payments.
    const items = rowItems(row, () => {}, false, new Set([9]), paymentsCopy.en, fmt, "en");
    expect(items.map((item) => item.label)).toEqual(["Send again"]);
    const retry = dialogCopy({ kind: "retry", payment: row, refund: failed }, paymentsCopy.en, fmt);
    expect(retry.body).toContain("sent to Uzum");
    const manual = refund({
      provider: "uzum",
      state: "manual_required",
      manualReason: "uzum_fake",
    });
    const settled = dialogCopy(
      {
        kind: "resolve",
        state: "succeeded",
        payment: { ...row, refunds: [manual] },
        refund: manual,
      },
      paymentsCopy.en,
      fmt,
    );
    expect(settled.body).not.toContain("cabinet");
  });
});
