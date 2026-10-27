"use server";

import { z } from "zod";

import {
  SEGMENT_MEMBERS_MAX,
  parseMemberEntry,
  type MemberRef,
  type Segment,
} from "@/domain/segment";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiAddSegmentMembers,
  apiCreateSegment,
  apiDeleteSegment,
  apiPatchSegment,
  apiRemoveSegmentMember,
} from "./api/admin";
import { toActionResult, type FieldRemap } from "./api/mappers/errors";
import { mapSegment, segmentCreateBody, segmentPatchBody } from "./api/mappers/segments";
import * as mock from "./mock/segments.actions";
import { segmentFormSchema, type SegmentFormValues } from "./segments.schema";
import { dataSource } from "./source";
import type { ActionFailure, ActionResult } from "./types";

/**
 * Customer group mutations (contract §2.8): create (`POST segments/`), update
 * (`PATCH segments/{id}/` with only what changed against the group the dialog
 * loaded), delete (409 `conflict` while a scheduled campaign targets the
 * group), add members (`POST segments/{id}/members/` with customer ids and/or phones)
 * and remove a manual member (409 `conflict` for a rule-only member). Mock
 * bodies live in `./mock/segments.actions.ts`.
 */

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const NOT_FOUND: ActionFailure = { ok: false, error: "Guruh topilmadi.", code: "not_found" };
const apiId = (value: string) => /^\d{1,12}$/.test(value);

