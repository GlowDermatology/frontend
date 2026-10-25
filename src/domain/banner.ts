import type { ContentLanguage } from "./product";

/**
 * Home-screen banners (contract §2.5). Ordered by `position`; each one links
 * to nothing, a product or a category and may be limited to a time window.
 */

export const BANNER_LINK_KINDS = ["none", "product", "category"] as const;
export type BannerLinkKind = (typeof BANNER_LINK_KINDS)[number];

export interface BannerLink {
  kind: BannerLinkKind;
  /** Product id (string, as every FE id) when `kind` is `product`. */
  productId: string | null;
  /** Category slug when `kind` is `category`. */
  category: string | null;
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

export const BANNER_LINK_LABEL: Record<BannerLinkKind, string> = {
  none: "Havolasiz",
  product: "Mahsulot",
  category: "Kategoriya",
};

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
