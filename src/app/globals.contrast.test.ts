import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CUSTOMER_DARK_COLOR } from "../lib/theme/theme-cookie";

/**
 * Guard for the two token blocks of `globals.css` (light and night-blue dark): the same tokens in
 * both, WCAG AA for the dark theme's text and status pairs, the light theme's current ratios as
 * floors (a later tweak may not make it worse), and no Tailwind `dark:` variant anywhere (it would
 * leak into subtrees pinned to `data-theme="light"`).
 */

// CRLF → LF: a Windows checkout (core.autocrlf) must not hide the multi-line selectors below.
const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

function block(selector: string): Map<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  expect(start, `block ${selector}`).toBeGreaterThanOrEqual(0);
  const body = CSS.slice(start + selector.length + 2, CSS.indexOf("}", start));
  const tokens = new Map<string, string>();
  for (const match of body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(/(--gd-[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1]!, match[2]!.trim());
  }
  return tokens;
}

const LIGHT = block(':root,\n[data-theme="light"]');
const DARK = block('[data-theme="dark"]');

const CUSTOMER_DARK = new Map([...DARK, ...block('html[data-customer-web][data-theme="dark"]')]);

function color(tokens: Map<string, string>, name: string): string {
  let value = tokens.get(`--gd-${name}`);
  for (let depth = 0; value?.startsWith("var("); depth += 1) {
    expect(depth).toBeLessThan(5);
    value = tokens.get(value.slice(4, -1).trim());
  }
  expect(value, `--gd-${name}`).toMatch(/^#[0-9a-f]{6}$/i);
  return value!;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const ratio = (tokens: Map<string, string>, fg: string, bg: string) =>
  contrast(color(tokens, fg), color(tokens, bg));

describe("globals.css theme tokens", () => {
  it("keeps the customer browser chrome and homepage action colors legible", () => {
    expect(color(CUSTOMER_DARK, "surface")).toBe(CUSTOMER_DARK_COLOR);
    for (const palette of [LIGHT, CUSTOMER_DARK]) {
      expect(ratio(palette, "home-action-ink", "home-action")).toBeGreaterThanOrEqual(4.5);
      expect(ratio(palette, "home-action-accent", "home-action")).toBeGreaterThanOrEqual(3);
    }
  });

  it("both blocks declare the same tokens and their colour scheme", () => {
    expect([...DARK.keys()].sort()).toEqual([...LIGHT.keys()].sort());
    expect(LIGHT.size).toBeGreaterThan(30);
    expect(CSS).toMatch(/\[data-theme="dark"\] \{[^}]*color-scheme: dark;/);
    expect(CSS).toMatch(/\[data-theme="light"\] \{[^}]*color-scheme: light;/);
  });

  it("product imagery dims only in the dark theme", () => {
    expect(LIGHT.get("--gd-media-dim")).toBe("none");
    expect(DARK.get("--gd-media-dim")).toBe("brightness(0.86) saturate(0.92)");
    expect(CSS).toMatch(/@utility media-dim \{\s*filter: var\(--gd-media-dim\);/);
    for (const slot of ["cap", "accent", "body", "label", "ink", "line"]) {
      expect(CSS).toContain(`--pa-${slot}: var(--pa-${slot}-d);`);
      expect(CSS).toContain(`--pa-${slot}: initial;`);
    }
  });

  it("status utilities read the tokens", () => {
    for (const name of ["success", "warning", "danger", "danger-strong", "on-fill"]) {
      expect(CSS).toContain(`--color-${name}: var(--gd-${name});`);
    }
    expect(CSS).toMatch(/\[data-theme\] \{\s*color: var\(--gd-ink\);/);
  });

  const TEXT_BACKGROUNDS = ["surface", "surface-raised"];
  it.each<readonly [string, string]>([
    ...["ink", "ink-muted", "gold-ink", "danger", "danger-strong", "success", "warning"].flatMap(
      (fg) => TEXT_BACKGROUNDS.map((bg) => [fg, bg] as const),
    ),
    ["ink", "gold-soft"],
    ["ink-muted", "gold-soft"],
    ["gold-ink", "gold-soft"],
    ["ink", "image-well"],
    ["on-gold", "gold"],
    ["nav-ink-muted", "nav"],
    ["ink", "nav"],
    ["banner-ink", "banner"],
    ["banner-ink-soft", "banner"],
    ...["danger", "danger-strong", "success", "warning"].map((bg) => ["on-fill", bg] as const),
  ])("dark: %s on %s passes AA (4.5:1)", (fg, bg) => {
    for (const palette of [DARK, CUSTOMER_DARK])
      expect(ratio(palette, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["scrollbar-thumb", "surface"],
    ["scrollbar-thumb", "surface-raised"],
    ["line-strong", "surface-raised"],
    ["gold-ink", "surface"],
  ])("dark: %s on %s is a visible non-text colour (3:1)", (fg, bg) => {
    for (const palette of [DARK, CUSTOMER_DARK])
      expect(ratio(palette, fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it("dark: the nav hairline is visible against the nav and the page", () => {
    expect(ratio(DARK, "nav-line", "nav")).toBeGreaterThanOrEqual(1.4);
    expect(ratio(DARK, "nav-line", "surface")).toBeGreaterThanOrEqual(1.3);
  });

  /* The light theme's ratios when the dark theme was added, rounded down. */
  it.each([
    ["ink", "surface", 14.5],
    ["ink-muted", "surface", 4.6],
    ["ink-muted", "surface-raised", 4.88],
    ["on-gold", "gold", 6.41],
    ["on-fill", "danger-strong", 5.03],
    ["danger", "surface-raised", 4.37],
    ["nav-ink-muted", "nav", 5.26],
    ["banner-ink", "banner", 6.24],
    ["scrollbar-thumb", "surface", 3.21],
    ["scrollbar-thumb", "surface-raised", 3.4],
  ] as const)("light: %s on %s keeps its floor (%s:1)", (fg, bg, floor) => {
    expect(ratio(LIGHT, fg, bg)).toBeGreaterThanOrEqual(floor);
  });

  it("there is no Tailwind dark: variant", () => {
    expect(CSS).not.toMatch(/@custom-variant\s+dark/);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) files.push(path);
      }
    };
    walk(join(process.cwd(), "src"));
    const offenders = files.filter((file) =>
      /(^|[\s"'`])dark:[a-z[]/m.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
