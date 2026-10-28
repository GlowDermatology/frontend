import { describe, expect, it } from "vitest";

import type { ProductBaseline, ProductFormValues } from "@/data/products.schema";
import type { ActionResult } from "@/data/types";
import type { Product, ProductImage } from "@/domain/product";
import { emptySeo } from "@/domain/seo";

import {
  createPendingImages,
  needsReorder,
  persistProduct,
  productBaseline,
  type PendingImages,
  type PersistActions,
} from "./persist-product";

/**
 * The save orchestration against a small in-memory imitation of the API's
 * rules (contract §2.3): ≤ 8 images (`images` `max_items`), the last image of
 * an active product cannot be deleted (409), uploads are appended last,
 * `PUT …/images/order/` needs the exact set, activation needs an image.
 */

const TEXTS = {
  uz: { name: "Serum", description: "", ingredients: "", usage: "" },
  ru: { name: "", description: "", ingredients: "", usage: "" },
  en: { name: "", description: "", ingredients: "", usage: "" },
};

const image = (id: string): ProductImage => ({ id, label: `Rasm ${id}`, src: `http://m/${id}` });

function product(overrides: Partial<Product> = {}): Product {
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
    texts: structuredClone(TEXTS),
    art: null,
    images: [image("1"), image("2")],
    slug: "serum",
    seo: emptySeo(),
    seoStatus: { ok: true, issues: [] },
    ...overrides,
  };
}

function formValues(
  source: Product,
  overrides: Partial<ProductFormValues> = {},
): ProductFormValues {
  return {
    texts: structuredClone(source.texts),
    price: source.price,
    category: source.category ?? "",
    billzId: source.billzId,
    promo: source.promo,
    status: source.status,
    images: structuredClone(source.images),
    slug: source.slug,
    seo: structuredClone(source.seo),
    ...overrides,
  };
}

interface Call {
  kind: "save" | "upload" | "remove" | "reorder";
  id: string | null;
  arg?: unknown;
  baseline?: ProductBaseline | null;
}

/** A fake API holding one product's images and status; `failOn` makes the first matching call fail. */
function fakeServer(initial: Product | null, options: { failOn?: (call: Call) => boolean } = {}) {
  let images = initial ? initial.images.map((i) => i.id) : [];
  let status = initial?.status ?? "hidden";
  let nextImage = 100;
  let maxSeen = images.length;
  let minSeenWhileActive = status === "active" ? images.length : Infinity;
  const calls: Call[] = [];
  let failedOnce = false;
  // Only the first call matching `failOn` fails (a transient blip).
  const shouldFail = (call: Call) => {
    calls.push(call);
    if (!failedOnce && options.failOn?.(call)) {
      failedOnce = true;
      return true;
    }
    return false;
  };
  const track = () => {
    maxSeen = Math.max(maxSeen, images.length);
    if (status === "active") minSeenWhileActive = Math.min(minSeenWhileActive, images.length);
  };
  const failure = (error: string, code?: string) =>
    ({ ok: false, error, ...(code ? { code } : {}) }) as Extract<
      ActionResult<never>,
      { ok: false }
    >;

  const actions: PersistActions = {
    async save(id, values, baseline) {
      if (shouldFail({ kind: "save", id, arg: values, baseline })) return failure("Tarmoq xatosi.");
      if (values.status === "active" && images.length === 0) {
        return {
          ok: false,
          error: "Maydonlarni tekshiring.",
          fieldErrors: { images: "Faol mahsulotda kamida bitta rasm bo‘lsin." },
        };
      }
      status = values.status;
      track();
      return {
        ok: true,
        data: product({ id: id ?? "259", status, images: images.map(image) }),
      };
    },
    async upload(id, file) {
      if (shouldFail({ kind: "upload", id, arg: file.name })) return failure("Tarmoq xatosi.");
      if (images.length >= 8) {
        return {
          ok: false,
          error: "Maydonlarni tekshiring.",
          fieldErrors: { images: "Ko‘pi bilan 8 ta rasm." },
        };
      }
      const created = String(nextImage++);
      images.push(created);
      track();
      return { ok: true, data: { id: created, label: file.name, src: `http://m/${created}` } };
    },
    async remove(id, imageId) {
      if (shouldFail({ kind: "remove", id, arg: imageId })) return failure("Tarmoq xatosi.");
      if (!images.includes(imageId)) return failure("Topilmadi.", "not_found");
      if (status === "active" && images.length === 1) {
        return failure("Faol mahsulotda kamida bitta rasm bo‘lsin.", "conflict");
      }
      images = images.filter((i) => i !== imageId);
      track();
      return { ok: true, data: { id: imageId } };
    },
    async reorder(id, imageIds) {
      if (shouldFail({ kind: "reorder", id, arg: imageIds })) return failure("Tarmoq xatosi.");
      const same = imageIds.length === images.length && imageIds.every((i) => images.includes(i));
      if (!same) return failure("Ro‘yxat mos emas.", "mismatch");
      images = [...imageIds];
      return { ok: true, data: { imageIds } };
    },
  };
  return {
    actions,
    calls,
    get images() {
      return images;
    },
    get status() {
      return status;
    },
    get maxSeen() {
      return maxSeen;
    },
    get minSeenWhileActive() {
      return minSeenWhileActive;
    },
  };
}

