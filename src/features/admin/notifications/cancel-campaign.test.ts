import { describe, expect, it } from "vitest";

import type { NotificationRecord } from "@/domain/notification";

import { cancelOutcome, canCancelCampaign } from "./cancel-campaign";

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

  it("re-reads the history when the send started (409) or the campaign is gone (404)", () => {
    const started = "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.";
    expect(cancelOutcome({ ok: false, code: "conflict", error: started })).toEqual({
      type: "stale",
      message: started,
    });
    expect(cancelOutcome({ ok: false, code: "not_found", error: "Topilmadi." })).toEqual({
      type: "stale",
      message: "Topilmadi.",
    });
  });

  it("keeps the dialog and its key when nothing changed", () => {
    for (const code of ["network_error", "request_in_progress", "provider_unavailable"]) {
      expect(cancelOutcome({ ok: false, code, error: "x" })).toEqual({
        type: "retryable",
        message: "x",
      });
    }
  });
});
