import { describe, expect, it } from "vitest";

import type { ShopProduct, ShopSettings, ShopSpecialist } from "@/domain/shop";

import { getShopDictionary } from "../content";
import { categoryDescription, productDescription, productTitle } from "./describe";
import {
  breadcrumbLd,
  clinicLd,
  organizationLd,
  productLd,
  serializeJsonLd,
  serviceLd,
  specialistLd,
  websiteLd,
} from "./json-ld";
import { buildShopMetadata, clampDescription, languageAlternates, pageTitle } from "./metadata";

const ORIGIN = "http://localhost:3000";

const product: ShopProduct = {
  id: 1,
  segment: "gialuron-serum",
  hasSlug: true,
  name: "Gialuron kislotali serum",
  volume: "30 ml",
  price: 185000,
  promo: false,
  category: { slug: "serums", name: "Serumlar" },
  image: "https://media.glowderma.uz/a.webp",
  imageUrl: "https://media.glowderma.uz/a.webp",
  available: 12,
  inStock: true,
  brand: null,
  sku: null,
  updatedAt: null,
  description: "",
  ingredients: "",
  usage: "",
  images: [],
  maxQuantity: 10,
  seoTitle: null,
  seoDescription: null,
};

const settings: ShopSettings = {
  supportPhone: "+998712000000",
  storePhone: "+998712000001",
  cosmetologistPhone: null,
  telegramUrl: "https://t.me/glowderma",
  instagramUrl: null,
  websiteUrl: null,
  pickupAddress: "Toshkent, Chilonzor tumani, 12",
  terms: "",
  privacyPolicy: "",
  bookingPolicy: "",
  termsVersion: null,
  termsUpdatedAt: null,
  onlineSalesEnabled: true,
  fulfilmentMethods: ["pickup"],
  paymentProviders: [],
  storeUrls: { ios: null, android: null },
};

