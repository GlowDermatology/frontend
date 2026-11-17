import { describe, expect, it } from "vitest";

import { looksLikePhone, lookupSegmentId, lookupTerm, readLookupItem } from "./customer-lookup";
import { segmentRulesSummary } from "./segment";

describe("customer lookup term", () => {
  it("sends a phone in any spelling as national digits only", () => {
    expect(lookupTerm("+998 90 123 45 67")).toEqual({ term: "901234567", kind: "phone" });
    expect(lookupTerm("90 123")).toEqual({ term: "90123", kind: "phone" });
    expect(lookupTerm("(90) 123-45")).toEqual({ term: "9012345", kind: "phone" });
    expect(lookupTerm("998901234567")).toEqual({ term: "901234567", kind: "phone" });
    // The country code alone and two national digits are not enough yet.
    expect(lookupTerm("+998 90")).toBeNull();
  });

  it("needs 3 digits or 2 letters, and refuses an overlong text", () => {
    expect(lookupTerm("90")).toBeNull();
    expect(lookupTerm("  ")).toBeNull();
    expect(lookupTerm("M")).toBeNull();
    expect(lookupTerm("Ma")).toEqual({ term: "Ma", kind: "name" });
    expect(lookupTerm("  Malika   Karimova ")).toEqual({ term: "Malika Karimova", kind: "name" });
    expect(lookupTerm("x".repeat(65))).toBeNull();
  });

  it("tells phones from names", () => {
    expect(looksLikePhone("+998 90")).toBe(true);
    expect(looksLikePhone("90-123")).toBe(true);
    expect(looksLikePhone("Ali 2")).toBe(false);
    expect(looksLikePhone("+")).toBe(false);
  });

  it("accepts only id-shaped group ids", () => {
    expect(lookupSegmentId("12")).toBe("12");
    expect(lookupSegmentId(" g-1a ")).toBe("g-1a");
    expect(lookupSegmentId("")).toBeNull();
    expect(lookupSegmentId("1/2")).toBeNull();
    expect(lookupSegmentId(null)).toBeNull();
  });

  it("reads the route's rows defensively", () => {
    expect(
      readLookupItem({
        id: "5",
        name: "Malika",
        phone: "+998901234567",
        email: null,
        status: "active",
        member: true,
      }),
    ).toEqual({
      id: "5",
      name: "Malika",
      phone: "+998901234567",
      email: null,
      status: "active",
      member: true,
    });
    expect(
      readLookupItem({ id: "6", name: "", phone: null, email: "a@b.uz", status: "deleted" }),
    ).toEqual({ id: "6", name: "", phone: null, email: "a@b.uz", status: "deleted" });
    expect(
      readLookupItem({ id: 5, name: "x", phone: null, email: null, status: "active" }),
    ).toBeNull();
    expect(
      readLookupItem({ id: "5", name: "x", phone: 1, email: null, status: "active" }),
    ).toBeNull();
    expect(
      readLookupItem({ id: "5", name: "x", phone: null, email: null, status: "gone" }),
    ).toBeNull();
    expect(readLookupItem(null)).toBeNull();
  });
});

describe("segment rules in ru and en", () => {
  it("uses each language's plural and amount style", () => {
    const NBSP = "\u00a0";
    expect(segmentRulesSummary({ minOnlineOrders: 1, minLifetimeAmount: null }, "ru")).toBe(
      "Не менее 1 онлайн-заказа",
    );
    expect(segmentRulesSummary({ minOnlineOrders: 5, minLifetimeAmount: 2_500_000 }, "ru")).toBe(
      `Не менее 5 онлайн-заказов и покупки на сумму от 2,5${NBSP}млн сум`,
    );
    expect(segmentRulesSummary({ minOnlineOrders: 1, minLifetimeAmount: null }, "en")).toBe(
      "At least 1 online order",
    );
    expect(segmentRulesSummary({ minOnlineOrders: 3, minLifetimeAmount: 10_000_000 }, "en")).toBe(
      "At least 3 online orders and purchases of 10M UZS or more",
    );
    expect(segmentRulesSummary({ minOnlineOrders: null, minLifetimeAmount: null }, "en")).toBe(
      "Manually added customers only",
    );
  });
});
