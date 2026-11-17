import { describe, expect, it } from "vitest";

import type { Order, OrderDelivery } from "@/domain/order";

import {
  DISPATCH_TIMEOUT_TOAST,
  dispatchOffer,
  dispatchTimeoutToast,
  dispatchToast,
  formatGrams,
  manualDeliveryOffered,
  promisedWindow,
  withOpenIssue,
} from "./delivery-view";

const yandex = (patch: Partial<OrderDelivery> = {}): OrderDelivery => ({
  provider: "yandex",
  method: "standard",
  stage: "awaiting_dispatch",
  promisedFrom: null,
  promisedTo: null,
  quoteFee: 22_000,
  carrierPrice: 19_000,
  offerPrice: null,
  approvedPrice: null,
  carrierCostTotal: null,
  costDifference: null,
  parcelWeightG: null,
  preparedAt: null,
  courierName: null,
  courierVehicle: null,
  trackingUrl: null,
  claimStatus: null,
  claimNumber: null,
  failureCode: null,
  openIssues: [],
  ...patch,
});

const order = (patch: Partial<Order>): Pick<Order, "status" | "availableActions" | "delivery"> => ({
  status: "processing",
  availableActions: { transitions: [], cancel: true, retryShipment: false },
  delivery: yandex(),
  ...patch,
});

const actions = { transitions: [], cancel: true, retryShipment: false };
const review = {
  id: 7,
  kind: "dispatch_review" as const,
  code: "increase_over_limit",
  urgent: false,
  openedAt: "2026-11-15T10:00:00Z",
};

describe("dispatchOffer (Kuryer chaqirish)", () => {
  it("is offered only when the server says available_actions.dispatch = true", () => {
    expect(dispatchOffer(order({ availableActions: { ...actions, dispatch: true } }))).toEqual({
      review: null,
      label: "Kuryer chaqirish",
    });
    expect(dispatchOffer(order({ availableActions: { ...actions, dispatch: false } }))).toBeNull();
    // An API before phase 3 has no dispatch endpoint: no button without the key.
    expect(dispatchOffer(order({}))).toBeNull();
  });

  it("names the retry, the new trip after a return and the price review", () => {
    const offered = { ...actions, dispatch: true };
    expect(
      dispatchOffer(order({ availableActions: offered, delivery: yandex({ stage: "failed" }) }))
        ?.label,
    ).toBe("Kuryerni qayta chaqirish");
    expect(
      dispatchOffer(order({ availableActions: offered, delivery: yandex({ stage: "returned" }) }))
        ?.label,
    ).toBe("Qayta jo‘natish");
    const reviewed = dispatchOffer(
      order({ availableActions: offered, delivery: yandex({ openIssues: [review] }) }),
    );
    expect(reviewed).toEqual({ review, label: "Narxni ko‘rib chiqish" });
  });

  it("never offers it for BTS, pickup or an API without the delivery object", () => {
    const offered = { availableActions: { ...actions, dispatch: true } };
    expect(
      dispatchOffer(order({ ...offered, delivery: { ...yandex(), provider: "bts" } })),
    ).toBeNull();
    expect(dispatchOffer(order({ ...offered, delivery: null }))).toBeNull();
    expect(dispatchOffer(order({ ...offered, delivery: undefined }))).toBeNull();
  });
});

describe("manualDeliveryOffered (parcel_unaccounted)", () => {
  it("follows the server's transitions for a Yandex order only", () => {
    const listed = { ...actions, transitions: ["delivered" as const] };
    expect(manualDeliveryOffered(order({ availableActions: listed }))).toBe(true);
    expect(manualDeliveryOffered(order({ availableActions: actions }))).toBe(false);
    expect(
      manualDeliveryOffered(
        order({ availableActions: listed, delivery: { ...yandex(), provider: "bts" } }),
      ),
    ).toBe(false);
  });
});

