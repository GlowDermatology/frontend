import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `getAppointmentRange` (DESIGN §B): the range guard, the api branch (query and mapping of
 * `appointments/range/`) and the mock branch's deterministic synthetic days.
 */

const cachedGet = vi.fn();
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("./auth", () => ({ requireApiToken: async () => "t" }));
vi.mock("./api/client", () => ({
  apiFetch: vi.fn(),
  cachedGet: (...args: unknown[]) => cachedGet(...args),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import { mapAppointmentRange } from "./api/mappers/appointments";
import type { ApiAppointmentRange } from "./api/types";
import { getAppointmentRange } from "./appointments";
import { DESIGN_DAY, SPECIALISTS, syntheticDay } from "./mock/appointments";
import { getAppointmentDay } from "./mock/appointments.queries";

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
afterEach(() => {
  cachedGet.mockReset();
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

const clinic = { id: 2, name: "Yunusobod", address: "Toshkent, Yunusobod" };

const RANGE: ApiAppointmentRange = {
  from: "2026-10-26",
  to: "2026-10-27",
  specialists: [
    { id: 1, name: "Nodira Rahimova", role: "dermatologist", is_active: true },
    { id: 3, name: "Dilnoza Yusupova", role: "cosmetologist", is_active: false },
  ],
  days: [
    {
      date: "2026-10-26",
      counts: { requested: 1, confirmed: 1, attended: 0, rejected: 0, cancelled: 1 },
      total: 3,
      working: true,
      hours: { start: "09:00", end: "18:00" },
    },
    {
      date: "2026-10-27",
      counts: { requested: 0, confirmed: 0, attended: 0, rejected: 0, cancelled: 0 },
      total: 0,
      working: false,
      hours: null,
    },
  ],
  schedules: [
    {
      specialist_id: 1,
      date: "2026-10-26",
      working_hours: { start: "09:00", end: "18:00" },
      location: clinic,
      blocks: [{ start: "13:00", end: "14:00", kind: "off", label: null }],
    },
    { specialist_id: 1, date: "2026-10-27", location: null, working_hours: null, blocks: [] },
  ],
  appointments: [
    {
      id: 7,
      specialist_id: 1,
      location: clinic,
      customer: { id: 8, name: "Kamola Nazarova", phone: "+998909741823" },
      service_id: 1,
      service_name: "Dermatolog konsultatsiyasi",
      service_short_name: "Konsultatsiya",
      duration_min: 30,
      start: "2026-10-26T09:00:00+05:00",
      end: "2026-10-26T09:30:00+05:00",
      price: 150000,
      status: "requested",
      requested_at: "2026-10-24T08:41:00+05:00",
      requested_via: "app",
    },
  ],
} as unknown as ApiAppointmentRange;

describe("mapAppointmentRange", () => {
  it("maps the counts, the specialists and one day schedule per date", () => {
    const range = mapAppointmentRange(RANGE);
    expect(range.specialists).toEqual([
      { id: "1", name: "Nodira Rahimova", role: "Dermatolog", isActive: true },
      { id: "3", name: "Dilnoza Yusupova", role: "Kosmetolog", isActive: false },
    ]);
    expect(range.days[0]).toMatchObject({ date: "2026-10-26", total: 3, working: true });
    expect(range.days[0]!.counts.cancelled).toBe(1);
    expect(range.days[1]).toMatchObject({ working: false, hours: null });
    const [monday, tuesday] = range.schedules!;
    expect(monday!.appointments.map((a) => a.id)).toEqual(["7"]);
    expect(monday!.specialists[0]).toMatchObject({
      id: "1",
      working: true,
      location: { ...clinic, id: "2" },
    });
    expect(monday!.appointments[0]!.location).toEqual({ ...clinic, id: "2" });
    // No schedule entry → drawn as not working; a null working day → the day-off block.
    expect(monday!.specialists[1]).toMatchObject({ id: "3", working: false, isActive: false });
    expect(tuesday!.specialists[0]!.working).toBe(false);
    expect(tuesday!.appointments).toEqual([]);
  });

  it("leaves the schedules out of a counts answer", () => {
    expect(
      mapAppointmentRange({ ...RANGE, schedules: null, appointments: null }).schedules,
    ).toBeNull();
  });
});

describe("getAppointmentRange", () => {
  it("refuses an inverted or oversized range before fetching", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    await expect(getAppointmentRange({ from: "2026-10-27", to: "2026-10-26" })).rejects.toThrow(
      RangeError,
    );
    await expect(getAppointmentRange({ from: "2026-10-01", to: "2026-11-12" })).rejects.toThrow(
      RangeError,
    );
    await expect(
      getAppointmentRange({ from: "2026-10-26", to: "2026-11-02", detail: "full" }),
    ).rejects.toThrow(RangeError);
    await expect(getAppointmentRange({ from: "2026-1-1", to: "2026-01-02" })).rejects.toThrow(
      RangeError,
    );
    expect(cachedGet).not.toHaveBeenCalled();
  });

  it("asks the api with from/to/detail and a numeric specialist only", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    cachedGet.mockResolvedValue({ data: RANGE });
    await getAppointmentRange({ from: "2026-10-26", to: "2026-10-27", specialistId: "1" });
    expect(cachedGet).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/appointments\/range\/$/),
      { from: "2026-10-26", to: "2026-10-27", detail: "counts", specialist_id: 1 },
      "t",
    );
    await getAppointmentRange({
      from: "2026-10-26",
      to: "2026-10-27",
      detail: "full",
      specialistId: "s-1",
    });
    expect(cachedGet).toHaveBeenLastCalledWith(
      expect.any(String),
      { from: "2026-10-26", to: "2026-10-27", detail: "full" },
      "t",
    );
  });

  it("mock: counts every status of the same days the day board shows", async () => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
    const range = await getAppointmentRange({ from: "2026-10-26", to: "2026-11-01" });
    expect(range.days).toHaveLength(7);
    expect(range.schedules).toBeNull();
    for (const day of range.days) {
      const board = await getAppointmentDay(day.date);
      expect(day.total).toBe(board.appointments.length);
      expect(Object.values(day.counts).reduce((a, b) => a + b, 0)).toBe(day.total);
    }
    // Sunday 1 November: the demo clinic is closed.
    expect(range.days[6]).toMatchObject({ working: false, hours: null, total: 0 });
    expect(range.specialists.map((s) => s.id)).toEqual(SPECIALISTS.map((s) => s.id));
  });

  it("mock: narrows to one specialist and returns the full week", async () => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
    const range = await getAppointmentRange({
      from: "2026-10-26",
      to: "2026-11-01",
      detail: "full",
      specialistId: "s-2",
    });
    expect(range.specialists.map((s) => s.id)).toEqual(["s-2"]);
    expect(range.schedules).toHaveLength(7);
    for (const day of range.schedules!) {
      expect(day.specialists.map((s) => s.id)).toEqual(["s-2"]);
      expect(day.appointments.every((a) => a.specialistId === "s-2")).toBe(true);
    }
    expect(range.schedules![6]!.specialists[0]!.working).toBe(false);
  });

  it("mock: synthetic days are deterministic and leave requests to the fixture week", () => {
    const day = "2026-12-03";
    expect(syntheticDay(day)).toEqual(syntheticDay(day));
    expect(syntheticDay("2026-12-06")).toEqual([]); // a Sunday
    const many = ["2026-11-10", "2026-11-11", "2026-09-15", "2026-09-16"].flatMap(syntheticDay);
    expect(many.length).toBeGreaterThan(0);
    expect(many.some((a) => a.status === "requested")).toBe(false);
    expect(syntheticDay("2026-09-15").every((a) => a.status !== "confirmed")).toBe(true);
    expect(DESIGN_DAY).toBe("2026-10-26");
  });
});
