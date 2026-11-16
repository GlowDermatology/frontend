import { describe, expect, it } from "vitest";

import { ORDER_SEEDS } from "@/data/mock/orders";
import { getOrder } from "@/data/mock/orders.queries";
import type { Order, ShipmentStage } from "@/domain/order";

import { cancellationEffects, YANDEX_CANCEL_FEE_NOTE } from "./cancel-order-dialog";

async function yandexOrder(stage: ShipmentStage): Promise<Order> {
  const seed = ORDER_SEEDS.find((s) => s.yandex?.stage === stage)!;
  return (await getOrder(seed.id))!;
}

const withStage = (order: Order, stage: ShipmentStage): Order => ({
  ...order,
  delivery: { ...order.delivery!, stage },
});

describe("cancellationEffects (carrier-aware texts, plan §3.8)", () => {
  it("states that Yandex may charge a fee once a courier is assigned (never an amount)", async () => {
    const order = await yandexOrder("courier_assigned");
    const effects = cancellationEffects(order);
    expect(effects).toContain("Yandex kuryer buyurtmasi bekor qilish uchun yuboriladi.");
    expect(effects).toContain(YANDEX_CANCEL_FEE_NOTE);
    expect(YANDEX_CANCEL_FEE_NOTE).not.toMatch(/\d/);
    expect(cancellationEffects(withStage(order, "courier_requested"))).toContain(
      YANDEX_CANCEL_FEE_NOTE,
    );
    // The refund line stays as before.
    expect(effects[0]).toMatch(/orqali mijozga qaytariladi\.$/);
  });

  it("explains the return first for a parcel with the courier", async () => {
    const effects = cancellationEffects(await yandexOrder("in_transit"));
    expect(effects.join(" ")).toContain("omborga qaytarish so‘raladi");
    expect(effects.join(" ")).toContain("buyurtma ochiq qoladi");
  });

  it("asks Yandex nothing for a parcel coming back or back, or before any claim", async () => {
    const returning = cancellationEffects(await yandexOrder("returning"));
    expect(returning).toContain("Posilka omborga qaytmoqda: Yandexga so‘rov yuborilmaydi.");
    expect(returning).not.toContain(YANDEX_CANCEL_FEE_NOTE);
    const waiting = cancellationEffects(await yandexOrder("awaiting_dispatch"));
    expect(waiting.join(" ")).not.toContain("Yandex");
    expect(waiting.join(" ")).not.toContain("BTS");
  });

  it("keeps the BTS and unpaid texts unchanged", async () => {
    const bts = (await getOrder(10249))!;
    const effects = cancellationEffects(bts);
    if (bts.shipment.state === "created") {
      expect(effects).toContain(
        `BTS buyurtmasi ${bts.shipment.trackingNumber} bekor qilish uchun yuboriladi.`,
      );
    }
    expect(effects.join(" ")).not.toContain("Yandex");
    const unpaid = ORDER_SEEDS.find((s) => s.status === "awaiting_payment")!;
    expect(cancellationEffects((await getOrder(unpaid.id))!)).toContain(
      "Band qilingan mahsulotlar omborga qaytariladi.",
    );
  });
});
