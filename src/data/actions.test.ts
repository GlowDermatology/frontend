import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appointmentActions } from "@/domain/appointment";
import { ledgerBalance } from "@/domain/cashback";
import { canCancel, manualTransitions } from "@/domain/order";

import type { StaffSession } from "./auth";

/**
 * The Server Actions in mock mode: session/csrf gate, zod re-validation and
 * the happy paths, which must produce the same shapes the old client-side
 * mocks produced (the UI behaviour is unchanged). `verifyStaff` is mocked so
 * the gate can be exercised; `connection()` needs a Next request store and is
 * stubbed; `refresh()` must never run in mock mode.
 */

const verifyStaff = vi.fn<() => Promise<StaffSession>>();
const refresh = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("./auth", () => ({ verifyStaff: () => verifyStaff() }));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));

import { updateAppointment } from "./appointments.actions";
import { saveCashbackPolicy } from "./cashback.actions";
import { adjustCashback } from "./customers.actions";
import { ACTIVE_POLICY } from "./mock/cashback";
import { APPOINTMENTS } from "./mock/appointments";
import { PRODUCTS } from "./mock/catalog";
import { ORDER_SUMMARIES } from "./mock/orders";
import { getOrder } from "./mock/orders.queries";
import { sendNotification } from "./notifications.actions";
import { cancelOrder, changeOrderStatus, retryShipment } from "./orders.actions";
import {
  deleteProductImage,
  reorderProductImages,
  saveProduct,
  uploadProductImage,
} from "./products.actions";
import type { ProductFormValues } from "./products.schema";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const DEMO_NOW_ISO = "2026-10-24T07:00:00.000Z";

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  refresh.mockClear();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
  vi.useRealTimers();
});

function notificationForm(overrides: Record<string, string | File> = {}): FormData {
  const form = new FormData();
  const fields: Record<string, string | File> = {
    kind: "promo",
    title: "Yangi aksiya",
    body: "Barcha serumlarga 20% chegirma.",
    link: "none",
    audience: "all",
    segmentId: "",
    phone: "",
    scheduledAt: "",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

describe("session and csrf gate", () => {
  it("returns session_expired when verifyStaff reports no session or an expired one", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "expired" });
    const result = await changeOrderStatus(10248, "handed_to_courier", KEY, CSRF);
    expect(result).toEqual({
      ok: false,
      error: "Sessiya tugadi. Qayta kiring.",
      code: "session_expired",
    });
    verifyStaff.mockResolvedValue({ ok: false, reason: "no_session" });
    expect(await updateAppointment("a1", "confirm", KEY, CSRF)).toMatchObject({
      code: "session_expired",
    });
  });

  it("returns csrf when the double-submit token does not match", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "csrf" });
    const result = await adjustCashback(
      "5",
      { direction: "add", amount: 1000, reason: "Chek qo‘lda" },
      KEY,
      "wrong",
    );
    expect(result).toEqual({
      ok: false,
      error: "Xavfsizlik tekshiruvi o‘tmadi. Sahifani yangilang.",
      code: "csrf",
    });
  });

  it("rejects a non-UUID idempotency key before touching the data", async () => {
    const result = await cancelOrder(10248, "mijoz so‘rovi bilan", "not-a-uuid", CSRF);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.key).toBe("Noto‘g‘ri so‘rov kaliti.");
  });
});

