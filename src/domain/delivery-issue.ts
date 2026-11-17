/**
 * The delivery exception queue ("Muammolar", Yandex Delivery plan §3.9) and
 * the courier-dispatch switch. Framework-free; the mappers turn the admin
 * API's `DeliveryIssue` / `Suspension` into these shapes.
 */
import type { Locale } from "@/lib/i18n/locales";

import { deliveryIssueCopy } from "./copy/delivery-issues";
import type { DeliveryIssueKind } from "./order";

export const ISSUE_STATES = ["open", "resolved"] as const;
export type IssueState = (typeof ISSUE_STATES)[number];

export interface IssueActor {
  id: string;
  name: string;
}

/** One row of `GET delivery/issues/`. */
export interface DeliveryIssue {
  id: number;
  orderId: number;
  kind: DeliveryIssueKind;
  code: string;
  urgent: boolean;
  /** Ids and amounts only (never contacts): shown as a short list. */
  details: Record<string, unknown>;
  /** The staff note of an incident (empty for the system's issues). */
  note: string;
  state: IssueState;
  openedAt: string;
  updatedAt: string;
  remindedAt: string | null;
  reminders: number;
  resolvedAt: string | null;
  /** `null` while open, or when the system closed it. */
  resolvedBy: IssueActor | null;
  resolutionNote: string;
}

/** `GET/POST delivery/suspension/`: `suspended` is in effect now (`until` passed → `false`). */
export interface DispatchSuspension {
  suspended: boolean;
  until: string | null;
  note: string;
  updatedAt: string;
}

/** An open urgent issue, as the 30 s poll reports it (toasts and the badge). */
export interface IssueAlert {
  id: number;
  orderId: number;
  kind: DeliveryIssueKind;
  code: string;
  openedAt: string;
}

/** What the shell polls: the open count (`nav-counts.delivery_issues_open`) and the urgent ones. */
export interface IssueAlerts {
  open: number;
  urgent: IssueAlert[];
}

/** Limits of the API's request bodies (`ResolveIssueRequest`, `OpenIssueRequest`, `SuspensionBodyRequest`). */
export const ISSUE_NOTE_MIN = 3;
export const ISSUE_NOTE_MAX = 1000;
export const SUSPENSION_NOTE_MAX = 300;

const MONEY_KEY = /(price|fee|amount|total|difference|cost|increase|loss)$/;
const WEIGHT_KEY = /_g$/;

export interface IssueDetailLine {
  key: string;
  label: string;
  /** Raw value; the screen formats money (`money`) and grams (`grams`). */
  value: string | number | boolean;
  kind: "money" | "grams" | "text";
}

/**
 * The `details` object as label/value lines: scalars only (a nested value is
 * skipped, `null` and `""` too), money keys marked for so‘m formatting —
 * the amounts are the server's, never recomputed here.
 */
export function issueDetailLines(details: unknown, locale: Locale = "uz"): IssueDetailLine[] {
  // Names of the `details` keys the backend writes; others are shown as their key.
  const names = deliveryIssueCopy[locale].detail as Record<string, string>;
  if (typeof details !== "object" || details === null || Array.isArray(details)) return [];
  const lines: IssueDetailLine[] = [];
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (value === null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }
    const kind =
      typeof value === "number" && MONEY_KEY.test(key)
        ? "money"
        : typeof value === "number" && WEIGHT_KEY.test(key)
          ? "grams"
          : "text";
    lines.push({
      key,
      label: (Object.hasOwn(names, key) ? names[key] : undefined) ?? key,
      value,
      kind,
    });
  }
  return lines;
}

/** Page sizes of the «Muammolar» list (client-safe: the URL parser in the browser bundle reads them). */
export const ISSUE_PAGE_SIZES = [20, 50] as const;
export type IssuePageSize = (typeof ISSUE_PAGE_SIZES)[number];
