import { describe, expect, it } from "vitest";

import { toShopFailure } from "@/data/shop/private";
import { ApiError } from "@/data/api/errors";

import {
  inboxTarget,
  mapCart,
  mapCashback,
  mapMe,
  mapOrder,
  mapPage,
  mapPayLink,
  mapQrToken,
  mapSession,
  orderSessions,
} from "./account-mappers";
import type { ApiCart, ApiMe, ApiOrderDetail, ApiSession } from "./account-types";

const HOSTS = ["media.glowderma.uz"];

const me: ApiMe = {
  id: 5,
  phone: null,
  email: "malika@mail.uz",
  name: " Malika ",
  language: "ru",
  image_url: null,
  registered_at: "2026-10-01T10:00:00+05:00",
  has_password: true,
  linked_providers: ["google", "twitter" as never],
  push_enabled: false,
  consent: {
    terms_version: "20261001-1",
    accepted_at: null,
    current_version: "20261027-1",
    update_required: true,
  },
  default_address: null,
};

describe("mapMe", () => {
  it("keeps a phoneless account phoneless and drops unknown providers", () => {
    const mapped = mapMe(me);
    expect(mapped.phone).toBeNull();
    expect(mapped.email).toBe("malika@mail.uz");
    expect(mapped.name).toBe("Malika");
    expect(mapped.language).toBe("ru");
    expect(mapped.linkedProviders).toEqual(["google"]);
    expect(mapped.consent).toEqual({
      acceptedVersion: "20261001-1",
      currentVersion: "20261027-1",
      updateRequired: true,
    });
  });
});

const cart: ApiCart = {
  items: [
    {
      product_id: 4,
      name: "Krem",
      volume: "50 ml",
      main_image_url: "https://media.glowderma.uz/a.webp",
      unit_price: 312000,
      promo: false,
      quantity: 3,
      line_total: 936000,
      available: 2,
      max_quantity: 2,
      max_reached: true,
      status: "insufficient",
      price_changed: true,
      previous_price: 300000,
    },
    {
      product_id: 9,
      name: "Serum",
      volume: "",
      main_image_url: "https://elsewhere.example/b.webp",
      unit_price: 185000,
      promo: true,
      quantity: 1,
      line_total: 185000,
      available: 0,
      max_quantity: 0,
      max_reached: false,
      status: "weird" as never,
      price_changed: false,
      previous_price: null,
    },
  ],
  item_count: 2,
  quantity_total: 4,
  items_subtotal: 0,
  promo_subtotal: 0,
  has_problems: true,
  cashback: { available: -500, max_usable_pickup: 0 },
  updated_at: null,
  last_change: { product_id: 4, requested_quantity: 5, quantity: 2, max_reached: true },
};

describe("mapCart", () => {
  it("maps line problems, max_reached and the last change", () => {
    const mapped = mapCart(cart, HOSTS);
    expect(mapped.lines[0]).toMatchObject({
      productId: 4,
      status: "insufficient",
      maxReached: true,
      priceChanged: true,
      previousPrice: 300000,
      image: "https://media.glowderma.uz/a.webp",
    });
    // Unknown status literal → the safest reading; foreign image host → no next/image.
    expect(mapped.lines[1]).toMatchObject({ status: "unavailable", image: null });
    expect(mapped.quantityTotal).toBe(4);
    expect(mapped.cashbackAvailable).toBe(-500);
    expect(mapped.lastChange).toEqual({
      productId: 4,
      requested: 5,
      quantity: 2,
      maxReached: true,
    });
  });
});

describe("mapPayLink", () => {
  it("follows only an https provider page", () => {
    const base = {
      order_id: 1,
      payment_id: 2,
      provider: "click" as const,
      amount: 1000,
      pay_by: "2026-10-27T12:00:00+05:00",
      account_ref: "1-abc",
      app_url: null,
      return_url: "https://glowderma.uz/buyurtmalar/1?paid=1",
    };
    expect(mapPayLink({ ...base, web_url: "https://my.click.uz/services/pay?x=1" })?.webUrl).toBe(
      "https://my.click.uz/services/pay?x=1",
    );
    expect(mapPayLink({ ...base, web_url: "http://my.click.uz/" })).toBeNull();
    expect(mapPayLink({ ...base, web_url: "javascript:alert(1)" })).toBeNull();
  });
});

describe("mapOrder", () => {
  it("maps the timeline, progress, actions and drops a non-https tracking URL", () => {
    const api = {
      id: 10248,
      created_at: "2026-10-23T14:02:00+05:00",
      status: "handed_to_courier",
      status_label: "Kuryerga topshirildi",
      fulfilment: "delivery",
      fulfilment_label: "Yetkazib berish",
      total: 784400,
      item_count: 3,
      preview_images: ["https://media.glowderma.uz/a.webp", "https://evil.example/x.webp"],
      payment: {
        status: "paid",
        status_label: "To‘langan",
        provider: "click",
        amount: 784400,
        confirmed_at: "2026-10-23T14:05:00+05:00",
        in_progress: false,
        in_progress_label: null,
      },
      pay_by: null,
      tracking_number: "48213907",
      items: [],
      items_subtotal: 808000,
      promo_subtotal: 0,
      delivery_fee: 25000,
      cashback_used: 48600,
      address: "Toshkent",
      address_comment: null,
      pickup_address: null,
      customer_note: null,
      refund: null,
      shipment: { carrier: "BTS", tracking_number: "48213907", tracking_url: "http://bts.uz/t" },
      cashback: { used: 48600, earned: 5680, earned_state: "credited" },
      cancellation: null,
      progress: [{ step: "paid", label: "To‘lov qabul qilindi", state: "done", at: null }],
      timeline: [
        {
          type: "handed_to_courier",
          at: "2026-10-24T10:00:00+05:00",
          title: "Kuryerga topshirildi",
          subtitle: "BTS",
        },
      ],
      actions: { pay: false, cancel: false, reorder: true },
    } as unknown as ApiOrderDetail;
    const order = mapOrder(api, HOSTS);
    expect(order.previewImages).toEqual(["https://media.glowderma.uz/a.webp"]);
    expect(order.shipment?.trackingUrl).toBeNull();
    expect(order.timeline[0]).toMatchObject({ title: "Kuryerga topshirildi", subtitle: "BTS" });
    expect(order.actions).toEqual({ pay: false, cancel: false, reorder: true });
    expect(order.cashback).toEqual({ used: 48600, earned: 5680, earnedState: "credited" });
  });
});

