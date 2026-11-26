import { describe, expect, it } from "vitest";

import type { ProductFormValues } from "@/data/products.schema";
import type { Product, ProductImage, ProductImageMedia } from "@/domain/product";
import { emptySeo } from "@/domain/seo";

import {
  adoptImage,
  adoptNewImage,
  formEntry,
  formImage,
  mediaById,
  withMedia,
  withServerId,
} from "./adopt-image";
import { createPendingImages, persistProduct, type PersistActions } from "./persist-product";

/**
 * `adoptImage`: a photo the renditions dialog saved becomes part of the editor's baseline only,
 * so the form's unsaved edits stay and the next product save neither deletes, uploads nor
 * reorders anything because of it — and still returns the photo with its shapes.
 */

const media = (overrides: Partial<ProductImageMedia> = {}): ProductImageMedia => ({
  width: 1200,
  height: 1500,
  url: "http://m/a.webp",
  mediumUrl: "http://m/a_1000.webp",
  source: "upload",
  derivedFromId: null,
  productBox: null,
  renditions: { portrait: null, square: null },
  ...overrides,
});

const SQUARE = {
  crop: [0, 0.1, 1, 0.8] as const,
  mode: "manual" as const,
  url: "http://m/a_r11.webp",
  mediumUrl: "http://m/a_r11_1000.webp",
  thumbnailUrl: "http://m/a_r11_400.webp",
};

const photo = (id: string, alt = ""): ProductImage => ({
  id,
  label: `Rasm ${id}`,
  src: `http://m/${id}_400.webp`,
  alt: { uz: alt, ru: "", en: "" },
  media: media(),
});

function product(images: ProductImage[]): Product {
  return {
    id: "7",
    billzId: "4607012301",
    billzName: "SERUM",
    volume: "30 ml",
    category: "serums",
    price: 185_000,
    stock: 3,
    promo: false,
    status: "active",
    isNewFromBillz: false,
    texts: {
      uz: { name: "Serum", shortDescription: "", description: "", ingredients: "", usage: "" },
      ru: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
      en: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
    },
    art: null,
    images,
    slug: "serum",
    seo: emptySeo(),
    seoStatus: { ok: true, issues: [] },
  };
}

/** The form's values as the editor builds them: no `media` on the photos. */
function values(saved: Product, overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    texts: structuredClone(saved.texts),
    price: saved.price,
    category: saved.category ?? "",
    billzId: saved.billzId,
    promo: saved.promo,
    status: saved.status,
    images: saved.images.map((image) => ({ ...formImage(image), alt: { ...image.alt! } })),
    slug: saved.slug,
    seo: structuredClone(saved.seo),
    ...overrides,
  };
}

/** The server's answer to the renditions dialog: photo 1 with its square shape. */
const answer = (): ProductImage => ({
  id: "1",
  label: "",
  src: "http://m/1_400.webp",
  alt: { uz: "Server alt", ru: "", en: "" },
  media: media({ renditions: { portrait: null, square: SQUARE } }),
});

/** Records every call; the server echoes what it is given (the mock's way). */
function recorder() {
  const calls: string[] = [];
  const actions: PersistActions = {
    async save(id, form) {
      calls.push(`save:${form.status}`);
      return {
        ok: true,
        data: { ...product(form.images), id: id ?? "7", texts: form.texts, status: form.status },
      };
    },
    async upload(_id, file) {
      calls.push(`upload:${file.name}`);
      return {
        ok: true,
        data: { id: "9", label: file.name, src: "http://m/9_400.webp", media: media() },
      };
    },
    async remove(_id, imageId) {
      calls.push(`remove:${imageId}`);
      return { ok: true, data: { id: imageId } };
    },
    async reorder(_id, imageIds) {
      calls.push(`reorder:${imageIds.join(",")}`);
      return { ok: true, data: { imageIds } };
    },
    async updateAlt(_id, imageId, alt) {
      calls.push(`alt:${imageId}`);
      return {
        ok: true,
        data: { id: imageId, label: "", alt: { uz: "", ru: "", en: "", ...alt } },
      };
    },
  };
  return { calls, actions };
}

describe("adoptImage", () => {
  it("puts the server's media on the photo of the same id and nothing else", () => {
    const saved = product([photo("1", "Flakon"), photo("2")]);
    const next = adoptImage(saved, answer());
    expect(next).not.toBe(saved);
    expect(next.images[0]?.media?.renditions.square).toEqual(SQUARE);
    // The baseline's own alt text, label and source stay: only media is the server's news.
    expect(next.images[0]).toMatchObject({ id: "1", label: "Rasm 1", alt: { uz: "Flakon" } });
    expect(next.images[1]).toBe(saved.images[1]);
    expect(next.images.map((image) => image.id)).toEqual(["1", "2"]);
    expect(saved.images[0]?.media?.renditions.square).toBeNull(); // not mutated
  });

  it("returns the same baseline for an unknown photo or an answer without media", () => {
    const saved = product([photo("1")]);
    expect(adoptImage(saved, { ...answer(), id: "99" })).toBe(saved);
    expect(adoptImage(saved, { id: "1", label: "" })).toBe(saved);
  });

  it("finds media by id, first list first, and drops a stale one only when none is known", () => {
    const fresh = { ...photo("1"), media: media({ width: 10 }) };
    const map = mediaById([fresh], [photo("1"), photo("2")], undefined);
    expect(map.get("1")?.width).toBe(10);
    expect(map.get("2")?.width).toBe(1200);
    expect(withMedia({ id: "2", label: "" }, map).media?.width).toBe(1200);
    expect("media" in withMedia({ id: "3", label: "" }, map)).toBe(false);
  });
});

