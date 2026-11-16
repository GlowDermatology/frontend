import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ORDER_SEEDS } from "@/data/mock/orders";
import { getOrder } from "@/data/mock/orders.queries";
import type { Order } from "@/domain/order";

import { FulfilmentBoard } from "../dashboard/fulfilment-board";
import { OpenIssuesSection, OrderDeliveryCard } from "./delivery-card";
import { OrdersTable } from "./orders-table";

const plain = (html: string) => html.replace(/ /g, " ");

async function yandexOrder(stage: string): Promise<Order> {
  const seed = ORDER_SEEDS.find((s) => s.yandex?.stage === stage)!;
  return (await getOrder(seed.id))!;
}

describe("OrderDeliveryCard (carrier-neutral, plan §4)", () => {
  it("shows the method, stage, promised window, courier and tracking link — never a phone", async () => {
    const order = await yandexOrder("courier_assigned");
    const html = plain(renderToStaticMarkup(createElement(OrderDeliveryCard, { order })));
    expect(html).toContain("Yandex Express");
    expect(html).toContain("Kuryer biriktirildi");
    expect(html).toContain("Va’da qilingan vaqt");
    expect(html).toContain(order.delivery!.courierName!);
    expect(html).toContain(`href="${order.delivery!.trackingUrl}"`);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("performer_found");
    expect(html).not.toMatch(/\+998|tel:/);
  });

  it("puts the server's fee, offer, final cost and difference side by side", async () => {
    const order = await yandexOrder("delivered");
    const d = order.delivery!;
    const html = plain(renderToStaticMarkup(createElement(OrderDeliveryCard, { order })));
    expect(html).toContain("Mijoz to‘lagan");
    expect(html).toContain(`${d.quoteFee!.toLocaleString("en").replace(/,/g, " ")} so‘m`);
    expect(html).toContain("Yandex yakuniy narxi");
    expect(d.costDifference).toBe(d.quoteFee! - d.carrierCostTotal!);
    expect(html).toContain(`+${d.costDifference!.toLocaleString("en").replace(/,/g, " ")} so‘m`);
  });

  it("lists the open issues with a link to the queue for this order", async () => {
    const order = await yandexOrder("returning");
    const html = renderToStaticMarkup(
      createElement(OpenIssuesSection, { orderId: order.id, issues: order.delivery!.openIssues }),
    );
    expect(html).toContain("Ochiq muammolar (2)");
    expect(html).toContain("Qaytish kutilmoqda");
    expect(html).toContain("Shoshilinch");
    expect(html).toContain(`href="/admin/delivery-issues?order=${order.id}"`);
    const none = renderToStaticMarkup(createElement(OpenIssuesSection, { orderId: 1, issues: [] }));
    expect(none).toContain("Ochiq muammo yo‘q.");
  });
});

describe("the orders list's delivery column", () => {
  it("shows the carrier and the stage, BTS rows keep their states", async () => {
    const orders = [
      await yandexOrder("returning"),
      (await getOrder(10250))!,
      (await getOrder(10251))!,
    ];
    const html = renderToStaticMarkup(
      createElement(OrdersTable, { orders, sortHref: "/admin/orders", sortedAscending: false }),
    );
    expect(html).toContain("YETKAZISH");
    expect(html).toContain("Yandex Standard");
    expect(html).toContain("Omborga qaytarilmoqda");
    expect(html).toContain("Shoshilinch");
    // №10250: the design's failed BTS hand-off; №10251: pickup.
    expect(html).toContain("Yuborilmadi");
    expect(html).toContain("Kerak emas");
    expect(html.match(/Yuborilmadi/g)).toHaveLength(1);
  });
});

describe("FulfilmentBoard", () => {
  it("renders the seven tiles as links", () => {
    const html = renderToStaticMarkup(
      createElement(FulfilmentBoard, {
        counters: {
          paidToPrepare: 4,
          toHandToCourier: 2,
          inDelivery: 7,
          returning: 1,
          completedToday: 12,
          needsAction: 3,
          urgent: 1,
        },
      }),
    );
    expect(html).toContain("Buyurtmalar holati");
    expect(html.match(/<a /g)).toHaveLength(7);
    expect(html).toContain('href="/admin/orders?period=all&amp;attention=urgent"');
  });
});
