import { describe, expect, it } from "vitest";

import { htmlPage, requestTheme, sameOriginBounce, themeStyle } from "./html-page";

/** The minimal HTML answers follow the visitor's theme: the `gd_theme` cookie, else the device. */

const DARK_BG = "--bg:#14110d";
const LIGHT_BG = "--bg:#fbf8f2";

describe("html-page theme", () => {
  it("reads gd_theme from the request's cookies (none or unknown = system)", () => {
    const req = (cookie?: string) =>
      new Request("http://localhost/x", cookie ? { headers: { cookie } } : undefined);
    expect(requestTheme(req("a=1; gd_theme=dark"))).toBe("dark");
    expect(requestTheme(req("gd_theme=light"))).toBe("light");
    expect(requestTheme(req("gd_theme=blue"))).toBe("system");
    expect(requestTheme(req())).toBe("system");
  });

  it("pins a saved choice and follows the device otherwise", () => {
    expect(themeStyle("dark")).toContain(DARK_BG);
    expect(themeStyle("dark")).not.toContain(LIGHT_BG);
    expect(themeStyle("light")).toContain(LIGHT_BG);
    expect(themeStyle("light")).not.toContain("prefers-color-scheme");
    const system = themeStyle("system");
    expect(system.indexOf(LIGHT_BG)).toBeLessThan(
      system.indexOf("@media (prefers-color-scheme:dark)"),
    );
    expect(system.slice(system.indexOf("@media"))).toContain(DARK_BG);
  });

  it("renders the colours and color-scheme meta, with no fixed page colours", async () => {
    const dark = await htmlPage("T", "<p>x</p>", { status: 200 }, "", "uz", "dark").text();
    expect(dark).toContain('<meta name="color-scheme" content="dark">');
    expect(dark).toContain(DARK_BG);
    expect(dark).toContain("background:var(--bg);color:var(--fg)");
    const system = await htmlPage("T", "<p>x</p>", { status: 200 }).text();
    expect(system).toContain('<meta name="color-scheme" content="light dark">');
    const bounce = await sameOriginBounce("/admin", undefined, undefined, "uz", "light").text();
    expect(bounce).toContain('<meta name="color-scheme" content="light">');
  });
});
