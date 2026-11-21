import {
  STAFF_INVITE_STATES,
  type StaffAccountRow,
  type StaffActivation,
  type StaffCredentials,
  type StaffInvite,
  type StaffListQuery,
  type StaffMember,
  type SpecialistRoleChange,
} from "@/domain/staff";

import type {
  ApiSpecialistInviteCredentials,
  ApiSpecialistRoleChangeResult,
  ApiStaffCredentials,
  ApiStaffInvite,
  ApiStaffLinkSent,
  ApiStaffListItem,
  ApiStaffMember,
} from "../types";
import { idString } from "./common";

/** `StaffListItem` (contract §2.16) → the actor filter option. */
export function mapStaffMember(api: ApiStaffListItem): StaffMember {
  return {
    id: idString(api.id),
    name: api.display_name || api.email,
    email: api.email,
    isActive: api.is_active,
  };
}

/**
 * A `StaffListItem` with the manager columns, or a `StaffMember` → the staff
 * screen's row. The manager columns are `null` for a caller who is not a
 * manager (the screen is not shown then); they read as empty here.
 */
export function mapStaffRow(api: ApiStaffListItem | ApiStaffMember): StaffAccountRow {
  return {
    id: idString(api.id),
    displayName: api.display_name || api.email,
    email: api.email,
    fullName: api.full_name ?? "",
    isActive: api.is_active,
    isManager: api.is_manager ?? false,
    ...(api.role === "specialist" ? { isSpecialist: true } : {}),
    ...(api.is_superuser ? { isSuperuser: true } : {}),
    ...(api.has_ops_console_access ? { hasOpsConsoleAccess: true } : {}),
    lastLoginAt: api.last_login_at ?? null,
    linkedProviders: [...(api.linked_providers ?? [])],
    createdAt: api.created_at ?? null,
    mustChangePassword: api.must_change_password ?? false,
    passwordChangedAt: "password_changed_at" in api ? (api.password_changed_at ?? null) : null,
    mfaEnabled: api.mfa_enabled ?? false,
    invite: mapStaffInvite(api.invite),
  };
}

/** `StaffInvite` → the row's link state; an unknown state (a newer backend) reads as `none`. */
export function mapStaffInvite(api: ApiStaffInvite | null | undefined): StaffInvite | null {
  if (!api) return null;
  const state = (STAFF_INVITE_STATES as ReadonlyArray<string>).includes(api.state)
    ? api.state
    : "none";
  return { state, sentAt: api.sent_at ?? null, expiresAt: api.expires_at ?? null };
}

function mapActivation(
  api: { sent: boolean; expires_at: string } | null | undefined,
): StaffActivation | null {
  return api ? { sent: Boolean(api.sent), expiresAt: api.expires_at || null } : null;
}

export function mapStaffCredentials(api: ApiStaffCredentials): StaffCredentials {
  return {
    staff: mapStaffRow(api.staff),
    temporaryPassword: api.temporary_password || null,
    activation: mapActivation(api.activation),
  };
}

/** `POST specialists/invite/` → the invitation's credentials with the new draft profile's id. */
export function mapSpecialistInviteCredentials(
  api: ApiSpecialistInviteCredentials,
): StaffCredentials {
  return { ...mapStaffCredentials(api), specialistId: idString(api.specialist_id) };
}

/** `POST staff/{id}/specialist-role/` → the account, its profile and the visits left to handle. */
export function mapSpecialistRoleChange(api: ApiSpecialistRoleChangeResult): SpecialistRoleChange {
  return {
    staff: mapStaffRow(api.account),
    specialistId: api.specialist_id == null ? null : idString(api.specialist_id),
    upcomingAppointments: api.upcoming_appointments ?? 0,
  };
}

/** `POST staff/{id}/send-password-link/` → the same shape as an invitation without a password. */
export function mapStaffLinkSent(api: ApiStaffLinkSent): StaffCredentials {
  return {
    staff: mapStaffRow(api.staff),
    temporaryPassword: null,
    activation: mapActivation(api.activation),
  };
}

/** The screen's URL query → `GET staff/` parameters (`search`, `is_active`, `page`, `page_size`). */
export function staffListParams(query: StaffListQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    is_active: query.status === "active",
    page: query.page,
    page_size: query.pageSize,
  };
  if (query.q) params.search = query.q;
  return params;
}
