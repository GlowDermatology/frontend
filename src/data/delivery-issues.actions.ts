"use server";

import { z } from "zod";

import { deliveryIssueCopy } from "@/domain/copy/delivery-issues";
import {
  ISSUE_NOTE_MAX,
  ISSUE_NOTE_MIN,
  SUSPENSION_NOTE_MAX,
  type DeliveryIssue,
  type DispatchSuspension,
} from "@/domain/delivery-issue";
import { DELIVERY_ISSUE_KINDS, type DeliveryIssueKind } from "@/domain/order";

import { getAdminLocale } from "@/lib/i18n/admin-locale";
import { localized } from "@/lib/i18n/localized";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { apiMutation, fieldErrorsFrom, guardAction, sessionToken } from "./action-guard";
import {
  apiListDeliveryIssuesFresh,
  apiOpenIncident,
  apiResolveIssue,
  apiSetSuspension,
} from "./api/delivery";
import {
  issueListParams,
  mapDeliveryIssue,
  mapSuspension,
  suspensionBody,
} from "./api/mappers/delivery-issues";
import { toActionResult } from "./api/mappers/errors";
import * as mock from "./mock/delivery-issues.actions";
import * as mockQueries from "./mock/delivery-issues.queries";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Delivery exception queue mutations (Yandex Delivery plan §3.9,
 * INTERFACES-ops). Same convention as the other actions: ids + the change +
 * the dialog's idempotency key + the `gd_csrf` token; zod re-validation with
 * the backend's limits and messages; the mock bodies in
 * `./mock/delivery-issues.actions.ts`. Refusals keep the backend's code:
 * 404 `not_found`, 409 `conflict` (issue already resolved; incident on a
 * pickup order), 400 `validation_error` on `note` / `until` (`in_past`).
 */

const idSchema = z.int().positive();

/** An aware instant (`2026-10-25T18:00:00+05:00`); the API refuses a naive one. */
const AWARE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** The actions' input rules with the backend's limits; messages in the admin language. */
const issueActionSchemas = localized(validationCopy, (v) => {
  const key = z.uuid({ error: v.requestKey });
  const note = z
    .string()
    .trim()
    .min(1, v.required)
    .min(ISSUE_NOTE_MIN, v.minChars(ISSUE_NOTE_MIN))
    .max(ISSUE_NOTE_MAX, v.maxChars(ISSUE_NOTE_MAX));
  return {
    resolve: z.object({ issueId: idSchema, note, key }),
    incident: z.object({ orderId: idSchema, note, urgent: z.boolean(), key }),
    suspension: z.object({
      suspended: z.boolean(),
      until: z
        .string()
        .regex(AWARE, v.invalid)
        .refine((value) => !Number.isNaN(Date.parse(value)), v.invalid)
        .nullable(),
      note: z.string().trim().max(SUSPENSION_NOTE_MAX, v.maxChars(SUSPENSION_NOTE_MAX)),
      key,
    }),
  };
});

/** The admin language of this request, its messages and its rules. */
async function requestLanguage() {
  const locale = await getAdminLocale();
  return { locale, m: deliveryIssueCopy[locale], schemas: issueActionSchemas[locale] };
}

export async function resolveDeliveryIssue(
  issueId: number,
  note: string,
  key: string,
  csrf: string,
): Promise<ActionResult<DeliveryIssue>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas } = await requestLanguage();
  const parsed = schemas.resolve.safeParse({ issueId, note, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("resolveDeliveryIssue", async () => {
      try {
        const { data } = await apiResolveIssue(
          sessionToken(guard.session),
          input.issueId,
          { note: input.note },
          input.key,
        );
        return { ok: true, data: mapDeliveryIssue(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.resolveIssue(input.issueId, input.note, locale);
}

export interface OpenedIncident {
  issue: DeliveryIssue;
  /** `true`: 201, a new incident; `false`: 200, the open one was refreshed. */
  created: boolean;
}

export async function openDeliveryIncident(
  orderId: number,
  note: string,
  urgent: boolean,
  key: string,
  csrf: string,
): Promise<ActionResult<OpenedIncident>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas } = await requestLanguage();
  const parsed = schemas.incident.safeParse({ orderId, note, urgent, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("openDeliveryIncident", async () => {
      try {
        const { status, data } = await apiOpenIncident(
          sessionToken(guard.session),
          input.orderId,
          { kind: "incident", note: input.note, urgent: input.urgent },
          input.key,
        );
        return { ok: true, data: { issue: mapDeliveryIssue(data), created: status === 201 } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.openIncident(input.orderId, input.note, input.urgent, locale);
}

export interface SuspensionInput {
  suspended: boolean;
  /** Aware instant, or `null` = until lifted by hand; ignored when resuming. */
  until: string | null;
  note: string;
}

export async function updateDispatchSuspension(
  input: SuspensionInput,
  key: string,
  csrf: string,
): Promise<ActionResult<DispatchSuspension>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas } = await requestLanguage();
  const parsed = schemas.suspension.safeParse({ ...input, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const value = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("updateDispatchSuspension", async () => {
      try {
        const { data } = await apiSetSuspension(
          sessionToken(guard.session),
          suspensionBody(value),
          value.key,
        );
        return { ok: true, data: mapSuspension(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.setDispatchSuspension(value.suspended, value.until, value.note, locale);
}

const openIssueSchema = z.object({ orderId: idSchema, kind: z.enum(DELIVERY_ISSUE_KINDS) });

/**
 * The order's open issue of `kind` with its `details` (the order card's
 * `open_issues` carry no details), read fresh for the dispatch dialog's price
 * review (`dispatch_review`: offer, estimate, paid fee, the exceeded limit).
 * `null` when none is open. A read: no key, no refresh.
 */
export async function loadOpenIssue(
  orderId: number,
  kind: DeliveryIssueKind,
  csrf: string,
): Promise<ActionResult<DeliveryIssue | null>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = openIssueSchema.safeParse({ orderId, kind });
  if (!parsed.success) {
    return { ok: false, error: (await requestLanguage()).m.notFound, code: "not_found" };
  }
  const query = {
    state: "open" as const,
    kind: parsed.data.kind,
    order: parsed.data.orderId,
    page: 1,
    pageSize: 20 as const,
  };
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiListDeliveryIssuesFresh(
        sessionToken(guard.session),
        issueListParams(query),
      );
      const row = data.results.find(
        (issue) => issue.order_id === query.order && issue.kind === query.kind,
      );
      return { ok: true, data: row ? mapDeliveryIssue(row) : null };
    } catch (error) {
      return toActionResult(error);
    }
  }
  const page = await mockQueries.listDeliveryIssues(query);
  return { ok: true, data: page.items.find((issue) => issue.orderId === query.order) ?? null };
}
