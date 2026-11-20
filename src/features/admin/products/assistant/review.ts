import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";
import {
  fieldMode,
  fillTargets,
  hasAnyName,
  improveTargets,
  keyLanguage,
  needsSource,
  parseKey,
  type AssistantDraft,
  type AssistantJobNotes,
  type AssistantStartInput,
  type SuggestionWarning,
} from "@/domain/assistant";

import type { AssistantCopyT } from "./copy";

/**
 * The assistant's pure parts (framework-free, unit-tested): the start request of a field's ✨ and
 * of the three menu commands, and why one cannot run; why a requested field came back
 * without a text, in plain words; the suggestion warnings in plain words; which language tabs hold
 * AI texts; and the job id kept per product so a reloaded editor resumes the same job.
 */

/* --- What a click starts --- */

export type MenuAction = "fill" | "improve" | "photos";

/** One field's ✨: write it (empty or placeholder) or rewrite it (filled), in its language. */
export function fieldRequest(draft: AssistantDraft, key: string): AssistantStartInput {
  return {
    mode: fieldMode(draft, key),
    languages: [keyLanguage(key)!],
    keys: [key],
    goal: "professional",
    imageIds: [],
    draft,
  };
}

/** Why a field's ✨ cannot run now; `undefined` when it can. */
export function fieldBlocker(
  t: AssistantCopyT,
  draft: AssistantDraft,
  key: string,
  running: boolean,
): string | undefined {
  if (running) return t.field.wait;
  if (needsSource(draft, key)) return t.field.needSource;
  // An empty description, SEO or alt text is written from the name: without one the AI has nothing.
  if (fieldMode(draft, key) === "fill_missing" && !hasAnyName(draft)) return t.fill.needName;
  return undefined;
}

/**
 * A menu command's request: «fill» every empty key, «improve» the filled descriptions, usage and
 * SEO texts, «photos» reads the saved photos (at most `maxImages`).
 */
export function menuRequest(
  action: MenuAction,
  draft: AssistantDraft,
  savedImageIds: ReadonlyArray<string>,
  maxImages: number,
): AssistantStartInput {
  const base = { languages: [...CONTENT_LANGUAGES], goal: "professional" as const, draft };
  if (action === "fill") {
    return { ...base, mode: "fill_missing", keys: fillTargets(draft), imageIds: [] };
  }
  if (action === "improve") {
    return { ...base, mode: "improve", keys: improveTargets(draft), imageIds: [] };
  }
  return { ...base, mode: "photos", keys: [], imageIds: savedImageIds.slice(0, maxImages) };
}

/** Why a menu command cannot run now; `undefined` when it can. */
export function menuBlocker(
  t: AssistantCopyT,
  action: MenuAction,
  draft: AssistantDraft,
  savedImageIds: ReadonlyArray<string>,
): string | undefined {
  if (action === "fill") {
    if (!hasAnyName(draft)) return t.fill.needName;
    return fillTargets(draft).length === 0 ? t.fill.none : undefined;
  }
  if (action === "improve") return improveTargets(draft).length === 0 ? t.improve.none : undefined;
  return savedImageIds.length === 0 ? t.photos.none : undefined;
}

/**
 * Why a requested key got no text in the form: `edited` (the admin typed in it while the AI was
 * writing), `review` (an unchecked suggestion — read from the photos, or with an unverified claim
 * or number — over a filled text: shown with «Insert», never written by itself), `nothingToDo`
 * (the server found nothing to write: no product name yet), `fallback` (no text and no reason).
 */
export interface KeyProblem {
  kind: "rejected" | "skipped" | "unchanged" | "edited" | "fallback" | "review" | "nothingToDo";
  /** `rejected`: the server's reason code (`pos_label`, `unsupported_number`, …). */
  reason?: string;
  /** `review`: the suggested text and its warnings. */
  suggested?: string;
  warnings?: SuggestionWarning[];
}

/** The job's per-key notes, by key (the first note of a key wins). */
export function problemsOf(
  notes: AssistantJobNotes | null | undefined,
): Record<string, KeyProblem> {
  const out: Record<string, KeyProblem> = {};
  for (const note of notes?.keys ?? []) {
    out[note.key] ??= { kind: note.kind, reason: note.reason };
  }
  return out;
}

/** A problem in the admin's words; never a raw code. */
export function problemText(t: AssistantCopyT, problem: KeyProblem): string {
  switch (problem.kind) {
    case "unchanged":
      return t.reasons.unchanged;
    case "skipped":
      return t.reasons.skipped;
    case "edited":
      return t.reasons.edited;
    case "fallback":
      return t.reasons.fallback;
    case "review":
      return t.reasons.review;
    case "nothingToDo":
      return t.reasons.nothingToDo;
    case "rejected":
      if (problem.reason === "pos_label") return t.reasons.posLabel;
      if (problem.reason === "too_long") return t.reasons.tooLong;
      if (problem.reason === "empty") return t.reasons.empty;
      return t.reasons.factAdded;
  }
}

/** The suggestion's warnings in the admin's words. */
export function warningTexts(
  t: AssistantCopyT,
  warnings: ReadonlyArray<SuggestionWarning>,
): string[] {
  return warnings.map((warning) => t.warnings[warning]);
}

/** The languages whose `kind` fields hold an AI text (the gold dot on the language tabs). */
export function markedLanguages(
  keys: Iterable<string>,
  kind: "text" | "seo" | "alt",
): Partial<Record<ContentLanguage, boolean>> {
  const out: Partial<Record<ContentLanguage, boolean>> = {};
  for (const key of keys) {
    if (parseKey(key)?.kind === kind) out[keyLanguage(key)!] = true;
  }
  return out;
}

/* --- The job id kept per product (sessionStorage: this tab only) --- */

const storeKey = (productId: string) => `gd_ai_job:${productId}`;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberJob(productId: string, jobId: string, store = sessionStore()): void {
  try {
    store?.setItem(storeKey(productId), jobId);
  } catch {
    // Storage full or blocked: the job is simply not resumed after a reload.
  }
}

export function rememberedJob(productId: string, store = sessionStore()): string | null {
  try {
    return store?.getItem(storeKey(productId)) ?? null;
  } catch {
    return null;
  }
}

export function forgetJob(productId: string, store = sessionStore()): void {
  try {
    store?.removeItem(storeKey(productId));
  } catch {
    // ignore
  }
}
