import { describe, expect, it } from "vitest";

import { hasReauthProof, newPasswordProblem, unplacedError } from "./password-rules";

describe("newPasswordProblem", () => {
  it("checks length, digits-only and the repeat in that order", () => {
    expect(newPasswordProblem("short1", "short1")).toBe("short");
    expect(newPasswordProblem("12345678", "12345678")).toBe("digits");
    expect(newPasswordProblem("Glow-2026!", "Glow-2026?")).toBe("mismatch");
    expect(newPasswordProblem("Glow-2026!", "Glow-2026!")).toBeNull();
  });
});

describe("hasReauthProof", () => {
  it("needs a typed password or a verified code", () => {
    expect(hasReauthProof({})).toBe(false);
    expect(hasReauthProof({ password: "" })).toBe(false);
    expect(hasReauthProof({ password: "x" })).toBe(true);
    expect(hasReauthProof({ verificationToken: "t" })).toBe(true);
  });
});

describe("unplacedError", () => {
  const failure = (fieldErrors?: Record<string, string>) =>
    ({ ok: false, error: "Tekshiring.", fieldErrors }) as const;

  it("shows a refusal no field displays", () => {
    expect(unplacedError(null, [])).toBeNull();
    expect(unplacedError(failure(), ["password"])).toBe("Tekshiring.");
    expect(unplacedError(failure({ verification_token: "Majburiy." }), ["password"])).toBe(
      "Majburiy.",
    );
  });

  it("stays quiet when a shown field carries the error", () => {
    expect(unplacedError(failure({ password: "Juda oddiy." }), ["password"])).toBeNull();
  });
});
