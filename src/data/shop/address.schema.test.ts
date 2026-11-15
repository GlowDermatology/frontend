import { describe, expect, it } from "vitest";

import { addressPinSchema } from "./address.schema";

describe("addressPinSchema", () => {
  const schema = addressPinSchema("uz");

  it("rounds a pin to 6 decimals", () => {
    expect(schema.parse({ latitude: 41.31110049, longitude: 69.2797005 })).toEqual({
      latitude: 41.3111,
      longitude: 69.279701,
    });
  });

  it("accepts no pin", () => {
    expect(schema.parse({ latitude: null, longitude: null })).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it.each([
    { latitude: 41.3, longitude: null },
    { latitude: null, longitude: 69.2 },
    { latitude: 91, longitude: 69.2 },
    { latitude: 41.3, longitude: 181 },
    { latitude: Number.NaN, longitude: 69.2 },
    { latitude: "41.3", longitude: 69.2 },
  ])("refuses %o", (pin) => {
    const result = schema.safeParse(pin);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Xaritadagi nuqtani qayta belgilang.");
  });

  it("speaks the page's language", () => {
    const result = addressPinSchema("en").safeParse({ latitude: 1, longitude: null });
    expect(result.error?.issues[0]?.message).toBe("Set the point on the map again.");
  });
});
