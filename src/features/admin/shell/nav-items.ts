import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";

export type AdminSection =
  | "dashboard"
  | "products"
  | "categories"
  | "banners"
  | "orders"
  | "appointments"
  | "customers"
  | "cashback"
  | "notifications"
  | "payments"
  | "audit-log"
  | "settings";

export interface NavItem {
  section: AdminSection;
  label: string;
  href: Route;
  icon: IconName;
  /** Live count shown as a pill (work waiting for the admin). */
  badge?: "orders" | "appointments";
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { section: "dashboard", label: "Dashboard", href: "/admin", icon: "chart" },
  { section: "products", label: "Mahsulotlar", href: "/admin/products", icon: "bag" },
  { section: "categories", label: "Kategoriyalar", href: "/admin/categories", icon: "tag" },
  { section: "banners", label: "Bannerlar", href: "/admin/banners", icon: "image" },
  {
    section: "orders",
    label: "Buyurtmalar",
    href: "/admin/orders",
    icon: "receipt",
    badge: "orders",
  },
  {
    section: "appointments",
    label: "Qabullar",
    href: "/admin/appointments",
    icon: "calendar",
    badge: "appointments",
  },
  { section: "customers", label: "Mijozlar", href: "/admin/customers", icon: "users" },
  { section: "cashback", label: "Cashback sozlamalari", href: "/admin/cashback", icon: "percent" },
  {
    section: "notifications",
    label: "Bildirishnomalar",
    href: "/admin/notifications",
    icon: "bell",
  },
  { section: "payments", label: "To‘lovlar", href: "/admin/payments", icon: "card" },
  {
    section: "audit-log",
    label: "Harakatlar jurnali",
    href: "/admin/audit-log",
    icon: "history",
  },
  { section: "settings", label: "Sozlamalar", href: "/admin/settings", icon: "sliders" },
];
