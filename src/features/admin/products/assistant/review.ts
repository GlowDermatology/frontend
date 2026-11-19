import {
  keyLanguage,
  suggestionProblem,
  type AssistantApplyItem,
  type AssistantSuggestion,
} from "@/domain/assistant";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";

/**
 * The review's pure parts (framework-free, unit-tested): the row state per suggestion, the
 * grouping by language, the items an apply sends, and the job id kept per product so a closed
 * dialog (or a reloaded editor) resumes the same job.
 */

export interface ReviewRow {
  checked: boolean;
  value: string;
}

/** A key whose editor field holds an unsaved edit: shown, but it cannot be applied now. */
export type IsBlocked = (key: string) => boolean;

export type ReviewState = Record<string, ReviewRow>;

/** The starting rows: the server's pre-selection, except fields the admin is editing. */
export function initialReview(
  suggestions: ReadonlyArray<AssistantSuggestion>,
  isBlocked: IsBlocked,
): ReviewState {
  const state: ReviewState = {};
  for (const suggestion of suggestions) {
    state[suggestion.key] = {
      checked: suggestion.checked && !isBlocked(suggestion.key),
      value: suggestion.suggested,
    };
  }
  return state;
}

/** Suggestions per content language, in uz → ru → en order; languages without any are left out. */
export function groupByLanguage(
  suggestions: ReadonlyArray<AssistantSuggestion>,
): Array<{ language: ContentLanguage; suggestions: AssistantSuggestion[] }> {
  return CONTENT_LANGUAGES.map((language) => ({
    language,
    suggestions: suggestions.filter((s) => keyLanguage(s.key) === language),
  })).filter((group) => group.suggestions.length > 0);
}

export type RowProblem = "blank" | "too_long" | null;

export function rowProblem(
  row: ReviewRow | undefined,
  suggestion: AssistantSuggestion,
): RowProblem {
  return row ? suggestionProblem(row.value, suggestion.maxLength) : null;
}

/** Checked and not blocked. */
export function isSelected(state: ReviewState, key: string, isBlocked: IsBlocked): boolean {
  return Boolean(state[key]?.checked) && !isBlocked(key);
}

/** The selected rows as apply items (values trimmed), in the suggestions' order. */
export function applyItems(
  suggestions: ReadonlyArray<AssistantSuggestion>,
  state: ReviewState,
  isBlocked: IsBlocked,
): AssistantApplyItem[] {
  return suggestions
    .filter((s) => isSelected(state, s.key, isBlocked))
    .map((s) => ({ key: s.key, value: state[s.key]!.value.trim() }));
}

/** Whether a selected row would be refused (blank or too long). */
export function hasSelectedProblem(
  suggestions: ReadonlyArray<AssistantSuggestion>,
  state: ReviewState,
  isBlocked: IsBlocked,
): boolean {
  return suggestions.some(
    (s) => isSelected(state, s.key, isBlocked) && rowProblem(state[s.key], s) !== null,
  );
}

/** Server field errors of an apply (`items.<i>.value`) → per key, by the index of the sent item. */
export function itemErrors(
  items: ReadonlyArray<AssistantApplyItem>,
  fieldErrors: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(fieldErrors ?? {})) {
    const match = /^items\.(\d+)\.(value|key)$/.exec(path);
    const item = match ? items[Number(match[1])] : undefined;
    if (item) out[item.key] ??= message;
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
