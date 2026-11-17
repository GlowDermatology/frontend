import type { Route } from "next";

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
 * stays available): `<PanelNotFound kind="order" />`.
 */
export async function PanelNotFound({ kind }: { kind: NotFoundKind }) {
  const t = (await copyFor(shellCopy)).notFound[kind];
  return (
    <AdminNotFound
      title={t.title}
      description={t.description}
      backHref={BACK[kind]}
      backLabel={t.back}
    />
  );
}
