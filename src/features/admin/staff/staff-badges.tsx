"use client";

import { Badge, type Tone } from "@/components/ui/badge";
import { staffBadges, type StaffAccountRow, type StaffBadge } from "@/domain/staff";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { staffCopy } from "./copy";

const TONES: Record<StaffBadge, Tone> = {
  mustChange: "warning",
  invitePending: "gold",
  inviteExpired: "danger",
  mfa: "success",
};

/**
 * A row's password and MFA state (DESIGN §E): must set a password, link sent (until when), link
 * expired, MFA on. Each badge carries its explanation for screen readers and as a hover title.
 */
export function StaffBadges({ row, nowMs }: { row: StaffAccountRow; nowMs: number }) {
  const t = useCopy(staffCopy).badges;
  const fmt = useFormat();
  const badges = staffBadges(row, nowMs);
  if (badges.length === 0) return null;
  const hint = (badge: StaffBadge): string => {
    switch (badge) {
      case "mustChange":
        return t.mustChangeHint;
      case "invitePending":
        return row.invite?.expiresAt
          ? t.invitePendingHint(fmt.dateTimeShort(row.invite.expiresAt))
          : t.mustChangeHint;
      case "inviteExpired":
        return t.inviteExpiredHint;
      case "mfa":
        return t.mfaHint;
    }
  };
  return (
    <span className="flex flex-wrap gap-1.5" data-staff-badges="">
      {badges.map((badge) => (
        <span key={badge} title={hint(badge)} data-badge={badge} className="inline-flex">
          <Badge tone={TONES[badge]} dot={badge !== "mfa"}>
            {t[badge]}
            <span className="sr-only">{`: ${hint(badge)}`}</span>
          </Badge>
        </span>
      ))}
    </span>
  );
}
