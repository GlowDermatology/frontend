import { isFilled, recommendedToAsk, textChanged } from "@/lib/forms/recommended-rules";
import type { Locale } from "@/lib/i18n/locales";

import { catalogDataCopy } from "./copy/catalog";
import type { ContentLanguage } from "./product";

/**
 * Home-screen banners (contract §2.5). Ordered by `position`; each one links
 * to nothing, a product, a category or an `https` page (gap X-BANNER-URL)
 * and may be limited to a time window.
 */

export const BANNER_LINK_KINDS = ["none", "product", "category", "url"] as const;
export type BannerLinkKind = (typeof BANNER_LINK_KINDS)[number];

export interface BannerLink {
  kind: BannerLinkKind;
  /** Product id (string, as every FE id) when `kind` is `product`. */
  productId: string | null;
  /** Category slug when `kind` is `category`. */
  category: string | null;
  /** Absolute `https` URL when `kind` is `url` (opened in the app). */
  url: string | null;
}

export interface Banner {
  id: string;
  title: Record<ContentLanguage, string>;
  imageUrl: string;
  link: BannerLink;
  isActive: boolean;
  /** ISO datetimes with offset, or `null` for an open end. */
  startsAt: string | null;
  endsAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** The link kinds' labels in the admin language (`catalogDataCopy.*.linkKind`). */
export function bannerLinkKindLabel(kind: BannerLinkKind, locale: Locale = "uz"): string {
  return catalogDataCopy[locale].linkKind[kind];
}

/** @deprecated Uzbek only: use `bannerLinkKindLabel(kind, locale)`. */
export const BANNER_LINK_LABEL: Record<BannerLinkKind, string> = catalogDataCopy.uz.linkKind;

/**
 * Where a banner leads, in words: «Mahsulot #12», «Kategoriya: Serumlar», the URL itself, or
 * «Havolasiz». `categoryName` names the slug (the list's label; the slug when unknown).
 */
export function bannerLinkText(
  link: BannerLink,
  locale: Locale = "uz",
  categoryName: (slug: string) => string = (slug) => slug,
): string {
  const t = catalogDataCopy[locale];
  if (link.kind === "product") return t.linkProduct(link.productId ?? "");
  if (link.kind === "category") return t.linkCategory(categoryName(link.category ?? ""));
  if (link.kind === "url") return link.url ?? t.linkKind.url;
  return t.linkKind.none;
}

/**
 * Fields the dialog recommends but does not require: the Russian and English titles (the app
 * shows the Uzbek one in their place).
 */
export type BannerRecommendedField = "title.ru" | "title.en";

export function bannerRecommendedMissing(values: {
  title: Record<ContentLanguage, string>;
}): BannerRecommendedField[] {
  const missing: BannerRecommendedField[] = [];
  if (!values.title.ru.trim()) missing.push("title.ru");
  if (!values.title.en.trim()) missing.push("title.en");
  return missing;
}

/**
 * The empty titles worth asking about on this save (`recommendedToAsk`): an inactive banner
 * never asks; a new one, or the save that activates it, asks about both; else only a title the
 * admin just emptied, or both empty ones when the Uzbek title changed. `saved` = the stored
 * banner (`null` = create).
 */
export function bannerRecommendedToAsk(
  values: { title: Record<ContentLanguage, string>; isActive: boolean },
  saved: { title: Record<ContentLanguage, string>; isActive: boolean } | null,
): BannerRecommendedField[] {
  return recommendedToAsk(bannerRecommendedMissing(values), {
    isNew: saved === null,
    active: values.isActive,
    wasActive: saved?.isActive,
    filledBefore: (field) => isFilled(field === "title.ru" ? saved?.title.ru : saved?.title.en),
    sourceChanged: () => textChanged(saved?.title.uz, values.title.uz),
  });
}

/**
 * What the app shows for this banner right now: `inactive` wins over the
 * window; `scheduled` before `startsAt`; `ended` after `endsAt`; else `live`.
 */
export type BannerScheduleState = "inactive" | "scheduled" | "live" | "ended";

export function bannerScheduleState(
  banner: Pick<Banner, "isActive" | "startsAt" | "endsAt">,
  now: Date,
): BannerScheduleState {
  if (!banner.isActive) return "inactive";
  const at = now.getTime();
  if (banner.startsAt && Date.parse(banner.startsAt) > at) return "scheduled";
  if (banner.endsAt && Date.parse(banner.endsAt) <= at) return "ended";
  return "live";
}

/** `ends_at` must be after `starts_at` (contract §2.5, `invalid`). */
export function isValidBannerWindow(startsAt: string | null, endsAt: string | null): boolean {
  if (!startsAt || !endsAt) return true;
  return Date.parse(endsAt) > Date.parse(startsAt);
}
