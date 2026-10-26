import { BILLZ_LISTING_INCOMPLETE, BILLZ_LISTING_INCOMPLETE_MESSAGE, type Job } from "@/domain/job";

import { referenceNow } from "../config";
import { PRODUCTS } from "./catalog";

/**
 * Mock jobs (contract §2.14). The demo's Billz import is a job that is
 * `running` when started and finished on the first poll, so the import
 * control shows both states without a backend. Job 1 succeeds with a full
 * run's summary (`hidden` included: the import joined the daily full sync,
 * single-flight); job 2 is a full run whose Billz listing arrived incomplete
 * (`billz_listing_incomplete`, nothing hidden). The demo import alternates
 * between them (`importFromBillz` in `./products.actions.ts`).
 */

export const MOCK_IMPORT_JOB_ID = "1";
export const MOCK_FAILED_IMPORT_JOB_ID = "2";

function base(id: string): Omit<Job, "state" | "progress" | "result" | "error" | "finishedAt"> {
  const at = referenceNow().toISOString();
  return { id, kind: "billz_import", createdAt: at, startedAt: at };
}

export function runningImportJob(id: string = MOCK_IMPORT_JOB_ID): Job {
  return {
    ...base(id),
    state: "running",
    progress: { done: 0, total: PRODUCTS.length },
    result: null,
    error: null,
    finishedAt: null,
  };
}

export function finishedImportJob(): Job {
  const total = PRODUCTS.length;
  return {
    ...base(MOCK_IMPORT_JOB_ID),
    state: "succeeded",
    progress: { done: total, total },
    result: { created: 0, updated: 12, unchanged: total - 12, newFromBillz: 0, hidden: 0 },
    error: null,
    finishedAt: referenceNow().toISOString(),
  };
}

export function failedImportJob(): Job {
  return {
    ...base(MOCK_FAILED_IMPORT_JOB_ID),
    state: "failed",
    progress: null,
    result: null,
    error: { code: BILLZ_LISTING_INCOMPLETE, message: BILLZ_LISTING_INCOMPLETE_MESSAGE },
    finishedAt: referenceNow().toISOString(),
  };
}

export async function getJob(id: string): Promise<Job | null> {
  if (id === MOCK_IMPORT_JOB_ID) return finishedImportJob();
  if (id === MOCK_FAILED_IMPORT_JOB_ID) return failedImportJob();
  return null;
}
