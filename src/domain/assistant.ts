import type { JobState } from "./job";
import {
  ALT_MAX_LENGTH,
  CONTENT_LANGUAGES,
  PRODUCT_TEXT_FIELDS,
  TEXT_MAX_LENGTH,
  type ContentLanguage,
  type Product,
  type ProductTextField,
} from "./product";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "./seo";

/**
 * The AI product content assistant (admin contract §2.19). A job is started for one product,
 * polled like the Billz job (`state`), and its suggestions are reviewed by a person before the
 * chosen ones are applied: nothing reaches the product without «Qo‘llash».
 *
 * Every target is a snapshot key: `texts.<lang>.<name|short_description|description|ingredients|
 * usage>`, `seo.<lang>.<title|description>`, `images.<image_id>.alt.<lang>`.
 */

/** The modes an admin can start (`test` is the ops console's). */
export const ASSISTANT_MODES = ["fill_missing", "languages", "improve", "photos"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export const IMPROVE_GOALS = ["professional", "clear", "natural", "seo", "shorter"] as const;
export type ImproveGoal = (typeof IMPROVE_GOALS)[number];

export type AssistantOutcome = "pending" | "applied" | "partial" | "discarded";

/** Suggestion badges (`AssistantSuggestion.warnings`). */
export const SUGGESTION_WARNINGS = [
  "unsupported_claim",
  "inci_mismatch",
  "confirm_packaging",
  "seo_title_long",
  "seo_description_long",
] as const;
export type SuggestionWarning = (typeof SUGGESTION_WARNINGS)[number];

export interface AssistantSuggestion {
  key: string;
  /** The product's value when the job was started (`""` = empty). */
  current: string;
  suggested: string;
  /** Known codes only (unknown ones are dropped by the mapper). */
  warnings: SuggestionWarning[];
  /** `image`: read from the product photos (confirm against the packaging). */
  origin: "ai" | "image";
  /** Pre-selected in the review. */
  checked: boolean;
  maxLength: number;
}

/** Job-level notes (`result.warnings`): rejected keys, a dropped count, label info from photos. */
export interface AssistantJobNotes {
  rejected: number;
  dropped: number;
  extracted: { brand?: string; volume?: string } | null;
}

export interface AssistantJob {
  id: string;
  productId: string | null;
  mode: AssistantMode | "test";
  languages: ContentLanguage[];
  keys: string[];
  state: JobState;
  outcome: AssistantOutcome;
  result: { suggestions: AssistantSuggestion[]; notes: AssistantJobNotes } | null;
  /** Failed jobs: the message is already in the admin language. */
  error: { code: string; message: string } | null;
  appliedKeys: string[];
  createdAt: string;
  finishedAt: string | null;
}

export interface AssistantStatus {
  enabled: boolean;
  maxImages: number;
}

export interface AssistantStartInput {
  mode: AssistantMode;
  languages: ContentLanguage[];
  /** The «Batafsil» field picker; required (non-empty) for `improve`. */
  keys: string[];
  goal: ImproveGoal;
  imageIds: string[];
}

/** `POST products/{id}/assistant/jobs/`: a job (new or the active one), or nothing to fill. */
export type AssistantStart =
  { nothingToFill: true; job: null } | { nothingToFill: false; job: AssistantJob };

export interface AssistantApplyItem {
  key: string;
  value: string;
}

export interface AssistantApplyResult {
  job: AssistantJob;
  applied: string[];
  /** Changed meanwhile: not written. */
  conflicts: string[];
  /** The product after the apply (§2.3 shape). */
  product: Product;
}

/* --- Keys --- */

const API_FIELD: Record<ProductTextField, string> = {
  name: "name",
  shortDescription: "short_description",
  description: "description",
  ingredients: "ingredients",
  usage: "usage",
};
const FIELD_OF_API = Object.fromEntries(
  Object.entries(API_FIELD).map(([field, api]) => [api, field as ProductTextField]),
) as Record<string, ProductTextField>;

export type ParsedKey =
  | { kind: "text"; language: ContentLanguage; field: ProductTextField }
  | { kind: "seo"; language: ContentLanguage; field: "title" | "description" }
  | { kind: "alt"; language: ContentLanguage; imageId: string };

const isLanguage = (value: string | undefined): value is ContentLanguage =>
  (CONTENT_LANGUAGES as ReadonlyArray<string | undefined>).includes(value);

/** `texts.ru.short_description` → `{kind: "text", language: "ru", field: "shortDescription"}`. */
export function parseKey(key: string): ParsedKey | null {
  const parts = key.split(".");
  if (parts[0] === "texts" && parts.length === 3 && isLanguage(parts[1])) {
    const field = FIELD_OF_API[parts[2]!];
    return field ? { kind: "text", language: parts[1], field } : null;
  }
  if (parts[0] === "seo" && parts.length === 3 && isLanguage(parts[1])) {
    const field = parts[2];
    return field === "title" || field === "description"
      ? { kind: "seo", language: parts[1], field }
      : null;
  }
  if (parts[0] === "images" && parts.length === 4 && parts[2] === "alt" && isLanguage(parts[3])) {
    return parts[1] ? { kind: "alt", language: parts[3], imageId: parts[1] } : null;
  }
  return null;
}

export function keyOf(parsed: ParsedKey): string {
  switch (parsed.kind) {
    case "text":
      return `texts.${parsed.language}.${API_FIELD[parsed.field]}`;
    case "seo":
      return `seo.${parsed.language}.${parsed.field}`;
    case "alt":
      return `images.${parsed.imageId}.alt.${parsed.language}`;
  }
}

export function keyLanguage(key: string): ContentLanguage | null {
  return parseKey(key)?.language ?? null;
}

/** The API limit of a key's value. */
export function keyMaxLength(parsed: ParsedKey): number {
  if (parsed.kind === "text") return TEXT_MAX_LENGTH[parsed.field];
  if (parsed.kind === "seo") return parsed.field === "title" ? SEO_TITLE_MAX : SEO_DESCRIPTION_MAX;
  return ALT_MAX_LENGTH;
}

/** The product's value of a key; `null` when the key names nothing (an image that is gone). */
export function keyValue(
  product: Pick<Product, "texts" | "seo" | "images">,
  key: string,
): string | null {
  const parsed = parseKey(key);
  if (!parsed) return null;
  if (parsed.kind === "text") return product.texts[parsed.language][parsed.field];
  if (parsed.kind === "seo") return product.seo[parsed.language][parsed.field];
  const image = product.images.find((candidate) => candidate.id === parsed.imageId);
  return image ? (image.alt?.[parsed.language] ?? "") : null;
}

/**
 * The editor form path of a key: texts and SEO keep theirs (`texts.ru.shortDescription`), an alt
 * text points at the photo's place (`images.2.alt.uz`); `null` when the photo is not in the form.
 */
export function formPathOf(key: string, images: ReadonlyArray<{ id: string }>): string | null {
  const parsed = parseKey(key);
  if (!parsed) return null;
  if (parsed.kind === "text") return `texts.${parsed.language}.${parsed.field}`;
  if (parsed.kind === "seo") return key;
  const index = images.findIndex((image) => image.id === parsed.imageId);
  return index === -1 ? null : `images.${index}.alt.${parsed.language}`;
}

/** Every key of the product in the given languages, in the editor's order (texts, SEO, photos). */
export function productKeys(
  product: Pick<Product, "images">,
  languages: ReadonlyArray<ContentLanguage> = CONTENT_LANGUAGES,
): string[] {
  const keys: string[] = [];
  const wanted = CONTENT_LANGUAGES.filter((language) => languages.includes(language));
  for (const language of wanted) {
    for (const field of PRODUCT_TEXT_FIELDS) keys.push(keyOf({ kind: "text", language, field }));
  }
  for (const language of wanted) {
    keys.push(`seo.${language}.title`, `seo.${language}.description`);
  }
  for (const image of product.images) {
    for (const language of wanted) keys.push(keyOf({ kind: "alt", language, imageId: image.id }));
  }
  return keys;
}

/**
 * The keys the «Batafsil» picker offers: `improve` works on filled ones, every other mode on
 * empty ones (it never overwrites).
 */
export function candidateKeys(
  product: Pick<Product, "texts" | "seo" | "images">,
  mode: AssistantMode,
  languages: ReadonlyArray<ContentLanguage>,
): string[] {
  return productKeys(product, languages).filter((key) => {
    const filled = (keyValue(product, key) ?? "").trim().length > 0;
    return mode === "improve" ? filled : !filled;
  });
}

/**
 * The product with the `keys` leaves taken from `next` and everything else from `base`: after an
 * apply, the editor's baseline gains the written values without adopting other fields another
 * admin may have changed (a later save must not write those back).
 */
export function withKeysFrom(base: Product, next: Product, keys: ReadonlyArray<string>): Product {
  const out = structuredClone(base);
  for (const key of keys) {
    const parsed = parseKey(key);
    const value = keyValue(next, key);
    if (!parsed || value === null) continue;
    if (parsed.kind === "text") out.texts[parsed.language][parsed.field] = value;
    else if (parsed.kind === "seo") out.seo[parsed.language][parsed.field] = value;
    else {
      const image = out.images.find((candidate) => candidate.id === parsed.imageId);
      if (image) image.alt = { uz: "", ru: "", en: "", ...image.alt, [parsed.language]: value };
    }
  }
  return out;
}

/** A value the review can send: not blank, within the key's limit. */
export function suggestionProblem(value: string, maxLength: number): "blank" | "too_long" | null {
  if (value.trim().length === 0) return "blank";
  if (value.length > maxLength) return "too_long";
  return null;
}

export function isAssistantJobActive(job: Pick<AssistantJob, "state">): boolean {
  return job.state === "queued" || job.state === "running";
}

/** A finished job whose suggestions still wait for «Qo‘llash» or «Bekor qilish». */
export function isAwaitingReview(job: Pick<AssistantJob, "state" | "outcome">): boolean {
  return job.state === "succeeded" && job.outcome === "pending";
}
