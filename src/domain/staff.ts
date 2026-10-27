/** A staff member as the audit-log actor filter lists them (contract §2.16 `StaffListItem`). */
export interface StaffMember {
  id: string;
  /** Full name, else the email. */
  name: string;
  email: string;
  isActive: boolean;
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
  /** Start of the newest session; `null` = never signed in. */
  lastLoginAt: string | null;
  /** Linked social sign-ins (`google`, `facebook`). */
  linkedProviders: string[];
  createdAt: string | null;
}

/** The answer of an invitation or a password reset: the temporary password is shown once. */
export interface StaffCredentials {
  staff: StaffAccountRow;
  /** `null` on a replay after a key rotation (contract §1.7 "Stored credentials"). */
  temporaryPassword: string | null;
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

export const STAFF_ROLE_LABEL = { manager: "Menejer", staff: "Xodim" } as const;

export const STAFF_FULL_NAME_MIN = 2;
export const STAFF_FULL_NAME_MAX = 150;

/** The one-time password hint (contract §7 item 20). */
export const TEMPORARY_PASSWORD_HINT =
  "Parolni xodimga shaxsan bering; u «Parolni o‘zgartirish» orqali almashtiradi.";

/** The 409 messages of §2.16, for the demo and the e2e suite. */
export const STAFF_REFUSALS = {
  selfDemote: "O‘zingizni menejerlikdan chiqara olmaysiz.",
  lastManager: "Kamida bitta faol menejer qolishi kerak. Avval boshqa xodimni menejer qiling.",
  selfDeactivate: "O‘z hisobingizni faolsizlantira olmaysiz.",
  selfReset: "O‘z parolingizni «Parolni o‘zgartirish» orqali almashtiring.",
  emailTaken: "Bu email bilan xodim allaqachon bor (nofaol bo‘lsa, uni qayta faollashtiring).",
} as const;