describe("adoptImage and the next product save", () => {
  it("keeps unsaved texts, alt edits and pending uploads, with no phantom image calls", async () => {
    const loaded = product([photo("1", "Flakon"), photo("2")]);
    // The admin's unsaved work: a new name, photo 2's alt text, one picked file.
    const form = values(loaded);
    form.texts.uz.name = "Serum (yangi nom)";
    form.images[1]!.alt = { uz: "Qadoq", ru: "", en: "" };
    const pending = createPendingImages();
    pending.files.set("upload-a", new File(["x"], "a.png", { type: "image/png" }));
    form.images.push({ id: "upload-a", label: "a.png", src: "blob:a" });
    const before = structuredClone(form);

    const saved = adoptImage(loaded, answer());
    // The form's values are not touched by the adoption.
    expect(form).toEqual(before);

    const { calls, actions } = recorder();
    const { result } = await persistProduct({
      saved,
      targetId: "7",
      values: form,
      pending,
      actions,
    });
    expect(calls).toEqual(["save:active", "upload:a.png", "alt:2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.texts.uz.name).toBe("Serum (yangi nom)");
    expect(result.data.images.map((image) => image.id)).toEqual(["1", "2", "9"]);
    // The shapes survive the save: re-attached from the baseline by id.
    expect(result.data.images[0]?.media?.renditions.square).toEqual(SQUARE);
    expect(result.data.images[2]?.media).toBeDefined();
  });

  it("a clean form saves without any image call and keeps the shapes", async () => {
    const loaded = product([photo("1"), photo("2")]);
    const saved = adoptImage(loaded, answer());
    const { calls, actions } = recorder();
    const { result } = await persistProduct({
      saved,
      targetId: "7",
      values: values(loaded),
      pending: createPendingImages(),
      actions,
    });
    expect(calls).toEqual(["save:active"]);
    expect(result.ok && result.data.images[0]?.media?.renditions.square).toEqual(SQUARE);
  });
});

describe("adoptNewImage (an accepted scene) and the next product save", () => {
  const scene = (): ProductImage => ({
    id: "50",
    label: "",
    src: "http://m/50_400.webp",
    alt: { uz: "", ru: "", en: "" },
    media: media({
      source: "studio",
      derivedFromId: "1",
      renditions: { portrait: null, square: SQUARE },
    }),
  });

  it("puts the new photo first with make_main, else last, and adopts a known id", () => {
    const saved = product([photo("1"), photo("2")]);
    expect(adoptNewImage(saved, scene(), true).images.map((i) => i.id)).toEqual(["50", "1", "2"]);
    expect(adoptNewImage(saved, scene(), false).images.map((i) => i.id)).toEqual(["1", "2", "50"]);
    const known = { ...scene(), id: "2" };
    expect(adoptNewImage(saved, known, true).images.map((i) => i.id)).toEqual(["1", "2"]);
    expect(formEntry(scene())).not.toHaveProperty("media");
    expect(withServerId(null, "50", true)).toBeNull();
    expect(withServerId(["1", "2"], "50", true)).toEqual(["50", "1", "2"]);
    expect(withServerId(["1", "50"], "50", true)).toEqual(["1", "50"]);
  });

  it("a clean form rebuilt from the new baseline saves without image calls", async () => {
    const loaded = product([photo("1"), photo("2")]);
    const saved = adoptNewImage(loaded, scene(), true);
    const { calls, actions } = recorder();
    const { result } = await persistProduct({
      saved,
      targetId: "7",
      values: values(saved),
      pending: createPendingImages(),
      actions,
    });
    expect(calls).toEqual(["save:active"]);
    expect(result.ok && result.data.images.map((i) => i.id)).toEqual(["50", "1", "2"]);
    expect(result.ok && result.data.images[0]?.media?.source).toBe("studio");
  });

  it("a dirty form with a pending upload keeps its edits; the scene is neither uploaded nor deleted", async () => {
    const loaded = product([photo("1"), photo("2")]);
    const form = values(loaded);
    form.texts.uz.name = "Yangi nom";
    const pending = createPendingImages();
    pending.files.set("upload-a", new File(["x"], "a.png", { type: "image/png" }));
    form.images.push({ id: "upload-a", label: "a.png", src: "blob:a" });
    // Accepted as the main photo while the form is dirty: baseline and form both get it.
    const saved = adoptNewImage(loaded, scene(), true);
    form.images.unshift(formEntry(scene()));
    const { calls, actions } = recorder();
    const { result } = await persistProduct({
      saved,
      targetId: "7",
      values: form,
      pending,
      actions,
    });
    expect(calls).toEqual(["save:active", "upload:a.png"]);
    expect(result.ok && result.data.texts.uz.name).toBe("Yangi nom");
    expect(result.ok && result.data.images.map((i) => i.id)).toEqual(["50", "1", "2", "9"]);
    expect(result.ok && result.data.images[0]?.media?.renditions.square).toEqual(SQUARE);
  });

  it("after a partially failed save the known server ids gain the scene: no phantom delete", async () => {
    const loaded = product([photo("1"), photo("2")]);
    const form = values(loaded);
    const pending = createPendingImages();
    pending.server = ["1", "2"]; // what an earlier, failed attempt learnt
    const saved = adoptNewImage(loaded, scene(), false);
    pending.server = withServerId(pending.server, "50", false);
    form.images.push(formEntry(scene()));
    const { calls, actions } = recorder();
    await persistProduct({ saved, targetId: "7", values: form, pending, actions });
    expect(calls.filter((call) => call.startsWith("remove") || call.startsWith("upload"))).toEqual(
      [],
    );
    expect(calls.some((call) => call.startsWith("reorder"))).toBe(false);
  });
});
