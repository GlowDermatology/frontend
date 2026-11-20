import {
  buildDraft,
  fillTargets,
  isFilled,
  isPlaceholder,
  keyMaxLength,
  keyValue,
  needsSource,
  parseKey,
  type AssistantDraft,
  type AssistantJob,
  type AssistantKeyNote,
  type AssistantStart,
  type AssistantStartInput,
  type AssistantStatus,
  type AssistantSuggestion,
  type ParsedKey,
} from "@/domain/assistant";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { CONTENT_LANGUAGES, type ContentLanguage, type Product } from "@/domain/product";
import { copyFor } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { getProduct } from "./products.queries";

/**
 * The demo AI assistant: deterministic, no provider. The job id carries the start request
 * (base64url JSON), so a poll recomputes the same suggestions from the fixtures: a started job is
 * `running` and the first poll finds it `succeeded`. The start's `draft` (the editor's unsaved
 * values) is kept in memory by job id and laid over the fixture, like the API's working values; a
 * server restart forgets it (the saved fixture is used then). Accepted ids are remembered the same
 * way. The texts are sample content (never translated with the admin language), built like the
 * real rules: empty or placeholder keys only (`improve`: filled ones), names, ingredients and usage
 * only copied from another language (else `skipped`), photo suggestions with «confirm against the
 * packaging», an improvement equal to the text `unchanged`.
 */

export const MOCK_ASSISTANT_STATUS: AssistantStatus = { enabled: true, maxImages: 3 };

const PREFIX = "mock-ai-";

interface Encoded {
  p: string;
  m: AssistantStartInput["mode"];
  l: ContentLanguage[];
  k: string[];
  g: AssistantStartInput["goal"];
  /** Tells starts with different drafts apart. */
  n: number;
}

const drafts = new Map<string, AssistantDraft>();
const accepted = new Set<string>();
let startCount = 0;

const encode = (value: Encoded) =>
  PREFIX + Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

function decode(id: string): Encoded | null {
  if (!id.startsWith(PREFIX)) return null;
  try {
    const value = JSON.parse(Buffer.from(id.slice(PREFIX.length), "base64url").toString("utf8"));
    return value && typeof value.p === "string" && Array.isArray(value.l)
      ? (value as Encoded)
      : null;
  } catch {
    return null;
  }
}

/* --- Sample texts (content in the product's languages) --- */

const SHORT: Record<ContentLanguage, (name: string) => string> = {
  uz: (name) => `${name}: yengil tekstura, har kungi parvarish uchun.`,
  ru: (name) => `${name}: лёгкая текстура для ежедневного ухода.`,
  en: (name) => `${name}: a light texture for everyday care.`,
};
const DESCRIPTION: Record<ContentLanguage, (name: string) => string> = {
  uz: (name) =>
    `${name} terini yumshoq parvarish qiladi. Yengil tekstura tez so‘riladi va yopishqoqlik qoldirmaydi. Ertalab va kechqurun foydalanish mumkin.`,
  ru: (name) =>
    `${name} бережно ухаживает за кожей. Лёгкая текстура быстро впитывается и не оставляет липкости. Подходит для утреннего и вечернего ухода.`,
  en: (name) =>
    `${name} gently cares for the skin. The light texture absorbs quickly and leaves no stickiness. Suitable for morning and evening routines.`,
};
const SEO_DESCRIPTION: Record<ContentLanguage, (name: string) => string> = {
  uz: (name) => `${name} — Glow Derma do‘konida. Toshkent bo‘ylab yetkazib berish.`,
  ru: (name) => `${name} в магазине Glow Derma. Доставка по Ташкенту.`,
  en: (name) => `${name} at Glow Derma. Delivery across Tashkent.`,
};
const ALT: Record<ContentLanguage, (name: string, n: number) => string> = {
  uz: (name, n) => `${name}, ${n}-rasm`,
  ru: (name, n) => `${name}, фото ${n}`,
  en: (name, n) => `${name}, photo ${n}`,
};

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

