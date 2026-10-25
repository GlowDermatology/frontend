import { describe, expect, it } from "vitest";

import bannerFixture from "../__fixtures__/banner.json";
import categoriesFixture from "../__fixtures__/categories.json";
import jobFixture from "../__fixtures__/job-1.json";
import productFixture from "../__fixtures__/product-1.json";
import pageFixture from "../__fixtures__/products-page.json";
import statsFixture from "../__fixtures__/stats.json";
import type {
  ApiBanner,
  ApiCategory,
  ApiJob,
  ApiPaginatedProducts,
  ApiProduct,
  ApiProductStats,
} from "../types";
import { bannerFormData, bannerPatchBody, mapBanner } from "./banners";
import { categoryCreateBody, categoryPatchBody, mapCategory } from "./categories";
import { contentDisposition, exportFilename, parseExportFormat } from "./export";
import { mapJob } from "./jobs";
import { mapPage } from "./page";
import {
  lastChangeNote,
  lastSyncLabel,
  mapCatalogStats,
  mapProduct,
  productCreateBody,
  productFilterParams,
  productListParams,
  productPatchBody,
} from "./products";

/**
 * Recorded JSON from the M1a backend (`src/data/api/__fixtures__`, backend
 * 13021b6: `GET products/1/`, `GET products/?page_size=8` trimmed to two
 * rows, `GET products/stats/`, `GET categories/`, `GET jobs/1/`, one
 * `POST banners/` answer) → the FE domain objects, display strings included
 * (contract §5.2).
 */

const product = productFixture as ApiProduct;
const page = pageFixture as ApiPaginatedProducts;
const stats = statsFixture as ApiProductStats;
const NOW = new Date("2026-10-24T12:05:30+05:00");

describe("mapProduct", () => {
  it("maps product 1 with its photos and the price-change note", () => {
    const mapped = mapProduct(product);
    expect(mapped).toMatchObject({
      id: "1",
      billzId: "4607012301",
      billzName: "HYALURONIC SERUM 30ML",
      volume: "30 ml",
      category: "serums",
      price: 185_000,
      stock: 12,
      promo: false,
      status: "active",
      isNewFromBillz: false,
      art: null,
      mainImageUrl: "http://localhost:8001/media/products/1/d5872db9aa73d5e9.webp",
      lastChange: {
        by: "Administrator",
        at: "2026-10-22T18:04:00+05:00",
        note: "narx 175 000 → 185 000",
      },
    });
    expect(mapped.images).toEqual([
      {
        id: "1",
        src: "http://localhost:8001/media/products/1/d5872db9aa73d5e9.webp",
        label: "Rasm 1",
      },
      {
        id: "2",
        src: "http://localhost:8001/media/products/1/fd9b176b0330fb9a.webp",
        label: "Rasm 2",
      },
      {
        id: "3",
        src: "http://localhost:8001/media/products/1/b34a35635a12d0e0.webp",
        label: "Rasm 3",
      },
    ]);
    expect(mapped.texts.uz.name).toBe("Gialuron kislotali serum");
    expect(mapped.texts.en).toEqual({
      name: "Hyaluronic acid serum",
      description: "",
      ingredients:
        "Aqua, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Panthenol, Glycerin, Allantoin, Betaine, 1,2-Hexanediol.",
      usage: "",
    });
  });

  it("maps a fresh Billz import without category, photos or history", () => {
    const fresh = page.results.find((row) => row.id === 7)!;
    const mapped = mapProduct(fresh);
    expect(mapped).toMatchObject({
      id: "7",
      category: null,
      status: "hidden",
      isNewFromBillz: true,
      images: [],
      art: null,
    });
    expect(mapped.mainImageUrl).toBeUndefined();
    expect(mapped.lastChange).toBeUndefined();
    expect(mapped.texts.uz).toEqual({ name: "", description: "", ingredients: "", usage: "" });
  });

  it("fills missing languages and fields with empty strings", () => {
    const sparse = { ...product, texts: { uz: { name: "Serum" } } } as ApiProduct;
    expect(mapProduct(sparse).texts).toEqual({
      uz: { name: "Serum", description: "", ingredients: "", usage: "" },
      ru: { name: "", description: "", ingredients: "", usage: "" },
      en: { name: "", description: "", ingredients: "", usage: "" },
    });
  });

  it("writes every last_change kind per §5.2 and falls back to Administrator for a system actor", () => {
    const at = "2026-10-22T18:04:00+05:00";
    const note = (kind: Parameters<typeof lastChangeNote>[0]["kind"]) =>
      lastChangeNote({ kind, at, actor: null, old_price: 100_000, new_price: 1_250_000 });
    expect(note("created")).toBe("mahsulot yaratildi");
    expect(note("price_changed")).toBe("narx 100 000 → 1 250 000");
    expect(note("activated")).toBe("faollashtirildi");
    expect(note("hidden")).toBe("yashirildi");
    expect(note("promo_added")).toBe("aksiyaga qo‘shildi");
    expect(note("promo_removed")).toBe("aksiyadan olindi");
    expect(note("updated")).toBe("ma’lumotlar yangilandi");
    const system = mapProduct({
      ...product,
      last_change: { kind: "updated", at, actor: null, old_price: null, new_price: null },
    });
    expect(system.lastChange).toEqual({ by: "Administrator", at, note: "ma’lumotlar yangilandi" });
  });

  it("maps the page envelope", () => {
    const mapped = mapPage(page, mapProduct);
    expect(mapped).toMatchObject({ total: 248, page: 1, pageSize: 8, pageCount: 31 });
    expect(mapped.items.map((item) => item.id)).toEqual(["1", "7"]);
  });
});

