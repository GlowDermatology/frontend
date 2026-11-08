import { describe, expect, it } from "vitest";

import { keepReauthAfter } from "./reauth-proof";

describe("keepReauthAfter", () => {
  it("drops a code proof the API refused, so a new code can be asked", () => {
    expect(keepReauthAfter({ verificationToken: "t" }, { code: "verification_invalid" })).toEqual(
      {},
    );
  });

  it("keeps a password proof on verification_invalid (nothing to re-send)", () => {
    const proof = { password: "secret" };
    expect(keepReauthAfter(proof, { code: "verification_invalid" })).toBe(proof);
  });

  it("keeps the proof on any other failure", () => {
    const proof = { verificationToken: "t" };
    expect(keepReauthAfter(proof, { code: "otp_invalid" })).toBe(proof);
    expect(keepReauthAfter(proof, {})).toBe(proof);
  });

  it("keeps a closed step closed", () => {
    expect(keepReauthAfter(null, { code: "verification_invalid" })).toBeNull();
  });
});