describe("metadata", () => {
  it("builds canonical, hreflang with x-default, Open Graph and Twitter", () => {
    const metadata = buildShopMetadata({
      locale: "ru",
      route: { kind: "product", slug: "gialuron-serum" },
      title: "Сыворотка",
      description: "Описание",
      images: [{ url: "https://media.glowderma.uz/a.webp", alt: "Сыворотка" }],
    });
    expect(metadata.title).toEqual({ absolute: "Сыворотка | Glow Derma" });
    expect(metadata.alternates).toEqual({
      canonical: "/ru/products/gialuron-serum",
      languages: {
        uz: "/mahsulotlar/gialuron-serum",
        ru: "/ru/products/gialuron-serum",
        en: "/en/products/gialuron-serum",
        "x-default": "/mahsulotlar/gialuron-serum",
      },
    });
    expect(metadata.openGraph).toMatchObject({
      url: "/ru/products/gialuron-serum",
      locale: "ru_RU",
      alternateLocale: ["uz_UZ", "en_US"],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("keeps the page number in the canonical and noindexes on request", () => {
    const metadata = buildShopMetadata({
      locale: "uz",
      route: { kind: "catalog" },
      title: "Katalog",
      description: "x",
      query: { page: 3 },
      noindex: true,
    });
    expect(metadata.alternates?.canonical).toBe("/katalog?page=3");
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(languageAlternates({ kind: "catalog" }, { page: 3 })["x-default"]).toBe(
      "/katalog?page=3",
    );
  });

  it("marks a product page og:type product without tripping Next's type list", () => {
    const metadata = buildShopMetadata({
      locale: "uz",
      route: { kind: "product", slug: "serum" },
      title: "Serum",
      description: "x",
      ogType: "product",
    });
    expect(metadata.openGraph).not.toHaveProperty("type");
    expect(metadata.other).toEqual({ "og:type": "product" });
  });

  it("does not repeat the brand in titles that already have it", () => {
    expect(pageTitle("Glow Derma — do‘kon")).toBe("Glow Derma — do‘kon");
    expect(pageTitle("Katalog")).toBe("Katalog | Glow Derma");
  });

  it("clamps descriptions at a word boundary", () => {
    const long = "so‘z ".repeat(60);
    const clamped = clampDescription(long);
    expect(clamped.length).toBeLessThanOrEqual(160);
    expect(clamped.endsWith("…")).toBe(true);
    expect(clamped).not.toMatch(/\s…$/);
    expect(clampDescription("  qisqa\n matn ")).toBe("qisqa matn");
  });
});

describe("entity descriptions", () => {
  const uz = getShopDictionary("uz");
  const en = getShopDictionary("en");

  it("builds a product description from name, volume, category and price when empty", () => {
    expect(productDescription(product, "uz", uz)).toBe(
      "Gialuron kislotali serum, 30 ml — Serumlar toifasidan — narxi 185 000 so‘m — Glow Derma do‘konida, cashback va yetkazib berish bilan.",
    );
    expect(productDescription(product, "en", en)).toContain("priced at 185,000 UZS");
  });

  it("prefers seo_description, then a real description", () => {
    expect(productDescription({ ...product, seoDescription: "SEO matn" }, "uz", uz)).toBe(
      "SEO matn",
    );
    const description =
      "Yengil serum teringizni chuqur namlaydi va tiniqlashtiradi, har kuni ertalab.";
    expect(productDescription({ ...product, description }, "uz", uz)).toBe(description);
    expect(productTitle(product)).toBe("Gialuron kislotali serum, 30 ml");
    expect(productTitle({ ...product, seoTitle: "Serum SPF" })).toBe("Serum SPF");
  });

  it("never describes a ru/en page with the Uzbek fallback text (U6)", () => {
    const ru = getShopDictionary("ru");
    const description =
      "Yengil serum teringizni chuqur namlaydi va tiniqlashtiradi, har kuni ertalab.";
    const uzTexts = { description, seoTitle: null, seoDescription: null };
    const fallback = productDescription({ ...product, description }, "ru", ru, uzTexts);
    expect(fallback).not.toContain("Yengil serum");
    expect(fallback).toContain("30 мл");
    const translated = "Лёгкая сыворотка глубоко увлажняет кожу и выравнивает её тон каждый день.";
    expect(productDescription({ ...product, description: translated }, "ru", ru, uzTexts)).toBe(
      translated,
    );
    expect(productTitle(product, "ru")).toBe("Gialuron kislotali serum, 30 мл");
  });

  it("describes a category by its name and count when staff left it empty", () => {
    expect(
      categoryDescription(
        {
          slug: "serums",
          name: "Serumlar",
          image: null,
          imageUrl: null,
          productCount: 20,
          description: null,
          seoTitle: null,
          seoDescription: null,
          updatedAt: null,
        },
        uz,
      ),
    ).toContain("Serumlar: Glow Derma katalogida 20 ta mahsulot.");
  });
});

describe("JSON-LD", () => {
  it("escapes markup and line separators so the script cannot be closed", () => {
    const out = serializeJsonLd({ name: "</script><b>& " });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual({ name: "</script><b>& " });
  });

  it("describes a product with a UZS offer and availability", () => {
    const ld = productLd({
      origin: ORIGIN,
      product,
      url: `${ORIGIN}/mahsulotlar/gialuron-serum`,
      description: "d",
    });
    expect(ld).toMatchObject({
      "@type": "Product",
      name: "Gialuron kislotali serum",
      image: ["https://media.glowderma.uz/a.webp"],
      offers: {
        "@type": "Offer",
        price: 185000,
        priceCurrency: "UZS",
        availability: "https://schema.org/InStock",
      },
    });
    // No made-up brand or SKU (the product id is not one).
    expect(ld).not.toHaveProperty("brand");
    expect(ld).not.toHaveProperty("sku");
    expect(
      productLd({
        origin: ORIGIN,
        product: { ...product, inStock: false, brand: "CeraVe", sku: "CV-HA-30" },
        url: "u",
        description: "d",
      }),
    ).toMatchObject({
      brand: { "@type": "Brand", name: "CeraVe" },
      sku: "CV-HA-30",
      offers: { availability: "https://schema.org/OutOfStock" },
    });
  });

  it("describes the organization and the clinic from the settings", () => {
    expect(organizationLd({ origin: ORIGIN, settings })).toMatchObject({
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      sameAs: ["https://t.me/glowderma"],
      contactPoint: [{ telephone: "+998712000000" }],
    });
    const clinic = clinicLd({
      origin: ORIGIN,
      settings,
      location: { latitude: 41.3, longitude: 69.2 },
    });
    expect(clinic).toMatchObject({
      "@type": ["MedicalClinic", "Store"],
      telephone: "+998712000000",
      address: { streetAddress: "Toshkent, Chilonzor tumani, 12", addressCountry: "UZ" },
      geo: { latitude: 41.3, longitude: 69.2 },
    });
    expect(clinicLd({ origin: ORIGIN, settings, location: null })).not.toHaveProperty("geo");
    const hours = {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday"],
      opens: "09:00",
      closes: "20:00",
    };
    expect(
      clinicLd({
        origin: ORIGIN,
        settings,
        location: { latitude: null, longitude: null },
        facts: { openingHours: [hours], geo: { latitude: 41.31, longitude: 69.28 } },
      }),
    ).toMatchObject({
      geo: { "@type": "GeoCoordinates", latitude: 41.31, longitude: 69.28 },
      openingHoursSpecification: [hours],
    });
  });

  it("declares the site search", () => {
    expect(
      websiteLd({
        origin: ORIGIN,
        url: `${ORIGIN}/ru`,
        locale: "ru",
        name: "Glow Derma",
        searchUrlTemplate: `${ORIGIN}/katalog?q={search_term_string}`,
      }),
    ).toMatchObject({
      "@type": "WebSite",
      "@id": `${ORIGIN}/ru/#website`,
      url: `${ORIGIN}/ru`,
      potentialAction: {
        "@type": "SearchAction",
        target: { urlTemplate: `${ORIGIN}/katalog?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    });
  });

  it("numbers breadcrumbs from 1", () => {
    expect(
      breadcrumbLd([
        { name: "Bosh sahifa", url: ORIGIN },
        { name: "Katalog", url: `${ORIGIN}/katalog` },
      ]),
    ).toMatchObject({
      itemListElement: [
        { position: 1, name: "Bosh sahifa" },
        { position: 2, item: `${ORIGIN}/katalog` },
      ],
    });
  });

  it("describes a dermatologist as a Physician and a cosmetologist as a Person", () => {
    const specialist: ShopSpecialist = {
      id: 1,
      segment: "1",
      hasSlug: false,
      name: "Nodira Rahimova",
      role: "dermatologist",
      roleLabel: "Dermatolog",
      photo: null,
      photoUrl: null,
      bio: "",
      qualifications: "",
      experienceYears: 8,
      location: {
        name: "Klinika",
        address: "Toshkent",
        phone: null,
        latitude: null,
        longitude: null,
      },
      services: [{ id: 1, name: "Konsultatsiya", shortName: "K", durationMin: 30, price: 1 }],
      updatedAt: null,
    };
    expect(specialistLd({ origin: ORIGIN, specialist, url: "u" })).toMatchObject({
      "@type": "Physician",
      medicalSpecialty: "Dermatology",
      availableService: [{ "@type": "MedicalProcedure", name: "Konsultatsiya" }],
    });
    expect(
      specialistLd({
        origin: ORIGIN,
        specialist: { ...specialist, role: "cosmetologist", roleLabel: "Kosmetolog" },
        url: "u",
      }),
    ).toMatchObject({
      "@type": "Person",
      jobTitle: "Kosmetolog",
      worksFor: { "@id": `${ORIGIN}/#clinic` },
    });
  });

  it("describes a service with its price range", () => {
    expect(
      serviceLd({
        origin: ORIGIN,
        url: "u",
        service: {
          id: 1,
          name: "Konsultatsiya",
          shortName: "K",
          description: "",
          category: "dermatology",
          categoryLabel: "Dermatologiya",
          durationMin: 30,
          priceFrom: 120000,
          priceTo: 150000,
          specialistIds: [1],
        },
      }),
    ).toMatchObject({
      "@type": "Service",
      provider: { "@id": `${ORIGIN}/#clinic` },
      offers: { priceSpecification: { minPrice: 120000, maxPrice: 150000, priceCurrency: "UZS" } },
    });
  });
});
