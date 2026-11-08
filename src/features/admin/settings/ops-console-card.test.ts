import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OpsConsoleCard, opsConsoleSettingsUrl } from "./ops-console-card";

const render = (consoleUrl: string | null) =>
  renderToStaticMarkup(createElement(OpsConsoleCard, { consoleUrl }));

describe("opsConsoleSettingsUrl", () => {
  it("resolves the settings page under the console base", () => {
    expect(opsConsoleSettingsUrl("https://ops.glowderma.uz/django-admin/")).toBe(
      "https://ops.glowderma.uz/django-admin/settings/",
    );
    expect(opsConsoleSettingsUrl("http://127.0.0.1:8000/django-admin/")).toBe(
      "http://127.0.0.1:8000/django-admin/settings/",
    );
  });

  it("is null without a usable base", () => {
    expect(opsConsoleSettingsUrl(null)).toBeNull();
    expect(opsConsoleSettingsUrl("")).toBeNull();
    expect(opsConsoleSettingsUrl("not a url")).toBeNull();
  });
});

describe("OpsConsoleCard", () => {
  it("links to the console's settings page in a new tab", () => {
    const html = render("https://ops.glowderma.uz/django-admin/");
    expect(html).toContain("Do‘kon sozlamalari");
    expect(html).toContain("aloqa ma’lumotlari va huquqiy matnlar");
    expect(html).toContain("(2FA)");
    expect(html).toContain('href="https://ops.glowderma.uz/django-admin/settings/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Ops konsolda ochish");
    expect(html).not.toContain("Konsol manzili sozlanmagan");
  });

  it("says the console address is not configured instead of a link", () => {
    const html = render(null);
    expect(html).toContain("Konsol manzili sozlanmagan (GLOWDERMA_OPS_CONSOLE_URL).");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Ops konsolda ochish");
  });
});
