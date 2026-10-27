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

/** The API's `invalid` message for a slug (§2.3, §2.17). */
export const SLUG_INVALID_MESSAGE =
  "Faqat lotin kichik harflari, raqamlar va chiziqcha (faqat raqam emas).";

/** Why `slug` is refused, or `null` when it is a valid website slug of at most `max` characters. */
export function slugProblem(slug: string, max: number): string | null {
  if (slug.length > max) return `${max} belgidan oshmasin.`;
  if (!SLUG_PATTERN.test(slug) || /^\d+$/.test(slug)) return SLUG_INVALID_MESSAGE;
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

export const SEO_SEVERITY_LABEL: Record<SeoSeverity, string> = {
  error: "Xatolar",
  warning: "Ogohlantirishlar",
  info: "Maslahatlar",
};

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

/* The checklist computed the way the server does (`catalog.seo`), for the
   demo data only: the API sends `seo_status` with every product and category. */

const LANGUAGE_NAMES: Record<ContentLanguage, string> = {
  uz: "o‘zbekcha",
  ru: "ruscha",
  en: "inglizcha",
};
const SEVERITY_ORDER: Record<SeoSeverity, number> = { error: 0, warning: 1, info: 2 };
const DESCRIPTION_MIN = 80;

const issue = (
  code: SeoIssueCode,
  severity: SeoSeverity,
  message: string,
  language: ContentLanguage | null = null,
): SeoIssue => ({ code, severity, language, message });

function metaIssues(seo: SeoTexts): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const language of LANGUAGES) {
    const label = LANGUAGE_NAMES[language];
    const title = seo[language].title.trim();
    const description = seo[language].description.trim();
    if (!title) {
      issues.push(
        issue(
          "seo_title_missing",
          "info",
          `SEO sarlavha (${label}) yo‘q: sayt nomdan foydalanadi.`,
          language,
        ),
      );
    } else if (title.length < SEO_TITLE_IDEAL.min) {
      issues.push(
        issue(
          "seo_title_short",
          "warning",
          `SEO sarlavha (${label}) juda qisqa: kamida ${SEO_TITLE_IDEAL.min} belgi yozing.`,
          language,
        ),
      );
    } else if (title.length > SEO_TITLE_IDEAL.max) {
      issues.push(
        issue(
          "seo_title_long",
          "warning",
          `SEO sarlavha (${label}) ${SEO_TITLE_IDEAL.max} belgidan uzun: qidiruvda kesiladi.`,
          language,
        ),
      );
    }
    if (!description) {
      issues.push(
        issue(
          "seo_description_missing",
          "info",
          `SEO tavsif (${label}) yo‘q: sayt uni tavsifdan yasaydi.`,
          language,
        ),
      );
    } else if (description.length < SEO_DESCRIPTION_IDEAL.min) {
      issues.push(
        issue(
          "seo_description_short",
          "warning",
          `SEO tavsif (${label}) juda qisqa: kamida ${SEO_DESCRIPTION_IDEAL.min} belgi yozing.`,
          language,
        ),
      );
    } else if (description.length > SEO_DESCRIPTION_IDEAL.max) {
      issues.push(
        issue(
          "seo_description_long",
          "warning",
          `SEO tavsif (${label}) ${SEO_DESCRIPTION_IDEAL.max} belgidan uzun: qidiruvda kesiladi.`,
          language,
        ),
      );
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

/** The product checklist (§2.3 «SEO holati»), as the server computes it. */
export function productSeoStatus(product: ProductSeoInput): SeoStatus {
  const issues: SeoIssue[] = [];
  const nameUz = product.texts.uz.name.trim();
  if (!nameUz) {
    issues.push(
      issue("name_missing", "error", "O‘zbekcha nom yo‘q: sahifa Billz nomi bilan chiqadi.", "uz"),
    );
  }
  for (const language of ["ru", "en"] as const) {
    if (!product.texts[language].name.trim()) {
      issues.push(
        issue(
          "name_translation_missing",
          "warning",
          `Nomning ${LANGUAGE_NAMES[language]} tarjimasi yo‘q.`,
          language,
        ),
      );
    }
  }
  for (const language of LANGUAGES) {
    const description = product.texts[language].description.trim();
    const label = LANGUAGE_NAMES[language];
    if (!description) {
      issues.push(
        issue(
          "description_missing",
          language === "uz" ? "error" : "warning",
          `Tavsif (${label}) yo‘q.`,
          language,
        ),
      );
    } else if (description.length < DESCRIPTION_MIN) {
      issues.push(
        issue(
          "description_short",
          "warning",
          `Tavsif (${label}) juda qisqa: kamida ${DESCRIPTION_MIN} belgi yozing.`,
          language,
        ),
      );
    }
  }
  if (product.imageCount === 0) {
    issues.push(issue("images_missing", "error", "Mahsulotda rasm yo‘q."));
  } else if (!nameUz) {
    issues.push(
      issue(
        "alt_text_fallback",
        "warning",
        "Rasmlarning alt matni mahsulot nomidan olinadi: o‘zbekcha nomni kiriting.",
        "uz",
      ),
    );
  }
  if (!product.category) {
    issues.push(
      issue(
        "category_missing",
        "warning",
        "Kategoriya tanlanmagan: sahifa katalog yo‘lida ko‘rinmaydi.",
      ),
    );
  }
  return toStatus([...issues, ...metaIssues(product.seo)]);
}

export interface CategorySeoInput {
  name: Record<ContentLanguage, string>;
  hasImage: boolean;
  activeProducts: number;
  seo: SeoTexts;
}

/** The category checklist (§2.4 «SEO holati»), as the server computes it. */
export function categorySeoStatus(category: CategorySeoInput): SeoStatus {
  const issues: SeoIssue[] = [];
  for (const language of ["ru", "en"] as const) {
    if (!category.name[language].trim()) {
      issues.push(
        issue(
          "name_translation_missing",
          "warning",
          `Nomning ${LANGUAGE_NAMES[language]} tarjimasi yo‘q.`,
          language,
        ),
      );
    }
  }
  if (!category.hasImage) {
    issues.push(
      issue(
        "image_missing",
        "warning",
        "Kategoriya rasmi yo‘q: ijtimoiy tarmoqlarda umumiy rasm chiqadi.",
      ),
    );
  }
  if (category.activeProducts === 0) {
    issues.push(
      issue(
        "no_active_products",
        "warning",
        "Kategoriyada faol mahsulot yo‘q: sahifa bo‘sh ko‘rinadi.",
      ),
    );
  }
  return toStatus([...issues, ...metaIssues(category.seo)]);
}
