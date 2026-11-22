import type { Route } from "next";

import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { copyFor } from "@/lib/i18n/admin-locale";

import { AdminNotFound } from "../shared/admin-not-found";
import { shellCopy, type ShellCopy } from "./copy";

type NotFoundKind = keyof ShellCopy["notFound"];

const BACK: Record<NotFoundKind, Route> = {
  page: "/admin",
  order: "/admin/orders",
  customer: "/admin/customers",
  product: "/admin/products",
  specialist: "/admin/specialists",
};

/**
 * The localized 404 body of the panel's `not-found.tsx` files (inside the shell, so the navigation
 * stays available): `<PanelNotFound kind="order" />`. `home` replaces the way back for the
 * specialist workspace (`(specialist)/not-found.tsx`), whose home is its Appointments page.
 */
export async function PanelNotFound({ kind, home }: { kind: NotFoundKind; home?: Route }) {
  const copy = (await copyFor(shellCopy)).notFound;
  const t = copy[kind];
  const specialistHome = home === SPECIALIST_HOME;
  return (
    <AdminNotFound
      title={t.title}
      description={t.description}
      backHref={home ?? BACK[kind]}
      backLabel={specialistHome ? copy.page.backSpecialist : t.back}
    />
  );
}
