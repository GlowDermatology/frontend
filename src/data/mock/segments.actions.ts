import { segmentCopy } from "@/domain/copy/segments";
import type { MemberRef, Segment } from "@/domain/segment";
import { copyFor } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import type { SegmentFormValues } from "../segments.schema";
import type { ActionFailure, ActionResult } from "../types";
import { delay } from "./delay";
import { DELETED_CUSTOMER_IDS } from "./customers";
import { CUSTOMERS } from "./people";
import { MOCK_MEMBERS, MOCK_SEGMENTS } from "./segments";

/**
 * Mock implementation of `src/data/segments.actions.ts`: the backend's rules
 * and messages (unique name, the scheduled-campaign and rule-member 409s,
 * unknown customers) checked against the fixtures; nothing is persisted.
 */

/** The backend's answers, in the admin language (the API sends them translated too). */
const texts = () => copyFor(segmentCopy);

const notFound = async (): Promise<ActionFailure> => ({
  ok: false,
  error: (await texts()).actions.notFound,
  code: "not_found",
});

/** The seeded "Doimiy mijozlar" group has a scheduled campaign (notification 4). */
const SCHEDULED_TARGETS = new Set(["1"]);

async function uniqueName(name: string, exceptId?: string): Promise<ActionFailure | null> {
  const t = await texts();
  const taken = MOCK_SEGMENTS.some(
    (s) => s.id !== exceptId && s.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return taken
    ? {
        ok: false,
        error: t.actions.checkFields,
        code: "validation_error",
        fieldErrors: { name: t.mock.nameTaken },
      }
    : null;
}

export async function createSegment(values: SegmentFormValues): Promise<ActionResult<Segment>> {
  await delay(400);
  const taken = await uniqueName(values.name);
  if (taken) return taken;
  const now = referenceNow().toISOString();
  return {
    ok: true,
    data: {
      id: `g-${crypto.randomUUID().slice(0, 8)}`,
      name: values.name,
      rules: { ...values.rules },
      manualMemberCount: 0,
      memberCount: 0,
      size: 0,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function updateSegment(
  id: string,
  values: SegmentFormValues,
): Promise<ActionResult<Segment>> {
  await delay(400);
  const segment = MOCK_SEGMENTS.find((s) => s.id === id);
  if (!segment) return notFound();
  const taken = await uniqueName(values.name, id);
  if (taken) return taken;
  return {
    ok: true,
    data: {
      ...segment,
      name: values.name,
      rules: { ...values.rules },
      updatedAt: referenceNow().toISOString(),
    },
  };
}

export async function deleteSegment(id: string): Promise<ActionResult<{ id: string }>> {
  await delay(400);
  if (!MOCK_SEGMENTS.some((s) => s.id === id)) return notFound();
  if (SCHEDULED_TARGETS.has(id)) {
    return { ok: false, error: (await texts()).mock.scheduled, code: "conflict" };
  }
  return { ok: true, data: { id } };
}

/**
 * The backend's resolution (contract §2.8): every id must exist (any status),
 * every phone must belong to an active customer; a miss is reported on the
 * input row that named it.
 */
export async function addSegmentMembers(
  id: string,
  ids: MemberRef[],
  phones: MemberRef[],
): Promise<ActionResult<Segment>> {
  await delay(400);
  const segment = MOCK_SEGMENTS.find((s) => s.id === id);
  if (!segment) return notFound();
  const t = await texts();
  const errors: Record<string, string> = {};
  const resolved = new Set<string>();
  for (const ref of ids) {
    if (CUSTOMERS.some((c) => c.id === ref.value)) resolved.add(ref.value);
    else errors[`entries.${ref.row}`] = t.mock.idNotFound;
  }
  for (const ref of phones) {
    const customer = CUSTOMERS.find((c) => c.phone === ref.value);
    if (customer && !DELETED_CUSTOMER_IDS.has(customer.id)) resolved.add(customer.id);
    else errors[`entries.${ref.row}`] = t.mock.phoneNotFound;
  }
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: t.actions.checkFields,
      code: "validation_error",
      fieldErrors: errors,
    };
  }
  const known = new Set(MOCK_MEMBERS[id]?.members.map((m) => m.id));
  const added = [...resolved].filter((cid) => !known.has(cid)).length;
  return {
    ok: true,
    data: {
      ...segment,
      manualMemberCount: segment.manualMemberCount + added,
      memberCount: segment.memberCount + added,
    },
  };
}

export async function removeSegmentMember(
  id: string,
  customerId: string,
): Promise<ActionResult<{ id: string; customerId: string }>> {
  await delay(400);
  const t = await texts();
  const entry = MOCK_MEMBERS[id];
  if (!entry || !entry.members.some((m) => m.id === customerId)) {
    return { ok: false, error: t.mock.memberNotFound, code: "not_found" };
  }
  if (!entry.manual.includes(customerId)) {
    return { ok: false, error: t.mock.ruleMember, code: "conflict" };
  }
  return { ok: true, data: { id, customerId } };
}
