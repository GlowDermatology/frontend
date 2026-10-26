import { describe, expect, it } from "vitest";

import { isoDateParam } from "./url-state";

describe("isoDateParam", () => {
  it("keeps a real calendar day in 2000–2099", () => {
    expect(isoDateParam("2026-10-20")).toBe("2026-10-20");
    expect(isoDateParam("2028-02-29")).toBe("2028-02-29");
    expect(isoDateParam("2000-01-01")).toBe("2000-01-01");
    expect(isoDateParam("2099-12-31")).toBe("2099-12-31");
  });

  it("drops malformed, impossible and half-typed days", () => {
    for (const value of [
      undefined,
      "",
      "2026-1-20",
      "20261020",
      "2026-10-20T00:00",
      "2026-02-30",
      "2026-13-01",
      "2027-02-29",
      // A date input mid-year: Chrome reports each typed digit as a full value.
      "0002-10-20",
      "0020-10-20",
      "0202-10-20",
      "1999-12-31",
      "2100-01-01",
    ]) {
      expect(isoDateParam(value)).toBeUndefined();
    }
  });
});
