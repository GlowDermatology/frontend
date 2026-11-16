import { describe, expect, it, vi } from "vitest";

import type { IssueAlert } from "@/domain/delivery-issue";

import {
  alertToast,
  announce,
  createSeenStore,
  MAX_SEEN,
  parseSeen,
  planToasts,
  SEEN_STORAGE_KEY,
} from "./issue-alerts";
import { getSnapshot, offerServerCount, receive } from "./issue-watch";

const alert = (id: number, orderId = 10_000 + id): IssueAlert => ({
  id,
  orderId,
  kind: "return_pending",
  code: "warehouse_closed",
  openedAt: "2026-11-15T19:10:00+05:00",
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
  };
}

describe("announce: one toast per new urgent issue", () => {
  it("records the first look silently (the badge shows the backlog)", () => {
    expect(announce(null, [alert(1), alert(2)])).toEqual({ fresh: [], seen: [1, 2] });
  });

  it("announces only ids not seen before, once, in the API's order", () => {
    const first = announce([1, 2], [alert(1), alert(3), alert(2), alert(4)]);
    expect(first.fresh.map((a) => a.id)).toEqual([3, 4]);
    expect(first.seen).toEqual([1, 2, 3, 4]);
    // The next poll returns the same rows: nothing new.
    expect(announce(first.seen, [alert(1), alert(3), alert(2), alert(4)]).fresh).toEqual([]);
    // A resolved issue leaving the list does not re-announce anything.
    expect(announce(first.seen, [alert(4)]).fresh).toEqual([]);
    // A duplicate row in one answer is announced once.
    expect(announce([], [alert(5), alert(5)]).fresh.map((a) => a.id)).toEqual([5]);
  });

  it("caps the remembered ids, dropping the oldest", () => {
    const many = Array.from({ length: MAX_SEEN }, (_, i) => i + 1);
    const { seen } = announce(many, [alert(MAX_SEEN + 1)]);
    expect(seen).toHaveLength(MAX_SEEN);
    expect(seen[0]).toBe(2);
    expect(seen.at(-1)).toBe(MAX_SEEN + 1);
  });
});

describe("the seen-ids store", () => {
  it("round-trips through localStorage as {v: 1, ids}", () => {
    const storage = memoryStorage();
    const store = createSeenStore(storage);
    expect(store.load()).toBeNull();
    store.save([3, 4]);
    expect(JSON.parse(storage.data.get(SEEN_STORAGE_KEY)!)).toEqual({ v: 1, ids: [3, 4] });
    expect(createSeenStore(storage).load()).toEqual([3, 4]);
  });

  it("reads a damaged or foreign value as 'never looked' and filters bad ids", () => {
    expect(parseSeen("{not json")).toBeNull();
    expect(parseSeen(JSON.stringify({ v: 2, ids: [1] }))).toBeNull();
    expect(parseSeen(JSON.stringify([1, 2]))).toBeNull();
    expect(parseSeen(JSON.stringify({ v: 1, ids: [1, "2", -3, 4.5, 5] }))).toEqual([1, 5]);
    expect(parseSeen(null)).toBeNull();
  });

  it("falls back to memory when storage throws (private mode, quota, blocked)", () => {
    const throwing = {
      getItem: vi.fn(() => {
        throw new DOMException("denied", "SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("full", "QuotaExceededError");
      }),
    };
    const store = createSeenStore(throwing);
    expect(store.load()).toBeNull();
    store.save([7]);
    expect(store.load()).toEqual([7]);
    const noStorage = createSeenStore(null);
    noStorage.save([8]);
    expect(noStorage.load()).toEqual([8]);
  });

  it("keeps working in memory after a failed write", () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const store = createSeenStore(storage);
    store.save([9]);
    expect(store.load()).toEqual([9]);
  });
});

describe("toasts", () => {
  it("names the order, the kind and the code", () => {
    expect(alertToast(alert(5, 10_240))).toEqual({
      title: "Shoshilinch: buyurtma №10240",
      description: "Qaytish kutilmoqda · warehouse_closed. «Muammolar» bo‘limida ko‘ring.",
    });
  });

  it("shows up to three, else two and a summary", () => {
    expect(planToasts([alert(1), alert(2), alert(3)])).toHaveLength(3);
    const many = planToasts([alert(1), alert(2), alert(3), alert(4), alert(5)]);
    expect(many.map((toast) => toast.title)).toEqual([
      "Shoshilinch: buyurtma №10001",
      "Shoshilinch: buyurtma №10002",
      "Yana 3 ta shoshilinch muammo",
    ]);
    expect(planToasts([])).toEqual([]);
  });
});

describe("receive (one poll answer)", () => {
  it("publishes the counts and toasts each new urgent issue exactly once", () => {
    const store = createSeenStore(memoryStorage());
    const toast = vi.fn();
    receive({ open: 3, urgent: [alert(1)] }, store, toast);
    expect(toast).not.toHaveBeenCalled(); // first look in this browser
    expect(getSnapshot()).toEqual({ open: 3, urgent: 1 });

    receive({ open: 4, urgent: [alert(1), alert(2)] }, store, toast);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(alertToast(alert(2)));

    receive({ open: 4, urgent: [alert(1), alert(2)] }, store, toast);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(getSnapshot()).toEqual({ open: 4, urgent: 2 });
  });

  it("lets a newer server render (after resolving) replace the count until the next poll", () => {
    const store = createSeenStore(null);
    receive({ open: 4, urgent: [] }, store, null);
    offerServerCount(3);
    expect(getSnapshot().open).toBe(3);
    offerServerCount(null);
    expect(getSnapshot().open).toBe(3);
  });
});