describe("dispatchToast", () => {
  it("words the search, a found courier and every dispatch issue", () => {
    expect(dispatchToast({ kind: "searching" }, order({}))?.title).toBe("Kuryer chaqirildi");
    const found = dispatchToast(
      { kind: "moved", stage: "courier_assigned" },
      order({ delivery: yandex({ courierName: "Sardor" }) }),
    );
    expect(found).toEqual({
      tone: "success",
      title: "Kuryer topildi",
      description: "Kuryer biriktirildi · Sardor",
    });
    expect(dispatchToast({ kind: "moved", stage: "cancelled" }, order({}))).toBeNull();
    expect(
      dispatchToast({ kind: "issue", issueKind: "dispatch_review", code: "x" }, order({}))?.title,
    ).toBe("Narxni tasdiqlash kerak");
    expect(
      dispatchToast({ kind: "issue", issueKind: "dispatch_unknown", code: "x" }, order({}))?.title,
    ).toBe("Kuryer chaqiruvi noaniq");
    expect(
      dispatchToast(
        { kind: "issue", issueKind: "dispatch_failed", code: "performer_not_found" },
        order({}),
      )?.description,
    ).toContain("performer_not_found");
    expect(DISPATCH_TIMEOUT_TOAST.title).toBe("Kuryer hali topilmadi");
  });

  it("tones failures as warning / danger and words them in the admin language", () => {
    const review = { kind: "issue", issueKind: "dispatch_review", code: "x" } as const;
    const failed = { kind: "issue", issueKind: "dispatch_failed", code: "boom" } as const;
    expect(dispatchToast(review, order({}))?.tone).toBe("warning");
    expect(dispatchToast(failed, order({}))?.tone).toBe("danger");
    expect(dispatchToast({ kind: "searching" }, order({}))?.tone).toBe("success");
    expect(dispatchToast(review, order({}), "ru")?.title).toBe("Нужно подтвердить цену");
    expect(dispatchToast(failed, order({}), "en")?.description).toBe(
      "Reason: boom. You can call a courier again.",
    );
    expect(dispatchTimeoutToast("en")).toMatchObject({ tone: "info", title: "No courier yet" });
  });

  it("labels the dispatch button in every language", () => {
    const offered = { availableActions: { ...actions, dispatch: true } };
    expect(dispatchOffer(order(offered), "ru")?.label).toBe("Вызвать курьера");
    expect(
      dispatchOffer(order({ ...offered, delivery: yandex({ stage: "failed" }) }), "en")?.label,
    ).toBe("Call a courier again");
  });

  it("never shows a phone in a toast", () => {
    const text = JSON.stringify(
      dispatchToast(
        { kind: "moved", stage: "in_transit" },
        order({ delivery: yandex({ courierName: "Jasur" }) }),
      ),
    );
    expect(text).not.toMatch(/\+?998|\d{9}/);
  });
});

describe("promisedWindow / formatGrams", () => {
  it("joins one day's window and spells out a window across days", () => {
    expect(promisedWindow("2026-11-15T14:05:00+05:00", "2026-11-15T15:35:00+05:00")).toBe(
      "15-noy, 14:05–15:35",
    );
    expect(promisedWindow("2026-11-15T22:30:00+05:00", "2026-11-16T09:00:00+05:00")).toBe(
      "15-noy, 22:30 – 16-noy, 09:00",
    );
    expect(promisedWindow(null, "2026-11-15T15:35:00+05:00")).toBe("15-noy, 15:35 gacha");
    expect(promisedWindow(null, null)).toBeNull();
  });

  it("writes grams with a thousands separator", () => {
    expect(formatGrams(1250).replace(/ /g, " ")).toBe("1 250 g");
  });
});

describe("withOpenIssue (staff incident answered)", () => {
  const base = {
    delivery: yandex({
      openIssues: [
        {
          id: 2,
          kind: "delivery_failed",
          code: "x",
          urgent: false,
          openedAt: "2026-11-15T10:00:00Z",
        },
      ],
    }),
  } as Order;

  it("adds a new incident in the API's order (urgent first, then oldest)", () => {
    const next = withOpenIssue(base, {
      id: 9,
      kind: "incident",
      code: "staff_report",
      urgent: true,
      openedAt: "2026-11-15T12:00:00Z",
    });
    expect(next.delivery?.openIssues.map((issue) => issue.id)).toEqual([9, 2]);
  });

  it("replaces a refreshed incident by id and leaves pickup alone", () => {
    const once = withOpenIssue(base, {
      id: 9,
      kind: "incident",
      code: "staff_report",
      urgent: true,
      openedAt: "2026-11-15T12:00:00Z",
    });
    const twice = withOpenIssue(once, {
      id: 9,
      kind: "incident",
      code: "staff_report",
      urgent: false,
      openedAt: "2026-11-15T12:00:00Z",
    });
    expect(twice.delivery?.openIssues.map((issue) => [issue.id, issue.urgent])).toEqual([
      [2, false],
      [9, false],
    ]);
    const pickup = { delivery: null } as Order;
    expect(withOpenIssue(pickup, once.delivery!.openIssues[0]!)).toBe(pickup);
  });
});
