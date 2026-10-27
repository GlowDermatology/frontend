import { describe, expect, it } from "vitest";

import type { DashboardData } from "@/domain/dashboard";

import {
  attentionItems,
  BTS_POLLING_FAILING_TITLE,
  CASHBACK_POLICY_MISSING_TITLE,
} from "./attention-items";

const calm: DashboardData["attention"] = {
  btsFailed: 0,
  pendingAppointments: 0,
  nextAppointmentAt: null,
  newFromBillz: 0,
  refundsNeedingAction: 0,
  btsPollingFailing: false,
  cashbackPolicyMissing: false,
};

describe("attentionItems (contract §5.7)", () => {
  it("shows nothing when nothing needs attention", () => {
    expect(attentionItems(calm)).toEqual([]);
  });

  it("words BTS polling failures with the contract's line, as text without a link (M2)", () => {
    const items = attentionItems({ ...calm, btsPollingFailing: true });
    expect(items).toEqual([
      {
        key: "bts-polling",
        icon: "truck",
        title: "BTS kuzatuvi ishlamayapti · buyurtma holatlari yangilanmayapti",
        tone: "danger",
      },
    ]);
    expect(items[0]!.title).toBe(BTS_POLLING_FAILING_TITLE);
    expect(items[0]!.href).toBeUndefined();
  });

  it("keeps the linked items in their order, with unique keys", () => {
    const items = attentionItems({
      btsFailed: 1,
      pendingAppointments: 3,
      nextAppointmentAt: "2026-10-26T09:00:00+05:00",
      newFromBillz: 4,
      refundsNeedingAction: 2,
      btsPollingFailing: true,
      cashbackPolicyMissing: true,
    });
    expect(items.map((item) => [item.key, item.href ?? null])).toEqual([
      ["bts-failed", "/admin/orders?status=processing&fulfilment=delivery&period=all"],
      ["bts-polling", null],
      ["cashback-policy", "/admin/cashback"],
      ["appointments", "/admin/appointments"],
      ["refunds", "/admin/payments?refund=needs_action"],
      ["billz", "/admin/products?new=1"],
    ]);
    expect(items[4]!.title).toBe("2 ta qaytarish tekshiruv kutmoqda");
  });

  it("links a missing cashback policy to the cashback settings (gap CB-9.2.4)", () => {
    const items = attentionItems({ ...calm, cashbackPolicyMissing: true });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "cashback-policy",
      href: "/admin/cashback",
      title: CASHBACK_POLICY_MISSING_TITLE,
      tone: "danger",
    });
    expect(CASHBACK_POLICY_MISSING_TITLE).toBe(
      "Cashback siyosati yo‘q · xaridlarga cashback yozilmayapti",
    );
  });
});
