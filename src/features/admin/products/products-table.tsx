import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { ProductArt } from "@/components/brand/product-art";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { categoryLabel, type Category } from "@/domain/category";
import { productDisplayName, stockLevel, type Product } from "@/domain/product";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { productsCopy, type ProductsCopy } from "./copy";
import { PRODUCT_STATUS_TONE } from "./labels";

type NameSort = "default" | "name_asc" | "name_desc";

interface ProductsTableProps {
  products: Product[];
  categories: ReadonlyArray<Category>;
  sort: NameSort;
  sortHref: Route;
}

/** 44×44 box in every state, so rows never shift while a photo loads. */
function Thumbnail({ product }: { product: Product }) {
  const out = stockLevel(product.stock) === "out";
  if (product.mainImageUrl) {
    return (
      <span className="relative flex size-11 overflow-hidden rounded-sm bg-surface">
        <Image
          src={product.mainImageUrl}
          alt=""
          fill
          sizes="44px"
          className={cn("object-cover", out && "opacity-45")}
        />
      </span>
    );
  }
  if (!product.art) {
    return (
      <span className="flex size-11 items-center justify-center rounded-sm border border-dashed border-line-strong text-ink-muted">
        <Icon name="image" size={18} />
      </span>
    );
  }
  return (
    <span
      data-theme="light"
      className="flex size-11 items-center justify-center rounded-sm bg-gold-soft"
    >
      <ProductArt
        kind={product.art.kind}
        tone={product.art.tone}
        detail="mini"
        width={26}
        className={cn(out && "opacity-45")}
      />
    </span>
  );
}

function StockCell({
  stock,
  t,
  fmt,
}: {
  stock: number;
  t: ProductsCopy["table"];
  fmt: AdminFormatter;
}) {
  const level = stockLevel(stock);
  const pieces = t.pieces(fmt.number(stock));
  if (level === "ok") return <span className="tabular-nums">{pieces}</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{level === "out" ? "0" : pieces}</span>
      <Badge tone={level === "out" ? "danger" : "warning"}>{level === "out" ? t.out : t.low}</Badge>
    </span>
  );
}

export async function ProductsTable({ products, categories, sort, sortHref }: ProductsTableProps) {
  const [copy, fmt] = await Promise.all([copyFor(productsCopy), getFormat()]);
  const t = copy.table;
  const ascending = sort !== "name_desc";
  return (
    <ScrollRegion
      label={t.label}
      className="transition-opacity duration-150 group-data-[pending]:opacity-60"
    >
      <table className="data-table min-w-[1040px]">
        <thead>
          <tr>
            <th scope="col">{t.image}</th>
            <th
              scope="col"
              aria-sort={sort === "default" ? undefined : ascending ? "ascending" : "descending"}
            >
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
              >
                {t.name}
                <Icon
                  name={ascending ? "chevron-up" : "chevron-down"}
                  size={14}
                  className={cn(sort === "default" && "text-ink-muted")}
                />
                <span className="sr-only">
                  {sort === "name_asc" ? t.sortAsc : sort === "name_desc" ? t.sortDesc : t.sortNone}
                </span>
              </Link>
            </th>
            <th scope="col">{t.category}</th>
            <th scope="col" className="text-right!">
              {t.price}
            </th>
            <th scope="col">
              <span className="inline-flex items-center gap-1.5" title={t.stockLocked}>
                {t.stock}
                <Icon name="lock" size={14} />
                <span className="sr-only">— {t.stockLocked}</span>
              </span>
            </th>
            <th scope="col">{t.promo}</th>
            <th scope="col">{t.status}</th>
            <th scope="col">
              <span className="sr-only">{t.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const name = productDisplayName(product);
            const href = `/admin/products/${product.id}` as Route;
            const tone = PRODUCT_STATUS_TONE[product.status];
            const statusLabel = copy.status[product.status];
            return (
              <tr key={product.id}>
                <td>
                  <Thumbnail product={product} />
                </td>
                <td>
                  <span className="flex max-w-[360px] min-w-0 flex-col">
                    <Link
                      href={href}
                      // Product texts are Uzbek data in every admin language (WCAG 3.1.2).
                      lang={product.texts.uz.name ? "uz" : undefined}
                      className="line-clamp-2 font-bold break-words text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                    >
                      {name}
                    </Link>
                    <span className="truncate text-[12px] text-ink-muted tabular-nums">
                      Billz {product.billzId}
                      {product.isNewFromBillz
                        ? ` · ${t.billzNameNotFilled}`
                        : product.volume
                          ? ` · ${product.volume}`
                          : ""}
                    </span>
                  </span>
                </td>
                <td className={cn(!product.category && "text-ink-muted!")}>
                  {product.category ? categoryLabel(categories, product.category) : t.noCategory}
                </td>
                <td className="text-right font-bold tabular-nums">{fmt.number(product.price)}</td>
                <td>
                  <StockCell stock={product.stock} t={t} fmt={fmt} />
                </td>
                <td>
                  {product.promo ? (
                    <span className="inline-flex h-6 rounded-sm bg-gold px-2 text-[11px] leading-6 font-bold tracking-[0.06em] text-on-gold">
                      {t.promoBadge}
                    </span>
                  ) : (
                    <span className="text-ink-muted" aria-label={t.notInPromo}>
                      —
                    </span>
                  )}
                </td>
                <td>
                  {product.isNewFromBillz ? (
                    <span className="flex flex-col items-start gap-1">
                      <Badge tone={tone}>{statusLabel}</Badge>
                      <span className="text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink">
                        {t.newBadge}
                      </span>
                    </span>
                  ) : (
                    <Badge tone={tone}>{statusLabel}</Badge>
                  )}
                </td>
                <td>
                  <Link
                    href={href}
                    aria-label={t.edit(name)}
                    className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                  >
                    <Icon name="pencil" size={18} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
