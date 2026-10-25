import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { getCatalogStats, listProducts } from "@/data/products";
import { formatNumber } from "@/lib/format";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { BillzImport } from "./billz-import";
import { ProductsTable } from "./products-table";
import { ProductsToolbar } from "./products-toolbar";
import { parseProductQuery, productListHref, withKnownCategory } from "./query";

const NEXT_SORT = { default: "name_asc", name_asc: "name_desc", name_desc: "default" } as const;

export async function ProductsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const parsed = parseProductQuery(await searchParams);
  const [categories, stats] = await Promise.all([getCategories(), getCatalogStats()]);
  // A stale category slug would be a 400 from the API: drop it first.
  const query = withKnownCategory(parsed, categories);
  const page = await listProducts(query);
  const exportHref = productListHref({ ...query, page: undefined }, "/admin/products/export");

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(stats.total)} ta mahsulot · Billz bilan sinxronlangan: ${stats.lastSyncLabel}`}
        title="Mahsulotlar"
        actions={
          <>
            <BillzImport />
            <ExportMenu href={exportHref} />
            <Link href="/admin/products/new" className={buttonStyles()}>
              <Icon name="plus" size={18} />
              Mahsulot qo‘shish
            </Link>
          </>
        }
      />

      {stats.newFromBillz > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-gold-soft px-4 py-3.5">
          <Icon name="info" size={20} className="shrink-0 text-gold-ink" />
          <p className="m-0 flex-[1_1_320px] text-[14px] leading-5 text-ink">
            <b>Billz’dan {stats.newFromBillz} ta yangi mahsulot keldi.</b> Ular ilovada ko‘rinmaydi
            — nom, tavsif va rasmlarni to‘ldirib, faollashtiring.
          </p>
          <Link
            href={productListHref(query.onlyNew ? {} : { onlyNew: true })}
            className={buttonStyles({ variant: "secondary", size: "sm", className: "font-bold" })}
          >
            {query.onlyNew ? "Hammasini ko‘rsatish" : "Yangilarni ko‘rsatish"}
          </Link>
        </div>
      )}

      <ListTransition className="group">
        <section
          aria-label="Mahsulotlar ro‘yxati"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <ProductsToolbar key={query.q ?? ""} query={query} categories={categories} />
          {page.items.length > 0 ? (
            <ProductsTable
              products={page.items}
              categories={categories}
              sort={query.sort}
              sortHref={productListHref({ ...query, sort: NEXT_SORT[query.sort], page: 1 })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="search" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">Mahsulot topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">
                Qidiruv yoki filtrlarni o‘zgartirib ko‘ring.
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
              hrefFor={(p): Route => productListHref({ ...query, page: p })}
            />
            <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
              <Icon name="lock" size={14} />
              Qoldiq faqat Billz’dan o‘qiladi va bu yerda o‘zgartirilmaydi
            </span>
          </div>
        </section>
      </ListTransition>
    </>
  );
}
