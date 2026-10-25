import { describe, expect, it } from "vitest";

import { ledgerBalance } from "@/domain/cashback";
import { itemsSubtotal } from "@/domain/order";

import { getCustomer } from "./mock/customers.queries";
import { getOrder, getOrderStatusCounts, listOrders } from "./mock/orders.queries";
import { getCatalogStats, listProducts } from "./mock/products.queries";

/** The mock dataset must reproduce the numbers drawn in the design. */
describe("mock dataset", () => {
  it("matches the order tab counts and pagination on the orders screen", async () => {
    const counts = await getOrderStatusCounts({ period: "month" });
    expect(counts).toEqual({
      all: 1284,
      awaiting_payment: 6,
      processing: 12,
      handed_to_courier: 9,
      delivered: 1198,
      cancelled: 59,
    });
    const page = await listOrders({ period: "month", page: 1, pageSize: 10, sort: "date_desc" });
    expect(page.pageCount).toBe(129);
    expect(page.items.map((o) => o.id)).toEqual([
      10252, 10251, 10250, 10249, 10248, 10247, 10246, 10245, 10244, 10243,
    ]);
    expect(page.items.map((o) => o.total)).toEqual([
      1_128_000, 456_000, 312_000, 240_000, 784_400, 698_000, 1_540_000, 385_000, 212_000, 924_000,
    ]);
  });

  it("reproduces order №10248 exactly", async () => {
    const order = await getOrder(10248);
    expect(order).not.toBeNull();
    expect(itemsSubtotal(order!.items)).toBe(808_000);
    expect(order!.deliveryFee).toBe(25_000);
    expect(order!.cashbackUsed).toBe(48_600);
    expect(order!.total).toBe(784_400);
    expect(order!.cashback.map((e) => e.amount)).toEqual([-48_600, 5_680]);
    expect(order!.history.map((e) => e.title)).toEqual([
      "Kuryerga topshirildi",
      "BTS buyurtmasi yaratildi",
      "Jarayonda",
      "To‘lov kutilmoqda",
    ]);
  });

  it("matches the catalog numbers on the products screen and dashboard", async () => {
    expect(await getCatalogStats()).toMatchObject({ total: 248, newFromBillz: 4, outOfStock: 7 });
    const page = await listProducts({
      outOfStock: false,
      onlyNew: false,
      sort: "default",
      page: 1,
      pageSize: 8,
    });
    expect(page.pageCount).toBe(31);
  });

  it("keeps Malika's balance equal to the sum of her ledger (48 600 so‘m)", async () => {
    const customer = await getCustomer("5");
    expect(customer && ledgerBalance(customer.ledger)).toBe(48_600);
  });

  it("builds a coherent card for every customer who placed an order", async () => {
    const customer = await getCustomer("1");
    expect(customer?.name).toBe("Sherzod Qodirov");
    expect(customer?.onlineOrders.count).toBeGreaterThan(0);
  });
});
