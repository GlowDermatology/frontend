import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";
import { SPECIALIST_HOME, type Workspace } from "@/data/auth/next-param";

export type AdminSection =
  | "dashboard"
  | "products"
  | "categories"
  | "banners"
  | "orders"
  | "delivery-issues"
  | "appointments"
  | "specialists"
  | "clinics"
  | "customers"
  | "cashback"
  | "notifications"
  | "payments"
  | "audit-log"
  | "staff"
  | "settings";

/** The sections of the specialist workspace (`/admin/my-*` plus the shared settings). */
export type SpecialistSection =
  "my-appointments" | "my-schedule" | "my-profile" | "my-services" | "settings";

/**
 * One sidebar entry. Its label is `shellCopy[locale].nav[section]` (`./copy.ts`); the item itself
 * holds no text, so the list is the same in every admin language.
 */
export interface NavItem {
  section: AdminSection;
  href: Route;
  icon: IconName;
  /** Live count shown as a pill (work waiting for the admin). */
  badge?: "orders" | "appointments" | "issues";
  /** Shown only to managers (`Me.is_manager`, contract §2.16). */
  managerOnly?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { section: "dashboard", href: "/admin", icon: "chart" },
  { section: "products", href: "/admin/products", icon: "bag" },
  { section: "categories", href: "/admin/categories", icon: "tag" },
  { section: "banners", href: "/admin/banners", icon: "image" },
  {
    section: "orders",
    href: "/admin/orders",
    icon: "receipt",
    badge: "orders",
  },
  {
    // Yandex Delivery plan §4: the exception queue (the Telegram bot links here).
    section: "delivery-issues",
    href: "/admin/delivery-issues",
    icon: "alert-triangle",
    badge: "issues",
  },
  {
    section: "appointments",
    href: "/admin/appointments",
    icon: "calendar",
    badge: "appointments",
  },
  {
    section: "specialists",
    href: "/admin/specialists",
    icon: "user",
  },
  { section: "clinics", href: "/admin/clinics", icon: "map-pin" },
  { section: "customers", href: "/admin/customers", icon: "users" },
  { section: "cashback", href: "/admin/cashback", icon: "percent" },
  {
    section: "notifications",
    href: "/admin/notifications",
    icon: "bell",
  },
  { section: "payments", href: "/admin/payments", icon: "card" },
  {
    section: "audit-log",
    href: "/admin/audit-log",
    icon: "history",
  },
  { section: "staff", href: "/admin/staff", icon: "shield", managerOnly: true },
  { section: "settings", href: "/admin/settings", icon: "sliders" },
];

/**
 * The specialist workspace's sidebar (DESIGN: same shell, reduced nav). Labels are
 * `shellCopy[locale].specialistNav[section]`; the Appointments row carries the own pending count.
 */
export interface SpecialistNavItem {
  section: SpecialistSection;
  href: Route;
  icon: IconName;
  badge?: "pending";
}

export const SPECIALIST_NAV_ITEMS: ReadonlyArray<SpecialistNavItem> = [
  { section: "my-appointments", href: SPECIALIST_HOME, icon: "calendar", badge: "pending" },
  { section: "my-schedule", href: "/admin/my-schedule", icon: "clock" },
  { section: "my-profile", href: "/admin/my-profile", icon: "user" },
  { section: "my-services", href: "/admin/my-services", icon: "sparkle" },
  { section: "settings", href: "/admin/settings", icon: "sliders" },
];

const SECTIONS: Record<Workspace, ReadonlySet<string>> = {
  admin: new Set<string>(NAV_ITEMS.map((item) => item.section)),
  specialist: new Set<string>(SPECIALIST_NAV_ITEMS.map((item) => item.section)),
};

/**
 * The highlighted sidebar section for the segments below the shell's layout
 * (`useSelectedLayoutSegments()`): `[]` → Dashboard (admin only), `["orders", "10240"]` →
 * Buyurtmalar, `["customers", "groups"]` → Mijozlar, `["my-schedule"]` → Ish jadvali (specialist).
 * Route groups (`(…)`) and Next's internal page markers are skipped; anything else — a catch-all
 * match such as `"foo/bar"`, a removed section, another workspace's section — highlights nothing.
 * Pure, unit-tested.
 */
export function sectionFromSegments(
  segments: ReadonlyArray<string>,
  workspace: Workspace = "admin",
): AdminSection | SpecialistSection | undefined {
  const first = segments.find((segment) => !segment.startsWith("(") && !segment.startsWith("__"));
  if (first === undefined) return workspace === "admin" ? "dashboard" : undefined;
  return SECTIONS[workspace].has(first) ? (first as AdminSection | SpecialistSection) : undefined;
}
