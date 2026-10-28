import { describe, expect, it } from "vitest";

import { parseGeo, parseOpeningHours } from "./clinic-facts";

describe("parseOpeningHours", () => {
  it("reads day ranges and lists", () => {
    expect(parseOpeningHours("Mo-Fr 09:00-20:00; Sa,Su 10:00-18:00")).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "10:00",
        closes: "18:00",
      },
    ]);
  });

  it("ignores a malformed value entirely", () => {
    expect(parseOpeningHours(undefined)).toEqual([]);
    expect(parseOpeningHours("Mo-Fr 9-20")).toEqual([]);
    expect(parseOpeningHours("Fr-Mo 09:00-20:00")).toEqual([]);
    expect(parseOpeningHours("Mo 20:00-09:00")).toEqual([]);
  });
});

describe("parseGeo", () => {
  it("reads latitude,longitude", () => {
    expect(parseGeo("41.3111, 69.2797")).toEqual({ latitude: 41.3111, longitude: 69.2797 });
    expect(parseGeo("100,69")).toBeNull();
    expect(parseGeo("")).toBeNull();
  });
});
