import { describe, expect, it } from "vitest";

import { notificationListHref, parseNotificationQuery } from "./query";

describe("notifications history URL state (gap X-NOTIF-HISTORY)", () => {
  it("keeps only known filters and page sizes", () => {
    expect(parseNotificationQuery({ state: "sent", kind: "promo", page: "3", size: "50" })).toEqual(
      { state: "sent", kind: "promo", page: 3, pageSize: 50 },
    );
    expect(parseNotificationQuery({ state: "lost", kind: "x", page: "-1", size: "30" })).toEqual({
      state: undefined,
      kind: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("omits defaults and keeps the composer's customer", () => {
    expect(notificationListHref({ page: 1, pageSize: 20 })).toBe("/admin/notifications");
    expect(notificationListHref({ state: "scheduled", page: 2, customer: "288" })).toBe(
      "/admin/notifications?customer=288&state=scheduled&page=2",
    );
    expect(
      notificationListHref({ kind: "general", pageSize: 50 }, "/admin/notifications/export"),
    ).toBe("/admin/notifications/export?kind=general&size=50");
  });
});
