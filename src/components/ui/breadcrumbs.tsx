"use client";

import Link from "next/link";
import type { Route } from "next";
import { Fragment } from "react";

import { useCopy } from "@/lib/i18n/admin-context";

import { kitCopy } from "./copy";
import { Icon } from "./icon";

export interface Crumb {
  label: string;
  href?: Route;
}

/**
 * "Buyurtmalar › №10248" — the last crumb is the current page. The landmark's name comes from
 * the kit copy in the admin language (`label` overrides it).
 */
export function Breadcrumbs({ items, label }: { items: ReadonlyArray<Crumb>; label?: string }) {
  const t = useCopy(kitCopy);
  return (
    <nav
      aria-label={label ?? t.breadcrumbs}
      className="flex items-center gap-1.5 text-body-sm text-ink-muted"
    >
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && <Icon name="chevron-right" size={14} />}
          {item.href ? (
            <Link
              href={item.href}
              className="font-semibold text-ink underline-offset-4 hover:underline hover:decoration-gold"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
