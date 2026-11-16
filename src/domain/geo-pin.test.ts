import { describe, expect, it } from "vitest";

import { hasPin } from "./shop-account";
import {
  DEFAULT_MAP_CENTER,
  formatPin,
  parseCoordinate,
  roundCoordinate,
  toPin,
  wrapLongitude,
} from "./geo-pin";

describe("roundCoordinate", () => {
  it("keeps 6 decimals and never returns -0", () => {
    expect(roundCoordinate(41.31110049)).toBe(41.3111);
    expect(roundCoordinate(69.2797005)).toBe(69.279701);
    expect(roundCoordinate(-0.0000001)).toBe(0);
    expect(Object.is(roundCoordinate(-0.0000001), 0)).toBe(true);
    expect(roundCoordinate(-12.3456789)).toBe(-12.345679);
  });
});

describe("parseCoordinate", () => {
  it("reads numbers and numeric strings", () => {
    expect(parseCoordinate(41.3111)).toBe(41.3111);
    expect(parseCoordinate("41.311100")).toBe(41.3111);
    expect(parseCoordinate(" -69.5 ")).toBe(-69.5);
    expect(parseCoordinate("+.5")).toBe(0.5);
  });

  it.each([null, undefined, "", " ", "abc", "1e3", "41,31", "0x10", NaN, Infinity, true, {}])(
    "refuses %s",
    (value) => {
      expect(parseCoordinate(value)).toBeNull();
    },
  );
});

describe("toPin", () => {
  it("rounds a valid pair", () => {
    expect(toPin("41.31110049", 69.2797005)).toEqual({ latitude: 41.3111, longitude: 69.279701 });
    expect(toPin(-90, 180)).toEqual({ latitude: -90, longitude: 180 });
  });

  it("treats half a pin and out-of-range values as no pin", () => {
    expect(toPin(41.3, null)).toBeNull();
    expect(toPin(null, 69.2)).toBeNull();
    expect(toPin(null, null)).toBeNull();
    expect(toPin(90.000001, 0)).toBeNull();
    expect(toPin(0, -180.5)).toBeNull();
    expect(toPin("x", "y")).toBeNull();
  });
});

describe("wrapLongitude", () => {
  it("brings a panned longitude back into range", () => {
    expect(wrapLongitude(69.28)).toBe(69.28);
    expect(wrapLongitude(180)).toBe(180);
    expect(wrapLongitude(429.28)).toBeCloseTo(69.28, 9);
    expect(wrapLongitude(-290.72)).toBeCloseTo(69.28, 9);
    expect(wrapLongitude(540)).toBe(180);
  });
});

describe("formatPin", () => {
  it("always shows 6 decimals", () => {
    expect(formatPin(DEFAULT_MAP_CENTER)).toBe("41.311100, 69.279700");
    expect(formatPin({ latitude: -1.5, longitude: 0 })).toBe("-1.500000, 0.000000");
  });
});

describe("hasPin", () => {
  it("needs both coordinates", () => {
    expect(hasPin({ latitude: 41.3, longitude: 69.2 })).toBe(true);
    expect(hasPin({ latitude: 0, longitude: 0 })).toBe(true);
    expect(hasPin({ latitude: 41.3, longitude: null })).toBe(false);
    expect(hasPin({ latitude: null, longitude: 69.2 })).toBe(false);
    expect(hasPin({ latitude: null, longitude: null })).toBe(false);
    expect(hasPin({ latitude: NaN, longitude: 69.2 })).toBe(false);
  });
});
