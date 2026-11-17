import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { themeCopy } from "@/components/brand/copy";

import { settingsCopy } from "./copy";
import { ThemeCard } from "./theme-card";

describe("ThemeCard", () => {
  it("offers light · dark · like the device as native radios, applied at once", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeCard, { t: settingsCopy.ru.theme, labels: themeCopy.ru }),
    );
    expect(html).toContain('aria-labelledby="theme-card-title"');
    expect(html).toContain(">Тема<");
    expect(html).toContain('role="radiogroup" aria-label="Тема"');
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    for (const name of ["Светлая", "Тёмная", "Как на устройстве"]) expect(html).toContain(name);
    // A display preference of this browser: nothing to submit.
    expect(html).not.toContain('type="submit"');
  });

  it("has its texts in every language", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      expect(settingsCopy[locale].theme.title).toBe(themeCopy[locale].label);
      expect(settingsCopy[locale].theme.lead).toContain(themeCopy[locale].system);
    }
  });
});
