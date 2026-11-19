import {
  SUGGESTION_WARNINGS,
  type AssistantJob,
  type AssistantJobNotes,
  type AssistantSuggestion,
  type SuggestionWarning,
} from "@/domain/assistant";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";

import type { ApiAssistantJob, ApiAssistantSuggestion } from "../types";
import { idString } from "./common";
import { mapJobError } from "./jobs";

/**
 * `AssistantJob` (contract §2.19) → the FE domain type. Unknown warning codes and languages are
 * dropped, so a newer backend never renders a raw code.
 */

const isWarning = (code: string): code is SuggestionWarning =>
  (SUGGESTION_WARNINGS as ReadonlyArray<string>).includes(code);

export function mapAssistantSuggestion(api: ApiAssistantSuggestion): AssistantSuggestion {
  return {
    key: api.key,
    current: api.current,
    suggested: api.suggested,
    warnings: api.warnings.filter(isWarning),
    origin: api.origin === "image" ? "image" : "ai",
    checked: api.checked,
    maxLength: api.max_length,
  };
}

/** `result.warnings` → counts and the photo label info (shown, never applied). */
export function mapAssistantNotes(
  warnings: ReadonlyArray<Record<string, unknown>>,
): AssistantJobNotes {
  const notes: AssistantJobNotes = { rejected: 0, dropped: 0, extracted: null };
  for (const warning of warnings) {
    if (warning.code === "rejected") notes.rejected += 1;
    else if (warning.code === "dropped" && typeof warning.count === "number") {
      notes.dropped += warning.count;
    } else if (warning.code === "extracted") {
      const extracted: NonNullable<AssistantJobNotes["extracted"]> = {};
      if (typeof warning.brand === "string" && warning.brand) extracted.brand = warning.brand;
      if (typeof warning.volume === "string" && warning.volume) extracted.volume = warning.volume;
      if (extracted.brand || extracted.volume) notes.extracted = extracted;
    }
  }
  return notes;
}

const isLanguage = (value: string): value is ContentLanguage =>
  (CONTENT_LANGUAGES as ReadonlyArray<string>).includes(value);

export function mapAssistantJob(api: ApiAssistantJob): AssistantJob {
  return {
    id: idString(api.id),
    productId: api.product_id === null ? null : idString(api.product_id),
    mode: api.mode,
    languages: api.languages.filter(isLanguage),
    keys: [...api.keys],
    state: api.state,
    outcome: api.outcome,
    result:
      api.state === "succeeded" && api.result
        ? {
            suggestions: api.result.suggestions.map(mapAssistantSuggestion),
            notes: mapAssistantNotes(api.result.warnings),
          }
        : null,
    error: api.state === "failed" ? mapJobError(api.error) : null,
    appliedKeys: [...api.applied_keys],
    createdAt: api.created_at,
    finishedAt: api.finished_at,
  };
}
