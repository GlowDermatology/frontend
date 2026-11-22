import type { Locale } from "@/lib/i18n/locales";

import {
  auditCopy,
  type AuditGroupKey,
  type AuditObjectGroupKey,
  type AuditObjectKey,
} from "./copy/audit";

/**
 * Audit log (contract §2.13, actions of §3.2). Labels come from `./copy/audit` in the admin
 * language (Uzbek by default); an action or object type the table does not know yet is shown as
 * the raw code, so a newer backend never breaks the screen.
 */

export interface AuditEntry {
  id: string;
  at: string;
  /** Staff display name; `null` = the system ("Tizim"). */
  actor: string | null;
  actorId: string | null;
  action: string;
  objectType: string;
  /** Always a string on the API (slugs); `""` when the action has no object. */
  objectId: string;
  /** Action-specific payload; shown as escaped, indented JSON. */
  data: unknown;
  ip: string | null;
  requestId: string;
}

/**
 * Every labelled action (uz; `auditCopy` holds ru and en): §3.2 incl. the M1d appointment and
 * override additions, the M3 operations actions, the staff invite/MFA actions and the ops
 * console's own entries (superusers only).
 */
export const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = auditCopy.uz.actions;

/** Object type labels (uz). */
export const AUDIT_OBJECT_LABELS: Readonly<Record<string, string>> = auditCopy.uz.objects;

const MODEL_PREFIXES = [
  "location.",
  "professional.",
  "service.",
  "working_hours.",
  "blocked_period.",
  "working_hours_override.",
  "schedule.",
];

/**
 * Groups for the action filter, in the §3.2 order. An action a group lists in `actions` belongs
 * there whatever its prefix: §3.2 puts the two M3 `billz.` repair actions in the System row, not
 * under Catalog.
 */
export const AUDIT_ACTION_GROUPS: ReadonlyArray<{
  key: AuditGroupKey;
  prefixes: string[];
  actions?: string[];
}> = [
  { key: "auth", prefixes: ["auth."] },
  { key: "staff", prefixes: ["staff."] },
  {
    key: "system",
    prefixes: ["outbox.", "integrations.", "report.", "console.", "ops.", "ops_access.", "pos."],
    actions: ["billz.sale_recorded_by_hand", "billz.payment_attempt_forgotten"],
  },
  { key: "orders", prefixes: ["order.", "refund.", "payment.", "delivery."] },
  { key: "catalog", prefixes: ["product.", "billz.", "category.", "banner.", "assistant."] },
  { key: "loyalty", prefixes: ["cashback.", "loyalty."] },
  { key: "customers", prefixes: ["customer."] },
  {
    key: "notifications",
    prefixes: ["notification.", "notification_template.", "segment.", "test_device."],
  },
  { key: "appointments", prefixes: ["appointment."] },
  { key: "specialists", prefixes: MODEL_PREFIXES },
  { key: "settings", prefixes: ["settings.", "export."] },
];

/** The labelled actions of each filter group: exact `actions` first, then prefixes. */
export function auditActionsByGroup(
  actions: readonly string[] = Object.keys(AUDIT_ACTION_LABELS),
  locale: Locale = "uz",
): Array<{ key: AuditGroupKey; label: string; actions: string[] }> {
  const exact = new Set(AUDIT_ACTION_GROUPS.flatMap((group) => group.actions ?? []));
  return AUDIT_ACTION_GROUPS.map((group) => ({
    key: group.key,
    label: auditCopy[locale].groups[group.key],
    actions: actions.filter((action) =>
      exact.has(action)
        ? (group.actions ?? []).includes(action)
        : group.prefixes.some((prefix) => action.startsWith(prefix)),
    ),
  }));
}

/** The label of an action in `locale` (Uzbek by default), or the raw code for an unknown one. */
export function auditActionLabel(action: string, locale: Locale = "uz"): string {
  return (auditCopy[locale].actions as Readonly<Record<string, string>>)[action] ?? action;
}

/** The label of an object type in `locale` (Uzbek by default), or the raw type. */
export function auditObjectLabel(objectType: string, locale: Locale = "uz"): string {
  return (auditCopy[locale].objects as Readonly<Record<string, string>>)[objectType] ?? objectType;
}

/** The actor cell of a row: the staff member's name, or «Tizim» for the system. */
export function auditActorLabel(actor: string | null, locale: Locale = "uz"): string {
  return actor ?? auditCopy[locale].system;
}

/** Groups of the object type filter, each with the types it lists. */
export const AUDIT_OBJECT_GROUPS: ReadonlyArray<{
  key: AuditObjectGroupKey;
  types: ReadonlyArray<AuditObjectKey>;
}> = [
  { key: "people", types: ["staff", "auth_session"] },
  {
    key: "sales",
    types: [
      "order",
      "refund",
      "payment",
      "delivery_issue",
      "delivery_settings",
      "warehouse_hours",
      "warehouse_closure",
    ],
  },
  {
    key: "catalog",
    types: [
      "product",
      "category",
      "banner",
      "job",
      "assistant_settings",
      "assistant_provider",
      "assistant_prompt",
    ],
  },
  {
    key: "customers",
    types: ["customer", "policy_version", "cashback_policy", "loyalty", "loyalty_account"],
  },
  {
    key: "notifications",
    types: ["campaign", "notification_template", "test_device", "segment"],
  },
  {
    key: "appointments",
    types: [
      "appointment",
      "location",
      "professional",
      "service",
      "working_hours",
      "blocked_period",
      "working_hours_override",
    ],
  },
  {
    key: "settings",
    types: [
      "settings",
      "orders",
      "payments",
      "products",
      "categories",
      "banners",
      "customers",
      "notifications",
      "segments",
      "audit-log",
    ],
  },
  {
    key: "system",
    types: ["pos_device", "outbox", "outbox_topic", "webhook_inbox", "integration", "report"],
  },
];