describe("api mode (endpoints not wired yet)", () => {
  it("answers 'not wired' without refreshing the route", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const notWired = { ok: false, error: "Bu amal API bilan hali ulanmagan." };
    expect(await cancelOrder(10248, "mijoz so‘rovi bilan", KEY, CSRF)).toEqual(notWired);
    expect(await changeOrderStatus(10248, "handed_to_courier", KEY, CSRF)).toEqual(notWired);
    expect(await retryShipment(10248, KEY, CSRF)).toEqual(notWired);
    expect(await updateAppointment("a1", "confirm", KEY, CSRF)).toEqual(notWired);
    expect(await sendNotification(notificationForm(), KEY, CSRF)).toEqual(notWired);
    expect(await saveCashbackPolicy(ACTIVE_POLICY, KEY, CSRF)).toEqual(notWired);
    expect(
      await adjustCashback("5", { direction: "add", amount: 1, reason: "abc" }, KEY, CSRF),
    ).toEqual(notWired);
    expect(await deleteProductImage("1", "img-1", CSRF)).toEqual(notWired);
    expect(await reorderProductImages("1", ["img-1"], CSRF)).toEqual(notWired);
    expect(refresh).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("orders", () => {
  it("cancelOrder validates the reason (3..500) and returns the field error", async () => {
    const short = await cancelOrder(10248, "ab", KEY, CSRF);
    expect(short).toEqual({
      ok: false,
      error: "Sababni kiriting.",
      fieldErrors: { reason: "Kamida 3 ta belgi kiriting." },
    });
    const long = await cancelOrder(10248, "x".repeat(501), KEY, CSRF);
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.fieldErrors?.reason).toBe("500 belgidan oshmasin.");
  });

  it("cancelOrder adds the cancellation, the reversal entries and the history row", async () => {
    const before = await getOrder(10248);
    expect(before && canCancel(before)).toBe(true);
    const result = await cancelOrder(10248, "  mijoz so‘rovi bilan  ", KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok || !before) return;
    const order = result.data;
    expect(order.id).toBe(10248);
    expect(order.status).toBe("cancelled");
    expect(order.cancellation).toEqual({ reason: "admin", note: "mijoz so‘rovi bilan" });
    const reversals = order.cashback.filter((e) => e.kind === "reversal");
    expect(reversals).toHaveLength(before.cashback.filter((e) => e.kind !== "reversal").length);
    expect(order.cashback.slice(0, before.cashback.length)).toEqual(before.cashback);
    expect(order.history).toHaveLength(before.history.length + 1);
    expect(order.history[0]).toMatchObject({
      at: DEMO_NOW_ISO,
      title: "Bekor qilindi",
      source: "admin",
      status: "cancelled",
    });
    expect(order.history[0]?.note).toContain("mijoz so‘rovi bilan");
    if (before.payment.status === "paid") expect(order.payment.status).toBe("refunded");
  });

  it("cancelOrder reports an unknown order as not_found", async () => {
    expect(await cancelOrder(999, "mijoz so‘rovi bilan", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "not_found",
    });
  });

  it("changeOrderStatus appends the history row for an allowed transition only", async () => {
    const before = await getOrder(10248);
    const [next] = before ? manualTransitions(before) : [];
    expect(next).toBeDefined();
    if (!before || !next) return;
    const result = await changeOrderStatus(10248, next, KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe(next);
    expect(result.data.history).toHaveLength(before.history.length + 1);
    expect(result.data.history[0]).toMatchObject({
      at: DEMO_NOW_ISO,
      source: "admin",
      status: next,
      note: "Administrator · holat qo‘lda o‘zgartirildi · mijozga push yuborildi",
    });

    expect(await changeOrderStatus(10248, "awaiting_payment", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu holatga o‘tib bo‘lmaydi.",
    });
    const invalid = await changeOrderStatus(10248, "shipped" as never, KEY, CSRF);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.fieldErrors?.status).toBeDefined();
  });

  it("retryShipment sets the shipment to created with a tracking number", async () => {
    const failed = ORDER_SUMMARIES.find((o) => o.shipment.state === "failed");
    expect(failed).toBeDefined();
    if (!failed) return;
    const result = await retryShipment(failed.id, KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.shipment).toEqual({
      state: "created",
      trackingNumber: String(48_214_000 + (failed.id % 1000)),
      tariff: result.data.deliveryFee,
      updatedAt: DEMO_NOW_ISO,
      via: "webhook",
    });
    expect(result.data.history[0]).toMatchObject({
      title: "BTS buyurtmasi yaratildi",
      source: "admin",
    });

    const created = ORDER_SUMMARIES.find((o) => o.shipment.state === "created");
    if (created) {
      expect(await retryShipment(created.id, KEY, CSRF)).toEqual({
        ok: false,
        error: "BTS buyurtmasi allaqachon yaratilgan.",
      });
    }
  });
});

describe("products", () => {
  const product = PRODUCTS.find((p) => p.status === "active" && p.images.length > 0)!;
  const values: ProductFormValues = {
    texts: structuredClone(product.texts),
    price: product.price + 10_000,
    category: product.category ?? "serums",
    billzId: product.billzId,
    promo: product.promo,
    status: "active",
    images: structuredClone(product.images),
  };

  it("saveProduct re-validates with productFormSchema and maps field errors", async () => {
    const result = await saveProduct(
      product.id,
      { ...values, texts: { ...values.texts, uz: { ...values.texts.uz, name: "A" } }, price: 10 },
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: {
        "texts.uz.name": "O‘zbekcha nomni kiriting (kamida 2 belgi).",
        price: "Narx kamida 1 000 so‘m bo‘lsin.",
      },
    });
  });

  it("saveProduct patches an existing product and notes the price change", async () => {
    const result = await saveProduct(product.id, values, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe(product.id);
    expect(result.data.price).toBe(product.price + 10_000);
    expect(result.data.stock).toBe(product.stock);
    expect(result.data.lastChange).toMatchObject({ by: "Administrator", at: DEMO_NOW_ISO });
    expect(result.data.lastChange?.note).toMatch(/^narx /);
  });

  it("saveProduct creates a hidden draft and later activates it by id", async () => {
    const created = await saveProduct(
      null,
      { ...values, billzId: "123456789", status: "hidden", images: [] },
      CSRF,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.id).toBe("draft-123456789");
    expect(created.data.lastChange?.note).toBe("mahsulot yaratildi");

    const activated = await saveProduct(
      created.data.id,
      { ...values, billzId: "123456789", status: "active", images: [{ id: "img-1", label: "a" }] },
      CSRF,
    );
    expect(activated.ok).toBe(true);
    if (activated.ok)
      expect(activated.data).toMatchObject({ id: "draft-123456789", status: "active" });

    expect(await saveProduct("missing", values, CSRF)).toMatchObject({ code: "not_found" });
  });

  it("image actions validate the file, ids and order", async () => {
    const form = new FormData();
    form.set("file", new File(["x"], "photo.gif", { type: "image/gif" }));
    expect(await uploadProductImage(product.id, form, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { file: "Faqat JPG, PNG yoki WebP." },
    });
    form.set("file", new File(["x"], "photo.jpg", { type: "image/jpeg" }));
    const uploaded = await uploadProductImage(product.id, form, CSRF);
    expect(uploaded.ok).toBe(true);
    if (uploaded.ok)
      expect(uploaded.data).toEqual({ id: expect.stringMatching(/^img-/), label: "photo.jpg" });

    expect(await deleteProductImage(product.id, "img-1", CSRF)).toEqual({
      ok: true,
      data: { id: "img-1" },
    });
    expect(await reorderProductImages(product.id, ["b", "a"], CSRF)).toEqual({
      ok: true,
      data: { imageIds: ["b", "a"] },
    });
    expect(await reorderProductImages(product.id, ["a", "a"], CSRF)).toMatchObject({ ok: false });
    expect(
      await reorderProductImages(
        product.id,
        Array.from({ length: 9 }, (_, i) => `i${i}`),
        CSRF,
      ),
    ).toMatchObject({
      ok: false,
    });
  });
});

describe("adjustCashback", () => {
  it("validates the amount (int 1..10 000 000) and the reason (3..300) under the dialog's field names", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "add", amount: 0.5, reason: "ab" },
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: { amount: "Summani kiriting.", reason: "Kamida 3 ta belgi kiriting." },
    });
    const big = await adjustCashback(
      "5",
      { direction: "add", amount: 10_000_001, reason: "abc" },
      KEY,
      CSRF,
    );
    expect(big).toMatchObject({ fieldErrors: { amount: "Summa juda katta." } });
  });

  it("refuses to take the fixture balance below zero", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "subtract", amount: 48_601, reason: "xato tuzatish" },
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    });
  });

  it("returns the signed ledger entry and no server balance in mock mode", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "subtract", amount: 2_000, reason: "  kassa xatosi  " },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.balance).toBeUndefined();
    expect(result.data.entry).toEqual({
      id: expect.stringMatching(/^adj-/),
      at: DEMO_NOW_ISO,
      kind: "adjustment",
      source: "Administrator",
      note: "kassa xatosi",
      amount: -2_000,
    });
    expect(ledgerBalance([result.data.entry])).toBe(-2_000);
    expect(
      await adjustCashback("no-such", { direction: "add", amount: 1, reason: "abc" }, KEY, CSRF),
    ).toMatchObject({ code: "not_found" });
  });
});

