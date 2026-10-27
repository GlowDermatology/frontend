import { localizeVolume } from "@/features/shop/content/volume";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { stockState, type ShopProductCard } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { ProductImage } from "./product-image";

interface ProductCardProps {
  product: ShopProductCard;
  locale: Locale;
  dict: ShopDictionary;
  /** `sizes` of the card's image in its grid. */
  sizes?: string;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}

/** 2 columns on phones, 3 from 600 px, 4 from 1152 px (the page is at most 1280 px wide). */
export const PRODUCT_GRID_SIZES = "(min-width: 72rem) 300px, (min-width: 37.5rem) 31vw, 46vw";

/**
 * A product in a grid: the whole card is one link (photo, name, volume,
 * price), the stock state is text, not only colour. The image is decorative
 * here (`alt=""`): the link already reads the product's name.
 */
export function ProductCard({
  product,
  locale,
  dict,
  sizes = PRODUCT_GRID_SIZES,
  priority = false,
  headingLevel: Heading = "h3",
}: ProductCardProps) {
  const state = stockState(product.available, product.inStock);
  return (
    <article className="group relative flex h-full flex-col gap-4">
      <ProductImage
        src={product.image}
        alt=""
        sizes={sizes}
        priority={priority}
        seed={product.id}
        zoom
      />
      <div className="flex flex-1 flex-col gap-1.5 px-0.5">
        <div className="flex min-h-6 flex-wrap items-center gap-2">
          {product.promo ? (
            <Badge tone="gold" dot={false}>
              {dict.product.promo}
            </Badge>
          ) : null}
          {state !== "in_stock" ? (
            <Badge tone={state === "low" ? "warning" : "muted"}>{dict.stock[state]}</Badge>
          ) : null}
        </div>
        <Heading className="m-0 text-subheading text-pretty text-ink">
          <Link
            href={shopPath(locale, { kind: "product", slug: product.segment })}
            className="text-ink no-underline after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </Heading>
        {product.volume ? (
          <p className="m-0 text-body-sm text-ink-muted">
            {localizeVolume(product.volume, locale)}
          </p>
        ) : null}
        <p
          className={cn(
            "m-0 mt-auto pt-1 text-price tabular-nums",
            state === "out_of_stock" ? "text-ink-muted" : "text-ink",
          )}
        >
          {formatPrice(product.price, locale)}
        </p>
      </div>
      {/* The stretched link's focus ring, drawn around the whole card. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-[24px] outline-2 outline-offset-0 outline-gold-ink [outline-style:none] group-has-[a:focus-visible]:[outline-style:solid]"
      />
    </article>
  );
}

export function ProductGrid({
  products,
  locale,
  dict,
  priorityCount = 0,
  headingLevel,
  label,
}: {
  products: ReadonlyArray<ShopProductCard>;
  locale: Locale;
  dict: ShopDictionary;
  /** How many first cards are above the fold (their images are preloaded). */
  priorityCount?: number;
  headingLevel?: "h2" | "h3";
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className="m-0 grid list-none grid-cols-2 gap-x-[clamp(12px,2vw,24px)] gap-y-[clamp(28px,3vw,44px)] p-0 sm:grid-cols-3 nav:grid-cols-4"
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            locale={locale}
            dict={dict}
            priority={index < priorityCount}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  );
}
