import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { ToastProvider } from "@/components/ui/toast";
import { DELIVERY_ISSUES, ORDER_SEEDS } from "@/data/mock/orders";
import { getOrder } from "@/data/mock/orders.queries";

import { OrderDetailView } from "../orders/order-detail-view";
import { IssuesTable } from "./issues-table";
import { SuspensionCard } from "./suspension-card";

const inToasts = (node: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(ToastProvider, null, node));

describe("the issues page's islands (server render)", () => {
  it("renders the queue rows with the order links and a resolve button for open ones", () => {
    const html = inToasts(createElement(IssuesTable, { issues: [...DELIVERY_ISSUES] }));
    for (const issue of DELIVERY_ISSUES) {
      expect(html).toContain(`href="/admin/orders/${issue.orderId}"`);
    }
    const open = DELIVERY_ISSUES.filter((issue) => issue.state === "open").length;
    expect(html.match(/>Hal qilish</g)).toHaveLength(open);
    expect(html).toContain("Hal qilindi");
    expect(html).toContain("Administrator");
  });

  it("renders the dispatch switch in both states", () => {
    const base = { note: "", updatedAt: "2026-10-20T09:00:00+05:00" };
    const on = inToasts(
      createElement(SuspensionCard, {
        initial: { ...base, suspended: false, until: null },
        now: "2026-10-24T07:00:00.000Z",
      }),
    );
    expect(on).toContain("Kuryer chaqirish ishlayapti");
    expect(on).toContain('aria-checked="false"');
    const off = inToasts(
      createElement(SuspensionCard, {
        initial: {
          ...base,
          suspended: true,
          until: "2026-10-25T09:00:00+05:00",
          note: "Inventarizatsiya",
        },
        now: "2026-10-24T07:00:00.000Z",
      }),
    );
    expect(off).toContain("To‘xtatilgan · 25-okt, 09:00 gacha");
    expect(off).toContain("Izoh: Inventarizatsiya");
  });
});

describe("the order page of a Yandex order", () => {
  it("shows the delivery card, the dispatch button and no BTS controls", async () => {
    const seed = ORDER_SEEDS.find(
      (s) => s.yandex?.stage === "awaiting_dispatch" && s.yandex.claimNumber === null,
    )!;
    const order = (await getOrder(seed.id))!;
    const html = inToasts(
      createElement(OrderDetailView, { initialOrder: order, now: "2026-10-24T07:00:00.000Z" }),
    );
    expect(html).toContain('aria-labelledby="order-delivery-title"');
    expect(html).toMatch(/<button[^>]*>(<svg[\s\S]*?<\/svg>)?Kuryer chaqirish<\/button>/);
    expect(html).not.toContain("3-BOSQICH");
    expect(html).not.toMatch(/ disabled=""/);
    expect(html).toContain("Hodisa qayd etish");
    expect(html).not.toContain("BTS ga");
    expect(html).not.toContain("order-shipment-title");
  });

  it("offers the price review, the return confirmation and the search check by stage", async () => {
    const render = async (pick: (s: (typeof ORDER_SEEDS)[number]) => boolean) => {
      const order = (await getOrder(ORDER_SEEDS.find(pick)!.id))!;
      return inToasts(
        createElement(OrderDetailView, { initialOrder: order, now: "2026-10-24T07:00:00.000Z" }),
      );
    };
    const reviewed = await render((s) => s.yandex?.claimStatus === "ready_for_approval");
    expect(reviewed).toContain("Narxni ko‘rib chiqish");
    const returning = await render((s) => s.yandex?.stage === "returning");
    expect(returning).toContain("Qaytganini tasdiqlash");
    expect(returning).not.toContain("Kuryer chaqirish<");
    const searching = await render((s) => s.yandex?.stage === "courier_requested");
    expect(searching).toContain("Holatni tekshirish");
    expect(searching).not.toContain("Qaytganini tasdiqlash");
  });

  it("keeps the BTS card and buttons for a BTS order, with its issues section", async () => {
    const order = (await getOrder(10250))!;
    const html = inToasts(
      createElement(OrderDetailView, { initialOrder: order, now: "2026-10-24T07:00:00.000Z" }),
    );
    expect(html).toContain('aria-labelledby="order-shipment-title"');
    expect(html).toContain("BTS ga yuborish");
    expect(html).toContain("Ochiq muammo yo‘q.");
    expect(html).not.toContain("Kuryer chaqirish");
  });
});
