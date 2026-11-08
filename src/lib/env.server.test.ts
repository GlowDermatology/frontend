import { afterEach, describe, expect, it, vi } from "vitest";

import { parseOpsConsoleUrl, serverEnv } from "./env.server";

describe("parseOpsConsoleUrl (GLOWDERMA_OPS_CONSOLE_URL)", () => {
  it("keeps an absolute http(s) URL and makes it end with a slash", () => {
    expect(parseOpsConsoleUrl("https://ops.glowderma.uz/django-admin/")).toBe(
      "https://ops.glowderma.uz/django-admin/",
    );
    expect(parseOpsConsoleUrl("https://ops.glowderma.uz/django-admin")).toBe(
      "https://ops.glowderma.uz/django-admin/",
    );
    expect(parseOpsConsoleUrl("  http://127.0.0.1:8000/django-admin  ")).toBe(
      "http://127.0.0.1:8000/django-admin/",
    );
    expect(parseOpsConsoleUrl("HTTPS://Ops.GlowDerma.uz")).toBe("https://ops.glowderma.uz/");
  });

  it("lets a relative page resolve under the console base", () => {
    const base = parseOpsConsoleUrl("https://ops.glowderma.uz/django-admin")!;
    expect(new URL("settings/", base).toString()).toBe(
      "https://ops.glowderma.uz/django-admin/settings/",
    );
  });

  it("refuses relative, non-http, credentialed, query or fragment values", () => {
    for (const value of [
      "",
      "ops.glowderma.uz/django-admin/",
      "/django-admin/",
      "ftp://ops.glowderma.uz/",
      "javascript:alert(1)",
      "https://",
      "https://admin:secret@ops.glowderma.uz/django-admin/",
      "https://ops.glowderma.uz/django-admin/?next=/",
      "https://ops.glowderma.uz/django-admin/#settings",
      "https://ops.glowderma.uz/django-admin/?",
    ]) {
      expect(parseOpsConsoleUrl(value), value).toBeNull();
    }
  });
});

describe("serverEnv.opsConsoleUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is null when unset or empty", () => {
    vi.stubEnv("GLOWDERMA_OPS_CONSOLE_URL", "");
    expect(serverEnv.opsConsoleUrl()).toBeNull();
  });

  it("reads and normalises the variable", () => {
    vi.stubEnv("GLOWDERMA_OPS_CONSOLE_URL", "http://127.0.0.1:8000/django-admin");
    expect(serverEnv.opsConsoleUrl()).toBe("http://127.0.0.1:8000/django-admin/");
  });

  it("treats an invalid value as unset and logs it once, without the value", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("GLOWDERMA_OPS_CONSOLE_URL", "https://user:pw@ops.example.uz/django-admin/");
    expect(serverEnv.opsConsoleUrl()).toBeNull();
    expect(serverEnv.opsConsoleUrl()).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]![0])).toContain("GLOWDERMA_OPS_CONSOLE_URL");
    expect(String(error.mock.calls[0]![0])).not.toContain("pw@");
  });
});