describe("saveCashbackPolicy", () => {
  const draft = { ...ACTIVE_POLICY, effectiveFrom: "2026-11-01T00:00:00+05:00" };

  it("returns version n+1, scheduled, with the added-tier summary", async () => {
    const result = await saveCashbackPolicy(
      {
        ...draft,
        tiers: [...draft.tiers, { id: "tier-4", from: 50_000_000, to: null, percent: 4 }],
      },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.policy.version).toBe(4);
    expect(result.data.policy.tiers).toHaveLength(4);
    expect(result.data.version).toEqual({
      version: 4,
      summary: "50\u00a0mln dan: 4% qo‘shildi",
      author: "Administrator",
      period: "1-noy 2026 dan",
      active: false,
      scheduled: true,
    });
    expect(result.data.warnings).toBeUndefined();
  });

  it("diffs the summary by (from, to, percent) and strips the NBSP mln suffix", async () => {
    const renamed = draft.tiers.map((t) => ({ ...t, id: `${t.id}-x` }));
    const same = await saveCashbackPolicy(
      { ...draft, tiers: renamed, basis: "with_purchase" },
      KEY,
      CSRF,
    );
    expect(same.ok && same.data.version.summary).toBe("Hisoblash qoidalari yangilandi");

    const bounded = await saveCashbackPolicy(
      {
        ...draft,
        tiers: [...draft.tiers, { id: "tier-4", from: 50_000_000, to: 80_000_000, percent: 4 }],
      },
      KEY,
      CSRF,
    );
    expect(bounded.ok && bounded.data.version.summary).toBe("50–80\u00a0mln: 4% qo‘shildi");

    const changed = await saveCashbackPolicy(
      { ...draft, tiers: draft.tiers.map((t, i) => (i === 0 ? { ...t, percent: 1.5 } : t)) },
      KEY,
      CSRF,
    );
    expect(changed.ok && changed.data.version.summary).toBe("Darajalar yangilandi");

    const fewer = await saveCashbackPolicy({ ...draft, tiers: draft.tiers.slice(0, 2) }, KEY, CSRF);
    expect(fewer.ok && fewer.data.version.summary).toBe("Daraja olib tashlandi");
  });

  it("applies the domain tier rules and the percent bounds", async () => {
    expect(await saveCashbackPolicy({ ...draft, tiers: [] }, KEY, CSRF)).toEqual({
      ok: false,
      error: "Kamida bitta daraja kerak.",
    });
    const overlapping = [
      { id: "a", from: 0, to: 20_000_000, percent: 1 },
      { id: "b", from: 10_000_000, to: null, percent: 2 },
    ];
    expect(await saveCashbackPolicy({ ...draft, tiers: overlapping }, KEY, CSRF)).toEqual({
      ok: false,
      error: "Darajalar ustma-ust tushmoqda.",
    });
    const badPercent = await saveCashbackPolicy(
      { ...draft, tiers: [{ id: "a", from: 0, to: null, percent: 101 }] },
      KEY,
      CSRF,
    );
    expect(badPercent).toMatchObject({
      ok: false,
      fieldErrors: { "draft.tiers.0.percent": "Foiz 100 dan oshmasin." },
    });
    const decimals = await saveCashbackPolicy(
      { ...draft, tiers: [{ id: "a", from: 0, to: null, percent: 1.234 }] },
      KEY,
      CSRF,
    );
    expect(decimals).toMatchObject({
      fieldErrors: { "draft.tiers.0.percent": "Ko‘pi bilan 2 ta kasr raqam." },
    });
  });
});

