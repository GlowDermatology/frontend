/** A staff member as the audit-log actor filter lists them (contract §2.16 `StaffListItem`). */
export interface StaffMember {
  id: string;
  /** Full name, else the email. */
  name: string;
  email: string;
  isActive: boolean;
}

/** `StaffMember.invite.state` (contract §2.16 `StaffInviteState`). */
export const STAFF_INVITE_STATES = ["none", "pending", "expired", "used", "revoked"] as const;
export type StaffInviteState = (typeof STAFF_INVITE_STATES)[number];

/** The newest e-mailed password link of an account (invite or reset). */
export interface StaffInvite {
  state: StaffInviteState;
  /** When the e-mail went to the relay; `null` while queued or when none was sent. */
  sentAt: string | null;
  expiresAt: string | null;
}

/**
 * A staff account as a manager sees it on «Xodimlar» (contract §2.16
 * `StaffListItem` with the manager columns, `StaffMember`).
 */
export interface StaffAccountRow {
  id: string;
  /** Full name, else the email. */
  displayName: string;
  email: string;
  /** `""` when none was given (the display name is then the email). */
  fullName: string;
  isActive: boolean;
  isManager: boolean;
  isSpecialist?: boolean;
  /** Start of the newest session; `null` = never signed in. */
  lastLoginAt: string | null;
  /** Linked social sign-ins (`google`, `facebook`). */
  linkedProviders: string[];
  createdAt: string | null;
  /** The person must set their own password before using the panel. */
  mustChangePassword: boolean;
  /** When the person last set their own password; `null` = not since this was recorded. */
  passwordChangedAt: string | null;
  /** A confirmed admin panel authenticator (TOTP). */
  mfaEnabled: boolean;
  /** `null` when the server did not send it (an older answer). */
  invite: StaffInvite | null;
}

/** How a new or reset account gets its first password (contract §2.16 `StaffPasswordDelivery`). */
export const STAFF_PASSWORD_DELIVERIES = ["temporary_password", "email_link", "both"] as const;
export type StaffPasswordDelivery = (typeof STAFF_PASSWORD_DELIVERIES)[number];

/** Whether a delivery e-mails a link (needs `capabilities.staff_email_invite`). */
export function deliverySendsEmail(delivery: StaffPasswordDelivery): boolean {
  return delivery !== "temporary_password";
}

/** Whether a delivery answers a temporary password (shown once). */
export function deliveryShowsPassword(delivery: StaffPasswordDelivery): boolean {
  return delivery !== "email_link";
}

/** An e-mailed password link: queued for the person's address, valid until `expiresAt`. */
export interface StaffActivation {
  sent: boolean;
  expiresAt: string | null;
  /** The demo (mock mode) only reports the e-mail: nothing was sent. */
  demo?: boolean;
}

/**
 * The answer of an invitation, a password reset or a resent link: the
 * temporary password is shown once, the e-mailed link is only reported.
 */
export interface StaffCredentials {
  staff: StaffAccountRow;
  /** `null` with an e-mail link only, or on a replay after a key rotation (contract §1.7). */
  temporaryPassword: string | null;
  /** The e-mailed link, else `null`. */
  activation: StaffActivation | null;
}

/** A row's status badges, in display order (texts in `staffCopy.badges`). */
export type StaffBadge = "mustChange" | "invitePending" | "inviteExpired" | "mfa";

/**
 * The badges of a row (DESIGN §E): the person still has to set a password, the e-mailed link is
 * open or has expired, the panel authenticator is on. An inactive account shows none of the
 * password states (it cannot sign in anyway). `nowMs` lets a pending link whose `expiresAt` has
 * passed read as expired before the server notices.
 */
export function staffBadges(row: StaffAccountRow, nowMs: number): StaffBadge[] {
  const out: StaffBadge[] = [];
  if (row.isActive) {
    const state = inviteState(row.invite, nowMs);
    if (state === "pending") out.push("invitePending");
    else if (state === "expired" && row.mustChangePassword) out.push("inviteExpired");
    if (row.mustChangePassword && state !== "pending" && state !== "expired") {
      out.push("mustChange");
    }
  }
  if (row.mfaEnabled) out.push("mfa");
  return out;
}

/** The link's state, with a pending link past its expiry read as expired. */
export function inviteState(invite: StaffInvite | null, nowMs: number): StaffInviteState {
  if (!invite) return "none";
  if (invite.state === "pending" && invite.expiresAt) {
    const expires = Date.parse(invite.expiresAt);
    if (!Number.isNaN(expires) && expires <= nowMs) return "expired";
  }
  return invite.state;
}

/** Why «Havolani qayta yuborish» cannot be used for a row (texts in `staffCopy.resend`), or `null`. */
export type ResendBlock = "self" | "inactive" | "emailUnavailable";

export function resendBlock(
  row: StaffAccountRow,
  selfId: string,
  emailInvite: boolean,
): ResendBlock | null {
  if (row.id === selfId) return "self";
  if (!row.isActive) return "inactive";
  if (!emailInvite) return "emailUnavailable";
  return null;
}

export type StaffStatus = "active" | "inactive";
export const STAFF_PAGE_SIZES = [20, 50, 100] as const;
export type StaffPageSize = (typeof STAFF_PAGE_SIZES)[number];

/** URL state of `/admin/staff` (the board's names; the mapper renames them for the API). */
export interface StaffListQuery {
  q?: string;
  status: StaffStatus;
  page: number;
  pageSize: StaffPageSize;
}

export const STAFF_FULL_NAME_MIN = 2;
export const STAFF_FULL_NAME_MAX = 150;