describe("catalog stats", () => {
  it("maps the counters and derives the sync label from the server now", () => {
    expect(mapCatalogStats(stats, NOW)).toEqual({
      total: 248,
      active: 234,
      hidden: 14,
      newFromBillz: 4,
      outOfStock: 7,
      billzConnected: true,
      lastSyncAt: "2026-10-24T12:03:00+05:00",
      lastSyncLabel: "2 daqiqa oldin",
    });
  });

  it("lastSyncLabel follows the §5.2 thresholds", () => {
    const now = new Date("2026-10-24T12:00:00+05:00");
    expect(lastSyncLabel(null, now)).toBe("hali sinxronlanmagan");
    expect(lastSyncLabel("2026-10-24T11:59:30+05:00", now)).toBe("hozirgina");
    expect(lastSyncLabel("2026-10-24T11:58:00+05:00", now)).toBe("2 daqiqa oldin");
    expect(lastSyncLabel("2026-10-24T11:00:59+05:00", now)).toBe("59 daqiqa oldin");
    expect(lastSyncLabel("2026-10-24T09:00:00+05:00", now)).toBe("3 soat oldin");
    expect(lastSyncLabel("2026-10-23T11:59:00+05:00", now)).toBe("23-okt, 11:59");
    // A clock slightly ahead of the server never produces a negative age.
    expect(lastSyncLabel("2026-10-24T12:00:10+05:00", now)).toBe("hozirgina");
  });
});

describe("product query → API params", () => {
  const base = {
    outOfStock: false,
    onlyNew: false,
    sort: "default" as const,
    page: 1,
    pageSize: 8,
  };

  it("maps the defaults to page_size only", () => {
    expect(productListParams(base)).toEqual({
      search: undefined,
      category: undefined,
      status: undefined,
      promo: undefined,
      out_of_stock: undefined,
      is_new: undefined,
      ordering: undefined,
      page: undefined,
      page_size: 8,
    });
  });

  it("maps every filter (§2.3, §7.15)", () => {
    expect(
      productListParams({
        ...base,
        q: " serum ",
        category: "none",
        status: "hidden",
        promo: "yes",
        outOfStock: true,
        onlyNew: true,
        sort: "name_desc",
        page: 3,
      }),
    ).toEqual({
      search: "serum",
      category: "none",
      status: "hidden",
      promo: true,
      out_of_stock: true,
      is_new: true,
      ordering: "-name",
      page: 3,
      page_size: 8,
    });
    expect(productFilterParams({ ...base, promo: "no", sort: "name_asc" })).toMatchObject({
      promo: false,
      ordering: "name",
    });
    expect(productFilterParams(base)).not.toHaveProperty("page_size");
  });
});