describe("sessions", () => {
  const row = (id: string, current: boolean): ApiSession => ({
    id,
    device: id === "a" ? "Chrome (Windows)" : "",
    platform: id === "c" ? ("tv" as never) : "web",
    location: "",
    created_at: "2026-10-27T10:12:00+05:00",
    updated_at: "2026-10-27T18:40:00+05:00",
    current,
  });

  it("maps a row with dashes for unknown fields and puts the current session first", () => {
    const mapped = [row("a", false), row("b", true), row("c", false)].map(mapSession);
    expect(mapped[0]).toMatchObject({ device: "Chrome (Windows)", location: "—", platform: "web" });
    expect(mapped[1]?.device).toBe("—");
    expect(mapped[2]?.platform).toBeNull();
    expect(orderSessions(mapped).map((session) => session.id)).toEqual(["b", "a", "c"]);
  });
});

describe("mapCashback / mapQrToken / inboxTarget / mapPage", () => {
  it("clamps the tier progress", () => {
    const mapped = mapCashback({
      balance: 48600,
      held: 20000,
      available: 28600,
      negative: false,
      lifetime_total: 13580000,
      tier: { percent: "1.00", from: 0, to: 20000000 },
      next_tier: { percent: "2.00", from: 20000000, remaining: 6420000, progress: 1.7 },
      tiers: [],
      earn_on_cashback_paid: false,
      holds: [],
      qr_ttl_seconds: 60,
    });
    expect(mapped.nextTier?.progress).toBe(1);
    expect(mapped.available).toBe(28600);
  });

  it("shows only a well-formed QR token", () => {
    const token = {
      token: "GD1:3q2-7wEjRZ8nYlZTS3l6qg",
      expires_at: "x",
      ttl_seconds: 60,
      refresh_in_seconds: 50,
    };
    expect(mapQrToken(token)).toMatchObject({ refreshInSeconds: 50, ttlSeconds: 60 });
    expect(mapQrToken({ ...token, token: "GD1:<script>" })).toBeNull();
  });

  it("follows inbox links to known targets and https pages only", () => {
    const link = {
      kind: "order" as const,
      order_id: 10248,
      product_id: null,
      appointment_id: null,
      url: null,
    };
    expect(inboxTarget(link)).toEqual({ kind: "order", orderId: 10248 });
    expect(inboxTarget({ ...link, kind: "url", url: "http://x.uz" })).toEqual({ kind: "none" });
    expect(inboxTarget({ ...link, kind: "url", url: "https://glowderma.uz/aksiya" })).toEqual({
      kind: "url",
      url: "https://glowderma.uz/aksiya",
    });
    expect(inboxTarget({ ...link, kind: "product", product_id: null })).toEqual({ kind: "none" });
    expect(inboxTarget(null)).toEqual({ kind: "none" });
  });

  it("maps a page envelope", () => {
    expect(
      mapPage({ results: [1, 2], count: 2, page: 1, page_count: 0, page_size: 20 }, (n) => n * 2),
    ).toEqual({ items: [2, 4], total: 2, page: 1, pageCount: 1, pageSize: 20 });
  });
});

describe("toShopFailure", () => {
  const error = (
    status: number,
    code: string,
    extra: Partial<{ errors: never[]; details: unknown }> = {},
  ) =>
    new ApiError(
      status,
      { code, message: "Xabar", errors: extra.errors ?? [], request_id: "r" },
      { details: extra.details, retryAfter: status === 429 ? 30 : undefined },
    );

  it("turns a 401 on a session route into session_expired, but keeps login refusals", () => {
    expect(toShopFailure(error(401, "SESSION_EXPIRED"), "uz")).toMatchObject({
      code: "session_expired",
    });
    expect(toShopFailure(error(401, "invalid_credentials"), "uz", { route: "auth" })).toMatchObject(
      {
        code: "invalid_credentials",
        error: "Xabar",
      },
    );
  });

  it("passes the localized message, field errors, details and Retry-After through", () => {
    const failure = toShopFailure(
      new ApiError(
        400,
        {
          code: "validation_error",
          message: "Maydonlarni tekshiring.",
          errors: [{ field: "code", code: "otp_invalid", message: "Kod noto‘g‘ri." }],
          request_id: "r",
        },
        { details: { attempts_left: 4 } },
      ),
      "uz",
    );
    expect(failure).toMatchObject({
      fieldErrors: { code: "Kod noto‘g‘ri." },
      details: { attempts_left: 4 },
    });
    expect(toShopFailure(error(409, "phone_required"), "uz")).toMatchObject({
      code: "phone_required",
    });
    expect(toShopFailure(error(429, "otp_resend_too_soon"), "uz").retryAfter).toBe(30);
    expect(toShopFailure(error(0, "network_error"), "ru")).toMatchObject({ code: "network_error" });
  });
});
