import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";

export type AdminSection =
  | "dashboard"
  | "products"
  | "categories"
  | "banners"
  | "orders"
  | "delivery-issues"
  | "appointments"
  | "specialists"
  | "services"
  | "customers"
  | "cashback"
  | "notifications"
  | "payments"
  | "audit-log"
  | "staff"
  | "settings";

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
  { section: "services", href: "/admin/services", icon: "sparkle" },
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

const SECTIONS = new Set<string>(NAV_ITEMS.map((item) => item.section));

/**
 * The highlighted sidebar section for the segments below `(panel)/layout.tsx`
 * (`useSelectedLayoutSegments()`): `[]` → Dashboard, `["orders", "10240"]` → Buyurtmalar,
 * `["customers", "groups"]` → Mijozlar. Route groups (`(…)`) and Next's internal page markers are
 * skipped; anything else — a catch-all match such as `"foo/bar"`, a removed section — highlights
 * nothing. Pure, unit-tested.
 */
export function sectionFromSegments(segments: ReadonlyArray<string>): AdminSection | undefined {
  const first = segments.find((segment) => !segment.startsWith("(") && !segment.startsWith("__"));
  if (first === undefined) return "dashboard";
  return SECTIONS.has(first) ? (first as AdminSection) : undefined;
}
