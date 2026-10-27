import { describe, expect, it } from "vitest";

import { othersLogoutNotice } from "./others-logout";

describe("othersLogoutNotice", () => {
  it("confirms only a reported success", () => {
    expect(othersLogoutNotice("http://localhost:3105/admin/settings?others=ok")).toEqual({
      cleanUrl: "/admin/settings",
      toast: expect.objectContaining({ tone: "success", title: "Boshqa qurilmalardan chiqildi" }),
    });
  });

  it("says the other sessions are still open after a failure", () => {
    expect(othersLogoutNotice("http://localhost:3105/admin/settings?others=failed&x=1")).toEqual({
      cleanUrl: "/admin/settings?x=1",
      toast: expect.objectContaining({
        tone: "info",
        title: "Boshqa qurilmalardan chiqib bo‘lmadi",
      }),
    });
  });

  it("ignores a missing or unknown flag", () => {
    expect(othersLogoutNotice("http://localhost:3105/admin/settings")).toBeNull();
    expect(othersLogoutNotice("http://localhost:3105/admin/settings?others=maybe")).toBeNull();
  });
});
