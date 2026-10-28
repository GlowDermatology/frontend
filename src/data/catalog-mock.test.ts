import { describe, expect, it, vi } from "vitest";

import { BILLZ_LISTING_INCOMPLETE_MESSAGE } from "@/domain/job";
import { BILLZ_UNAVAILABLE_MESSAGE } from "@/domain/product";
import { emptySeo, PRODUCT_SLUG_MAX, slugProblem } from "@/domain/seo";

import { csvDocument } from "./export-csv";
import { getBanners } from "./mock/banners.queries";
import { createBanner, deleteBanner, reorderBanners, updateBanner } from "./mock/banners.actions";
import { CATEGORIES } from "./mock/categories";
import { getCategories } from "./mock/categories.queries";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "./mock/categories.actions";
import { PRODUCTS } from "./mock/catalog";
import { getJob, MOCK_FAILED_IMPORT_JOB_ID, MOCK_IMPORT_JOB_ID } from "./mock/jobs.queries";
import { importFromBillz, saveProduct } from "./mock/products.actions";
import { exportProducts, getCatalogStats } from "./mock/products.queries";

vi.mock("./mock/delay", () => ({ delay: async () => undefined }));

/** The mock bodies of the catalog sections: coherent with the product fixtures and the contract. */
describe("mock categories", () => {
  it("lists the five fixture slugs in position order with counts from the catalog", async () => {
    const categories = await getCategories();
    expect(categories.map((c) => c.slug)).toEqual([
      "serums",
      "cleansing",
      "moisturizing",
      "sun",
      "toners",
    ]);
    expect(categories.map((c) => c.position)).toEqual([0, 1, 2, 3, 4]);
    const withCategory = PRODUCTS.filter((p) => p.category !== null).length;
    expect(categories.reduce((sum, c) => sum + c.productCount, 0)).toBe(withCategory);
    expect(categories.every((c) => c.productCount > 0 && c.isActive)).toBe(true);
  });

  it("creates appended last, updates by slug, refuses a taken slug", async () => {
    const created = await createCategory({
      slug: "masks",
      name: { uz: "Niqoblar", ru: "", en: "" },
      isActive: true,
      seo: emptySeo(),
    });
    expect(created).toMatchObject({
      ok: true,
      data: { slug: "masks", position: 5, productCount: 0 },
    });
    expect(
      await createCategory({
        slug: "serums",
        name: { uz: "X", ru: "", en: "" },
        isActive: true,
        seo: emptySeo(),
      }),
    ).toMatchObject({ ok: false, fieldErrors: { slug: "Bu qiymat band." } });
    const updated = await updateCategory("sun", {
      name: { uz: "SPF", ru: "", en: "" },
      isActive: false,
      seo: emptySeo(),
    });
    expect(updated).toMatchObject({
      ok: true,
      data: { slug: "sun", isActive: false, position: 3 },
    });
    expect(
      await updateCategory("missing", {
        name: { uz: "X", ru: "", en: "" },
        isActive: true,
        seo: emptySeo(),
      }),
    ).toMatchObject({
      code: "not_found",
    });
  });

  it("gives every demo product a unique, valid website slug (B-W1)", () => {
    const slugs = PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(PRODUCTS.length);
    expect(slugs.every((slug) => slugProblem(slug, PRODUCT_SLUG_MAX) === null)).toBe(true);
    expect(PRODUCTS[0]).toMatchObject({ slug: "gialuron-kislotali-serum" });
  });

  it("computes «SEO holati» like the server and recomputes it on save (B-W1)", async () => {
    const serums = CATEGORIES.find((c) => c.slug === "serums")!;
    // No image in the demo; the SEO texts are filled only in Uzbek and Russian.
    expect(serums.seoStatus.ok).toBe(false);
    expect(serums.seoStatus.issues.map((i) => [i.code, i.severity, i.language])).toEqual([
      ["image_missing", "warning", null],
      ["seo_description_missing", "info", "ru"],
      ["seo_title_missing", "info", "en"],
      ["seo_description_missing", "info", "en"],
    ]);
    const seo = {
      uz: serums.seo.uz,
      ru: { title: "Сыворотки для лица — Glow Derma", description: "д".repeat(80) },
      en: { title: "Face serums — Glow Derma", description: "e".repeat(80) },
    };
    const updated = await updateCategory(
      "serums",
      { name: serums.name, isActive: true, seo },
      { image: new File(["x"], "c.png", { type: "image/png" }), remove: false },
    );
    expect(updated).toMatchObject({ ok: true, data: { seo, seoStatus: { ok: true, issues: [] } } });
  });

  it("deletes only empty categories (409 conflict otherwise) and reorders the exact set", async () => {
    expect(await deleteCategory("serums")).toEqual({
      ok: false,
      error: "Kategoriyada mahsulotlar bor.",
      code: "conflict",
    });
    const slugs = CATEGORIES.map((c) => c.slug).reverse();
    const reordered = await reorderCategories(slugs);
    expect(reordered.ok).toBe(true);
    if (reordered.ok) {
      expect(reordered.data.map((c) => c.slug)).toEqual(slugs);
      expect(reordered.data.map((c) => c.position)).toEqual([0, 1, 2, 3, 4]);
    }
    expect(await reorderCategories(["serums"])).toMatchObject({ code: "mismatch" });
  });
});

