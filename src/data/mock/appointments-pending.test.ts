import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The demo's pending summary follows the backend's M3 rule (contract §2.9):
 * a request counts from the start of today in Tashkent, also once its time
 * has passed; requests of earlier days do not.
 */

const clock = vi.hoisted(() => ({ now: "2026-10-24T12:00:00+05:00" }));
vi.mock("../config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config")>()),
  referenceNow: () => new Date(clock.now),
}));

import { getPendingAppointments } from "./appointments.queries";

afterEach(() => {
  clock.now = "2026-10-24T12:00:00+05:00";
});

describe("getPendingAppointments (mock)", () => {
  it("counts the three requests of the design day ahead of the demo clock", async () => {
    expect(await getPendingAppointments()).toEqual({
      count: 3,
      nextAt: "2026-10-26T09:00:00+05:00",
    });
  });

  it("keeps today's request whose time passed, earliest first", async () => {
    clock.now = "2026-10-26T10:00:00+05:00";
    expect(await getPendingAppointments()).toEqual({
      count: 3,
      nextAt: "2026-10-26T09:00:00+05:00",
    });
  });

  it("drops the requests of earlier days", async () => {
    clock.now = "2026-10-27T00:05:00+05:00";
    expect(await getPendingAppointments()).toEqual({ count: 0, nextAt: null });
  });
});
