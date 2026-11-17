import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ProductArt,
  darkTone,
  type ProductArtDetail,
  type ProductArtKind,
  type ProductArtTone,
} from "./product-art";

/** Markup of every kind / tone / detail captured before the artwork became themeable. */
const BEFORE: Record<string, string> = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/components/brand/__fixtures__/product-art-light.json"),
    "utf8",
  ),
);

const KINDS: ProductArtKind[] = ["pump", "jar", "dropper", "tube", "toner", "box", "texture"];
const TONES: ProductArtTone[] = ["default", "night", "dark-cap"];
const DETAILS: ProductArtDetail[] = ["mini", "glyph", "thumb", "card", "full"];

const render = (kind: ProductArtKind, tone: ProductArtTone, detail: ProductArtDetail) =>
  renderToStaticMarkup(createElement(ProductArt, { kind, tone, detail, width: 96 }));

/** What the light theme paints: each `var(--pa-*, #hex)` resolves to its fallback (no rule sets
 *  `--pa-*` outside the dark theme); the dark-only `--pa-*-d` values and the hook class are inert. */
const asLight = (markup: string) =>
  markup
    .replace(/var\(--pa-[a-z]+, (#[0-9a-f]{6})\)/g, "$1")
    .replace(/ class="gd-product-art"/, "")
    .replace(/ style="[^"]*"/, "");

describe("ProductArt", () => {
  it("covers every combination in the baseline", () => {
    expect(Object.keys(BEFORE)).toHaveLength(KINDS.length * TONES.length * DETAILS.length);
  });

  it.each(
    KINDS.flatMap((kind) => TONES.flatMap((tone) => DETAILS.map((d) => [kind, tone, d] as const))),
  )("%s/%s/%s renders the same light colours as before", (kind, tone, detail) => {
    const markup = render(kind, tone, detail);
    expect(asLight(markup)).toBe(BEFORE[`${kind}/${tone}/${detail}`]);
    expect(markup).toContain('class="gd-product-art"');
    for (const slot of ["cap", "accent", "body", "label", "ink", "line"]) {
      expect(markup).toContain(`--pa-${slot}-d:`);
    }
    expect(markup).not.toMatch(/fill="#(2a2418|e5dcc8)"|stroke="#e5dcc8"/);
  });

  it("keeps the caller's class and style", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductArt, {
        kind: "jar",
        width: 40,
        className: "x",
        style: { opacity: 0.5 },
      }),
    );
    expect(markup).toContain('class="gd-product-art x"');
    expect(markup).toContain("opacity:0.5");
  });

  it("darkens bodies and lifts near-black caps off the dark well", () => {
    expect(darkTone("#e9dfca")).toBe("hsl(41 33% 61%)");
    // #14110d / #2b2620 caps: lightness 32 %, well #1a1611 is ~9 %.
    expect(darkTone("#14110d")).toMatch(/ 32%\)$/);
    expect(darkTone("#2b2620")).toMatch(/ 32%\)$/);
  });
});
