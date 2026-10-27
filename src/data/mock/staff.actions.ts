import { STAFF_REFUSALS, type StaffAccountRow, type StaffCredentials } from "@/domain/staff";

import { referenceNow } from "../config";
import type { InviteStaffValues, UpdateStaffValues } from "../staff.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { MOCK_STAFF_ACCOUNTS } from "./staff";

/**
 * Mock implementation of `src/data/staff.actions.ts` (contract §2.16): the
 * backend's refusals computed from the fixtures (the caller is the demo
 * Administrator, id 1, a manager); nothing is kept.
 */

const SELF_ID = "1";
const byId = (id: string) => MOCK_STAFF_ACCOUNTS.find((row) => row.id === id) ?? null;
const notFound = { ok: false as const, error: "Topilmadi.", code: "not_found" };
const conflict = (error: string) => ({ ok: false as const, error, code: "conflict" });

/** Active managers other than `id`. */
const otherManagers = (id: string) =>
  MOCK_STAFF_ACCOUNTS.filter((row) => row.isActive && row.isManager && row.id !== id).length;

/** `xxxx-xxxx-xxxx-xxxx` from letters and digits without look-alikes (no 0 O 1 l I). */
function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]);
  return [0, 4, 8, 12].map((at) => chars.slice(at, at + 4).join("")).join("-");
}

export async function inviteStaff(
  values: InviteStaffValues,
): Promise<ActionResult<StaffCredentials>> {
  await delay(400);
  const email = values.email.trim().toLowerCase();
  if (MOCK_STAFF_ACCOUNTS.some((row) => row.email.toLowerCase() === email)) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { email: STAFF_REFUSALS.emailTaken },
    };
  }
  const fullName = values.fullName.trim();
  return {
    ok: true,
    data: {
      staff: {
        id: `draft-${crypto.randomUUID()}`,
        displayName: fullName || email,
        email,
        fullName,
        isActive: true,
        isManager: values.isManager,
        lastLoginAt: null,
        linkedProviders: [],
        createdAt: referenceNow().toISOString(),
      },
      temporaryPassword: temporaryPassword(),
    },
  };
}

function find(id: string, rows: ReadonlyArray<StaffAccountRow> | undefined) {
  return rows?.find((row) => row.id === id) ?? byId(id);
}

export async function updateStaff(
  id: string,
  values: UpdateStaffValues,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffAccountRow>> {
  await delay(300);
  const before = current ?? find(id, undefined);
  if (!before) return notFound;
  if (before.isManager && !values.isManager) {
    if (id === SELF_ID) return conflict(STAFF_REFUSALS.selfDemote);
    if (before.isActive && otherManagers(id) === 0) return conflict(STAFF_REFUSALS.lastManager);
  }
  const fullName = values.fullName.trim();
  return {
    ok: true,
    data: {
      ...before,
      fullName,
      displayName: fullName || before.email,
      isManager: values.isManager,
    },
  };
}

export async function setStaffActive(
  id: string,
  active: boolean,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffAccountRow>> {
  await delay(300);
  const before = current ?? find(id, undefined);
  if (!before) return notFound;
  if (!active) {
    if (id === SELF_ID) return conflict(STAFF_REFUSALS.selfDeactivate);
    if (before.isManager && before.isActive && otherManagers(id) === 0) {
      return conflict(STAFF_REFUSALS.lastManager);
    }
  }
  return { ok: true, data: { ...before, isActive: active } };
}

export async function resetStaffPassword(
  id: string,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffCredentials>> {
  await delay(400);
  const before = current ?? find(id, undefined);
  if (!before) return notFound;
  if (id === SELF_ID) return conflict(STAFF_REFUSALS.selfReset);
  return { ok: true, data: { staff: before, temporaryPassword: temporaryPassword() } };
}
