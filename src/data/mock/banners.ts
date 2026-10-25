import type { Banner } from "@/domain/banner";

/**
 * Mock banners: two rows so the Bannerlar section has something to show —
 * one permanent category banner and one scheduled product banner (the
 * retinol night serum, product 6 of the design's catalog). The images are
 * static files under `public/mock/`.
 */
export const BANNERS: ReadonlyArray<Banner> = [
  {
    id: "1",
    title: { uz: "Kuzgi chegirmalar", ru: "Осенние скидки", en: "Autumn sale" },
    imageUrl: "/mock/banner-autumn.png",
    link: { kind: "category", productId: null, category: "serums" },
    isActive: true,
    startsAt: null,
    endsAt: null,
    position: 0,
    createdAt: "2026-10-01T10:00:00+05:00",
    updatedAt: "2026-10-01T10:00:00+05:00",
  },
  {
    id: "2",
    title: { uz: "Yangi: retinolli tungi serum", ru: "Новинка: ночная сыворотка", en: "" },
    imageUrl: "/mock/banner-night.png",
    link: { kind: "product", productId: "6", category: null },
    isActive: true,
    startsAt: "2026-10-20T00:00:00+05:00",
    endsAt: "2026-11-20T00:00:00+05:00",
    position: 1,
    createdAt: "2026-10-18T15:30:00+05:00",
    updatedAt: "2026-10-18T15:30:00+05:00",
  },
];
