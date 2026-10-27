import type { StaffAccountRow, StaffListQuery } from "@/domain/staff";
import { searchKey } from "@/lib/search";

import { paginate, type Page } from "../types";

const t = (iso: string) => `${iso}+05:00`;

/**
 * The demo's staff accounts (contract §2.16). The Administrator (id 1) is
 * the signed-in demo account (`MOCK_ME`) and a manager.
 */
export const MOCK_STAFF_ACCOUNTS: ReadonlyArray<StaffAccountRow> = [
  {
    id: "1",
    displayName: "Administrator",
    email: "admin@glowderma.uz",
    fullName: "Administrator",
    isActive: true,
    isManager: true,
    lastLoginAt: t("2026-10-24T09:05:00"),
    linkedProviders: [],
    createdAt: t("2026-06-01T09:00:00"),
  },
  {
    id: "2",
    displayName: "Dilnoza Yusupova",
    email: "dilnoza@glowderma.uz",
    fullName: "Dilnoza Yusupova",
    isActive: true,
    isManager: false,
    lastLoginAt: t("2026-10-23T18:30:00"),
    linkedProviders: ["google"],
    createdAt: t("2026-07-14T10:00:00"),
  },
  {
    id: "3",
    displayName: "Sardor Qodirov",
    email: "sardor@glowderma.uz",
    fullName: "Sardor Qodirov",
    isActive: true,
    isManager: false,
    lastLoginAt: null,
    linkedProviders: [],
    createdAt: t("2026-10-20T09:00:00"),
  },
  {
    id: "4",
    displayName: "Gulnora Ergasheva",
    email: "gulnora@glowderma.uz",
    fullName: "Gulnora Ergasheva",
    isActive: false,
    isManager: false,
    lastLoginAt: t("2026-08-02T12:00:00"),
    linkedProviders: [],
    createdAt: t("2026-06-10T09:00:00"),
  },
];

/** Mock implementation of `listStaffAccounts`: search on name or email, active or not. */
export function listStaffAccounts(query: StaffListQuery): Page<StaffAccountRow> {
  const term = query.q ? searchKey(query.q) : "";
  const rows = MOCK_STAFF_ACCOUNTS.filter(
    (row) =>
      row.isActive === (query.status === "active") &&
      (!term || searchKey(`${row.fullName} ${row.email}`).includes(term)),
  ).sort((a, b) => a.displayName.localeCompare(b.displayName, "uz"));
  return paginate(rows, query.page, query.pageSize);
}