function pick(pending: PendingImages, ...ids: string[]): ProductImage[] {
  const files = ids.map((id) => {
    const tempId = `upload-${id}`;
    pending.files.set(tempId, new File(["x"], `${id}.png`, { type: "image/png" }));
    return { id: tempId, label: `${id}.png`, src: `blob:${id}` };
  });
  return files;
}

describe("persistProduct", () => {
  it("sends no PUT …/images/order/ when the image set and order are unchanged", async () => {
    const saved = product();
    const server = fakeServer(saved);
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values: formValues(saved, { price: 190_000 }),
      pending: createPendingImages(),
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    expect(server.calls.map((c) => c.kind)).toEqual(["save"]);
  });

  it("diffs against the editor's baseline (the loaded product), not a re-read", async () => {
    const saved = product();
    const server = fakeServer(saved);
    const values = formValues(saved);
    values.texts.uz.description = "Yangi tavsif.";
    await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending: createPendingImages(),
      actions: server.actions,
    });
    expect(server.calls[0]!.baseline).toEqual(productBaseline(saved));
  });

  it("swaps a photo of a product with 8 images: deletes first, never 9 on the server", async () => {
    const saved = product({ images: ["1", "2", "3", "4", "5", "6", "7", "8"].map(image) });
    const server = fakeServer(saved);
    const pending = createPendingImages();
    const kept = saved.images.filter((i) => i.id !== "3");
    const values = formValues(saved, { images: [...kept, ...pick(pending, "new")] });
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    expect(server.maxSeen).toBe(8);
    expect(server.calls.map((c) => c.kind)).toEqual(["save", "remove", "upload"]);
    expect(server.images).toEqual(["1", "2", "4", "5", "6", "7", "8", "100"]);
  });

  it("keeps an active product active when some images are replaced (no hide)", async () => {
    const saved = product();
    const server = fakeServer(saved);
    const pending = createPendingImages();
    const values = formValues(saved, { images: [image("2"), ...pick(pending, "a")] });
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    const saves = server.calls.filter((c) => c.kind === "save");
    expect(saves).toHaveLength(1);
    expect((saves[0]!.arg as ProductFormValues).status).toBe("active");
    expect(server.status).toBe("active");
  });

  it("replaces every image of an active product without hiding it or leaving it imageless", async () => {
    const saved = product();
    const server = fakeServer(saved);
    const pending = createPendingImages();
    const values = formValues(saved, { images: pick(pending, "a", "b") });
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    expect(server.calls.filter((c) => c.kind === "save")).toHaveLength(1);
    expect(server.minSeenWhileActive).toBeGreaterThanOrEqual(1);
    expect(server.images).toEqual(["100", "101"]);
    expect(server.status).toBe("active");
  });

  it("puts uploads where the admin placed them with one PUT", async () => {
    const saved = product();
    const server = fakeServer(saved);
    const pending = createPendingImages();
    const [added] = pick(pending, "a");
    const values = formValues(saved, { images: [added!, ...saved.images] });
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    expect(server.calls.map((c) => c.kind)).toEqual(["save", "upload", "reorder"]);
    expect(server.images).toEqual(["100", "1", "2"]);
    if (result.ok) expect(result.data.images.map((i) => i.id)).toEqual(["100", "1", "2"]);
  });

  it("creates hidden, then uploads and activates; a failure after the create keeps the id", async () => {
    const server = fakeServer(null, { failOn: (call) => call.kind === "upload" });
    const pending = createPendingImages();
    const values = formValues(product({ images: [] }), {
      status: "active",
      images: pick(pending, "a"),
    });
    const first = await persistProduct({
      saved: null,
      targetId: null,
      values,
      pending,
      actions: server.actions,
    });
    expect(first.result.ok).toBe(false);
    expect(first.createdId).toBe("259");
    expect((server.calls[0]!.arg as ProductFormValues).status).toBe("hidden");

    // The retry patches the created draft (no second create) with the
    // committed values as the baseline, uploads and activates.
    const retry = await persistProduct({
      saved: null,
      targetId: first.createdId,
      values,
      pending,
      actions: server.actions,
    });
    expect(retry.result.ok).toBe(true);
    expect(retry.createdId).toBeNull();
    const saves = server.calls.filter((c) => c.kind === "save");
    expect(saves.map((c) => c.id)).toEqual([null, "259", "259"]);
    expect(saves[1]!.baseline).toMatchObject({ status: "hidden", price: values.price });
    expect(server.status).toBe("active");
    expect(server.images).toEqual(["100"]);
  });

  it("does not repeat a delete that already succeeded when a later one failed", async () => {
    const saved = product({ status: "hidden", images: [image("1"), image("2"), image("3")] });
    let failNext = true;
    const server = fakeServer(saved, {
      failOn: (call) => {
        if (call.kind === "remove" && call.arg === "2" && failNext) {
          failNext = false;
          return true;
        }
        return false;
      },
    });
    const pending = createPendingImages();
    const values = formValues(saved, { images: [image("3")] });
    const first = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(first.result.ok).toBe(false);
    const retry = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(retry.result.ok).toBe(true);
    const removes = server.calls.filter((c) => c.kind === "remove").map((c) => c.arg);
    expect(removes).toEqual(["1", "2", "2"]);
    expect(server.images).toEqual(["3"]);
  });

  it("treats a 404 on delete as already deleted", async () => {
    const saved = product({ status: "hidden", images: [image("1"), image("9")] });
    const server = fakeServer({ ...saved, images: [image("1")] }); // "9" is gone already
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values: formValues(saved, { images: [image("1")] }),
      pending: createPendingImages(),
      actions: server.actions,
    });
    expect(result.ok).toBe(true);
    expect(server.calls.map((c) => c.kind)).toEqual(["save", "remove"]);
  });

  it("deletes an uploaded image the admin removed before the retry", async () => {
    const saved = product({ status: "hidden", images: [image("1")] });
    const server = fakeServer(saved, { failOn: (call) => call.kind === "reorder" });
    const pending = createPendingImages();
    const [a] = pick(pending, "a");
    const first = await persistProduct({
      saved,
      targetId: saved.id,
      values: formValues(saved, { images: [a!, image("1")] }),
      pending,
      actions: server.actions,
    });
    expect(first.result.ok).toBe(false);
    // The admin removes the uploaded tile, then saves again.
    pending.uploaded.delete(a!.id);
    const retry = await persistProduct({
      saved,
      targetId: saved.id,
      values: formValues(saved, { images: [image("1")] }),
      pending,
      actions: server.actions,
    });
    expect(retry.result.ok).toBe(true);
    expect(server.images).toEqual(["1"]);
  });

  it("surfaces the upload's field message as the toast text", async () => {
    const saved = product({ images: ["1", "2", "3", "4", "5", "6", "7", "8"].map(image) });
    const server = fakeServer(saved);
    const pending = createPendingImages();
    // Nine tiles cannot be produced by the form; force it to hit the server limit.
    const values = formValues(saved, { images: [...saved.images, ...pick(pending, "x")] });
    const { result } = await persistProduct({
      saved,
      targetId: saved.id,
      values,
      pending,
      actions: server.actions,
    });
    expect(result).toMatchObject({ ok: false, error: "Ko‘pi bilan 8 ta rasm." });
  });
});

describe("needsReorder", () => {
  it("compares the order and the set", () => {
    expect(needsReorder(["1", "2"], ["1", "2"])).toBe(false);
    expect(needsReorder(["1", "2"], ["2", "1"])).toBe(true);
    expect(needsReorder(["1"], ["1", "2"])).toBe(true);
    expect(needsReorder([], [])).toBe(false);
  });
});
