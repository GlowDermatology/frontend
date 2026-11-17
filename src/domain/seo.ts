import type { Locale } from "@/lib/i18n/locales";

import { catalogDataCopy } from "./copy/catalog";
import type { ContentLanguage } from "./product";

/**
 * Website SEO of the catalog (B-W1, admin contract §2.3, §2.4, §2.17):
 * URL slugs, the per-language page title / meta description and the
 * server's «SEO holati» checklist. Pure and framework-free; unit-tested.
 */

const LANGUAGES: ReadonlyArray<ContentLanguage> = ["uz", "ru", "en"];

/* --- Slugs --- */

/** `^[a-z0-9]+(-[a-z0-9]+)*$` (products and specialists; categories keep their own 2–40 rule). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PRODUCT_SLUG_MAX = 140;
export const SPECIALIST_SLUG_MAX = 160;

/** The API's `invalid` message for a slug (§2.3, §2.17), in Uzbek (the backend's source text). */
export const SLUG_INVALID_MESSAGE = catalogDataCopy.uz.slugInvalid;

/**
 * Why `slug` is refused (in `locale`), or `null` when it is a valid website slug of at most
 * `max` characters.
 */
export function slugProblem(slug: string, max: number, locale: Locale = "uz"): string | null {
  const t = catalogDataCopy[locale];
  if (slug.length > max) return t.maxChars(max);
  if (!SLUG_PATTERN.test(slug) || /^\d+$/.test(slug)) return t.slugInvalid;
  return null;
}

const APOSTROPHES = /['`´ʻʼʹʽ‘’‛′]/g;
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h", і: "i", ї: "yi", є: "ye",
}; // prettier-ignore

/**
 * The slug the server derives from a name (the backend's `slugify_uz`):
 * Uzbek apostrophes dropped (`Ko‘pikli` → `kopikli`), Uzbek and Russian
 * Cyrillic transliterated, accents folded, cut at a word boundary to `max`.
 * `""` when nothing usable remains.
 */
