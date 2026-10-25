import type { Job } from "@/domain/job";

import { referenceNow } from "../config";
import { PRODUCTS } from "./catalog";

/**
 * Mock jobs (contract §2.14). The demo's Billz import is one job that is
 * `running` when started and `succeeded` on the first poll, so the import
 * control shows both states without a backend.
 */

export const MOCK_IMPORT_JOB_ID = "1";

function base(): Omit<Job, "state" | "progress" | "result" | "error" | "finishedAt"> {
  const at = referenceNow().toISOString();
  return { id: MOCK_IMPORT_JOB_ID, kind: "billz_import", createdAt: at, startedAt: at };
}

export function runningImportJob(): Job {
  return {
    ...base(),
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
    ...base(),
    state: "succeeded",
    progress: { done: total, total },
    result: { created: 0, updated: 12, unchanged: total - 12, newFromBillz: 0 },
    error: null,
    finishedAt: referenceNow().toISOString(),
  };
}

export async function getJob(id: string): Promise<Job | null> {
  return id === MOCK_IMPORT_JOB_ID ? finishedImportJob() : null;
}
