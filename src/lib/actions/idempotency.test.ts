import { describe, expect, it } from "vitest";

import { newIdempotencyKey, shouldRenewKey } from "./idempotency";

/** Contract §1.7: one key per form instance, renewed after success or 422 `idempotency_key_reused`. */
describe("shouldRenewKey", () => {
  it("renews after a success (a replay counts as success)", () => {
    expect(shouldRenewKey({ ok: true, data: null })).toBe(true);
  });

  it("renews after the server reports the key as reused with another body", () => {
    expect(
      shouldRenewKey({
        ok: false,
        error: "Kalit boshqa so‘rovda ishlatilgan.",
        code: "idempotency_key_reused",
      }),
    ).toBe(true);
  });

  it("keeps the key on every other failure so a retry replays the same request", () => {
    expect(shouldRenewKey({ ok: false, error: "Maydonlarni tekshiring." })).toBe(false);
    expect(shouldRenewKey({ ok: false, error: "Sessiya tugadi.", code: "session_expired" })).toBe(
      false,
    );
    expect(shouldRenewKey({ ok: false, error: "Sahifani yangilang.", code: "csrf" })).toBe(false);
    expect(shouldRenewKey({ ok: false, error: "API bilan bog‘lanib bo‘lmadi." })).toBe(false);
    expect(shouldRenewKey({ ok: false, error: "Band.", code: "request_in_progress" })).toBe(false);
  });

  it("creates RFC 4122 UUIDs", () => {
    expect(newIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
