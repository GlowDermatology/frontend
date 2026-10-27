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
import { formatNumber } from "@/lib/format";

import { PRODUCT_STATUS_META } from "./labels";

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
    <span className="flex size-11 items-center justify-center rounded-sm bg-gold-soft">
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

function StockCell({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  if (level === "ok") return <span className="tabular-nums">{stock} dona</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{level === "out" ? "0" : `${stock} dona`}</span>
      <Badge tone={level === "out" ? "danger" : "warning"}>
        {level === "out" ? "Tugagan" : "Kam qoldi"}
      </Badge>
    </span>
  );
}

export function ProductsTable({ products, categories, sort, sortHref }: ProductsTableProps) {
  const ascending = sort !== "name_desc";
  return (
    <ScrollRegion
      label="Mahsulotlar jadvali"
      className="transition-opacity duration-150 group-data-[pending]:opacity-60"
    >
      <table className="data-table min-w-[1040px]">
        <thead>
          <tr>
            <th scope="col">RASM</th>
            <th
              scope="col"
              aria-sort={sort === "default" ? undefined : ascending ? "ascending" : "descending"}
            >
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
              >
                NOMI
                <Icon
                  name={ascending ? "chevron-up" : "chevron-down"}
                  size={14}
                  className={cn(sort === "default" && "text-ink-muted")}
                />
                <span className="sr-only">
                  {sort === "name_asc"
                    ? ", A–Z — teskari tartiblash"
                    : sort === "name_desc"
                      ? ", Z–A — asl tartibga qaytarish"
                      : " — nomi bo‘yicha tartiblash"}
                </span>
              </Link>
            </th>
            <th scope="col">KATEGORIYA</th>
            <th scope="col" className="text-right!">
              NARX, SO‘M
            </th>
            <th scope="col">
              <span
                className="inline-flex items-center gap-1.5"
                title="Faqat Billz’dan keladi, tahrirlab bo‘lmaydi"
              >
                QOLDIQ (BILLZ)
                <Icon name="lock" size={14} />
                <span className="sr-only">— faqat Billz’dan keladi, tahrirlab bo‘lmaydi</span>
              </span>
            </th>
            <th scope="col">AKSIYA</th>
            <th scope="col">HOLAT</th>
            <th scope="col">
              <span className="sr-only">Amallar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const name = productDisplayName(product);
            const href = `/admin/products/${product.id}` as Route;
            const status = PRODUCT_STATUS_META[product.status];
            return (
              <tr key={product.id}>
                <td>
                  <Thumbnail product={product} />
                </td>
                <td>
                  <span className="flex flex-col">
                    <Link
                      href={href}
                      className="font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                    >
                      {name}
                    </Link>
                    <span className="text-[12px] text-ink-muted tabular-nums">
                      Billz {product.billzId} ·{" "}
                      {product.isNewFromBillz ? "Billz’dagi nom · to‘ldirilmagan" : product.volume}
                    </span>
                  </span>
                </td>
                <td className={cn(!product.category && "text-ink-muted!")}>
                  {product.category ? categoryLabel(categories, product.category) : "Tanlanmagan"}
                </td>
                <td className="text-right font-bold tabular-nums">{formatNumber(product.price)}</td>
                <td>
                  <StockCell stock={product.stock} />
                </td>
                <td>
                  {product.promo ? (
                    <span className="inline-flex h-6 rounded-sm bg-gold px-2 text-[11px] leading-6 font-bold tracking-[0.06em] text-on-gold">
                      AKSIYA
                    </span>
                  ) : (
                    <span className="text-ink-muted" aria-label="Aksiyada emas">
                      —
                    </span>
                  )}
                </td>
                <td>
                  {product.isNewFromBillz ? (
                    <span className="flex flex-col items-start gap-1">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink">
                        YANGI · BILLZ
                      </span>
                    </span>
                  ) : (
                    <Badge tone={status.tone}>{status.label}</Badge>
                  )}
                </td>
                <td>
                  <Link
                    href={href}
                    aria-label={`${name} — tahrirlash`}
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