describe("mock banners", () => {
  it("lists two banners in position order with a scheduled window on the second", async () => {
    const banners = await getBanners();
    expect(banners.map((b) => [b.id, b.position, b.link.kind])).toEqual([
      ["1", 0, "category"],
      ["2", 1, "product"],
    ]);
    expect(banners[1]).toMatchObject({
      startsAt: "2026-10-20T00:00:00+05:00",
      endsAt: "2026-11-20T00:00:00+05:00",
    });
    // The product link points at a real active product; the category at a real slug.
    expect(PRODUCTS.find((p) => p.id === banners[1]!.link.productId)?.status).toBe("active");
    expect(CATEGORIES.some((c) => c.slug === banners[0]!.link.category)).toBe(true);
  });

  it("creates with an empty image URL (the client keeps its preview), updates, deletes, reorders", async () => {
    const image = new File(["x"], "b.png", { type: "image/png" });
    const values = {
      title: { uz: "Yangi", ru: "", en: "" },
      link: { kind: "category" as const, productId: null, category: "serums", url: null },
      isActive: true,
      startsAt: null,
      endsAt: null,
    };
    const created = await createBanner(values, image);
    expect(created).toMatchObject({
      ok: true,
      data: { imageUrl: "", position: 2, link: { category: "serums" } },
    });
    expect(
      await createBanner(
        { ...values, link: { kind: "product", productId: "7", category: null, url: null } },
        image,
      ),
    ).toMatchObject({ ok: false, fieldErrors: { "link.productId": "Topilmadi." } });
    const updated = await updateBanner("1", { ...values, isActive: false }, null);
    expect(updated).toMatchObject({
      ok: true,
      data: { id: "1", isActive: false, imageUrl: "/mock/banner-autumn.png" },
    });
    // Like the API, an unchanged link is not re-checked: a banner whose linked
    // product was hidden since can still be switched off or retitled.
    const hiddenLink = { kind: "product" as const, productId: "7", category: null, url: null };
    expect(
      await updateBanner("1", { ...values, link: hiddenLink, isActive: false }, null, {
        ...values,
        link: hiddenLink,
      }),
    ).toMatchObject({ ok: true, data: { isActive: false } });
    expect(await updateBanner("1", { ...values, link: hiddenLink }, null, values)).toMatchObject({
      ok: false,
      fieldErrors: { "link.productId": "Topilmadi." },
    });
    expect(await deleteBanner("2")).toEqual({ ok: true, data: { id: "2" } });
    expect(await deleteBanner("9")).toMatchObject({ code: "not_found" });
    const reordered = await reorderBanners(["2", "1"]);
    expect(reordered.ok && reordered.data.map((b) => [b.id, b.position])).toEqual([
      ["2", 0],
      ["1", 1],
    ]);
    expect(await reorderBanners(["1"])).toMatchObject({ code: "mismatch" });
  });
});

