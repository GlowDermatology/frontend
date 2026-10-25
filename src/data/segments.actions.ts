"use server";

import { z } from "zod";

import { SEGMENT_MEMBERS_MAX, parseMemberList, type Segment } from "@/domain/segment";

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
 * group), add members (`POST segments/{id}/members/` with ≤500 customer ids)
 * and remove a manual member (409 `conflict` for a rule-only member). Mock
 * bodies live in `./mock/segments.actions.ts`.
 */

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const NOT_FOUND: ActionFailure = { ok: false, error: "Guruh topilmadi.", code: "not_found" };
const apiId = (value: string) => /^\d{1,12}$/.test(value);

/** `customer_ids` and its elements are the dialog's single "members" field. */
const MEMBERS_REMAP: FieldRemap = { customer_ids: "members", "customer_ids.*": "members" };

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

const PHONES_NEED_CUSTOMERS =
  "Telefon bo‘yicha qo‘shish mijozlar ro‘yxati API orqali ulangach ishlaydi. Hozircha mijoz ID sini kiriting.";

/**
 * `list` is what the admin typed: customer ids and/or phones (comma, semicolon or
 * newline separated), ≤500. Phones are resolved to customers in mock mode;
 * the API takes ids only (`customer_ids`), and the customers list that would
 * resolve a phone is not on the backend yet, so api mode asks for ids.
 */
export async function addSegmentMembers(
  id: string,
  list: string,
  key: string,
  csrf: string,
): Promise<ActionResult<Segment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return NOT_FOUND;
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  if (typeof list !== "string" || list.length > 20_000) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: { members: "Ro‘yxat juda uzun." },
    };
  }
  const { ids, phones, invalid, incomplete } = parseMemberList(list);
  const fail = (message: string): ActionFailure => ({
    ok: false,
    error: "Maydonlarni tekshiring.",
    fieldErrors: { members: message },
  });
  if (incomplete.length > 0) {
    return fail(`Telefonni to‘liq kiriting: ${incomplete.slice(0, 3).join(", ")}`);
  }
  if (invalid.length > 0) return fail(`Noto‘g‘ri qiymat: ${invalid.slice(0, 3).join(", ")}`);
  if (ids.length + phones.length === 0) return fail("Mijoz ID yoki telefon raqamini kiriting.");
  if (ids.length + phones.length > SEGMENT_MEMBERS_MAX) {
    return fail(`Ko‘pi bilan ${SEGMENT_MEMBERS_MAX} ta.`);
  }
  if ((await dataSource()) === "api") {
    if (!apiId(parsedId.data)) return NOT_FOUND;
    if (phones.length > 0) return fail(PHONES_NEED_CUSTOMERS);
    return apiMutation("addSegmentMembers", async () => {
      try {
        const { data } = await apiAddSegmentMembers(
          sessionToken(guard.session),
          parsedId.data,
          ids.map(Number),
          parsedKey.data,
        );
        return { ok: true, data: mapSegment(data) };
      } catch (error) {
        return toActionResult(error, MEMBERS_REMAP);
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
