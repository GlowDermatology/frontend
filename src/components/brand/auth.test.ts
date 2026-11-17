import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AudienceSwitch, STAFF_SIGN_IN_PATH, type AudienceSwitchLinks } from "./audience-switch";
import { AuthArtwork } from "./auth-artwork";
import { AuthLayout, type AuthLayoutProps } from "./auth-layout";
import { LocaleFlag } from "./locale-flag";

const Layout = AuthLayout as FC<Omit<AuthLayoutProps, "children"> & { children?: ReactNode }>;

const links: AudienceSwitchLinks = {
  label: "Kim sifatida kirasiz",
  customer: { href: "/kirish", label: "Mijoz" },
  staff: { href: STAFF_SIGN_IN_PATH, label: "Xodim" },
};

/** Every `id="…"` of the markup. */
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);

describe("AuthArtwork", () => {
  it("is decorative inline SVG without external references", () => {
    const html = renderToStaticMarkup(createElement(AuthArtwork));
    expect(html).toMatch(/^<svg[^>]+aria-hidden="true"/);
    expect(html).toContain('focusable="false"');
    expect(html).toContain('data-artwork="panel"');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<text");
  });

  it("references only its own ids, which stay unique across copies", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(AuthArtwork, { crop: "panel" }),
        createElement(AuthArtwork, { crop: "band" }),
      ),
    );
    const all = ids(html);
    expect(all.length).toBeGreaterThan(20);
    expect(new Set(all).size).toBe(all.length);
    const referenced = [...html.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
    expect(referenced.length).toBeGreaterThan(20);
    for (const id of referenced) expect(all).toContain(id);
    for (const id of all) expect(id).toMatch(/^[A-Za-z][\w-]*$/);
  });

  it("frames the panel with slice and the band with meet", () => {
    const panel = renderToStaticMarkup(createElement(AuthArtwork, { crop: "panel" }));
    const band = renderToStaticMarkup(createElement(AuthArtwork, { crop: "band" }));
    expect(panel).toContain('viewBox="0 0 960 1000"');
    expect(panel).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(band).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(band).not.toContain('viewBox="0 0 960 1000"');
  });

  it("animates only behind motion-safe and only transforms and opacity", () => {
    const html = renderToStaticMarkup(createElement(AuthArtwork));
    const animated = [...html.matchAll(/class="([^"]*animate-[^"]*)"/g)].map(
      (match) => match[1] ?? "",
    );
    expect(animated.length).toBeGreaterThan(0);
    for (const classes of animated) {
      for (const token of classes.split(" ").filter((name) => name.includes("animate-"))) {
        expect(token).toMatch(/^motion-safe:animate-\[gd-auth-/);
      }
    }
    const keyframes = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    expect(keyframes).toContain("@keyframes gd-auth-light");
    expect(keyframes).not.toMatch(/(?:width|height|left|top|filter)\s*:/);
  });
});

describe("AudienceSwitch", () => {
  it("renders two links and marks the current audience", () => {
    const html = renderToStaticMarkup(createElement(AudienceSwitch, { current: "staff", links }));
    expect(html).toContain('<nav aria-label="Kim sifatida kirasiz"');
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toMatch(/<a href="\/admin\/login" aria-current="page"[^>]*>Xodim<\/a>/);
    expect(html).toMatch(/<a href="\/kirish" class="[^"]*">Mijoz<\/a>/);
  });
});

describe("AuthLayout", () => {
  it("renders the switch, the art crops, the texts and the card content", () => {
    const html = renderToStaticMarkup(
      createElement(
        Layout,
        {
          audience: "customer",
          frame: "embedded",
          switchLinks: links,
          eyebrow: "Glow Derma hisobi",
          headline: "Parvarish",
          points: [{ icon: "receipt", text: "Buyurtmalar" }],
        },
        createElement("h1", null, "Xush kelibsiz"),
      ),
    );
    expect(html).toContain('data-auth-layout="customer"');
    expect(html).toContain('data-artwork="band"');
    expect(html).toContain('data-artwork="panel"');
    expect(html).toContain("Glow Derma hisobi");
    expect(html).toContain("Buyurtmalar");
    expect(html).toContain("<h1>Xush kelibsiz</h1>");
    expect(html).toMatch(/<a href="\/kirish" aria-current="page"/);
    // Only one heading: the art panel's line is not a heading.
    expect(html.match(/<h[1-6][\s>]/g)).toHaveLength(1);
  });

  it("hides a first-step-only switch until a first step is in the card", () => {
    const html = renderToStaticMarkup(
      createElement(
        Layout,
        { audience: "customer", switchLinks: links, switchVisibility: "first-step" },
        "x",
      ),
    );
    const nav = html.match(/<nav aria-label="Kim sifatida kirasiz" class="([^"]+)"/)?.[1] ?? "";
    expect(nav.split(" ")).toEqual(
      expect.arrayContaining([
        "hidden",
        "group-has-[[data-auth-first-step]]/auth:block",
        "group-has-[[role=tablist]]/auth:block",
      ]),
    );
    expect(html).toContain("group/auth");
  });

  it("omits the switch and the art texts when not given", () => {
    const html = renderToStaticMarkup(createElement(Layout, { audience: "staff" }, "x"));
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<ul");
    expect(html).toContain("min-h-dvh");
  });
});

describe("LocaleFlag", () => {
  it("draws each language's flag as decorative SVG", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LocaleFlag, { locale }));
      expect(html).toMatch(/^<svg viewBox="0 0 30 20" aria-hidden="true"/);
    }
  });
});