export async function createSegment(
  values: SegmentFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<Segment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = segmentFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") {
    return apiMutation("createSegment", async () => {
      try {
        const { data } = await apiCreateSegment(
          sessionToken(guard.session),
          segmentCreateBody(parsed.data),
          parsedKey.data,
        );
        return { ok: true, data: mapSegment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.createSegment(parsed.data);
}

/** `baseline` = the group as the dialog loaded it; only the differences are sent. */
export async function updateSegment(
  id: string,
  values: SegmentFormValues,
  baseline: SegmentFormValues,
  key: string,
  csrf: string,
): Promise<ActionResult<Segment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = segmentFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  // The baseline only decides what is sent; a malformed one sends everything.
  const parsedBaseline = segmentFormSchema.safeParse(baseline);
  const base = parsedBaseline.success
    ? parsedBaseline.data
    : { name: "", rules: { minOnlineOrders: -1, minLifetimeAmount: -1 } };
  if ((await dataSource()) === "api") {
    if (!apiId(parsedId.data)) return NOT_FOUND;
    return apiMutation("updateSegment", async () => {
      try {
        const { data } = await apiPatchSegment(
          sessionToken(guard.session),
          parsedId.data,
          segmentPatchBody(base, parsed.data),
          parsedKey.data,
        );
        return { ok: true, data: mapSegment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateSegment(parsedId.data, parsed.data);
}

export async function deleteSegment(
  id: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  if ((await dataSource()) === "api") {
    if (!apiId(parsedId.data)) return NOT_FOUND;
    return apiMutation("deleteSegment", async () => {
      try {
        await apiDeleteSegment(sessionToken(guard.session), parsedId.data);
        return { ok: true, data: { id: parsedId.data } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.deleteSegment(parsedId.data);
}

const MEMBER_ROW_MESSAGES = {
  incomplete: "Telefonni to‘liq kiriting.",
  invalid: "ID yoki telefon raqamini to‘g‘ri kiriting.",
  tooLong: "Juda uzun.",
} as const;

/**
 * Reads the dialog's rows (one customer id or phone each, contract §2.8):
 * ids and E.164 phones, de-duplicated, each remembering the first row that
 * named it, so a server error on `phones.{i}` / `customer_ids.{i}` lands on
 * that row. Rows that are not an id or a whole phone are refused here,
 * under `entries.{row}`.
 */
function readMemberRows(
  entries: unknown,
): { ok: true; ids: MemberRef[]; phones: MemberRef[] } | ActionFailure {
  const fail = (fieldErrors: Record<string, string>): ActionFailure => ({
    ok: false,
    error: "Maydonlarni tekshiring.",
    code: "validation_error",
    fieldErrors,
  });
  if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
    return fail({ members: "Mijoz ID yoki telefon raqamini kiriting." });
  }
  const rows = entries as string[];
  if (rows.length > SEGMENT_MEMBERS_MAX)
    return fail({ members: `Ko‘pi bilan ${SEGMENT_MEMBERS_MAX} ta.` });
  const ids = new Map<string, number>();
  const phones = new Map<string, number>();
  const errors: Record<string, string> = {};
  rows.forEach((raw, row) => {
    if (raw.length > 64) {
      errors[`entries.${row}`] = MEMBER_ROW_MESSAGES.tooLong;
      return;
    }
    const entry = parseMemberEntry(raw);
    if (entry.kind === "id") {
      if (!ids.has(entry.value)) ids.set(entry.value, row);
    } else if (entry.kind === "phone") {
      if (!phones.has(entry.value)) phones.set(entry.value, row);
    } else if (entry.kind === "incomplete" || entry.kind === "invalid") {
      errors[`entries.${row}`] = MEMBER_ROW_MESSAGES[entry.kind];
    }
  });
  if (Object.keys(errors).length > 0) return fail(errors);
  if (ids.size + phones.size === 0)
    return fail({ members: "Mijoz ID yoki telefon raqamini kiriting." });
  const refs = (map: Map<string, number>) => [...map].map(([value, row]) => ({ value, row }));
  return { ok: true, ids: refs(ids), phones: refs(phones) };
}

/**
 * `phones.{i}` / `customer_ids.{i}` → the input row of that element; a
 * list-level error (`customer_ids` `required` / `max_items` / `does_not_exist`,
 * `phones` `max_items`) is the dialog's form-level `members` message.
 */
function memberRemap(ids: MemberRef[], phones: MemberRef[]): FieldRemap {
  const remap: FieldRemap = { customer_ids: "members", phones: "members" };
  ids.forEach((ref, index) => (remap[`customer_ids.${index}`] = `entries.${ref.row}`));
  phones.forEach((ref, index) => (remap[`phones.${index}`] = `entries.${ref.row}`));
  // An index outside what was sent cannot happen; keep it visible rather than drop it.
  remap["customer_ids.*"] = "members";
  remap["phones.*"] = "members";
  return remap;
}

/**
 * `entries` are the dialog's rows: one customer id or phone each (a spaced
 * national phone such as "90 123 45 67" or "+998 90 123 45 67" is one
 * phone), ≤500 in all. Both modes resolve phones: api mode sends
 * `{customer_ids, phones}` (only the non-empty lists) and the backend
 * resolves each phone to an active customer; per-element errors come back on
 * `entries.{row}`.
 */
export async function addSegmentMembers(
  id: string,
  entries: string[],
  key: string,
  csrf: string,
): Promise<ActionResult<Segment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const read = readMemberRows(entries);
  if (!read.ok) return read;
  const { ids, phones } = read;
  if ((await dataSource()) === "api") {
    if (!apiId(parsedId.data)) return NOT_FOUND;
    return apiMutation("addSegmentMembers", async () => {
      try {
        const { data } = await apiAddSegmentMembers(
          sessionToken(guard.session),
          parsedId.data,
          {
            ...(ids.length > 0 && { customer_ids: ids.map((ref) => Number(ref.value)) }),
            ...(phones.length > 0 && { phones: phones.map((ref) => ref.value) }),
          },
          parsedKey.data,
        );
        return { ok: true, data: mapSegment(data) };
      } catch (error) {
        return toActionResult(error, memberRemap(ids, phones));
      }
    });
  }
  return mock.addSegmentMembers(parsedId.data, ids, phones);
}

export async function removeSegmentMember(
  id: string,
  customerId: string,
  csrf: string,
): Promise<ActionResult<{ id: string; customerId: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = idSchema.safeParse(id);
  const parsedCustomer = idSchema.safeParse(customerId);
  if (!parsedId.success || !parsedCustomer.success) return NOT_FOUND;
  if ((await dataSource()) === "api") {
    if (!apiId(parsedId.data) || !apiId(parsedCustomer.data)) return NOT_FOUND;
    return apiMutation("removeSegmentMember", async () => {
      try {
        await apiRemoveSegmentMember(
          sessionToken(guard.session),
          parsedId.data,
          parsedCustomer.data,
        );
        return { ok: true, data: { id: parsedId.data, customerId: parsedCustomer.data } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.removeSegmentMember(parsedId.data, parsedCustomer.data);
}
