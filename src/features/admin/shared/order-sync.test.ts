import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";

import { createOrderSync } from "./order-sync";
import { upsertRow } from "./use-ordered-list";

/** Reorder requests: one in flight, later moves coalesced, failures roll back. */

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createOrderSync", () => {
  it("sends one request at a time and only the latest order after it", async () => {
    const first = deferred<ActionResult<string[]>>();
    const send = vi
      .fn<(keys: string[]) => Promise<ActionResult<string[]>>>()
      .mockReturnValueOnce(first.promise)
      .mockImplementation(async (keys) => ({ ok: true, data: keys }));
    const onConfirmed = vi.fn();
    const sync = createOrderSync({ send, onConfirmed, onFailed: vi.fn() });

    sync.push(["b", "a", "c"]);
    sync.push(["b", "c", "a"]);
    sync.push(["c", "b", "a"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sync.busy).toBe(true);

    first.resolve({ ok: true, data: ["b", "a", "c"] });
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(send.mock.calls.map(([keys]) => keys)).toEqual([
      ["b", "a", "c"],
      ["c", "b", "a"],
    ]);
    // The intermediate answer is not reported (the local list is already ahead).
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed).toHaveBeenCalledWith(["c", "b", "a"]);
    expect(sync.busy).toBe(false);
  });

  it("reports a failure and drops the waiting order", async () => {
    const first = deferred<ActionResult<string[]>>();
    const send = vi
      .fn<(keys: string[]) => Promise<ActionResult<string[]>>>()
      .mockReturnValueOnce(first.promise);
    const onFailed = vi.fn();
    const onConfirmed = vi.fn();
    const sync = createOrderSync({ send, onConfirmed, onFailed });
    sync.push(["b", "a"]);
    sync.push(["a", "b"]);
    first.resolve({ ok: false, error: "Ro‘yxat mos emas.", code: "mismatch" });
    await vi.waitFor(() => expect(onFailed).toHaveBeenCalledWith("Ro‘yxat mos emas."));
    expect(send).toHaveBeenCalledTimes(1);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(sync.busy).toBe(false);
  });
});

describe("upsertRow", () => {
  it("replaces a row with the same key instead of appending a duplicate", () => {
    const key = (row: { slug: string }) => row.slug;
    const rows = [{ slug: "a", n: 1 }];
    expect(upsertRow(rows, { slug: "b", n: 2 }, key)).toEqual([
      { slug: "a", n: 1 },
      { slug: "b", n: 2 },
    ]);
    expect(upsertRow(rows, { slug: "a", n: 3 }, key)).toEqual([{ slug: "a", n: 3 }]);
  });
});