/** The product's name in `language`, else another language's (never the Billz stock name). */
function nameIn(product: Product, language: ContentLanguage): string | null {
  for (const other of [language, "uz", "en", "ru"] as const) {
    const name = product.texts[other].name.trim();
    if (!isPlaceholder(name)) return name;
  }
  return null;
}

/** Names, ingredients and usage are never invented: copied from a language that has them. */
function fromOtherLanguage(product: Product, parsed: ParsedKey & { kind: "text" }): string | null {
  for (const language of CONTENT_LANGUAGES) {
    const value = product.texts[language][parsed.field].trim();
    if (language !== parsed.language && !isPlaceholder(value)) return value;
  }
  return null;
}

/** The fixture with the draft's values laid over it (the API's "working values"). */
function withDraft(product: Product, draft: AssistantDraft): Product {
  const out = structuredClone(product);
  for (const [key, value] of Object.entries(draft)) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    if (parsed.kind === "text") out.texts[parsed.language][parsed.field] = value;
    else if (parsed.kind === "seo") out.seo[parsed.language][parsed.field] = value;
    else {
      const image = out.images.find((candidate) => candidate.id === parsed.imageId);
      if (image) image.alt = { uz: "", ru: "", en: "", ...image.alt, [parsed.language]: value };
    }
  }
  return out;
}

/** Every key of a product with its value (the shape of the editor's draft). */
const valuesOf = (product: Product) =>
  buildDraft(
    product,
    product.images.map((image) => image.id),
  );

