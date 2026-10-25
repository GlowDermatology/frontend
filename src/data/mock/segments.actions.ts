import type { Segment } from "@/domain/segment";

import { referenceNow } from "../config";
import type { SegmentFormValues } from "../segments.schema";
import type { ActionFailure, ActionResult } from "../types";
import { delay } from "./delay";
import { CUSTOMERS } from "./people";
import { MOCK_MEMBERS, MOCK_SEGMENTS } from "./segments";

/**
 * Mock implementation of `src/data/segments.actions.ts`: the backend's rules
 * and messages (unique name, the scheduled-campaign and rule-member 409s,
 * unknown customers) checked against the fixtures; nothing is persisted.
 */

const NOT_FOUND: ActionFailure = { ok: false, error: "Guruh topilmadi.", code: "not_found" };

/** The seeded "Doimiy mijozlar" group has a scheduled campaign (notification 4). */
const SCHEDULED_TARGETS = new Set(["1"]);

function uniqueName(name: string, exceptId?: string): ActionFailure | null {
  const taken = MOCK_SEGMENTS.some(
    (s) => s.id !== exceptId && s.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return taken
    ? {
        ok: false,
        error: "Maydonlarni tekshiring.",
        code: "validation_error",
        fieldErrors: { name: "Bu qiymat band." },
      }
    : null;
}

export async function createSegment(values: SegmentFormValues): Promise<ActionResult<Segment>> {
  await delay(400);
  const taken = uniqueName(values.name);
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
  if (!segment) return NOT_FOUND;
  const taken = uniqueName(values.name, id);
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
  if (!MOCK_SEGMENTS.some((s) => s.id === id)) return NOT_FOUND;
  if (SCHEDULED_TARGETS.has(id)) {
    return { ok: false, error: "Rejalashtirilgan xabar bu guruhga yuboriladi.", code: "conflict" };
  }
  return { ok: true, data: { id } };
}

export async function addSegmentMembers(
  id: string,
  ids: string[],
  phones: string[],
): Promise<ActionResult<Segment>> {
  await delay(400);
  const segment = MOCK_SEGMENTS.find((s) => s.id === id);
  if (!segment) return NOT_FOUND;
  const byPhone = phones.map((phone) => CUSTOMERS.find((c) => c.phone === phone)?.id);
  const resolved = [...ids, ...byPhone];
  if (resolved.some((cid) => !cid || !CUSTOMERS.some((c) => c.id === cid))) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { members: "Topilmadi." },
    };
  }
  const known = new Set(MOCK_MEMBERS[id]?.members.map((m) => m.id));
  const added = new Set(resolved.filter((cid) => cid && !known.has(cid))).size;
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
  const entry = MOCK_MEMBERS[id];
  if (!entry || !entry.members.some((m) => m.id === customerId)) {
    return { ok: false, error: "Topilmadi.", code: "not_found" };
  }
  if (!entry.manual.includes(customerId)) {
    return { ok: false, error: "Mijoz guruhga qoida orqali kiradi.", code: "conflict" };
  }
  return { ok: true, data: { id, customerId } };
}
