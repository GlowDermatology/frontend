import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CropFrame } from "@/components/ui/crop-frame";
import { ToastProvider } from "@/components/ui/toast";
import { autoCrop, SHAPE_RATIO } from "@/domain/crop";
import type { ProductImageMedia } from "@/domain/product";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { ImageManager } from "../image-manager";
import {
  chooseAuto,
  chooseManual,
  chooseRemove,
  initialShapes,
  moved,
  renditionChanges,
} from "./model";

vi.mock("@/data/products.actions", () => ({ updateProductImageRenditions: vi.fn() }));

const SIZE = { width: 1200, height: 1600 };
const media = (overrides: Partial<ProductImageMedia> = {}): ProductImageMedia => ({
  ...SIZE,
  url: "https://cdn.example/a.webp",
  mediumUrl: "https://cdn.example/a_1000.webp",
  source: "upload",
  derivedFromId: null,
  productBox: null,
  renditions: { portrait: null, square: null },
  ...overrides,
});
const SQUARE = {
  crop: [0.1, 0.2, 0.8, 0.6] as const,
  mode: "manual" as const,
  url: null,
  mediumUrl: null,
  thumbnailUrl: null,
};

describe("renditions dialog model", () => {
  it("starts from the stored crop, else the automatic framing on the product box", () => {
    const box = [0.4, 0.3, 0.6, 0.7] as const;
    const shapes = initialShapes(
      media({ productBox: box, renditions: { portrait: null, square: SQUARE } }),
    );
    expect(shapes.square.crop).toEqual(SQUARE.crop);
    expect(shapes.portrait.crop).toEqual(autoCrop(SHAPE_RATIO.portrait, SIZE, box));
    expect(shapes.portrait.touched || shapes.square.touched).toBe(false);
  });

  it("sends nothing for untouched shapes, even an unsaved proposal", () => {
    const m = media({ renditions: { portrait: null, square: SQUARE } });
    expect(renditionChanges(initialShapes(m), m)).toEqual({});
  });

  it("sends a moved crop, auto and a removal, and nothing for the other shape", () => {
    const m = media({ renditions: { portrait: null, square: SQUARE } });
    const start = initialShapes(m);
    const crop = [0.05, 0.1, 0.8, 0.75] as const;
    expect(renditionChanges({ ...start, portrait: moved(start.portrait, crop) }, m)).toEqual({
      portrait: crop,
    });
    expect(
      renditionChanges({ ...start, portrait: chooseAuto("portrait", m, start.portrait) }, m),
    ).toEqual({ portrait: "auto" });
    expect(renditionChanges({ ...start, square: chooseRemove(start.square) }, m)).toEqual({
      square: null,
    });
    // Moving the stored crop back where it was is no change; "manual" after auto sends the crop.
    expect(renditionChanges({ ...start, square: moved(start.square, SQUARE.crop) }, m)).toEqual({});
    const back = chooseManual(chooseAuto("portrait", m, start.portrait));
    expect(renditionChanges({ ...start, portrait: back }, m)).toEqual({ portrait: back.crop });
  });

  it("never removes a shape that is not stored", () => {
    const m = media();
    const start = initialShapes(m);
    expect(renditionChanges({ ...start, portrait: chooseRemove(start.portrait) }, m)).toEqual({});
  });
});

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );

describe("CropFrame and the tiles", () => {
  it("is a labelled, focusable frame with its crop on data-crop and a labelled zoom slider", () => {
    const html = render(
      createElement(CropFrame, {
        ratio: 1,
        size: SIZE,
        crop: [0, 0.125, 1, 0.75],
        onChange: () => undefined,
        label: "Kvadrat kesim",
        hint: "Strelkalar",
        zoomLabel: "Yaqinlashtirish",
      }),
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Kvadrat kesim"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-crop="0.0000,0.1250,1.0000,0.7500"');
    expect(html).toMatch(/<input[^>]*type="range"[^>]*aria-label="Yaqinlashtirish"/);
  });

  it("badges a scene and the shapes a saved photo has", () => {
    const images = [
      { id: "1", label: "Rasm 1", src: "https://cdn.example/a_400.webp" },
      { id: "2", label: "Rasm 2", src: "https://cdn.example/b_400.webp" },
    ];
    const map = new Map([
      ["1", media({ renditions: { portrait: { ...SQUARE, crop: [0, 0, 1, 1] }, square: SQUARE } })],
      ["2", media({ source: "ai_scene" })],
    ]);
    const noop = () => undefined;
    const html = render(
      createElement(ImageManager, {
        images,
        onMove: noop,
        onRemove: noop,
        onAdd: noop,
        media: map,
        productId: "7",
      }),
    );
    expect(html).toContain("4:5 · 1:1");
    expect(html).toContain('aria-label="Ekran kesimlari: 4:5, 1:1"');
    expect(html).toContain("AI sahna");
  });
});
