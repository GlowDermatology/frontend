import type { BillzImportResult, Job, JobProgress } from "@/domain/job";

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
  return { created, updated, unchanged, newFromBillz: int(value.new_from_billz) ?? created };
}

export function mapJobError(value: unknown): Job["error"] {
  if (!isRecord(value)) return null;
  const code = typeof value.code === "string" ? value.code : "unknown";
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
