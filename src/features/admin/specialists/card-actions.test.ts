import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createBlock: vi.fn(),
  createOverride: vi.fn(),
  deleteScheduleEntry: vi.fn(),
  saveWorkingHours: vi.fn(),
  setSpecialistPhoto: vi.fn(),
  updateSpecialist: vi.fn(),
}));
vi.mock("@/data/clinic.actions", () => actions);

import type {
  BlockFormValues,
  OverrideFormValues,
  SpecialistFormValues,
  WorkingWeekValues,
} from "@/data/clinic.schema";

import { staffProfileActions, staffScheduleActions } from "./card-actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const OK = { ok: true, data: null };

beforeEach(() => {
  for (const action of Object.values(actions)) {
    action.mockReset();
    action.mockResolvedValue(OK);
  }
});

describe("staff card actions", () => {
  it("bind every schedule write to the specialist", async () => {
    const schedule = staffScheduleActions("2");
    const week = { days: [] } as WorkingWeekValues;
    const override = { date: "2026-11-02" } as OverrideFormValues;
    const block = { startDate: "2026-11-02" } as BlockFormValues;
    await schedule.saveWeek(week, KEY, CSRF);
    await schedule.createOverride(override, KEY, CSRF);
    await schedule.createBlock(block, KEY, CSRF);
    expect(await schedule.deleteEntry("block", "9", KEY, CSRF)).toBe(OK);
    expect(actions.saveWorkingHours).toHaveBeenCalledWith("2", week, KEY, CSRF);
    expect(actions.createOverride).toHaveBeenCalledWith("2", override, KEY, CSRF);
    expect(actions.createBlock).toHaveBeenCalledWith("2", block, KEY, CSRF);
    expect(actions.deleteScheduleEntry).toHaveBeenCalledWith("2", "block", "9", KEY, CSRF);
  });

  it("bind the profile save and the photo to the specialist", async () => {
    const profile = staffProfileActions("2");
    const values = { name: "Jasur" } as SpecialistFormValues;
    const baseline = { name: "Jasur A." } as SpecialistFormValues;
    await profile.save(values, baseline, true, KEY, CSRF);
    await profile.photo(null, KEY, CSRF);
    expect(actions.updateSpecialist).toHaveBeenCalledWith("2", values, baseline, true, KEY, CSRF);
    expect(actions.setSpecialistPhoto).toHaveBeenCalledWith("2", null, KEY, CSRF);
  });
});
