import { siteConfig } from "@/config/site";
import type { ContentLanguage } from "@/domain/product";
import {
  lengthState,
  SEO_DESCRIPTION_IDEAL,
  SEO_TITLE_IDEAL,
  type LengthState,
  type SeoText,
} from "@/domain/seo";
import { getShopDictionary } from "@/features/shop/content";
import { clampDescription, pageTitle } from "@/features/shop/seo/metadata";
import { formatPrice } from "@/lib/format";
import { shopPath, type PublicRoute } from "@/features/shop/routing/routes";

/**
 * What the admin's SEO preview shows (pure; unit-tested): the website's
 * public URL of a product, category or specialist, and a search-result
 * snippet built the way the storefront builds its `<title>` and meta
 * description (`features/shop/seo`): the SEO text when filled, else the
 * page's own fallback.
 */

export type PublicEntity = Extract<PublicRoute, { slug: string }>["kind"];

/** `/mahsulotlar/{slug}` (uz), `/ru/products/{slug}` … — the storefront's own route table. */
export function publicPath(kind: PublicEntity, slug: string, language: ContentLanguage = "uz") {
  return shopPath(language, { kind, slug } as PublicRoute);
}

/** The site's host without the scheme, for display ("glowderma.uz"). */
export function siteHost(url: string = siteConfig.url): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** The full public URL as text (`glowderma.uz/mahsulotlar/serum`). */
export function publicUrlLabel(
  kind: PublicEntity,
  slug: string,
  language: ContentLanguage = "uz",
  url?: string,
): string {
  return `${siteHost(url)}${publicPath(kind, slug, language)}`;
}

export interface SnippetInput {
  seo: SeoText;
  /** What the website uses when the SEO title is empty (the name, "Serum, 30 ml"). */
  fallbackTitle: string;
  /** What the website uses when the SEO description is empty (the description). */
  fallbackDescription: string;
}

export interface Snippet {
  title: string;
  description: string;
  /** Whether each part is the admin's SEO text or the website's fallback. */
  titleSource: "seo" | "fallback";
  descriptionSource: "seo" | "fallback" | "none";
}

/** Search engines cut a title at about 60 characters. */
const SNIPPET_TITLE_MAX = SEO_TITLE_IDEAL.max;

export function buildSnippet(input: SnippetInput): Snippet {
  const seoTitle = input.seo.title.trim();
  const seoDescription = input.seo.description.trim();
  const fullTitle = pageTitle(seoTitle || input.fallbackTitle.trim() || "Glow Derma");
  const description = clampDescription(seoDescription || input.fallbackDescription);
  return {
    title:
      fullTitle.length > SNIPPET_TITLE_MAX
        ? `${fullTitle.slice(0, SNIPPET_TITLE_MAX - 1).trimEnd()}…`
        : fullTitle,
    description,
    titleSource: seoTitle ? "seo" : "fallback",
    descriptionSource: seoDescription ? "seo" : description ? "fallback" : "none",
  };
}

export interface CounterInfo {
  count: number;
  max: number;
  state: LengthState;
  /** "Ideal: 15–60" or the state in words. */
  note: string;
}

const STATE_NOTE: Record<LengthState, string> = {
  empty: "Bo‘sh — sayt o‘zi yasaydi",
  short: "Juda qisqa",
  ideal: "Ideal uzunlik",
  long: "Qidiruvda kesiladi",
};

/** The character counter of an SEO field (`kind` picks the ideal bounds). */
export function seoCounter(value: string, kind: "title" | "description", max: number): CounterInfo {
  const count = value.trim().length;
  const ideal = kind === "title" ? SEO_TITLE_IDEAL : SEO_DESCRIPTION_IDEAL;
  const state = count > max ? "long" : lengthState(count, ideal);
  return { count, max, state, note: STATE_NOTE[state] };
}

/** "Ideal: 15–60 belgi" under each field. */
export function idealHint(kind: "title" | "description"): string {
  const ideal = kind === "title" ? SEO_TITLE_IDEAL : SEO_DESCRIPTION_IDEAL;
  return `Ideal: ${ideal.min}–${ideal.max} belgi.`;
}

/* --- The website's own fallbacks (`features/shop/seo/describe.ts`) --- */

export interface PageFallback {
  title: string;
  description: string;
}

/**
 * A product page's title and description when its SEO fields are empty:
 * "Name, 30 ml"; the description when it says enough (≥ 50 characters),
 * else the sentence built from name, volume, category and price.
 */
export function productFallback(
  language: ContentLanguage,
  product: {
    name: string;
    volume: string;
    description: string;
    categoryName: string | null;
    price: number;
  },
): PageFallback {
  const title =
    product.volume && product.name ? `${product.name}, ${product.volume}` : product.name;
  if (product.description.replace(/\s+/g, "").length >= 50) {
    return { title, description: product.description };
  }
  if (!product.name) return { title, description: "" };
  return {
    title,
    description: getShopDictionary(language).meta.productDescription({
      name: product.name,
      volume: product.volume,
      category: product.categoryName,
      price: formatPrice(Number.isFinite(product.price) ? product.price : 0, language),
    }),
  };
}

/** A category page's title and description when its SEO fields are empty. */
export function categoryFallback(
  language: ContentLanguage,
  category: { name: string; productCount: number },
): PageFallback {
  if (!category.name) return { title: "", description: "" };
  const meta = getShopDictionary(language).meta;
  return {
    title: meta.categoryTitle(category.name),
    description: meta.categoryDescription(category.name, category.productCount),
  };
}
