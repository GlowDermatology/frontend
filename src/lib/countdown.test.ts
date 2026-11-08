import { describe, expect, it } from "vitest";

import { formatCountdown, remainingSeconds, secondsUntil } from "./countdown";

describe("remainingSeconds", () => {
  it("counts down from the window and stops at zero", () => {
    expect(remainingSeconds(1_000, 60, 1_000)).toBe(60);
    expect(remainingSeconds(1_000, 60, 31_500)).toBe(30);
    expect(remainingSeconds(1_000, 60, 61_000)).toBe(0);
    expect(remainingSeconds(1_000, 60, 90_000)).toBe(0);
  });
});

describe("secondsUntil", () => {
  const now = Date.parse("2026-10-24T12:00:00+05:00");

  it("rounds the time left up to whole seconds and is 0 once the instant passed", () => {
    expect(secondsUntil("2026-10-24T12:05:00+05:00", now)).toBe(300);
    expect(secondsUntil("2026-10-24T12:00:00.400+05:00", now)).toBe(1);
    expect(secondsUntil("2026-10-24T12:00:00+05:00", now)).toBe(0);
    expect(secondsUntil("2026-10-24T11:59:00+05:00", now)).toBe(0);
  });

  it("is 0 for nothing or an unreadable instant", () => {
    expect(secondsUntil(null, now)).toBe(0);
    expect(secondsUntil(undefined, now)).toBe(0);
    expect(secondsUntil("", now)).toBe(0);
    expect(secondsUntil("soon", now)).toBe(0);
  });
});

describe("formatCountdown", () => {
  it("shows m:ss", () => {
    expect(formatCountdown(300)).toBe("5:00");
    expect(formatCountdown(299)).toBe("4:59");
    expect(formatCountdown(7)).toBe("0:07");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-3)).toBe("0:00");
    expect(formatCountdown(3900)).toBe("65:00");
  });
});