describe("product write bodies", () => {
  const values = {
    texts: mapProduct(product).texts,
    price: 185_000,
    category: "serums",
    billzId: "4607012301",
    promo: false,
    status: "active" as const,
    images: [],
  };

  it("creates hidden with the slug or null", () => {
    expect(productCreateBody({ ...values, category: "" })).toEqual({
      billz_id: "4607012301",
      texts: values.texts,
      price: 185_000,
      category: null,
      promo: false,
      status: "hidden",
    });
  });

  it("patches only what changed against the baseline, texts as changed leaves", () => {
    const baseline = { ...values, category: "serums" };
    expect(productPatchBody(baseline, values)).toEqual({});
    const edited = {
      ...values,
      price: 190_000,
      category: "",
      texts: { ...values.texts, ru: { ...values.texts.ru, usage: "Вечером." } },
    };
    expect(productPatchBody(baseline, edited)).toEqual({
      price: 190_000,
      category: null,
      texts: { ru: { usage: "Вечером." } },
    });
    expect(
      productPatchBody(baseline, { ...values, billzId: "4607019901", status: "hidden" }),
    ).toEqual({
      billz_id: "4607019901",
      status: "hidden",
    });
  });

  it("leaves a concurrent edit of an untouched field alone (lost-update regression)", () => {
    // The editor loaded price 185 000 and an empty ru name. Meanwhile another
    // admin set price 131 000 and ru name "B edit" on the server. This admin
    // changed only the uz description: the PATCH must carry only that leaf,
    // so the server keeps the other admin's price and ru name.
    const loaded = mapProduct(product);
    const baseline = {
      texts: loaded.texts,
      price: loaded.price,
      category: loaded.category ?? "",
      billzId: loaded.billzId,
      promo: loaded.promo,
      status: loaded.status,
    };
    const edited = {
      ...values,
      texts: { ...loaded.texts, uz: { ...loaded.texts.uz, description: "Yangi tavsif." } },
      price: loaded.price,
    };
    expect(productPatchBody(baseline, edited)).toEqual({
      texts: { uz: { description: "Yangi tavsif." } },
    });
  });
});

describe("categories", () => {
  it("maps the recorded list", () => {
    const mapped = (categoriesFixture.results as ApiCategory[]).map(mapCategory);
    expect(mapped.map((c) => [c.slug, c.name.uz, c.position, c.productCount])).toEqual([
      ["serums", "Serumlar", 0, 20],
      ["cleansing", "Tozalash", 1, 55],
      ["moisturizing", "Namlantirish", 2, 92],
      ["sun", "Quyoshdan himoya", 3, 41],
      ["toners", "Tonerlar", 4, 36],
    ]);
    expect(mapped[0]).toMatchObject({
      isActive: true,
      name: { ru: "Сыворотки", en: "Serums" },
      createdAt: "2026-10-25T23:02:37+05:00",
    });
  });

  it("builds the write bodies (slug only on create)", () => {
    const values = {
      slug: "masks",
      name: { uz: "Niqoblar", ru: "", en: "Masks" },
      isActive: false,
    };
    expect(categoryCreateBody(values)).toEqual({
      slug: "masks",
      name: { uz: "Niqoblar", ru: "", en: "Masks" },
      is_active: false,
    });
    expect(categoryPatchBody(values)).toEqual({
      name: { uz: "Niqoblar", ru: "", en: "Masks" },
      is_active: false,
    });
  });
});

