import { describe, expect, it, vi } from "vitest";

import {
  applyTheme,
  readThemeChoice,
  setThemeChoice,
  subscribeTheme,
  type ThemeEnvironment,
} from "./theme-store";

/** A tiny stand-in for the browser objects the store touches. */
function fakeEnvironment({ cookie = "", prefersDark = false, protocol = "https:" } = {}) {
  const attributes: Record<string, string> = { "data-theme": "light" };
  const metas = [0, 1].map(() => {
    const meta: Record<string, string> = { content: "#fbf8f2" };
    return {
      getAttribute: (name: string) => meta[name] ?? null,
      setAttribute: (name: string, value: string) => {
        meta[name] = value;
      },
      meta,
    };
  });
  const head: unknown[] = [];
  const frames: Array<() => void> = [];
  const jar = { value: cookie, writes: [] as string[] };
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  const root = {
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
  };
  const env = {
    document: {
      get cookie() {
        return jar.value;
      },
      set cookie(value: string) {
        jar.writes.push(value);
        const [pair] = value.split(";");
        jar.value = value.includes("Max-Age=0") ? "" : (pair ?? "");
      },
      documentElement: root,
      head: { appendChild: (node: unknown) => head.push(node) },
      querySelectorAll: () => metas,
      createElement: () => {
        const style = {
          attrs: {} as Record<string, string>,
          textContent: "",
          setAttribute(name: string, value: string) {
            this.attrs[name] = value;
          },
          remove: () => head.splice(head.indexOf(style), 1),
        };
        return style;
      },
      defaultView: { getComputedStyle: () => ({ color: "" }) },
    },
    matchMedia: () => ({ matches: prefersDark }),
    location: { protocol },
    fetch,
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
  } as unknown as ThemeEnvironment;
  return { env, attributes, metas, head, frames, jar, fetch };
}

describe("theme store", () => {
  it("reads the choice from the cookie (none = system)", () => {
    expect(readThemeChoice(fakeEnvironment({ cookie: "gd_theme=dark" }).env)).toBe("dark");
    expect(readThemeChoice(fakeEnvironment().env)).toBe("system");
    expect(readThemeChoice(null)).toBe("system");
  });

  it("saves a choice: cookie, <html data-theme>, theme-color, readers, then the route", () => {
    const fake = fakeEnvironment();
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    setThemeChoice("dark", fake.env);
    unsubscribe();

    expect(fake.jar.writes).toEqual([
      "gd_theme=dark; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    ]);
    expect(fake.attributes["data-theme"]).toBe("dark");
    expect(fake.metas.map((meta) => meta.meta.content)).toEqual(["#0d1322", "#0d1322"]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fake.fetch).toHaveBeenCalledWith(
      "/api/shop/theme",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ theme: "dark" }),
        credentials: "same-origin",
      }),
    );
  });

  it("system deletes the cookie and follows the device; no Secure on http", () => {
    const fake = fakeEnvironment({
      cookie: "gd_theme=light",
      prefersDark: true,
      protocol: "http:",
    });
    setThemeChoice("system", fake.env);
    expect(fake.jar.writes).toEqual(["gd_theme=; Path=/; Max-Age=0; SameSite=Lax"]);
    expect(fake.attributes["data-theme"]).toBe("dark");
    expect(readThemeChoice(fake.env)).toBe("system");
  });

  it("a switch suppresses transitions for one frame; an unchanged theme touches nothing", () => {
    const fake = fakeEnvironment();
    applyTheme("dark", { instant: true }, fake.env);
    expect(fake.head).toHaveLength(1);
    fake.frames.forEach((frame) => frame());
    expect(fake.head).toHaveLength(0);

    applyTheme("dark", { instant: true }, fake.env);
    expect(fake.head).toHaveLength(0);
    expect(fake.frames).toHaveLength(1);
  });

  it("a failed request is ignored", async () => {
    const fake = fakeEnvironment();
    fake.fetch.mockRejectedValueOnce(new Error("offline"));
    expect(() => setThemeChoice("light", fake.env)).not.toThrow();
    await Promise.resolve();
    expect(fake.attributes["data-theme"]).toBe("light");
  });
});
