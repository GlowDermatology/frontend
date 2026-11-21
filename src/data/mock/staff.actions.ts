import { staffDataCopy } from "@/domain/copy/staff";
import {
  deliverySendsEmail,
  deliveryShowsPassword,
  type StaffAccountRow,
  type StaffActivation,
  type StaffCredentials,
  type StaffPasswordDelivery,
} from "@/domain/staff";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import type { InviteStaffData, UpdateStaffValues } from "../staff.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { MOCK_STAFF_ACCOUNTS } from "./staff";

/**
 * Mock implementation of `src/data/staff.actions.ts` (contract §2.16, DESIGN §E): the backend's
 * refusals computed from the fixtures (the caller is the demo Administrator, id 1, a manager), in
 * the admin language; nothing is kept. A temporary password is a demo one, an e-mailed link is
 * only reported as sent (`activation.demo`). `GLOWDERMA_MOCK_EMAIL_INVITE=false` imitates a
 * backend without e-mail (`capabilities.staff_email_invite` false).
 */

const SELF_ID = "1";
/** `STAFF_INVITE_TTL_HOURS` of the backend's default settings. */
const LINK_TTL_MS = 72 * 3_600_000;

const byId = (id: string) => MOCK_STAFF_ACCOUNTS.find((row) => row.id === id) ?? null;
const conflict = (error: string) => ({ ok: false as const, error, code: "conflict" });

async function messages() {
  return copyFor(staffDataCopy);
}

/** Active managers other than `id`. */
const otherManagers = (id: string) =>
  MOCK_STAFF_ACCOUNTS.filter((row) => row.isActive && row.isManager && row.id !== id).length;

/** `xxxx-xxxx-xxxx-xxxx` from letters and digits without look-alikes (no 0 O 1 l I). */
function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  // Rejection sampling: bytes at or above the largest multiple of the alphabet size are
  // drawn again, so every character is equally likely (a plain modulo would favour some).
  const limit = 256 - (256 % alphabet.length);
  const chars: string[] = [];
  while (chars.length < 16) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (byte < limit && chars.length < 16) chars.push(alphabet.charAt(byte % alphabet.length));
    }
  }
  return [0, 4, 8, 12].map((at) => chars.slice(at, at + 4).join("")).join("-");
}

function demoActivation(): StaffActivation {
  return {
    sent: true,
    expiresAt: new Date(referenceNow().getTime() + LINK_TTL_MS).toISOString(),
    demo: true,
  };
}

/** The row after a password was issued: flagged, with the new link's state. */
function issued(row: StaffAccountRow, delivery: StaffPasswordDelivery): StaffAccountRow {
  const sends = deliverySendsEmail(delivery);
  const activation = sends ? demoActivation() : null;
  return {
    ...row,
    mustChangePassword: true,
    invite: activation
      ? { state: "pending", sentAt: referenceNow().toISOString(), expiresAt: activation.expiresAt }
      : row.invite && row.invite.state === "pending"
        ? { ...row.invite, state: "revoked" }
        : row.invite,
  };
}

function credentials(row: StaffAccountRow, delivery: StaffPasswordDelivery): StaffCredentials {
  const staff = issued(row, delivery);
  return {
    staff,
    temporaryPassword: deliveryShowsPassword(delivery) ? temporaryPassword() : null,
    activation: deliverySendsEmail(delivery) ? demoActivation() : null,
  };
}

/** The 400 of `POST staff/` / `reset-password/` with an e-mail delivery but no e-mail. */
async function deliveryRefused(delivery: StaffPasswordDelivery) {
  if (!deliverySendsEmail(delivery) || serverEnv.mockEmailInvite()) return null;
  const m = await messages();
  return {
    ok: false as const,
    error: m.checkFields,
    code: "validation_error",
    fieldErrors: { delivery: m.refusals.emailDelivery },
  };
}

