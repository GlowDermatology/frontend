import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { NotificationRecord } from "@/domain/notification";

import {
  actionKeyFor,
  applyCampaignOutcome,
  campaignOutcome,
  settleActionKey,
  type CampaignEffects,
} from "./campaign-outcomes";

const record = {
  id: "4",
  title: "Yangi dermatolog qabuli ochildi",
  state: "cancelled",
} as NotificationRecord;

const STARTED = "Yuborish boshlangan: xabarni bekor qilib bo‘lmaydi.";
const STALE = "Xabar o‘zgartirilgan: sahifani yangilab, qayta urinib ko‘ring.";

describe("campaignOutcome", () => {
  it("shows the answered record", () => {
    expect(campaignOutcome({ ok: true, data: record })).toEqual({ type: "done", record });
  });

  it("is stale on another state, another revision, a missing campaign or a refused role", () => {
    expect(campaignOutcome({ ok: false, code: "conflict", error: STARTED })).toEqual({
      type: "stale",
      message: STARTED,
      gone: false,
    });
    expect(campaignOutcome({ ok: false, code: "conflict", error: STALE })).toMatchObject({
      type: "stale",
      gone: false,
    });
    expect(campaignOutcome({ ok: false, code: "invalid_transition", error: "x" })).toEqual({
      type: "stale",
      message: "x",
      gone: false,
    });
    expect(
      campaignOutcome({ ok: false, code: "permission_denied", error: "Ruxsat yo‘q." }),
    ).toEqual({ type: "stale", message: "Ruxsat yo‘q.", gone: false });
    expect(campaignOutcome({ ok: false, code: "not_found", error: "Topilmadi." })).toEqual({
      type: "stale",
      message: "Topilmadi.",
      gone: true,
    });
  });

  it("is retryable when nothing changed", () => {
    for (const code of [
      "network_error",
      "request_in_progress",
      "provider_unavailable",
      undefined,
    ]) {
      expect(campaignOutcome({ ok: false, code, error: "x" })).toEqual({
        type: "retryable",
        message: "x",
      });
    }
  });
});

describe("operation keys", () => {
  const failure = (code: string): ActionResult<unknown> => ({ ok: false, code, error: "x" });

  it("keeps one key per operation and campaign across re-opens and retryable answers", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const newKey = () => `k${++next}`;
    expect(actionKeyFor(keys, "cancel", "4", newKey)).toBe("k1");
    // Another operation on the same campaign, and another campaign, get their own.
    expect(actionKeyFor(keys, "approve", "4", newKey)).toBe("k2");
    expect(actionKeyFor(keys, "cancel", "5", newKey)).toBe("k3");
    for (const code of ["network_error", "request_in_progress", "provider_unavailable"]) {
      settleActionKey(keys, "cancel", "4", failure(code));
      expect(actionKeyFor(keys, "cancel", "4", newKey)).toBe("k1");
    }
    // A stale answer keeps it too: a later attempt replays the same request.
    settleActionKey(keys, "cancel", "4", failure("conflict"));
    expect(actionKeyFor(keys, "cancel", "4", newKey)).toBe("k1");
  });

  it("drops the key after a success and after a 422 reuse, so the next attempt gets a new one", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const newKey = () => `k${++next}`;
    actionKeyFor(keys, "cancel", "4", newKey);
    settleActionKey(keys, "cancel", "4", { ok: true, data: record });
    expect(actionKeyFor(keys, "cancel", "4", newKey)).toBe("k2");
    settleActionKey(keys, "cancel", "4", failure("idempotency_key_reused"));
    expect(actionKeyFor(keys, "cancel", "4", newKey)).toBe("k3");
  });

  it("makes UUID keys by default", () => {
    expect(actionKeyFor(new Map(), "stop", "4")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("applyCampaignOutcome", () => {
  const success = { title: "Xabar bekor qilindi", description: "«…» yuborilmaydi" };
  const effects = () =>
    ({
      showError: vi.fn(),
      close: vi.fn(),
      replaceRecord: vi.fn(),
      dropRecord: vi.fn(),
      toast: vi.fn(),
    }) satisfies CampaignEffects;

  it("shows the answered row, closes the dialog and confirms with the operation's toast", () => {
    const e = effects();
    applyCampaignOutcome({ type: "done", record }, record, success, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.replaceRecord).toHaveBeenCalledWith(record);
    expect(e.toast).toHaveBeenCalledWith(success);
    expect(e.showError).not.toHaveBeenCalled();
    expect(e.dropRecord).not.toHaveBeenCalled();
  });

  it("closes the dialog on a stale answer and keeps the row for the re-read", () => {
    const e = effects();
    applyCampaignOutcome({ type: "stale", message: STARTED, gone: false }, record, success, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.toast).toHaveBeenCalledWith({
      tone: "info",
      title: "Amal bajarilmadi",
      description: STARTED,
    });
    expect(e.dropRecord).not.toHaveBeenCalled();
    expect(e.replaceRecord).not.toHaveBeenCalled();
  });

  it("drops a gone campaign locally", () => {
    const e = effects();
    applyCampaignOutcome({ type: "stale", message: "Topilmadi.", gone: true }, record, success, e);
    expect(e.close).toHaveBeenCalledTimes(1);
    expect(e.dropRecord).toHaveBeenCalledWith("4");
    expect(e.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Topilmadi." }));
  });

  it("keeps the dialog open with the message when nothing changed", () => {
    const e = effects();
    applyCampaignOutcome({ type: "retryable", message: "Tarmoq xatosi." }, record, success, e);
    expect(e.showError).toHaveBeenCalledWith("Tarmoq xatosi.");
    expect(e.close).not.toHaveBeenCalled();
    expect(e.toast).not.toHaveBeenCalled();
  });
});
