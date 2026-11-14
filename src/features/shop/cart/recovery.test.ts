import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ShopCart, ShopOrder } from "@/domain/shop-account";
import { CartView } from "./cart-view";
import { cartBadgeQuantity, recoveryPhase } from "./recovery";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/data/shop/commerce.actions", () => ({}));
vi.mock("../account/phone-gate", () => ({ PhoneGate: () => null }));
vi.mock("../account/session-context", () => ({
  useShopSession: () => ({ setCartQuantity: vi.fn() }),
}));

const NOW = Date.parse("2026-11-15T10:00:00+05:00");
const order: ShopOrder = {
  id: 42,
  createdAt: "2026-11-15T09:59:00+05:00",
  status: "awaiting_payment",
  statusLabel: "Awaiting payment",
  fulfilment: "pickup",
  fulfilmentLabel: "Pickup",
  total: 199_000,
  itemCount: 1,
  previewImages: [],
  payment: { status: "pending", statusLabel: "Pending", provider: "click", inProgress: false },
  payBy: "2026-11-15T10:14:00+05:00",
  trackingNumber: null,
  items: [
    {
      productId: 7,
      name: "Saved serum",
      image: null,
      quantity: 1,
      unitPrice: 199_000,
      promo: false,
      lineTotal: 199_000,
    },
  ],
  itemsSubtotal: 199_000,
  promoSubtotal: 0,
  deliveryFee: 0,
  cashbackUsed: 0,
  address: null,
  addressComment: null,
  pickupAddress: "Store",
  customerNote: null,
  paymentDetail: { amount: 199_000, confirmedAt: null, inProgressLabel: null },
  refund: null,
  shipment: null,
  cashback: { used: 0, earned: 0, earnedState: "none" },
  cancellation: null,
  progress: [],
  timeline: [],
  actions: { pay: true, cancel: true, reorder: false },
};
const cart: ShopCart = {
  checkoutOrder: order,
  lines: [],
  itemCount: 0,
  quantityTotal: 0,
  itemsSubtotal: 0,
  promoSubtotal: 0,
  hasProblems: false,
  cashbackAvailable: 0,
  cashbackMaxPickup: 0,
  lastChange: null,
};
const render = (initial: ShopCart, locale: "uz" | "ru" | "en" = "en") =>
  renderToStaticMarkup(
    createElement(CartView, {
      locale,
      initial,
      providers: ["click", "payme"],
      canCheckout: { sales: true, payments: true },
      supportPhone: null,
    }),
  );

describe("saved checkout in the cart", () => {
  it.each(["uz", "ru", "en"] as const)(
    "keeps the purchase and both recovery actions visible in %s with an empty editable cart",
    (locale) => {
      const html = render(cart, locale);
      expect(html).toContain("Saved serum");
      expect(html).toContain("checkout-recovery-title");
      expect(html).toContain("№42");
      expect(html).not.toContain('href="/rasmiylashtirish"');
      if (locale === "en") {
        expect(html).toContain("Continue payment");
        expect(html).toContain("Edit items");
        expect(html).not.toContain("Your cart is empty");
      }
    },
  );

  it("separates newly added items and blocks creating another checkout", () => {
    const html = render({
      ...cart,
      quantityTotal: 1,
      lines: [
        {
          productId: 8,
          name: "New cream",
          volume: "50 ml",
          image: null,
          unitPrice: 10_000,
          promo: false,
          quantity: 1,
          lineTotal: 10_000,
          available: 10,
          maxQuantity: 10,
          maxReached: false,
          status: "ok",
          priceChanged: false,
          previousPrice: null,
        },
      ],
    });
    expect(html).toContain("Saved serum");
    expect(html).toContain("New cream");
    expect(html).toContain("Items added afterwards");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('href="/en/checkout"');
  });

  it("offers restore after expiry and refuses to invite another payment during confirmation", () => {
    const expired = {
      ...order,
      status: "cancelled" as const,
      cancellation: { reason: "reservation_expired", label: "Expired" },
      actions: { pay: false, cancel: false, reorder: true },
    };
    expect(render({ ...cart, checkoutOrder: expired })).toContain("Return items to cart");
    expect(render({ ...cart, checkoutOrder: expired })).not.toContain("Continue payment");
    const confirming = render({
      ...cart,
      checkoutOrder: { ...order, payment: { ...order.payment, inProgress: true } },
    });
    expect(confirming).toContain("Waiting for payment confirmation");
    expect(confirming).not.toContain("Continue payment");
    expect(confirming).not.toContain("Edit items");
  });

  it("keeps the pending purchase in the badge and distinguishes expiry from an unknown payment result", () => {
    expect(cartBadgeQuantity(cart)).toBe(1);
    expect(cartBadgeQuantity({ ...cart, quantityTotal: 2 })).toBe(3);
    expect(cartBadgeQuantity({ ...cart, checkoutOrder: { ...order, status: "cancelled" } })).toBe(
      0,
    );
    expect(recoveryPhase(order, NOW)).toBe("pending");
    expect(recoveryPhase(order, NOW + 20 * 60_000)).toBe("expired");
    expect(
      recoveryPhase(
        { ...order, payment: { ...order.payment, inProgress: true } },
        NOW + 20 * 60_000,
      ),
    ).toBe("confirming");
  });
});
