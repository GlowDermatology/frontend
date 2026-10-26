import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { listCustomers } from "@/data/customers";
import { listSegmentOptions } from "@/data/segments";
import { formatNumber } from "@/lib/format";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { CustomersTable } from "./customers-table";
import { CustomerPageSizeMenu, CustomersToolbar } from "./customers-toolbar";
import { customerListHref, hasActiveCustomerFilters, parseCustomerQuery } from "./query";

/**
 * Data boundary of `/admin/customers` (contract §2.6 `GET customers/`):
 * search, status, group and ordering in the URL, pages of 20 or 50, the
 * `mijozlar` export with the same filters. A failed read throws to the
 * admin error boundary like the other boards.
 */
export async function CustomersContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseCustomerQuery(await searchParams);
  const [page, groups] = await Promise.all([listCustomers(query), listSegmentOptions()]);
  const exportHref = customerListHref(
    { ...query, page: undefined, pageSize: undefined },
    "/admin/customers/export",
  );
  const filtered = hasActiveCustomerFilters(query);

  return (
    <>
      <PageHeader
        eyebrow={
          filtered
            ? `${formatNumber(page.total)} ta mijoz topildi`
            : `${formatNumber(page.total)} ta mijoz`
        }
        title="Mijozlar"
        actions={
          <>
            <ExportMenu href={exportHref} />
            <Link href="/admin/customers/groups" className={buttonStyles({ variant: "secondary" })}>
              <Icon name="users" size={18} />
              Guruhlar
            </Link>
          </>
        }
      />

      <ListTransition className="group">
        <section
          aria-label="Mijozlar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <CustomersToolbar key={query.q ?? ""} query={query} groups={groups} />
          {page.items.length > 0 ? (
            <CustomersTable customers={page.items} />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="search" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">Mijoz topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {filtered
                  ? "Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
                  : "Ilovada ro‘yxatdan o‘tgan mijozlar shu yerda ko‘rinadi."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
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