export function slugifyName(text: string, max = PRODUCT_SLUG_MAX): string {
  const latin = [...text.toLowerCase().replace(APOSTROPHES, "")]
    .map((char) => CYRILLIC[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  let slug = latin.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > max) {
    const cut = slug.slice(0, max);
    slug = cut.includes("-") ? cut.slice(0, cut.lastIndexOf("-")) : cut;
  }
  return slug.replace(/^-+|-+$/g, "");
}

/* --- Page title and meta description --- */

export interface SeoText {
  title: string;
  description: string;
}
export type SeoTexts = Record<ContentLanguage, SeoText>;

export const SEO_TITLE_MAX = 120;
export const SEO_DESCRIPTION_MAX = 300;
/** What search engines show in full (the checklist's warning bounds). */
export const SEO_TITLE_IDEAL = { min: 15, max: 60 } as const;
export const SEO_DESCRIPTION_IDEAL = { min: 50, max: 160 } as const;

export function emptySeo(): SeoTexts {
  return {
    uz: { title: "", description: "" },
    ru: { title: "", description: "" },
    en: { title: "", description: "" },
  };
}

/** A partial `seo` from the API → every language and leaf present (`""` = the website builds one). */
export function fillSeo(
  seo: Partial<Record<ContentLanguage, Partial<SeoText> | undefined>> | null | undefined,
): SeoTexts {
  const out = emptySeo();
  for (const language of LANGUAGES) {
    out[language] = {
      title: seo?.[language]?.title ?? "",
      description: seo?.[language]?.description ?? "",
    };
  }
  return out;
}

export type LengthState = "empty" | "short" | "ideal" | "long";

/** Where a trimmed length sits against the ideal bounds (the counters' colour and hint). */
export function lengthState(length: number, ideal: { min: number; max: number }): LengthState {
  if (length === 0) return "empty";
  if (length < ideal.min) return "short";
  if (length > ideal.max) return "long";
  return "ideal";
}

/** The changed leaves (`{ru: {title: "…"}}`); `undefined` when nothing changed. */
export function seoPatch(
  before: SeoTexts | null,
  after: SeoTexts,
): Partial<Record<ContentLanguage, Partial<SeoText>>> | undefined {
  const out: Partial<Record<ContentLanguage, Partial<SeoText>>> = {};
  for (const language of LANGUAGES) {
    for (const leaf of ["title", "description"] as const) {
      const value = after[language][leaf];
      if (before && before[language][leaf] === value) continue;
      (out[language] ??= {})[leaf] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Whether a language has both its title and description filled (the tab dot). */
export function isSeoComplete(text: SeoText): boolean {
  return text.title.trim().length > 0 && text.description.trim().length > 0;
}

/* --- «SEO holati» --- */

export type SeoSeverity = "error" | "warning" | "info";
export type SeoIssueCode =
  | "name_missing"
  | "name_translation_missing"
  | "description_missing"
  | "description_short"
  | "images_missing"
  | "alt_text_fallback"
  | "category_missing"
  | "seo_title_missing"
  | "seo_title_short"
  | "seo_title_long"
  | "seo_description_missing"
  | "seo_description_short"
  | "seo_description_long"
  | "image_missing"
  | "no_active_products";

export interface SeoIssue {
  code: SeoIssueCode;
  severity: SeoSeverity;
  /** The language the issue is about; `null` when it concerns the whole page. */
  language: ContentLanguage | null;
  message: string;
}

export interface SeoStatus {
  /** No error and no warning (hints may remain). */
  ok: boolean;
  /** Errors first, then warnings, then hints. */
  issues: SeoIssue[];
}

export const SEO_SEVERITIES: ReadonlyArray<SeoSeverity> = ["error", "warning", "info"];

/** @deprecated Uzbek only: use `seoSeverityLabel(severity, locale)`. */
export const SEO_SEVERITY_LABEL: Record<SeoSeverity, string> = catalogDataCopy.uz.seo.severity;

export function seoSeverityLabel(severity: SeoSeverity, locale: Locale = "uz"): string {
  return catalogDataCopy[locale].seo.severity[severity];
}

export const SEO_LANGUAGE_CHIP: Record<ContentLanguage, string> = { uz: "UZ", ru: "RU", en: "EN" };

/** The issues grouped by severity, in the panel's order; empty groups are left out. */
export function groupSeoIssues(
  issues: ReadonlyArray<SeoIssue>,
): Array<{ severity: SeoSeverity; issues: SeoIssue[] }> {
  return SEO_SEVERITIES.map((severity) => ({
    severity,
    issues: issues.filter((issue) => issue.severity === severity),
  })).filter((group) => group.issues.length > 0);
}

/**
 * The text of a checklist issue in `locale`, from its `code` and `language` (DESIGN §G: the
 * checklist is rendered from the code, so it follows the admin language whatever language the
 * server wrote `message` in). An unknown code keeps the server's `message`.
 */
export function seoIssueText(
  issue: Pick<SeoIssue, "code" | "language" | "message">,
  locale: Locale = "uz",
): string {
  const t = catalogDataCopy[locale].seo;
  const lang = t.language[issue.language ?? "uz"];
  switch (issue.code) {
    case "seo_title_missing":
      return t.titleMissing(lang);
    case "seo_title_short":
      return t.titleShort(lang, SEO_TITLE_IDEAL.min);
    case "seo_title_long":
      return t.titleLong(lang, SEO_TITLE_IDEAL.max);
    case "seo_description_missing":
      return t.descriptionMissing(lang);
    case "seo_description_short":
      return t.descriptionShort(lang, SEO_DESCRIPTION_IDEAL.min);
    case "seo_description_long":
      return t.descriptionLong(lang, SEO_DESCRIPTION_IDEAL.max);
    case "name_missing":
      return t.nameMissing;
    case "name_translation_missing":
      return t.nameTranslationMissing(lang);
    case "description_missing":
      return t.productDescriptionMissing(lang);
    case "description_short":
      return t.productDescriptionShort(lang, DESCRIPTION_MIN);
    case "images_missing":
      return t.imagesMissing;
    case "alt_text_fallback":
      return t.altTextFallback;
    case "category_missing":
      return t.categoryMissing;
    case "image_missing":
      return t.imageMissing;
    case "no_active_products":
      return t.noActiveProducts;
    default:
      return issue.message;
  }
}

/** The checklist with every issue worded in `locale` (from its code; see `seoIssueText`). */
export function localizeSeoStatus(status: SeoStatus, locale: Locale): SeoStatus {
  return {
    ok: status.ok,
    issues: status.issues.map((issue) => ({ ...issue, message: seoIssueText(issue, locale) })),
  };
}

/* The checklist computed the way the server does (`catalog.seo`), for the
   demo data only: the API sends `seo_status` with every product and category. */

const SEVERITY_ORDER: Record<SeoSeverity, number> = { error: 0, warning: 1, info: 2 };
const DESCRIPTION_MIN = 80;

function issueFactory(locale: Locale) {
  return (
    code: SeoIssueCode,
    severity: SeoSeverity,
    language: ContentLanguage | null = null,
  ): SeoIssue => ({
    code,
    severity,
    language,
    message: seoIssueText({ code, language, message: "" }, locale),
  });
}

function metaIssues(seo: SeoTexts, locale: Locale): SeoIssue[] {
  const issue = issueFactory(locale);
  const issues: SeoIssue[] = [];
  for (const language of LANGUAGES) {
    const title = seo[language].title.trim();
    const description = seo[language].description.trim();
    if (!title) {
      issues.push(issue("seo_title_missing", "info", language));
    } else if (title.length < SEO_TITLE_IDEAL.min) {
      issues.push(issue("seo_title_short", "warning", language));
    } else if (title.length > SEO_TITLE_IDEAL.max) {
      issues.push(issue("seo_title_long", "warning", language));
    }
    if (!description) {
      issues.push(issue("seo_description_missing", "info", language));
    } else if (description.length < SEO_DESCRIPTION_IDEAL.min) {
      issues.push(issue("seo_description_short", "warning", language));
    } else if (description.length > SEO_DESCRIPTION_IDEAL.max) {
      issues.push(issue("seo_description_long", "warning", language));
    }
  }
  return issues;
}

function toStatus(issues: SeoIssue[]): SeoStatus {
  const sorted = [...issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  return { ok: !sorted.some((item) => item.severity !== "info"), issues: sorted };
}

export interface ProductSeoInput {
  texts: Record<ContentLanguage, { name: string; description: string }>;
  imageCount: number;
  category: string | null;
  seo: SeoTexts;
}

/** The product checklist (§2.3 «SEO holati»), as the server computes it; messages in `locale`. */
export function productSeoStatus(product: ProductSeoInput, locale: Locale = "uz"): SeoStatus {
  const issue = issueFactory(locale);
  const issues: SeoIssue[] = [];
  const nameUz = product.texts.uz.name.trim();
  if (!nameUz) issues.push(issue("name_missing", "error", "uz"));
  for (const language of ["ru", "en"] as const) {
    if (!product.texts[language].name.trim()) {
      issues.push(issue("name_translation_missing", "warning", language));
    }
  }
  for (const language of LANGUAGES) {
    const description = product.texts[language].description.trim();
    if (!description) {
      issues.push(issue("description_missing", language === "uz" ? "error" : "warning", language));
    } else if (description.length < DESCRIPTION_MIN) {
      issues.push(issue("description_short", "warning", language));
    }
  }
  if (product.imageCount === 0) {
    issues.push(issue("images_missing", "error"));
  } else if (!nameUz) {
    issues.push(issue("alt_text_fallback", "warning", "uz"));
  }
  if (!product.category) issues.push(issue("category_missing", "warning"));
  return toStatus([...issues, ...metaIssues(product.seo, locale)]);
}

export interface CategorySeoInput {
  name: Record<ContentLanguage, string>;
  hasImage: boolean;
  activeProducts: number;
  seo: SeoTexts;
}

/** The category checklist (§2.4 «SEO holati»), as the server computes it; messages in `locale`. */
export function categorySeoStatus(category: CategorySeoInput, locale: Locale = "uz"): SeoStatus {
  const issue = issueFactory(locale);
  const issues: SeoIssue[] = [];
  for (const language of ["ru", "en"] as const) {
    if (!category.name[language].trim()) {
      issues.push(issue("name_translation_missing", "warning", language));
    }
  }
  if (!category.hasImage) issues.push(issue("image_missing", "warning"));
  if (category.activeProducts === 0) issues.push(issue("no_active_products", "warning"));
  return toStatus([...issues, ...metaIssues(category.seo, locale)]);
}
