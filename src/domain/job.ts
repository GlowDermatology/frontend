/**
 * Background jobs (contract §2.14). M1 has one kind, the Billz import; the
 * admin polls `GET jobs/{id}/` until the job is `succeeded` or `failed`.
 */

export const JOB_STATES = ["queued", "running", "succeeded", "failed"] as const;
export type JobState = (typeof JOB_STATES)[number];

export interface JobProgress {
  done: number;
  total: number;
}

/** `Job.result` of a `billz_import` (contract §2.3). */
export interface BillzImportResult {
  created: number;
  updated: number;
  unchanged: number;
  newFromBillz: number;
}

export interface Job {
  id: string;
  kind: "billz_import";
  state: JobState;
  progress: JobProgress | null;
  result: BillzImportResult | null;
  error: { code: string; message: string } | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export function isJobDone(state: JobState): boolean {
  return state === "succeeded" || state === "failed";
}

/** Uzbek summary of a finished import: "3 ta yangi · 245 ta yangilandi · 0 ta o‘zgarmadi". */
export function billzImportSummary(result: BillzImportResult): string {
  return [
    `${result.created} ta yangi`,
    `${result.updated} ta yangilandi`,
    `${result.unchanged} ta o‘zgarmadi`,
  ].join(" · ");
}
