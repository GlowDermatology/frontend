import { describe, expect, it } from "vitest";

import { claimNotice, withoutParam } from "./notice-once";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("claimNotice", () => {
  it("claims a notice once, however often the page re-renders with it", () => {
    const storage = memoryStorage();
    const memory = new Set<string>();
    expect(claimNotice("oauth:1:linked", storage, memory)).toBe(true);
    expect(claimNotice("oauth:1:linked", storage, memory)).toBe(false);
    expect(claimNotice("oauth:2:linked", storage, memory)).toBe(true);
  });

  it("remembers a claim across page loads of the tab through sessionStorage", () => {
    const storage = memoryStorage();
    expect(claimNotice("oauth:1:error", storage, new Set())).toBe(true);
    expect(claimNotice("oauth:1:error", storage, new Set())).toBe(false);
  });

  it("still claims once when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const memory = new Set<string>();
    expect(claimNotice("x", broken, memory)).toBe(true);
    expect(claimNotice("x", broken, memory)).toBe(false);
    expect(claimNotice("y", null, memory)).toBe(true);
  });
});

describe("withoutParam", () => {
  it("drops one parameter and keeps the rest", () => {
    expect(withoutParam("/admin/settings", "oauth=t", "oauth")).toBe("/admin/settings");
    expect(withoutParam("/admin/login", "?next=%2Fadmin%2Forders&oauth=t", "oauth")).toBe(
      "/admin/login?next=%2Fadmin%2Forders",
    );
  });
});
