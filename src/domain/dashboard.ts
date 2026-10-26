/** Preset periods of the dashboard switch. */
export const DASHBOARD_RANGES = ["today", "week", "month"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

/** What the dashboard shows: a preset, or an inclusive range of Tashkent days. */
export type DashboardQuery =
  { range: DashboardRange } | { range: "custom"; from: string; to: string };

export type DashboardBucket = "hour" | "day";

export interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface DashboardData {
  range: DashboardRange | "custom";
  /** Inclusive Tashkent days the numbers cover (`YYYY-MM-DD`). */
  from: string;
  to: string;
  bucket: DashboardBucket;
  /** Human label of the bucket size, e.g. "Soatlar bo‘yicha". */
  axisNote: string;
  /** Three evenly spaced x-axis labels. */
  axisLabels: [string, string, string];
  series: SeriesPoint[];
  /** Orders of the period of the same length just before (contract §2.10). */
  previousPeriodOrders: number;
  stats: {
    /** Σ of every bucket (the chart may show a window of them). */
    orders: number;
    revenue: number;
    newCustomers: number;
    ordersNote: string;
    totalCustomers: number;
    deletedCustomers: number;
    outOfStock: number;
  };
  attention: {
    btsFailed: number;
    pendingAppointments: number;
    nextAppointmentAt: string | null;
    newFromBillz: number;
    /** Refunds in unknown | manual_required, and failed ones that still need staff (§2.10). */
    refundsNeedingAction: number;
    /**
     * The last BTS polling run tracked no parcel or stopped on transport
     * failures (M2): order statuses from BTS are not being updated.
     */
    btsPollingFailing: boolean;
    /**
     * No cashback policy version is in force (gap CB-9.2.4): purchases
     * confirmed meanwhile earn no cashback until staff add one.
     */
    cashbackPolicyMissing: boolean;
  };
}

/** Longest custom range, in days, inclusive (contract §2.10). */
export const CUSTOM_RANGE_MAX_DAYS = 366;

/** Field messages of `dashboard/?range=custom` (contract §1.6 generic codes). */
export const RANGE_MESSAGES = {
  required: "Majburiy maydon.",
  invalid: "Noto‘g‘ri qiymat.",
} as const;

export type CustomRangeErrors = Partial<Record<"from" | "to", string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(isoDate: string): number | null {
  if (!ISO_DATE.test(isoDate)) return null;
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== isoDate) return null;
  return ms / 86_400_000;
}

/**
 * The backend's custom-range rules, checked in its order so the screen
 * answers like the API would: a missing day → `required` on that field;
 * `from > to` → `invalid` on `from`; `to` after today (Tashkent) or more
 * than 366 days inclusive → `invalid` on `to`. A malformed day is `invalid`.
 * Returns `{}` when the range is valid.
 */
export function validateCustomRange(
  from: string | undefined,
  to: string | undefined,
  today: string,
): CustomRangeErrors {
  const errors: CustomRangeErrors = {};
  if (!from) errors.from = RANGE_MESSAGES.required;
  if (!to) errors.to = RANGE_MESSAGES.required;
  if (errors.from || errors.to) return errors;
  const a = dayNumber(from!);
  const b = dayNumber(to!);
  if (a === null) errors.from = RANGE_MESSAGES.invalid;
  if (b === null) errors.to = RANGE_MESSAGES.invalid;
  if (a === null || b === null) return errors;
  if (a > b) return { from: RANGE_MESSAGES.invalid };
  const t = dayNumber(today);
  if (t !== null && b > t) return { to: RANGE_MESSAGES.invalid };
  if (b - a + 1 > CUSTOM_RANGE_MAX_DAYS) return { to: RANGE_MESSAGES.invalid };
  return {};
}

/** Inclusive length of a valid range in days. */
export function rangeDays(from: string, to: string): number {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === null || b === null ? 0 : b - a + 1;
}

/** `hour` buckets for spans of at most two days, else `day` (contract §2.10). */
export function customBucket(from: string, to: string): DashboardBucket {
  return rangeDays(from, to) <= 2 ? "hour" : "day";
}
