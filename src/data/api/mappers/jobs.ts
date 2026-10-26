import {
  BILLZ_AUTH_FAILED,
  BILLZ_AUTH_FAILED_MESSAGE,
  BILLZ_LISTING_INCOMPLETE,
  BILLZ_LISTING_INCOMPLETE_MESSAGE,
  type BillzImportResult,
  type Job,
  type JobProgress,
} from "@/domain/job";

import type { ApiJob } from "../types";
import { idString } from "./common";

/**
 * `Job` (contract §2.14) → the FE domain type. `progress`, `result` and
 * `error` are kind-specific in the schema (typed `unknown`), so their shapes
 * are checked here and anything malformed becomes `null`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapJobProgress(value: unknown): JobProgress | null {
  if (!isRecord(value)) return null;
  const done = int(value.done);
  const total = int(value.total);
  return done === null || total === null ? null : { done, total };
}

export function mapBillzImportResult(value: unknown): BillzImportResult | null {
  if (!isRecord(value)) return null;
  const created = int(value.created);
  const updated = int(value.updated);
  const unchanged = int(value.unchanged);
  if (created === null || updated === null || unchanged === null) return null;
  const result: BillzImportResult = {
    created,
    updated,
    unchanged,
    newFromBillz: int(value.new_from_billz) ?? created,
  };
  const hidden = int(value.hidden);
  if (hidden !== null) result.hidden = hidden;
  return result;
}

/**
 * `error` of a failed job. An incomplete Billz listing carries the generic
 * provider message, so its code gets the screen's own explanation; so does
 * a refused Billz key, which staff must not simply retry.
 */
export function mapJobError(value: unknown): Job["error"] {
  if (!isRecord(value)) return null;
  const code = typeof value.code === "string" ? value.code : "unknown";
  if (code === BILLZ_LISTING_INCOMPLETE) return { code, message: BILLZ_LISTING_INCOMPLETE_MESSAGE };
  if (code === BILLZ_AUTH_FAILED) return { code, message: BILLZ_AUTH_FAILED_MESSAGE };
  const message =
    typeof value.message === "string" && value.message ? value.message : "Kutilmagan xato.";
  return { code, message };
}

export function mapJob(api: ApiJob): Job {
  return {
    id: idString(api.id),
    kind: api.kind,
    state: api.state,
    progress: mapJobProgress(api.progress),
    result: api.state === "succeeded" ? mapBillzImportResult(api.result) : null,
    error: api.state === "failed" ? mapJobError(api.error) : null,
    createdAt: api.created_at,
    startedAt: api.started_at,
    finishedAt: api.finished_at,
  };
}