/* --- Visibility tiers (`GET audit-log/facets/`, DESIGN §D) --- */

export type AuditViewerTier = "staff" | "manager" | "superuser";

/** What the signed-in staff member may see in the log; filters outside it are not offered. */
export interface AuditFacets {
  tier: AuditViewerTier;
  /** Whether the IP column (and network keys in `data`) are shown. */
  ipVisible: boolean;
  /** Action prefixes (before the first dot) the viewer sees entries of. */
  visiblePrefixes: ReadonlyArray<string>;
  /** Visible prefixes limited to the viewer's own entries (staff sign-ins, exports). */
  ownOnlyPrefixes: ReadonlyArray<string>;
  /** Actions hidden although their prefix is visible (operator-only fixes). */
  hiddenActions: ReadonlyArray<string>;
}

/** Every prefix the label table knows (the superuser's view in mock mode). */
export function knownAuditPrefixes(): string[] {
  return [...new Set(Object.keys(AUDIT_ACTION_LABELS).map(auditActionPrefix))].sort();
}

/** The superuser's facets: everything, IPs included (mock mode, and the fallback of an old API). */
export function fullAuditFacets(): AuditFacets {
  return {
    tier: "superuser",
    ipVisible: true,
    visiblePrefixes: knownAuditPrefixes(),
    ownOnlyPrefixes: [],
    hiddenActions: [],
  };
}

/** `appointment.created` → `appointment`. */
export function auditActionPrefix(action: string): string {
  const dot = action.indexOf(".");
  return dot === -1 ? action : action.slice(0, dot);
}

/** Whether the action filter offers `action` to this viewer. */
export function auditActionVisible(action: string, facets: AuditFacets): boolean {
  return (
    facets.visiblePrefixes.includes(auditActionPrefix(action)) &&
    !facets.hiddenActions.includes(action)
  );
}

/**
 * Object types only some tiers can meet: the type is offered when any of its prefixes is
 * visible. Types not listed are written by business actions and always offered.
 */
const OBJECT_PREFIXES: Readonly<Partial<Record<AuditObjectKey, ReadonlyArray<string>>>> = {
  staff: ["auth", "staff"],
  auth_session: ["auth"],
  pos_device: ["pos"],
  outbox: ["outbox", "ops"],
  outbox_topic: ["ops"],
  webhook_inbox: ["integrations"],
  integration: ["integrations", "ops"],
  report: ["report", "ops"],
  orders: ["export"],
  payments: ["export"],
  products: ["export"],
  categories: ["export"],
  banners: ["export"],
  customers: ["export"],
  notifications: ["export"],
  segments: ["export"],
  "audit-log": ["export"],
};

/** Whether the object type filter offers `objectType` to this viewer. */
export function auditObjectVisible(objectType: string, facets: AuditFacets): boolean {
  const prefixes = OBJECT_PREFIXES[objectType as AuditObjectKey];
  return !prefixes || prefixes.some((prefix) => facets.visiblePrefixes.includes(prefix));
}

/** The visible actions, in filter groups (empty groups dropped). */
export function visibleAuditActionGroups(
  facets: AuditFacets,
  locale: Locale = "uz",
): Array<{ key: AuditGroupKey; label: string; actions: string[] }> {
  const actions = Object.keys(AUDIT_ACTION_LABELS).filter((a) => auditActionVisible(a, facets));
  return auditActionsByGroup(actions, locale).filter((group) => group.actions.length > 0);
}

/** The visible object types, in filter groups (empty groups dropped). */
export function visibleAuditObjectGroups(
  facets: AuditFacets,
  locale: Locale = "uz",
): Array<{ key: AuditObjectGroupKey; label: string; types: string[] }> {
  return AUDIT_OBJECT_GROUPS.map((group) => ({
    key: group.key,
    label: auditCopy[locale].objectGroups[group.key],
    types: group.types.filter((type) => auditObjectVisible(type, facets)),
  })).filter((group) => group.types.length > 0);
}

/* --- Request id (`?request_id=`, backend: 8–64 of `[A-Za-z0-9-]`, prefix match) --- */

export const AUDIT_REQUEST_ID_MIN = 8;
export const AUDIT_REQUEST_ID_MAX = 64;
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** The trimmed request id, or `undefined` when the backend would refuse it. */
export function parseAuditRequestId(raw: string | undefined | null): string | undefined {
  const value = raw?.trim() ?? "";
  return REQUEST_ID.test(value) ? value : undefined;
}

/** Why a typed request id cannot be searched (`null` = fine or empty). */
export function auditRequestIdProblem(raw: string): "short" | "chars" | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^[A-Za-z0-9-]*$/.test(value)) return "chars";
  if (value.length < AUDIT_REQUEST_ID_MIN) return "short";
  return null;
}

/** The data payload as indented JSON text (rendered as text, never as HTML). */
export function auditDataText(data: unknown): string {
  if (data === null || data === undefined) return "—";
  try {
    return JSON.stringify(data, null, 2) ?? "—";
  } catch {
    return String(data);
  }
}

export const AUDIT_ORDERINGS = ["-at", "at"] as const;
export type AuditOrdering = (typeof AUDIT_ORDERINGS)[number];

/** The URL filters of the audit log (they map 1:1 to the API's query parameters). */
export interface AuditFilters {
  actor?: string;
  action?: string;
  objectType?: string;
  objectId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Prefix of a request id (`request_id`, 8–64 of `[A-Za-z0-9-]`). */
  requestId?: string;
  ordering: AuditOrdering;
  page: number;
}
