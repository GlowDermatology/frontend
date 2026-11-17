import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { optionalRead } from "@/data/api/optional-read";
import { requireStaff } from "@/data/auth";
import { listCustomers } from "@/data/customers";
import { listSegmentOptions } from "@/data/segments";
import { copyFor, getAdminLocale, getFormat } from "@/lib/i18n/admin-locale";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { pageRangeText } from "../specialists/form-kit";
import { customersCopy } from "./copy";
import { CustomersTable } from "./customers-table";
import { CustomerPageSizeMenu, CustomersToolbar } from "./customers-toolbar";
import { customerListHref, hasActiveCustomerFilters, parseCustomerQuery } from "./query";

/**
 * Data boundary of `/admin/customers` (contract §2.6 `GET customers/`):
 * search, status, group and ordering in the URL, pages of 20 or 50, the
 * `mijozlar` export with the same filters. A failed customers read throws
 * to the admin error boundary like the other boards; the group options are
 * optional.
 */
export async function CustomersContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseCustomerQuery(await searchParams);
  // The group options are a convenience: when `GET segments/` fails, the
  // filter offers "all" and the current `#id` and the rows still render.
  const [page, groups, t, fmt, locale] = await Promise.all([
    listCustomers(query),
    optionalRead("customers group options", listSegmentOptions, []),
    copyFor(customersCopy),
    getFormat(),
    getAdminLocale(),
  ]);
  const exportHref = customerListHref(
    { ...query, page: undefined, pageSize: undefined },
    "/admin/customers/export",
  );
  const filtered = hasActiveCustomerFilters(query);

  return (
    <>
      <PageHeader
        eyebrow={(filtered ? t.found : t.count)(page.total, fmt.number(page.total))}
        title={t.title}
        actions={
          <>
            <ExportMenu href={exportHref} label={t.export} />
            <Link href="/admin/customers/groups" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="users" size={18} />
              {t.groups}
            </Link>
          </>
        }
      />

      <ListTransition className="group">
        <section
          aria-label={t.listLabel}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <CustomersToolbar key={query.q ?? ""} query={query} groups={groups} />
          {page.items.length > 0 ? (
            <CustomersTable customers={page.items} t={t} fmt={fmt} locale={locale} />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="search" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
              <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">
                {filtered ? t.emptyFiltered : t.emptyAll}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRangeText(fmt, page.page, page.pageSize, page.total)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => customerListHref({ ...query, page: p })}
            />
            <CustomerPageSizeMenu query={query} />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