describe("mock products: stats, export and import job", () => {
  it("keeps the design's counters and derives the sync label from the demo clock", async () => {
    expect(await getCatalogStats()).toMatchObject({
      total: 248,
      newFromBillz: 4,
      outOfStock: 7,
      billzConnected: true,
      lastSyncLabel: "2 daqiqa oldin",
    });
  });

  it("exports every matching row regardless of paging", async () => {
    const all = await exportProducts({ outOfStock: false, onlyNew: false, sort: "default" });
    expect(all).toHaveLength(248);
    const out = await exportProducts({ outOfStock: true, onlyNew: false, sort: "default" });
    expect(out).toHaveLength(7);
  });

  it("starts a running job finished on the first poll; a 9999 search makes the listing incomplete", async () => {
    const started = await importFromBillz();
    expect(started).toMatchObject({ ok: true, data: { id: MOCK_IMPORT_JOB_ID, state: "running" } });
    expect(await getJob(MOCK_IMPORT_JOB_ID)).toMatchObject({
      state: "succeeded",
      result: { created: 0, updated: 12, unchanged: 236, hidden: 0 },
    });
    // No shared counter: every visitor's next import succeeds again.
    expect(await importFromBillz()).toMatchObject({ data: { id: MOCK_IMPORT_JOB_ID } });
    expect(await importFromBillz("serum")).toMatchObject({ data: { id: MOCK_IMPORT_JOB_ID } });
    const next = await importFromBillz(" 4607019999 ");
    expect(next).toMatchObject({
      ok: true,
      data: { id: MOCK_FAILED_IMPORT_JOB_ID, state: "running" },
    });
    expect(await getJob(MOCK_FAILED_IMPORT_JOB_ID)).toMatchObject({
      state: "failed",
      result: null,
      error: { code: "billz_listing_incomplete", message: BILLZ_LISTING_INCOMPLETE_MESSAGE },
    });
    expect(await importFromBillz()).toMatchObject({ data: { id: MOCK_IMPORT_JOB_ID } });
    expect(await getJob("other")).toBeNull();
  });

  it("answers Billz's 503 for a demo Billz ID ending in 9999, on create or change only", async () => {
    const product = PRODUCTS.find((p) => p.status === "active")!;
    const values = {
      texts: product.texts,
      price: product.price,
      category: product.category ?? "",
      billzId: "4607019999",
      promo: product.promo,
      status: "hidden" as const,
      images: [],
      slug: "",
      seo: emptySeo(),
    };
    expect(await saveProduct(null, values)).toEqual({
      ok: false,
      error: BILLZ_UNAVAILABLE_MESSAGE,
      code: "provider_unavailable",
    });
    expect(await saveProduct(product.id, values)).toMatchObject({ code: "provider_unavailable" });
    // Other changes never ask Billz.
    expect(
      (await saveProduct(product.id, { ...values, billzId: product.billzId, price: 99_000 })).ok,
    ).toBe(true);
  });
});

describe("local CSV", () => {
  it("writes the API's format: BOM, ; separator, CRLF, quoted cells, formula guard", () => {
    const csv = csvDocument(
      ["ID", "Nomi"],
      [
        [1, '=cmd"x"'],
        [2, "Serum"],
        [3, true],
      ],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.slice(1)).toBe('"ID";"Nomi"\r\n"1";"\'=cmd""x"""\r\n"2";"Serum"\r\n"3";"Ha"\r\n');
  });
});
