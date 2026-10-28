import { describe, expect, it } from "vitest";

import { sandboxAllowed } from "./payment-sandbox";

describe("sandboxAllowed", () => {
  it("is off unless asked for", () => {
    expect(sandboxAllowed({ NODE_ENV: "development" })).toBe(false);
    expect(sandboxAllowed({ NODE_ENV: "development", GLOWDERMA_PAYMENT_SANDBOX: "true" })).toBe(
      true,
    );
  });

  it("needs a second opt-in on a production server", () => {
    expect(sandboxAllowed({ NODE_ENV: "production", GLOWDERMA_PAYMENT_SANDBOX: "true" })).toBe(
      false,
    );
    expect(
      sandboxAllowed({
        NODE_ENV: "production",
        GLOWDERMA_PAYMENT_SANDBOX: "true",
        GLOWDERMA_PAYMENT_SANDBOX_ALLOW: "true",
      }),
    ).toBe(true);
  });
});
