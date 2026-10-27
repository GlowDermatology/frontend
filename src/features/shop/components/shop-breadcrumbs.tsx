import Link from "next/link";
import type { Route } from "next";
import { Fragment } from "react";

import { Icon } from "@/components/ui/icon";

import { textLink } from "./layout-primitives";

export interface ShopCrumb {
  label: string;
  href?: Route;
}

/** "Bosh sahifa › Katalog › Serum": the last crumb is the current page. */
export function ShopBreadcrumbs({
  items,
  label,
}: {
  items: ReadonlyArray<ShopCrumb>;
  label: string;
}) {
  return (
    <nav aria-label={label} className="pt-6">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-body-sm text-ink-muted">
        {items.map((item, index) => (
          <Fragment key={`${index}-${item.label}`}>
            {index > 0 ? (
              <li aria-hidden="true" className="flex">
                <Icon name="chevron-right" size={14} />
              </li>
            ) : null}
            <li className="min-w-0">
              {item.href ? (
                <Link href={item.href} className={`font-semibold text-ink ${textLink}`}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="block truncate">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
