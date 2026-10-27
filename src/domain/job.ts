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
  /**
   * Full runs only (M3): products the full Billz listing no longer has,
   * hidden by the reconciliation. Absent on a delta run.
   */
  hidden?: number;
}

/**
 * `Job.error.code` of a full import whose Billz listing arrived incomplete or
 * implausibly small (M3): nothing was applied and nothing hidden. The
 * backend sends its generic provider message, so the screen says what
 * happened.
 */
export const BILLZ_LISTING_INCOMPLETE = "billz_listing_incomplete";
export const BILLZ_LISTING_INCOMPLETE_MESSAGE =
  "Billz’dan mahsulotlar ro‘yxati to‘liq kelmadi (yoki shubhali darajada qisqa), shuning uchun hech narsa o‘zgartirilmadi va yashirilmadi. Birozdan so‘ng qayta urinib ko‘ring.";

/**
 * `Job.error.code` when Billz refused the API key (M3): retrying cannot
 * help, the administrator has to check the Billz key in the settings.
 */
export const BILLZ_AUTH_FAILED = "billz_auth_failed";
export const BILLZ_AUTH_FAILED_MESSAGE =
  "Billz API kalitni qabul qilmadi, shuning uchun import bajarilmadi. Qayta urinish yordam bermaydi: administrator Billz kalitini tekshirishi kerak.";

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

/**
 * Uzbek summary of a finished import: "3 ta yangi · 245 ta yangilandi · 0 ta
 * o‘zgarmadi", plus "· 2 ta yashirildi" after a full run.
 */
export function billzImportSummary(result: BillzImportResult): string {
  return [
    `${result.created} ta yangi`,
    `${result.updated} ta yangilandi`,
    `${result.unchanged} ta o‘zgarmadi`,
    ...(result.hidden === undefined ? [] : [`${result.hidden} ta yashirildi`]),
  ].join(" · ");
}
