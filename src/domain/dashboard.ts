import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

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

/**
 * Order-state counters as the orders stand now (`dashboard.fulfilment`,
 * Yandex Delivery plan §3.10; not windowed by the range).
 */
export interface FulfilmentCounters {
  /** Processing orders still to be prepared (Yandex awaiting a courier, BTS, pickup). */
  paidToPrepare: number;
  /** Processing Yandex orders whose courier is requested, assigned or arrived. */
  toHandToCourier: number;
  /** Handed to the courier and not coming back. */
  inDelivery: number;
  /** Yandex `returning` / `returned` while the order is open. */
  returning: number;
  /** Delivered today (Tashkent), pickup included. */
  completedToday: number;
  /** Open delivery issues. */
  needsAction: number;
  /** Open urgent delivery issues. */
  urgent: number;
}

export interface DashboardData {
  range: DashboardRange | "custom";
  /** Inclusive Tashkent days the numbers cover (`YYYY-MM-DD`). */
  from: string;
  to: string;
  bucket: DashboardBucket;
  /** Label of the bucket size in the admin language, e.g. "Soatlar bo‘yicha". */
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
    /**
     * Yandex Delivery is live and its last status poll or price check failed
     * (always false in fake mode): quotes and statuses are not moving.
     */
    yandexFailing: boolean;
  };
  /** `null` when the API predates Yandex Delivery (no tiles then). */
  fulfilment: FulfilmentCounters | null;
}

/** Longest custom range, in days, inclusive (contract §2.10). */
export const CUSTOM_RANGE_MAX_DAYS = 366;

/** Field messages of `dashboard/?range=custom` (contract §1.6 generic codes), Uzbek. */
export const RANGE_MESSAGES = {
  required: validationCopy.uz.required,
  invalid: validationCopy.uz.invalid,
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
  locale: Locale = "uz",
): CustomRangeErrors {
  const m = validationCopy[locale];
  const errors: CustomRangeErrors = {};
  if (!from) errors.from = m.required;
  if (!to) errors.to = m.required;
  if (errors.from || errors.to) return errors;
  const a = dayNumber(from!);
  const b = dayNumber(to!);
  if (a === null) errors.from = m.invalid;
  if (b === null) errors.to = m.invalid;
  if (a === null || b === null) return errors;
  if (a > b) return { from: m.invalid };
  const t = dayNumber(today);
  if (t !== null && b > t) return { to: m.invalid };
  if (b - a + 1 > CUSTOM_RANGE_MAX_DAYS) return { to: m.invalid };
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
