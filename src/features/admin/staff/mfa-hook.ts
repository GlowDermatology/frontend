import type { ActionResult } from "@/data/types";
import type { StaffAccountRow } from "@/domain/staff";

/**
 * The manager's «MFA ni o‘chirish» (contract §2.16 `POST staff/{id}/reset-mfa/`, DESIGN §E): a
 * Server Action with the calling convention of the other staff actions (`id`, an
 * `Idempotency-Key`, the csrf token, the demo snapshot) plus the optional reason, answering the
 * updated row (`mfaEnabled: false`). `StaffContent` passes `resetStaffMfa`
 * (`src/data/mfa.actions.ts`) to `StaffView` as `resetMfa`; the menu item then appears on rows
 * with MFA on and opens `ResetMfaDialog` (`reset-mfa-dialog.tsx`); one's own row shows it
 * unavailable, with the way to Settings as the reason. The backend refuses one's own account and a
 * row without panel MFA (409).
 */
export type ResetStaffMfaAction = (
  id: string,
  key: string,
  csrf: string,
  snapshot?: unknown,
  reason?: string,
) => Promise<ActionResult<StaffAccountRow>>;
