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
 * The AI product content assistant (admin contract §2.19). A job is started for one product with
 * the editor's current form values (`draft`), polled like the Billz job (`state`), and its
 * suggestions are written straight into the editor form: the admin reviews them in place and saves
 * the product as usual. `accept` then records which suggestions went into the form.
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

/** Suggestion warnings (`AssistantSuggestion.warnings`): shown under the field in plain words. */
export const SUGGESTION_WARNINGS = [
  "unsupported_claim",
  "unverified_number",
  "inci_mismatch",
  "confirm_packaging",
  "seo_title_long",
  "seo_description_long",
] as const;
export type SuggestionWarning = (typeof SUGGESTION_WARNINGS)[number];

export interface AssistantSuggestion {
  key: string;
  /** The working value when the job started (the draft's, else the saved one; `""` = empty). */
  current: string;
  suggested: string;
  /** Known codes only (unknown ones are dropped by the mapper). */
  warnings: SuggestionWarning[];
  /** `image`: read from the product photos (confirm against the packaging). */
  origin: "ai" | "image";
  checked: boolean;
  maxLength: number;
}

/** A requested key that came back without a suggestion, and why (`result.warnings`). */
export interface AssistantKeyNote {
  key: string;
  /**
   * `rejected`: the suggestion broke a rule (`reason` is the server's code, e.g. `pos_label`);
   * `skipped`: the AI said it cannot write it (`reason` is its short English text);
   * `unchanged`: the suggestion equalled the current text.
   */
  kind: "rejected" | "skipped" | "unchanged";
  reason: string;
}

/** Job-level notes (`result.warnings`): keys without a suggestion, a dropped count, label info. */
export interface AssistantJobNotes {
  keys: AssistantKeyNote[];
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

/** The admin's current form value per key (`""` = empty); keys left out use the saved value. */
export type AssistantDraft = Record<string, string>;

/** At most this many draft entries per start (contract). */
export const DRAFT_MAX_ENTRIES = 150;

export interface AssistantStartInput {
  mode: AssistantMode;
  languages: ContentLanguage[];
  keys: string[];
  goal: ImproveGoal;
  imageIds: string[];
  draft: AssistantDraft;
}

/** `POST products/{id}/assistant/jobs/`: a job (new or the active one), or nothing to fill. */
export type AssistantStart =
  { nothingToFill: true; job: null } | { nothingToFill: false; job: AssistantJob };

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
  product: { images: ReadonlyArray<{ id: string }> },
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

/* --- Placeholders (the same rule as the backend's) --- */

const PLACEHOLDER_RE =
  /^(test|тест|test\d*|тест\d*|asd+f*|qwe+r*t*y*|lorem ipsum.*|xxx+|todo|tbd|placeholder|sample|example|пример|образец|namuna|\.+|-+|\?+)$/u;

/**
 * A value that is not real content: empty, without a single letter, or a stand-in like «Test»,
 * «asdf», «...». It counts as empty: the AI fills it and never reads it as a product fact.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
  if (text.length === 0 || !/\p{L}/u.test(text)) return true;
  return PLACEHOLDER_RE.test(text);
}

/* --- The draft (the editor's current values) and what each action targets --- */

export interface DraftSource {
  texts: Record<ContentLanguage, Record<ProductTextField, string>>;
  seo: Record<ContentLanguage, { title: string; description: string }>;
  images: ReadonlyArray<{ id: string; alt?: Partial<Record<ContentLanguage, string>> | null }>;
}

/**
 * Every assistant key → the form's current value (clipped to the key's API limit), in the editor's
 * order. Alt texts only for photos the server knows (`savedImageIds`): a photo picked but not
 * uploaded yet has no key.
 */
export function buildDraft(
  values: DraftSource,
  savedImageIds: ReadonlyArray<string>,
): AssistantDraft {
  const saved = new Set(savedImageIds);
  const images = values.images.filter((image) => saved.has(image.id));
  const draft: AssistantDraft = {};
  for (const key of productKeys({ images })) {
    const parsed = parseKey(key)!;
    let value: string | undefined;
    if (parsed.kind === "text") value = values.texts[parsed.language][parsed.field];
    else if (parsed.kind === "seo") value = values.seo[parsed.language][parsed.field];
    else value = images.find((image) => image.id === parsed.imageId)?.alt?.[parsed.language];
    const text = value ?? "";
    const max = keyMaxLength(parsed);
    draft[key] = text.length > max ? text.slice(0, max) : text;
  }
  return draft;
}

/** Real content (not empty, not a placeholder). */
export function isFilled(draft: AssistantDraft, key: string): boolean {
  return !isPlaceholder(draft[key]);
}

/** Fields the AI only translates from another language, never invents. */
export const SOURCE_FIELDS: ReadonlyArray<ProductTextField> = ["name", "ingredients", "usage"];

/** Text fields «Improve all texts» rewrites (not names or ingredients); SEO texts too. */
const IMPROVE_FIELDS: ReadonlyArray<ProductTextField> = [
  "shortDescription",
  "description",
  "usage",
];

/**
 * A name, ingredients or usage key that is empty in every language: the AI has nothing to
 * translate from, so the admin must write it first.
 */
export function needsSource(draft: AssistantDraft, key: string): boolean {
  const parsed = parseKey(key);
  if (parsed?.kind !== "text" || !SOURCE_FIELDS.includes(parsed.field)) return false;
  const field = parsed.field;
  return CONTENT_LANGUAGES.every(
    (language) => !isFilled(draft, keyOf({ kind: "text", language, field })),
  );
}

/** Whether any language has a product name yet (the AI writes nothing about a nameless product). */
export function hasAnyName(draft: AssistantDraft): boolean {
  return CONTENT_LANGUAGES.some((language) => isFilled(draft, `texts.${language}.name`));
}

/** One field's ✨: write it when empty, rewrite it better when filled. */
export function fieldMode(draft: AssistantDraft, key: string): "fill_missing" | "improve" {
  return isFilled(draft, key) ? "improve" : "fill_missing";
}

/** «Fill empty fields»: every empty or placeholder key the AI can write. */
export function fillTargets(draft: AssistantDraft): string[] {
  return Object.keys(draft).filter((key) => !isFilled(draft, key) && !needsSource(draft, key));
}

/** «Improve all texts»: the filled descriptions, usage and SEO texts (not names or ingredients). */
export function improveTargets(draft: AssistantDraft): string[] {
  return Object.keys(draft).filter((key) => {
    const parsed = parseKey(key);
    if (!parsed || parsed.kind === "alt") return false;
    if (parsed.kind === "text" && !IMPROVE_FIELDS.includes(parsed.field)) return false;
    return isFilled(draft, key);
  });
}

export function isAssistantJobActive(job: Pick<AssistantJob, "state">): boolean {
  return job.state === "queued" || job.state === "running";
}

/** A finished job whose suggestions were not yet put into the form (`accept` not called). */
export function isAwaitingReview(job: Pick<AssistantJob, "state" | "outcome">): boolean {
  return job.state === "succeeded" && job.outcome === "pending";
}
