import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { ToastProvider } from "@/components/ui/toast";
import { bannerDialogSchemas, bannerFieldLabel } from "@/features/admin/banners/banner-dialog";
import { windowLabel } from "@/features/admin/banners/banners-view";
import { bannersCopy } from "@/features/admin/banners/copy";
import { categoryFieldLabel } from "@/features/admin/categories/category-dialog";
import { categoriesCopy } from "@/features/admin/categories/copy";
import { categorySchemas } from "@/data/categories.schema";
import { PRODUCTS } from "@/data/mock/catalog";
import { CATEGORIES } from "@/data/mock/categories";
import { imageFileProblem, productFormSchemas } from "@/data/products.schema";
import { bannerLinkText, bannerRecommendedMissing, bannerRecommendedToAsk } from "@/domain/banner";
import { categoryRecommendedMissing, categoryRecommendedToAsk } from "@/domain/category";
import {
  defaultImageLabel,
  isDefaultImageLabel,
  productRecommendedMissing,
  productRecommendedToAsk,
} from "@/domain/product";
import { emptySeo, productSeoStatus, seoIssueText, slugProblem } from "@/domain/seo";
import type { Job } from "@/domain/job";
import { createFormatter } from "@/lib/format";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { importSummary, jobErrorText, jobStatusText } from "./billz-import";
import { productsCopy } from "./copy";
import { languageToShow } from "./form-reveal";
import { ImageManager } from "./image-manager";
import { LanguageTabs } from "./language-tabs";
import { missingTextsNote, ProductEditor, productFieldLabel } from "./product-editor";
import { pageRange } from "./products-content";

/**
 * The catalog sweep (products, categories, banners; DESIGN §A, §G): error reveal targets
 * (the image card, language tabs), recommended fields, labels of the error summary, the import
 * texts, schemas and checklist in the three admin languages, and the editor in a server render.
 */

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(ToastProvider, null, node)),
  );

const UZBEK_MARKER = /[‘ʻ]|\p{L}’\p{L}/u;
const CYRILLIC = /[Ѐ-ӿ]/;

