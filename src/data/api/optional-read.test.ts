import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { optionalRead } from "./optional-read";
import { PageLimitExceededError } from "./pages";

const envelope = (code: string) => ({ code, message: code, errors: [], request_id: "r" });

describe("optionalRead", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the read's value", async () => {
    await expect(optionalRead("x", async () => [1, 2], [])).resolves.toEqual([1, 2]);
  });

  it("falls back on an API failure or the page cap, so the board still renders", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      optionalRead(
        "segments",
        async () => {
          throw new ApiError(503, envelope("http_503"));
        },
        [],
      ),
    ).resolves.toEqual([]);
    await expect(
      optionalRead(
        "segments",
        async () => {
          throw new ApiError(429, envelope("throttled"), { retryAfter: 3 });
        },
        [],
      ),
    ).resolves.toEqual([]);
    await expect(
      optionalRead(
        "segments",
        async () => {
          throw new PageLimitExceededError("segments/", 20);
        },
        [],
      ),
    ).resolves.toEqual([]);
    expect(log).toHaveBeenCalledTimes(3);
  });

  it("still throws programming errors", async () => {
    await expect(
      optionalRead(
        "segments",
        async () => {
          throw new TypeError("boom");
        },
        [],
      ),
    ).rejects.toThrow("boom");
  });
});
