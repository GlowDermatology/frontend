import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { NotificationRecord } from "@/domain/notification";

import {
  applyCancelOutcome,
  cancelKeyFor,
  cancelOutcome,
  canCancelCampaign,
  settleCancelKey,
  type CancelEffects,
} from "./cancel-campaign";

const record: NotificationRecord = {
  id: "4",
  at: "2026-10-26T10:00:00+05:00",
  kind: "general",
  title: "Yangi dermatolog qabuli ochildi",
  audienceLabel: "Doimiy mijozlar · 612",
  sent: null,
  delivered: null,
  state: "cancelled",
  scheduledAt: "2026-10-26T10:00:00+05:00",
  cancelledAt: "2026-10-27T01:03:19+05:00",
};

const STARTED = "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.";

describe("canCancelCampaign", () => {
  it("offers Bekor qilish for scheduled campaigns only", () => {
    expect(canCancelCampaign({ state: "scheduled" })).toBe(true);
    expect(canCancelCampaign({ state: "queued" })).toBe(false);
    expect(canCancelCampaign({ state: "sent" })).toBe(false);
    expect(canCancelCampaign({ state: "cancelled" })).toBe(false);
  });
});

describe("cancelOutcome", () => {
  it("shows the cancelled record", () => {
    expect(cancelOutcome({ ok: true, data: record })).toEqual({ type: "done", record });
  });

  it("is stale when the send started (409) or the campaign is gone (404)", () => {
    expect(cancelOutcome({ ok: false, code: "conflict", error: STARTED })).toEqual({
      type: "stale",
      message: STARTED,
      gone: false,
    });
    expect(cancelOutcome({ ok: false, code: "not_found", error: "Topilmadi." })).toEqual({
      type: "stale",
      message: "Topilmadi.",
      gone: true,
    });
  });

  it("is retryable when nothing changed", () => {
    for (const code of ["network_error", "request_in_progress", "provider_unavailable"]) {
      expect(cancelOutcome({ ok: false, code, error: "x" })).toEqual({
        type: "retryable",
        message: "x",
      });
    }
  });
});

describe("cancel keys", () => {
  const failure = (code: string): ActionResult<unknown> => ({ ok: false, code, error: "x" });

  it("keeps one key per campaign across re-opens and retryable answers", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const newKey = () => `k${++next}`;
    expect(cancelKeyFor(keys, "4", newKey)).toBe("k1");
    // Another campaign gets its own key; the first keeps its own.
    expect(cancelKeyFor(keys, "5", newKey)).toBe("k2");
    for (const code of ["network_error", "request_in_progress", "provider_unavailable"]) {
      settleCancelKey(keys, "4", failure(code));
      expect(cancelKeyFor(keys, "4", newKey)).toBe("k1");
    }
    // A stale answer keeps it too: a later attempt on the same campaign replays the same request.
    settleCancelKey(keys, "4", failure("conflict"));
    expect(cancelKeyFor(keys, "4", newKey)).toBe("k1");
  });

  it("drops the key after a success and after a 422 reuse, so the next attempt gets a new one", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const newKey = () => `k${++next}`;
    cancelKeyFor(keys, "4", newKey);
    settleCancelKey(keys, "4", { ok: true, data: record });
    expect(cancelKeyFor(keys, "4", newKey)).toBe("k2");
    settleCancelKey(keys, "4", failure("idempotency_key_reused"));
    expect(cancelKeyFor(keys, "4", newKey)).toBe("k3");
  });

  it("makes UUID keys by default", () => {
    expect(cancelKeyFor(new Map(), "4")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("applyCancelOutcome", () => {
  const target = { id: "4", title: "Yangi dermatolog qabuli ochildi" };
  const effects = () =>
    ({
      showError: vi.fn(),
      close: vi.fn(),
      replaceRecord: vi.fn(),
      dropRecord: vi.fn(),
      toast: vi.fn(),
    }) satisfies CancelEffects;

  it("shows the cancelled row, closes the dialog and confirms", () => {
    const e = effects();
    applyCancelOutcome({ type: "done", record }, target, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.replaceRecord).toHaveBeenCalledWith(record);
    expect(e.toast).toHaveBeenCalledWith({
      title: "Xabar bekor qilindi",
      description: "«Yangi dermatolog qabuli ochildi» yuborilmaydi",
    });
    expect(e.showError).not.toHaveBeenCalled();
    expect(e.dropRecord).not.toHaveBeenCalled();
  });

  it("closes the dialog on a started send and keeps the row for the re-read", () => {
    const e = effects();
    applyCancelOutcome({ type: "stale", message: STARTED, gone: false }, target, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.toast).toHaveBeenCalledWith({
      tone: "info",
      title: "Amal bajarilmadi",
      description: STARTED,
    });
    expect(e.dropRecord).not.toHaveBeenCalled();
    expect(e.replaceRecord).not.toHaveBeenCalled();
  });

  it("drops a gone campaign locally (the demo's message scheduled in the page)", () => {
    const e = effects();
    applyCancelOutcome({ type: "stale", message: "Topilmadi.", gone: true }, target, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.dropRecord).toHaveBeenCalledWith("4");
    expect(e.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Topilmadi." }));
  });

  it("keeps the dialog open with the message when nothing changed", () => {
    const e = effects();
    applyCancelOutcome({ type: "retryable", message: "Tarmoq xatosi." }, target, e);
    expect(e.showError).toHaveBeenCalledWith("Tarmoq xatosi.");
    expect(e.close).not.toHaveBeenCalled();
    expect(e.toast).not.toHaveBeenCalled();
  });
});