describe("error reveal targets", () => {
  const noop = () => undefined;

  it("marks the image card as the field the reveal lands on, with the error read out", () => {
    const html = render(
      createElement(ImageManager, {
        images: [],
        onMove: noop,
        onRemove: noop,
        onAdd: noop,
        error: "Faol mahsulotda kamida bitta rasm bo‘lsin.",
      }),
    );
    expect(html).toContain('data-field="images"');
    expect(html).toContain('data-invalid="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain("Faol mahsulotda kamida bitta rasm bo‘lsin.");
    const clean = render(
      createElement(ImageManager, { images: [], onMove: noop, onRemove: noop, onAdd: noop }),
    );
    expect(clean).toContain('data-field="images"');
    expect(clean).not.toContain("data-invalid");
    expect(clean).toContain("0 / 8");
  });

  it("names API photos by their place in the admin language, keeps a given name", () => {
    const images = [
      { id: "1", src: "https://cdn.example/a.webp", label: defaultImageLabel(1) },
      { id: "2", src: "https://cdn.example/b.webp", label: "Old tomoni" },
    ];
    const html = render(
      createElement(ImageManager, { images, onMove: noop, onRemove: noop, onAdd: noop }),
      "en",
    );
    expect(html).toContain('alt="Image 1"');
    expect(html).toContain('alt="Old tomoni"');
    expect(html).toContain(productsCopy.en.imageManager.main);
    expect(isDefaultImageLabel("Rasm 12")).toBe(true);
    expect(isDefaultImageLabel("Rasm uchun")).toBe(false);
  });

  it("flags the language tabs that hold errors", () => {
    const html = render(
      createElement(LanguageTabs, {
        languages: ["uz", "ru", "en"],
        value: "uz",
        onChange: noop,
        complete: { uz: true, ru: false, en: true },
        invalid: { ru: true },
        idBase: "x",
      }),
      "ru",
    );
    expect(html).toContain('data-lang="ru" data-has-errors="true"');
    expect(html).toContain(productsCopy.ru.tabs.hasErrors);
    expect(html).toContain(productsCopy.ru.tabs.complete);
    expect(html).toContain(`aria-label="${productsCopy.ru.tabs.label}"`);
  });

  it("shows the failing language tab first: the current one when it fails, else uz → ru → en", () => {
    expect(languageToShow(["price", "texts.en.name", "texts.ru.usage"], "texts", "uz")).toBe("ru");
    expect(languageToShow(["texts.en.name", "texts.ru.usage"], "texts", "en")).toBe("en");
    expect(languageToShow(["seo.en.title"], "seo", "uz")).toBe("en");
    expect(languageToShow(["price", "images"], "texts", "uz")).toBeNull();
  });
});

describe("error summary labels", () => {
  it("names product paths with their language", () => {
    const t = productsCopy.ru.editor;
    expect(productFieldLabel(t, "texts.ru.name")).toBe("Название · Русский");
    expect(productFieldLabel(t, "seo.en.description")).toBe("SEO-описание (Английский)");
    expect(productFieldLabel(t, "images")).toBe("Изображения");
    expect(productFieldLabel(productsCopy.uz.editor, "price")).toBe("Narx");
    expect(productFieldLabel(t, "unknown.path")).toBeUndefined();
  });

  it("names category and banner paths", () => {
    expect(categoryFieldLabel(categoriesCopy.en.dialog, "name.ru")).toBe("Name (Russian)");
    expect(categoryFieldLabel(categoriesCopy.uz.dialog, "seo.ru.title")).toBe(
      "SEO sarlavha (ruscha)",
    );
    expect(categoryFieldLabel(categoriesCopy.ru.dialog, "image")).toBe("Изображение");
    expect(bannerFieldLabel(bannersCopy.en.dialog, "endsAt")).toBe("Ends");
    expect(bannerFieldLabel(bannersCopy.uz.dialog, "productId")).toBe("Mahsulot (faol)");
  });
});

describe("recommended fields (save anyway?)", () => {
  it("asks for photos and the Uzbek description of a product, never its SEO texts", () => {
    const product = PRODUCTS[0]!;
    const values = { images: [], texts: product.texts, seo: emptySeo() };
    expect(productRecommendedMissing(values)).toEqual(["images"]);
    const full = { images: [{ id: "1" }], texts: { uz: { description: "Tavsif" } } };
    expect(productRecommendedMissing(full)).toEqual([]);
    expect(productRecommendedMissing({ ...full, texts: { uz: { description: "   " } } })).toEqual([
      "texts.uz.description",
    ]);
  });

  it("asks about a product only when it is news (create, activation, a field just emptied)", () => {
    const saved = {
      images: [],
      texts: { uz: { description: "" } },
      status: "active" as const,
    };
    // An unchanged save of an active product saved without photos / description: no question.
    expect(productRecommendedToAsk(saved, saved)).toEqual([]);
    // The admin just cleared the description: asked; the photos were already missing: not.
    const filled = { ...saved, texts: { uz: { description: "Tavsif" } } };
    expect(productRecommendedToAsk(saved, filled)).toEqual(["texts.uz.description"]);
    // A create asks about everything empty, unless the product stays hidden.
    expect(productRecommendedToAsk(saved, null)).toEqual(["images", "texts.uz.description"]);
    expect(productRecommendedToAsk({ ...saved, status: "hidden" }, null)).toEqual([]);
    // Hidden → never; the save that shows it → every empty field.
    const hidden = { ...saved, status: "hidden" as const };
    expect(productRecommendedToAsk(hidden, filled)).toEqual([]);
    expect(productRecommendedToAsk(saved, hidden)).toEqual(["images", "texts.uz.description"]);
  });

  it("asks for a category's and a banner's translations, never the category image", () => {
    expect(categoryRecommendedMissing({ name: { uz: "A", ru: "", en: "B" } })).toEqual(["name.ru"]);
    expect(categoryRecommendedMissing({ name: { uz: "A", ru: "Б", en: "B" } })).toEqual([]);
    expect(bannerRecommendedMissing({ title: { uz: "A", ru: " ", en: "" } })).toEqual([
      "title.ru",
      "title.en",
    ]);
  });

  it("asks about a category's names only on create, activation, a cleared name or a new uz name", () => {
    const saved = { name: { uz: "Serumlar", ru: "", en: "Serums" }, isActive: true };
    expect(categoryRecommendedToAsk(saved, saved)).toEqual([]);
    expect(categoryRecommendedToAsk({ ...saved, name: { ...saved.name, en: "" } }, saved)).toEqual([
      "name.en",
    ]);
    expect(
      categoryRecommendedToAsk({ ...saved, name: { ...saved.name, uz: "Zardoblar" } }, saved),
    ).toEqual(["name.ru"]);
    expect(categoryRecommendedToAsk(saved, null)).toEqual(["name.ru"]);
    expect(categoryRecommendedToAsk({ ...saved, isActive: false }, null)).toEqual([]);
    expect(categoryRecommendedToAsk(saved, { ...saved, isActive: false })).toEqual(["name.ru"]);
  });

  it("asks about a banner's titles only when it is news", () => {
    const saved = { title: { uz: "Kuz", ru: "", en: "" }, isActive: true };
    expect(bannerRecommendedToAsk(saved, saved)).toEqual([]);
    expect(
      bannerRecommendedToAsk({ ...saved, title: { ...saved.title, uz: "Qish" } }, saved),
    ).toEqual(["title.ru", "title.en"]);
    expect(bannerRecommendedToAsk({ ...saved, isActive: false }, null)).toEqual([]);
    expect(bannerRecommendedToAsk(saved, null)).toEqual(["title.ru", "title.en"]);
  });
});

describe("Billz import texts", () => {
  const fmt = createFormatter("en");
  const job = (patch: Partial<Job>): Job => ({
    id: "1",
    kind: "billz_import",
    state: "running",
    progress: null,
    result: null,
    error: null,
    createdAt: "",
    startedAt: null,
    finishedAt: null,
    ...patch,
  });

  it("summarises the result in the admin language", () => {
    const result = { created: 3, updated: 1245, unchanged: 0, newFromBillz: 3, hidden: 2 };
    expect(importSummary(productsCopy.en.import, fmt, result)).toBe(
      "3 new · 1,245 updated · 0 unchanged · 2 hidden",
    );
    const uzFmt = createFormatter("uz");
    expect(importSummary(productsCopy.uz.import, uzFmt, { ...result, hidden: undefined })).toBe(
      `3 ta yangi · ${uzFmt.number(1245)} ta yangilandi · 0 ta o‘zgarmadi`,
    );
    expect(
      jobStatusText(productsCopy.en.import, fmt, job({ progress: { done: 5, total: 1200 } })),
    ).toBe("Importing: 5 / 1,200");
  });

  it("explains the known Billz failures itself, else shows the server's message", () => {
    const t = productsCopy.ru.import;
    expect(
      jobErrorText(t, job({ state: "failed", error: { code: "billz_auth_failed", message: "x" } })),
    ).toBe(t.authFailed);
    expect(
      jobErrorText(
        t,
        job({ state: "failed", error: { code: "billz_listing_incomplete", message: "x" } }),
      ),
    ).toBe(t.listingIncomplete);
    expect(
      jobErrorText(t, job({ state: "failed", error: { code: "other", message: "Сбой" } })),
    ).toBe("Сбой");
    expect(jobErrorText(t, job({ state: "failed", error: null }))).toBe(t.unexpected);
  });
});

describe("localized catalog data", () => {
  it("validates the product form in the admin language", () => {
    const parsed = productFormSchemas.ru.safeParse({
      texts: {
        uz: { name: "A", shortDescription: "", description: "", ingredients: "", usage: "" },
        ru: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
        en: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
      },
      price: 10,
      category: "",
      billzId: "12",
      promo: false,
      status: "active",
      images: [],
      slug: "12345",
      seo: emptySeo(),
    });
    expect(parsed.success).toBe(false);
    const messages = Object.fromEntries(
      (parsed.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]),
    );
    expect(messages).toMatchObject({
      "texts.uz.name": "Введите название на узбекском (не менее 2 символов).",
      price: "Цена должна быть не меньше 1 000 сум.",
      billzId: "Billz ID или штрихкод должен состоять из 6–14 цифр.",
      slug: "Только строчные латинские буквы, цифры и дефис (не только цифры).",
      category: "Для активного товара выберите категорию.",
      images: "У активного товара должно быть хотя бы одно изображение.",
    });
  });

  it("reports the active product's photo and category with an empty price, in one round", () => {
    const parsed = productFormSchemas.uz.safeParse({
      texts: {
        uz: { name: "Serum", shortDescription: "", description: "", ingredients: "", usage: "" },
        ru: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
        en: { name: "", shortDescription: "", description: "", ingredients: "", usage: "" },
      },
      price: Number.NaN,
      category: "",
      billzId: "4607012301",
      promo: false,
      status: "active",
      images: [],
      slug: "",
      seo: emptySeo(),
    });
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "price",
      "category",
      "images",
    ]);
  });

  it("validates the category and banner forms in the admin language", () => {
    const category = categorySchemas.en.form.safeParse({
      slug: "order",
      name: { uz: "A", ru: "", en: "" },
      isActive: true,
      seo: emptySeo(),
    });
    expect(category.error?.issues.map((issue) => issue.message)).toEqual([
      "This slug is reserved.",
      "Enter the Uzbek name (at least 2 characters).",
    ]);
    const banner = bannerDialogSchemas.ru.safeParse({
      title: { uz: "", ru: "", en: "" },
      kind: "url",
      productId: "",
      category: "",
      url: "http://glowderma.uz",
      isActive: true,
      startsAt: "2026-11-20T10:00",
      endsAt: "2026-11-20T09:00",
    });
    expect(banner.error?.issues.map((issue) => issue.message)).toEqual([
      "Введите заголовок на узбекском.",
      "Введите полную ссылку, начинающуюся с https://.",
      "Время окончания должно быть позже времени начала.",
    ]);
  });

  it("refuses image files and slugs in the admin language", () => {
    expect(imageFileProblem({ type: "image/gif", size: 10 }, "en")).toBe(
      "JPEG, PNG or WebP images only.",
    );
    expect(imageFileProblem({ type: "image/png", size: 6 * 1024 * 1024 }, "ru")).toBe(
      "Изображение должно быть не больше 5 МБ.",
    );
    expect(imageFileProblem({ type: "image/webp", size: 1 })).toBeNull();
    expect(slugProblem("a".repeat(141), 140, "en")).toBe("No more than 140 characters.");
  });

  it("renders the «SEO holati» checklist from the code in every language", () => {
    const status = productSeoStatus(
      {
        texts: {
          uz: { name: "", description: "" },
          ru: { name: "", description: "" },
          en: { name: "", description: "" },
        },
        imageCount: 0,
        category: null,
        seo: emptySeo(),
      },
      "en",
    );
    expect(status.issues[0]).toEqual({
      code: "name_missing",
      severity: "error",
      language: "uz",
      message: "No Uzbek name: the page shows the Billz name.",
    });
    for (const issue of status.issues) {
      expect(CYRILLIC.test(issue.message) || UZBEK_MARKER.test(issue.message)).toBe(false);
      // The text from the code matches what the demo checklist wrote.
      expect(seoIssueText(issue, "en")).toBe(issue.message);
    }
    expect(seoIssueText({ code: "seo_title_short", language: "ru", message: "" }, "ru")).toBe(
      "SEO-заголовок (русский) слишком короткий: напишите не менее 15 символов.",
    );
    // An unknown code keeps the server's text.
    expect(
      seoIssueText({ code: "new_rule" as never, language: null, message: "Server" }, "ru"),
    ).toBe("Server");
  });

  it("words banner links and windows", () => {
    const link = { kind: "category" as const, productId: null, category: "serums", url: null };
    expect(bannerLinkText(link, "en", () => "Serums")).toBe("Category: Serums");
    expect(bannerLinkText({ ...link, kind: "product", productId: "12" }, "ru")).toBe("Товар #12");
    expect(bannerLinkText({ ...link, kind: "none" }, "uz")).toBe("Havolasiz");
    const fmt = createFormatter("en");
    expect(windowLabel({ startsAt: null, endsAt: null }, bannersCopy.en.list, fmt)).toBe(
      "Always on",
    );
    expect(
      windowLabel(
        { startsAt: "2026-11-01T09:00:00+05:00", endsAt: null },
        bannersCopy.en.list,
        fmt,
      ),
    ).toBe(`${fmt.dateTimeShort("2026-11-01T09:00:00+05:00")} → …`);
  });

  it("formats the page range and the missing-texts note", () => {
    expect(pageRange(createFormatter("en"), 2, 8, 1248)).toBe("9–16 / 1,248");
    expect(pageRange(createFormatter("uz"), 1, 8, 0)).toBe("0 / 0");
    expect(missingTextsNote(productsCopy.en.editor, ["ru", "en"])).toBe(
      "Incomplete: Russian, English. Until it is filled in, the app shows the Uzbek text.",
    );
    expect(missingTextsNote(productsCopy.ru.editor, ["uz", "ru"])).toBe(
      productsCopy.ru.editor.missingUz,
    );
  });
});