describe("sendNotification", () => {
  it("validates title (3..60), body (5..180), phone (+998) and the schedule against requestNow()", async () => {
    const result = await sendNotification(
      notificationForm({
        title: "ab",
        body: "abc",
        audience: "one",
        phone: "+998 90 12",
        scheduledAt: "2026-10-24T11:00:00+05:00",
      }),
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: {
        title: "Sarlavhani kiriting (kamida 3 belgi).",
        body: "Xabar matnini kiriting.",
        phone: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
        scheduledAt: "Kelajakdagi vaqtni tanlang.",
      },
    });
    const long = await sendNotification(
      notificationForm({ title: "x".repeat(61), body: "y".repeat(181) }),
      KEY,
      CSRF,
    );
    expect(long).toMatchObject({
      fieldErrors: { title: "60 belgidan oshmasin.", body: "180 belgidan oshmasin." },
    });
    expect(
      await sendNotification(notificationForm({ audience: "group" }), KEY, CSRF),
    ).toMatchObject({
      fieldErrors: { segmentId: "Guruhni tanlang." },
    });
  });

  it("folds image problems into the top-level error", async () => {
    const result = await sendNotification(
      notificationForm({ image: new File(["x"], "banner.webp", { type: "image/webp" }) }),
      KEY,
      CSRF,
    );
    expect(result).toEqual({ ok: false, error: "Faqat JPG yoki PNG." });
  });

  it("returns the queued record for a send-now and the scheduled one for a later send", async () => {
    const now = await sendNotification(
      notificationForm({
        title: "  Yangi aksiya  ",
        image: new File(["x"], "b.png", { type: "image/png" }),
      }),
      KEY,
      CSRF,
    );
    expect(now.ok).toBe(true);
    if (now.ok) {
      expect(now.data).toEqual({
        id: expect.stringMatching(/^n-/),
        at: DEMO_NOW_ISO,
        kind: "promo",
        title: "Yangi aksiya",
        audienceLabel: "Barcha · 4\u00a0751",
        sent: null,
        delivered: null,
        state: "queued",
      });
    }
    const later = await sendNotification(
      notificationForm({
        audience: "one",
        phone: "+998 90 123 45 67",
        scheduledAt: "2026-10-26T10:00:00+05:00",
      }),
      KEY,
      CSRF,
    );
    expect(later.ok).toBe(true);
    if (later.ok) {
      expect(later.data).toMatchObject({
        at: "2026-10-26T10:00:00+05:00",
        audienceLabel: "Bitta mijoz · +998 90 123 45 67",
        state: "scheduled",
      });
    }
    const group = await sendNotification(
      notificationForm({ audience: "group", segmentId: "regular" }),
      KEY,
      CSRF,
    );
    expect(group.ok).toBe(true);
    if (group.ok) expect(group.data.audienceLabel).toBe("Doimiy mijozlar · 612");
  });
});

describe("updateAppointment", () => {
  it("applies confirm/reject/attend per the domain transition table", async () => {
    const requested = APPOINTMENTS.find((a) => a.status === "requested")!;
    const confirmed = APPOINTMENTS.find((a) => a.status === "confirmed")!;
    expect(appointmentActions("requested")).toEqual(["confirm", "reject"]);

    const confirm = await updateAppointment(requested.id, "confirm", KEY, CSRF);
    expect(confirm.ok && confirm.data).toEqual({ ...requested, status: "confirmed" });
    const reject = await updateAppointment(requested.id, "reject", KEY, CSRF);
    expect(reject.ok && reject.data.status).toBe("rejected");
    const attend = await updateAppointment(confirmed.id, "attend", KEY, CSRF);
    expect(attend.ok && attend.data.status).toBe("attended");

    expect(await updateAppointment(requested.id, "attend", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu amal ushbu holatda mumkin emas.",
    });
    expect(await updateAppointment("nope", "confirm", KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
    expect(await updateAppointment(requested.id, "cancel" as never, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { action: expect.any(String) },
    });
  });
});