function improved(current: string, goal: Encoded["g"]): string {
  const text = current.replace(/\s+/g, " ").trim();
  if (goal === "shorter") return text.split(/(?<=[.!?])\s/)[0] ?? text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function suggest(product: Product, key: string, request: Encoded): AssistantSuggestion | null {
  const parsed = parseKey(key);
  const current = keyValue(product, key);
  if (!parsed || current === null) return null;
  const max = keyMaxLength(parsed);
  const name = nameIn(product, parsed.language);
  let suggested: string | null = null;
  if (request.m === "improve") suggested = improved(current, request.g);
  else if (parsed.kind === "text") {
    switch (parsed.field) {
      case "shortDescription":
        suggested = name && SHORT[parsed.language](name);
        break;
      case "description":
        suggested = name && DESCRIPTION[parsed.language](name);
        break;
      default:
        suggested = fromOtherLanguage(product, parsed);
    }
  } else if (parsed.kind === "seo") {
    suggested =
      name &&
      (parsed.field === "title"
        ? `${name}${product.volume ? ` ${product.volume}` : ""} — Glow Derma`
        : SEO_DESCRIPTION[parsed.language](name));
  } else if (name) {
    const index = product.images.findIndex((image) => image.id === parsed.imageId);
    suggested = ALT[parsed.language](name, index + 1);
  }
  if (!suggested) return null;
  suggested = clip(suggested, max);
  const photo = request.m === "photos" && parsed.kind === "text";
  const warnings: AssistantSuggestion["warnings"] = [];
  if (photo) warnings.push("confirm_packaging");
  if (parsed.kind === "seo" && parsed.field === "title" && suggested.length > 60) {
    warnings.push("seo_title_long");
  }
  return {
    key,
    current,
    suggested,
    warnings,
    origin: photo ? "image" : "ai",
    checked: !photo,
    maxLength: max,
  };
}

/**
 * What a start targets: the requested keys (empty ones; `improve`: filled ones), else every empty
 * key the AI can write (photos: names and ingredients).
 */
function targets(product: Product, request: Encoded): string[] {
  const values = valuesOf(product);
  const inLanguages = (key: string) => request.l.includes(parseKey(key)!.language);
  if (request.k.length > 0) {
    return request.k.filter(
      (key) =>
        key in values &&
        inLanguages(key) &&
        (request.m === "improve" ? isFilled(values, key) : !isFilled(values, key)),
    );
  }
  if (request.m === "improve") return [];
  const empty = Object.keys(values).filter((key) => !isFilled(values, key) && inLanguages(key));
  if (request.m === "photos") {
    return empty.filter((key) => /^texts\.\w+\.(name|ingredients)$/.test(key));
  }
  const fillable = new Set(fillTargets(values));
  return empty.filter((key) => fillable.has(key));
}

function jobOf(
  id: string,
  request: Encoded,
  product: Product,
  state: AssistantJob["state"],
): AssistantJob {
  const at = referenceNow().toISOString();
  const keys = targets(product, request);
  const values = valuesOf(product);
  const suggestions: AssistantSuggestion[] = [];
  const notes: AssistantKeyNote[] = [];
  if (state === "succeeded") {
    for (const key of keys) {
      const suggestion = suggest(product, key, request);
      if (!suggestion) {
        const reason = needsSource(values, key) ? "no source text" : "not enough data";
        notes.push({ key, kind: "skipped", reason });
      } else if (suggestion.suggested.trim() === suggestion.current.trim()) {
        notes.push({ key, kind: "unchanged", reason: "" });
      } else suggestions.push(suggestion);
    }
  }
  return {
    id,
    productId: request.p,
    mode: request.m,
    languages: request.l,
    keys,
    state,
    outcome: accepted.has(id) ? "applied" : "pending",
    result:
      state === "succeeded"
        ? { suggestions, notes: { keys: notes, dropped: 0, extracted: null } }
        : null,
    error: null,
    appliedKeys: [],
    createdAt: at,
    finishedAt: state === "succeeded" ? at : null,
  };
}

export async function startAssistantJob(
  productId: string,
  input: AssistantStartInput,
): Promise<ActionResult<AssistantStart>> {
  await delay(400);
  const saved = await getProduct(productId);
  const m = await copyFor(catalogDataCopy);
  if (!saved) return { ok: false, error: m.productNotFound, code: "not_found" };
  const known = valuesOf(saved);
  const invalid = Object.entries(input.draft).some(
    ([key, value]) => !(key in known) || value.length > keyMaxLength(parseKey(key)!),
  );
  if (invalid) return { ok: false, error: m.checkFields, fieldErrors: { draft: m.checkFields } };
  startCount += 1;
  const request: Encoded = {
    p: productId,
    m: input.mode,
    l: input.languages.length > 0 ? input.languages : [...CONTENT_LANGUAGES],
    k: input.keys,
    g: input.goal,
    n: startCount,
  };
  const product = withDraft(saved, input.draft);
  if (targets(product, request).length === 0) {
    return { ok: true, data: { nothingToFill: true, job: null } };
  }
  const id = encode(request);
  drafts.set(id, { ...input.draft });
  return {
    ok: true,
    data: { nothingToFill: false, job: jobOf(id, request, product, "running") },
  };
}

export async function getAssistantJob(id: string): Promise<AssistantJob | null> {
  await delay(300);
  const request = decode(id);
  const saved = request ? await getProduct(request.p) : null;
  if (!request || !saved) return null;
  return jobOf(id, request, withDraft(saved, drafts.get(id) ?? {}), "succeeded");
}

/** The editor put `keys` into its form: the review closes (a second accept is refused). */
export async function acceptAssistantJob(
  id: string,
  keys: ReadonlyArray<string>,
): Promise<ActionResult<AssistantJob>> {
  await delay(150);
  const m = await copyFor(catalogDataCopy);
  const job = await getAssistantJob(id);
  if (!job) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (job.outcome !== "pending") {
    return { ok: false, error: m.jobClosed, code: "assistant_job_not_ready" };
  }
  const suggested = new Set(job.result?.suggestions.map((s) => s.key) ?? []);
  if (keys.some((key) => !suggested.has(key))) {
    return { ok: false, error: m.checkFields, fieldErrors: { keys: m.checkFields } };
  }
  accepted.add(id);
  drafts.delete(id);
  const outcome =
    keys.length === 0 ? "discarded" : keys.length === suggested.size ? "applied" : "partial";
  return { ok: true, data: { ...job, outcome, appliedKeys: [...keys] } };
}
