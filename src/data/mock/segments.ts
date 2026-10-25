import type { Segment, SegmentMember } from "@/domain/segment";

import { customerRef } from "./people";

/**
 * The two seeded groups of the backend (contract §2.8): "Doimiy mijozlar"
 * (at least 3 online orders) and "10 mln+ xarid" (lifetime purchases from
 * 10 mln so‘m). Malika Karimova is a manual member of both; the rule members
 * below stand in for the customers whose totals match.
 */

const t = (iso: string) => `${iso}+05:00`;

export const MOCK_SEGMENTS: ReadonlyArray<Segment> = [
  {
    id: "1",
    name: "Doimiy mijozlar",
    rules: { minOnlineOrders: 3, minLifetimeAmount: null },
    manualMemberCount: 1,
    memberCount: 4,
    size: 612,
    createdAt: t("2026-10-10T10:00:00"),
    updatedAt: t("2026-10-10T10:00:00"),
  },
  {
    id: "2",
    name: "10 mln+ xarid",
    rules: { minOnlineOrders: null, minLifetimeAmount: 10_000_000 },
    manualMemberCount: 1,
    memberCount: 3,
    size: 318,
    createdAt: t("2026-10-10T10:00:00"),
    updatedAt: t("2026-10-10T10:00:00"),
  },
];

function member(
  id: string,
  registeredAt: string,
  lifetimeTotal: number,
  onlineOrdersCount: number,
  balance: number,
  percent: string | null,
): SegmentMember {
  const customer = customerRef(id);
  return {
    id,
    name: customer.name,
    phone: customer.phone,
    status: "active",
    registeredAt: t(registeredAt),
    lifetimeTotal,
    percent,
    balance,
    onlineOrdersCount,
  };
}

const MALIKA = member("5", "2025-03-12T10:20:00", 13_580_000, 12, 48_600, "1.00");

/** Members per group, and which of them were added by hand (removable). */
export const MOCK_MEMBERS: Record<string, { members: SegmentMember[]; manual: string[] }> = {
  "1": {
    members: [
      MALIKA,
      member("2", "2025-05-02T14:05:00", 6_240_000, 5, 12_300, "1.00"),
      member("4", "2025-07-19T09:40:00", 4_110_000, 4, 8_150, "1.00"),
      member("10", "2025-09-01T18:12:00", 3_380_000, 3, 4_020, "1.00"),
    ],
    manual: ["5"],
  },
  "2": {
    members: [
      MALIKA,
      member("3", "2024-12-20T11:00:00", 21_400_000, 9, 96_500, "2.00"),
      member("8", "2025-01-15T16:30:00", 11_050_000, 2, 30_200, "1.00"),
    ],
    manual: ["5"],
  },
};