export async function inviteStaff(
  values: InviteStaffData,
): Promise<ActionResult<StaffCredentials>> {
  await delay(400);
  const m = await messages();
  const email = values.email.trim().toLowerCase();
  if (MOCK_STAFF_ACCOUNTS.some((row) => row.email.toLowerCase() === email)) {
    return {
      ok: false,
      error: m.checkFields,
      code: "validation_error",
      fieldErrors: { email: m.refusals.emailTaken },
    };
  }
  const refused = await deliveryRefused(values.delivery);
  if (refused) return refused;
  const fullName = values.fullName.trim();
  const row: StaffAccountRow = {
    id: `draft-${crypto.randomUUID()}`,
    displayName: fullName || email,
    email,
    fullName,
    isActive: true,
    isManager: values.isManager,
    lastLoginAt: null,
    linkedProviders: [],
    createdAt: referenceNow().toISOString(),
    mustChangePassword: true,
    passwordChangedAt: null,
    mfaEnabled: false,
    invite: { state: "none", sentAt: null, expiresAt: null },
  };
  return { ok: true, data: credentials(row, values.delivery) };
}

function find(id: string, current: StaffAccountRow | undefined) {
  return current ?? byId(id);
}

export async function updateStaff(
  id: string,
  values: UpdateStaffValues,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffAccountRow>> {
  await delay(300);
  const m = await messages();
  const before = find(id, current);
  if (!before) return { ok: false, error: m.notFound, code: "not_found" };
  if (before.isManager && !values.isManager) {
    if (id === SELF_ID) return conflict(m.refusals.selfDemote);
    if (before.isActive && otherManagers(id) === 0) return conflict(m.refusals.lastManager);
  }
  const fullName = values.fullName.trim();
  const email = values.email?.trim().toLowerCase() || before.email;
  if (
    email !== before.email.toLowerCase() &&
    MOCK_STAFF_ACCOUNTS.some((row) => row.id !== id && row.email.toLowerCase() === email)
  ) {
    return {
      ok: false,
      error: m.checkFields,
      code: "validation_error",
      fieldErrors: { email: m.refusals.emailTaken },
    };
  }
  return {
    ok: true,
    data: {
      ...before,
      email,
      fullName,
      displayName: fullName || email,
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
  const m = await messages();
  const before = find(id, current);
  if (!before) return { ok: false, error: m.notFound, code: "not_found" };
  if (!active) {
    if (id === SELF_ID) return conflict(m.refusals.selfDeactivate);
    if (before.isManager && before.isActive && otherManagers(id) === 0) {
      return conflict(m.refusals.lastManager);
    }
  }
  // Deactivation revokes open links (DESIGN §E).
  const invite =
    !active && before.invite?.state === "pending"
      ? { ...before.invite, state: "revoked" as const }
      : before.invite;
  return { ok: true, data: { ...before, isActive: active, invite } };
}

export async function resetStaffPassword(
  id: string,
  delivery: StaffPasswordDelivery,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffCredentials>> {
  await delay(400);
  const m = await messages();
  const before = find(id, current);
  if (!before) return { ok: false, error: m.notFound, code: "not_found" };
  if (id === SELF_ID) return conflict(m.refusals.selfReset);
  const refused = await deliveryRefused(delivery);
  if (refused) return refused;
  return { ok: true, data: credentials(before, delivery) };
}

/** `send-password-link/`: a fresh link, password and sessions untouched. */
export async function sendStaffPasswordLink(
  id: string,
  current?: StaffAccountRow,
): Promise<ActionResult<StaffCredentials>> {
  await delay(400);
  const m = await messages();
  const before = find(id, current);
  if (!before) return { ok: false, error: m.notFound, code: "not_found" };
  if (id === SELF_ID) return conflict(m.refusals.selfLink);
  if (!before.isActive) return conflict(m.refusals.inactiveLink);
  if (!serverEnv.mockEmailInvite()) return conflict(m.refusals.emailUnavailable);
  const activation = demoActivation();
  return {
    ok: true,
    data: {
      staff: {
        ...before,
        invite: {
          state: "pending",
          sentAt: referenceNow().toISOString(),
          expiresAt: activation.expiresAt,
        },
      },
      temporaryPassword: null,
      activation,
    },
  };
}
