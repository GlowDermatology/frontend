/**
 * When a form asks "save anyway?" about its empty recommended fields (DESIGN §A), as pure rules
 * the forms and their tests share. `src/lib/forms/recommended.ts` re-exports them next to the
 * `useRecommendedConfirm()` hook that opens the question.
 *
 * A field the domain lists as empty (`…RecommendedMissing(values)`) is asked about only when the
 * question is news to the admin:
 *
 * 1. the entity is new (nothing saved yet), OR the field was filled in the saved baseline (the
 *    admin just cleared it), OR its Uzbek source changed in this save (the Uzbek name changed
 *    while the Russian / English one stays empty);
 * 2. an inactive / hidden entity never asks: customers do not see it. The save that makes it
 *    active asks about every empty field, as a create does;
 * 3. after «Baribir saqlash», the same entity and field set is not asked again in this browser
 *    session (`sessionStorage`, see `recommendedMemoryKey`).
 */

export interface RecommendedContext<F extends string> {
  /** Nothing is saved yet (a create): every empty field is news. */
  isNew: boolean;
  /** Whether the field holds a value in the saved baseline (the admin cleared it now). */
  filledBefore?: (field: F) => boolean;
  /** Whether the field's Uzbek source changed in this save (its translation may be stale or missing). */
  sourceChanged?: (field: F) => boolean;
  /** Whether customers see the entity after this save; `false` never asks. Default `true`. */
  active?: boolean;
  /** Whether customers saw it before this save; `false` (and `active`) = the activating save. */
  wasActive?: boolean;
}

/** The empty recommended fields worth a question on this save (rules 1 and 2 above). */
export function recommendedToAsk<F extends string>(
  missing: ReadonlyArray<F>,
  context: RecommendedContext<F>,
): F[] {
  if (context.active === false) return [];
  if (context.isNew || context.wasActive === false) return [...missing];
  return missing.filter(
    (field) => context.filledBefore?.(field) === true || context.sourceChanged?.(field) === true,
  );
}

/** `true` when the trimmed text holds something. */
export function isFilled(text: string | null | undefined): boolean {
  return (text ?? "").trim().length > 0;
}

/** Whether a trimmed text differs between the baseline and the form. */
export function textChanged(before: string | null | undefined, now: string | null | undefined) {
  return (before ?? "").trim() !== (now ?? "").trim();
}

/** Which saved entity a «Baribir saqlash» answer belongs to (rule 3). */
export interface RecommendedScope {
  /** The form, e.g. `product`, `category`, `campaign`. */
  kind: string;
  /** The saved entity's id (with a revision where the content can change under the same id). */
  id: string;
}

export const RECOMMENDED_MEMORY_PREFIX = "gd-recommended";

/** `gd-recommended:<kind>:<id>:<fields, sorted>`. */
export function recommendedMemoryKey(
  scope: RecommendedScope,
  fields: ReadonlyArray<string>,
): string {
  return `${RECOMMENDED_MEMORY_PREFIX}:${scope.kind}:${scope.id}:${[...fields].sort().join(",")}`;
}

/** The part of `Storage` the memory uses (tests pass a `Map`-backed stand-in). */
export interface RecommendedMemoryStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** This tab's `sessionStorage`, or `null` where it is missing or blocked. */
export function sessionMemoryStore(): RecommendedMemoryStore | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Whether «Baribir saqlash» was already answered for this key (never throws). */
export function wasAnsweredSaveAnyway(store: RecommendedMemoryStore | null, key: string): boolean {
  try {
    return store?.getItem(key) === "save";
  } catch {
    return false;
  }
}

/** Remembers «Baribir saqlash» for this key; a full or blocked storage only forgets it. */
export function rememberSaveAnyway(store: RecommendedMemoryStore | null, key: string): void {
  try {
    store?.setItem(key, "save");
  } catch {
    /* the question may come back once: harmless */
  }
}