describe("ProductEditor in a server render", () => {
  const product = PRODUCTS[0]!;

  it.each(["ru", "en"] as const)("speaks %s in its own texts", (locale) => {
    const t = productsCopy[locale].editor;
    const html = render(
      createElement(ProductEditor, { product, categories: CATEGORIES, lastSyncLabel: "—" }),
      locale,
    );
    for (const text of [
      t.editTitle,
      t.texts,
      t.images,
      t.priceCard,
      t.billzCard,
      t.promo,
      t.save,
    ]) {
      expect(html).toContain(text);
    }
    // The category is a kit Select (only Radix's hidden form mirror is a <select>), the price
    // uses the language's grouping.
    expect(html.match(/<select(?![^>]*aria-hidden="true")/g)).toBeNull();
    expect(html).toContain('role="combobox"');
    expect(html).toContain(createFormatter(locale).number(product.price));
    expect(html).toContain('data-field="images"');
    for (const uzbek of [
      "Matnlar",
      "Narx va kategoriya",
      "Saqlash",
      "Bog‘langan",
      "Oxirgi o‘zgarish",
    ]) {
      expect(html).not.toContain(uzbek);
    }
  });

  it("renders a new product with an empty image card and no stray errors", () => {
    const html = render(
      createElement(ProductEditor, { product: null, categories: CATEGORIES, lastSyncLabel: "" }),
    );
    expect(html).toContain(productsCopy.uz.editor.newTitle);
    expect(html).toContain('data-field="images"');
    expect(html).not.toContain('data-invalid="true"');
    expect(html).not.toContain('aria-invalid="true"');
  });
});
