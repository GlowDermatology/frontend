import {
  candidateKeys,
  keyMaxLength,
  keyValue,
  parseKey,
  type AssistantApplyItem,
  type AssistantApplyResult,
  type AssistantJob,
  type AssistantStart,
  type AssistantStartInput,
  type AssistantStatus,
  type AssistantSuggestion,
  type ParsedKey,
} from "@/domain/assistant";
import { catalogDataCopy } from "@/domain/copy/catalog";
import {
  CONTENT_LANGUAGES,
  productDisplayName,
  type ContentLanguage,
  type Product,
} from "@/domain/product";
import { copyFor } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { withSeoStatus } from "./catalog";
import { delay } from "./delay";
import { getProduct } from "./products.queries";

/**
 * The demo AI assistant: deterministic, no provider and nothing stored. The job id carries the
 * start request (base64url JSON), so a poll or an apply recomputes the same suggestions from the
 * fixtures: a started job is `running` and the first poll (after ~1.5 s) finds it `succeeded`.
 * The texts are sample content (never translated with the admin language), built like the real
 * rules: missing keys only (`improve`: the chosen filled ones), ingredients and usage only copied
 * from another language, photo suggestions unchecked with «confirm against the packaging».
 */

export const MOCK_ASSISTANT_STATUS: AssistantStatus = { enabled: true, maxImages: 3 };

const PREFIX = "mock-ai-";

interface Encoded {
  p: string;
  m: AssistantStartInput["mode"];
  l: ContentLanguage[];
  k: string[];
  g: AssistantStartInput["goal"];
}

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

/** The product's name in `language`, else another language's, else the Billz name. */
function nameIn(product: Product, language: ContentLanguage): string {
  const own = product.texts[language].name.trim();
  if (own) return own;
  for (const other of ["uz", "en", "ru"] as const) {
    const name = product.texts[other].name.trim();
    if (name) return name;
  }
  return productDisplayName(product);
}

/** Ingredients and usage are never invented: copied from a language that has them. */
function fromOtherLanguage(product: Product, parsed: ParsedKey & { kind: "text" }): string | null {
  for (const language of CONTENT_LANGUAGES) {
    const value = product.texts[language][parsed.field].trim();
    if (language !== parsed.language && value) return value;
  }
  return null;
}

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
  let suggested: string | null;
  if (request.m === "improve") suggested = improved(current, request.g);
  else if (parsed.kind === "text") {
    switch (parsed.field) {
      case "name":
        suggested = name;
        break;
      case "shortDescription":
        suggested = SHORT[parsed.language](name);
        break;
      case "description":
        suggested = DESCRIPTION[parsed.language](name);
        break;
      default:
        suggested = fromOtherLanguage(product, parsed);
    }
  } else if (parsed.kind === "seo") {
    suggested =
      parsed.field === "title"
        ? `${name}${product.volume ? ` ${product.volume}` : ""} — Glow Derma`
        : SEO_DESCRIPTION[parsed.language](name);
  } else {
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

/** What a mode targets: the picked keys, else the mode's candidates (photos: names and ingredients). */
function targets(product: Product, request: Encoded): string[] {
  const candidates = candidateKeys(product, request.m, request.l);
  const picked =
    request.k.length > 0 ? candidates.filter((key) => request.k.includes(key)) : candidates;
  if (request.m !== "photos" || request.k.length > 0) return picked;
  return picked.filter((key) => /^texts\.\w+\.(name|ingredients)$/.test(key));
}

function jobOf(
  id: string,
  request: Encoded,
  product: Product,
  state: AssistantJob["state"],
): AssistantJob {
  const at = referenceNow().toISOString();
  const keys = targets(product, request);
  const suggestions =
    state === "succeeded"
      ? keys.map((key) => suggest(product, key, request)).filter((s) => s !== null)
      : [];
  return {
    id,
    productId: request.p,
    mode: request.m,
    languages: request.l,
    keys,
    state,
    outcome: "pending",
    result:
      state === "succeeded"
        ? { suggestions, notes: { rejected: 0, dropped: 0, extracted: null } }
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
  const product = await getProduct(productId);
  const m = await copyFor(catalogDataCopy);
  if (!product) return { ok: false, error: m.productNotFound, code: "not_found" };
  const request: Encoded = {
    p: productId,
    m: input.mode,
    l: input.languages.length > 0 ? input.languages : [...CONTENT_LANGUAGES],
    k: input.keys,
    g: input.goal,
  };
  if (targets(product, request).length === 0)
    return { ok: true, data: { nothingToFill: true, job: null } };
  return {
    ok: true,
    data: { nothingToFill: false, job: jobOf(encode(request), request, product, "running") },
  };
}

export async function getAssistantJob(id: string): Promise<AssistantJob | null> {
  await delay(300);
  const request = decode(id);
  const product = request ? await getProduct(request.p) : null;
  return request && product ? jobOf(id, request, product, "succeeded") : null;
}

export async function applyAssistantJob(
  id: string,
  items: ReadonlyArray<AssistantApplyItem>,
): Promise<ActionResult<AssistantApplyResult>> {
  await delay(500);
  const m = await copyFor(catalogDataCopy);
  const job = await getAssistantJob(id);
  const request = decode(id);
  const product = request ? await getProduct(request.p) : null;
  if (!job || !product) return { ok: false, error: m.jobNotFound, code: "not_found" };
  const known = new Map(job.result?.suggestions.map((s) => [s.key, s]) ?? []);
  const fieldErrors: Record<string, string> = {};
  items.forEach((item, index) => {
    const suggestion = known.get(item.key);
    if (!suggestion) fieldErrors[`items.${index}.key`] = m.checkFields;
    else if (item.value.trim().length > suggestion.maxLength) {
      fieldErrors[`items.${index}.value`] = m.maxChars(suggestion.maxLength);
    }
  });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: m.checkFields, fieldErrors };
  const next = structuredClone(product);
  for (const item of items) {
    const parsed = parseKey(item.key)!;
    const value = item.value.trim();
    if (parsed.kind === "text") next.texts[parsed.language][parsed.field] = value;
    else if (parsed.kind === "seo") next.seo[parsed.language][parsed.field] = value;
    else {
      const image = next.images.find((candidate) => candidate.id === parsed.imageId);
      if (image) image.alt = { uz: "", ru: "", en: "", ...image.alt, [parsed.language]: value };
    }
  }
  const applied = items.map((item) => item.key);
  const all = applied.length === known.size;
  return {
    ok: true,
    data: {
      job: { ...job, outcome: all ? "applied" : "partial", appliedKeys: applied },
      applied,
      conflicts: [],
      product: withSeoStatus(next),
    },
  };
}

export async function discardAssistantJob(id: string): Promise<ActionResult<AssistantJob>> {
  await delay(200);
  const job = await getAssistantJob(id);
  if (!job)
    return { ok: false, error: (await copyFor(catalogDataCopy)).jobNotFound, code: "not_found" };
  return { ok: true, data: { ...job, outcome: "discarded" } };
}