describe("banners", () => {
  const values = {
    title: { uz: "Kuzgi chegirmalar", ru: "", en: "" },
    link: { kind: "product" as const, productId: "4", category: null },
    isActive: true,
    startsAt: null,
    endsAt: "2026-11-30T00:00:00+05:00",
  };

  it("maps the recorded banner", () => {
    expect(mapBanner(bannerFixture as ApiBanner)).toEqual({
      id: "1",
      title: { uz: "Kuzgi chegirmalar", ru: "", en: "" },
      imageUrl: "http://localhost:8001/media/banners/1/8349b8f7b347589a.png",
      link: { kind: "product", productId: "4", category: null },
      isActive: true,
      startsAt: null,
      endsAt: "2026-11-30T00:00:00+05:00",
      position: 0,
      createdAt: "2026-10-26T00:49:05+05:00",
      updatedAt: "2026-10-26T00:49:05+05:00",
    });
  });

  it('builds the multipart body with dotted keys and "" for null', () => {
    const image = new File(["x"], "banner.png", { type: "image/png" });
    const form = bannerFormData(values, image);
    expect(Object.fromEntries([...form.entries()].filter(([k]) => k !== "image"))).toEqual({
      "title.uz": "Kuzgi chegirmalar",
      "title.ru": "",
      "title.en": "",
      "link.kind": "product",
      "link.product_id": "4",
      "link.category": "",
      is_active: "true",
      starts_at: "",
      ends_at: "2026-11-30T00:00:00+05:00",
    });
    expect(form.get("image")).toBeInstanceOf(File);
    // A category link clears the product id even if the form still holds one.
    const category = bannerFormData({
      ...values,
      link: { kind: "category", productId: "4", category: "serums" },
      isActive: false,
    });
    expect(category.get("link.product_id")).toBe("");
    expect(category.get("link.category")).toBe("serums");
    expect(category.get("is_active")).toBe("false");
    expect(category.has("image")).toBe(false);
  });

  it("builds the JSON PATCH body with nested nulls", () => {
    expect(bannerPatchBody(values)).toEqual({
      title: { uz: "Kuzgi chegirmalar", ru: "", en: "" },
      link: { kind: "product", product_id: 4, category: null },
      is_active: true,
      starts_at: null,
      ends_at: "2026-11-30T00:00:00+05:00",
    });
    expect(
      bannerPatchBody({ ...values, link: { kind: "none", productId: "4", category: "serums" } })
        .link,
    ).toEqual({ kind: "none", product_id: null, category: null });
  });
});

describe("jobs", () => {
  it("maps the recorded import job", () => {
    expect(mapJob(jobFixture as ApiJob)).toEqual({
      id: "1",
      kind: "billz_import",
      state: "succeeded",
      progress: { done: 248, total: 248 },
      result: { created: 0, updated: 248, unchanged: 0, newFromBillz: 0 },
      error: null,
      createdAt: "2026-10-24T12:03:00+05:00",
      startedAt: "2026-10-24T12:03:00+05:00",
      finishedAt: "2026-10-24T12:03:00+05:00",
    });
  });

  it("keeps a running job's progress and a failed job's error, and drops malformed extras", () => {
    const running = mapJob({
      ...(jobFixture as ApiJob),
      state: "running",
      progress: { done: 12, total: 248 },
      result: null,
      finished_at: null,
    });
    expect(running).toMatchObject({
      state: "running",
      progress: { done: 12, total: 248 },
      result: null,
    });
    const failed = mapJob({
      ...(jobFixture as ApiJob),
      state: "failed",
      progress: "n/a",
      result: { created: "3" },
      error: { code: "worker_lost", message: "Jarayon uzilib qoldi. Qayta urinib ko‘ring." },
    });
    expect(failed).toMatchObject({
      state: "failed",
      progress: null,
      result: null,
      error: { code: "worker_lost", message: "Jarayon uzilib qoldi. Qayta urinib ko‘ring." },
    });
  });
});

describe("exports", () => {
  it("parses the format with CSV as the default", () => {
    expect(parseExportFormat("xlsx")).toBe("xlsx");
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat("pdf")).toBe("csv");
    expect(parseExportFormat(undefined)).toBe("csv");
  });

  it("keeps a safe upstream filename and falls back otherwise", () => {
    expect(
      exportFilename('attachment; filename="mahsulotlar-20261026-0025.csv"', "mahsulotlar", "csv"),
    ).toBe("mahsulotlar-20261026-0025.csv");
    expect(exportFilename("attachment; filename=bannerlar-1.xlsx", "bannerlar", "xlsx")).toBe(
      "bannerlar-1.xlsx",
    );
    // Wrong extension, path separators, header injection, non-ASCII, nothing.
    expect(exportFilename('attachment; filename="x.xlsx"', "mahsulotlar", "csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(exportFilename('attachment; filename="../x.csv"', "mahsulotlar", "csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(exportFilename('attachment; filename="a";x=".csv"', "mahsulotlar", "csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(exportFilename('attachment; filename="a\r\nX: y.csv"', "mahsulotlar", "csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(exportFilename('attachment; filename="mahsulotlar-é.csv"', "mahsulotlar", "csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(exportFilename(null, "kategoriyalar", "xlsx")).toBe("kategoriyalar.xlsx");
    expect(contentDisposition("mahsulotlar.csv")).toBe('attachment; filename="mahsulotlar.csv"');
  });
});
