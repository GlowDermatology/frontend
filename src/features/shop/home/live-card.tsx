import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { stockState, type ShopProductCard } from "@/domain/shop";
import { cashbackEstimate, type ShopCashbackPolicy } from "@/domain/shop-live";
import { cn } from "@/lib/cn";
import { createFormatter, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { AddToCart } from "../components/add-to-cart";
import { ProductImage } from "../components/product-image";
import { localizeVolume } from "../content/volume";
import { homeCopy } from "../copy/home";
import { shopPath } from "../routing/routes";

/**
 * A product card of the live home (rails and the «Kashf eting» feed). Plain
 * props and no server-only imports, so the feed's client leaf renders the
 * same card for the pages it loads after hydration. Stock lines and the
 * cart button only while online sales are on; in showroom mode the card
 * offers «Batafsil» instead.
 */

export const liveCardGrid =
  "m-0 grid list-none grid-cols-2 gap-[clamp(10px,1.4vw,16px)] p-0 sm:grid-cols-3 lg:grid-cols-4 nav:grid-cols-5";

export const LIVE_CARD_SIZES =
  "(min-width: 72rem) 230px, (min-width: 64rem) 23vw, (min-width: 37.5rem) 31vw, 46vw";

const cardFrame =
  "group relative flex h-full min-w-0 flex-col gap-2.5 rounded-lg border border-line bg-surface-raised p-3 shadow-sm transition-[transform,box-shadow] duration-300 ease-soft hover:-translate-y-[3px] hover:shadow-lg";

export type CashbackRates = Pick<ShopCashbackPolicy, "minPercent" | "maxPercent"> | null;

export function cashbackLabel(
  price: number,
  promo: boolean,
  rates: CashbackRates,
  locale: Locale,
): string | null {
  const estimate = cashbackEstimate(price, rates, promo);
  if (!estimate) return null;
  const copy = homeCopy[locale].card;
  return estimate.min === estimate.max
    ? copy.cashback(formatPrice(estimate.max, locale))
    : copy.cashbackRange(
        createFormatter(locale).number(estimate.min),
        formatPrice(estimate.max, locale),
      );
}

/** "Omborda 12 dona" / "3 dona qoldi" / "Tugagan", with its status dot colour. */
export function stockLine(
  product: Pick<ShopProductCard, "available" | "inStock">,
  locale: Locale,
  short = false,
): { text: string; dot: string } {
  const copy = homeCopy[locale].card;
  const state = stockState(product.available, product.inStock);
  const count = createFormatter(locale).number(product.available);
  if (state === "out_of_stock") return { text: copy.out, dot: "bg-danger" };
  if (state === "low") return { text: copy.low(count), dot: "bg-warning" };
  return { text: short ? copy.inStockShort : copy.inStock(count), dot: "bg-success" };
}

interface LiveProductCardProps {
  product: ShopProductCard;
  locale: Locale;
  onlineSalesEnabled: boolean;
  cashback: CashbackRates;
  headingLevel?: "h3" | "h4";
}

export function LiveProductCard({
  product,
  locale,
  onlineSalesEnabled,
  cashback,
  headingLevel: Heading = "h3",
}: LiveProductCardProps) {
  const copy = homeCopy[locale].card;
  const path = shopPath(locale, { kind: "product", slug: product.segment });
  const stock = stockState(product.available, product.inStock);
  const line = stockLine(product, locale, true);
  const earn = cashbackLabel(product.price, product.promo, cashback, locale);
  const meta = [
    product.volume ? localizeVolume(product.volume, locale) : null,
    product.category?.name ?? null,
  ].filter(Boolean);

  return (
    <article className={cardFrame}>
      <Link href={path} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductImage
          src={product.imageMedium ?? product.image}
          alt=""
          sizes={LIVE_CARD_SIZES}
          seed={product.id}
          fit="contain"
          zoom
          className="aspect-square bg-gold-soft"
        />
        {product.promo ? (
          <span className="absolute top-2.5 left-2.5 inline-flex h-[22px] items-center rounded-sm bg-gold px-2 text-overline text-on-gold uppercase">
            {copy.promo}
          </span>
        ) : null}
      </Link>
      {meta.length ? (
        <p className="m-0 truncate px-1 text-caption text-ink-muted">{meta.join(" · ")}</p>
      ) : null}
      <Heading className="m-0 line-clamp-2 min-h-[42px] px-1 text-[15px] leading-[21px] font-semibold text-ink">
        <Link href={path} className="text-ink no-underline hover:text-gold-ink hover:underline">
          {product.name}
        </Link>
      </Heading>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 px-1">
        <p className="m-0 flex flex-col text-price whitespace-nowrap text-ink tabular-nums">
          <span>{formatPrice(product.price, locale)}</span>
          {product.promo && product.oldPrice ? (
            <s className="text-caption font-normal text-ink-muted">
              <span className="sr-only">{copy.oldPrice}</span>
              {formatPrice(product.oldPrice, locale)}
            </s>
          ) : null}
        </p>
        {earn ? (
          <span className="rounded-sm bg-gold-soft px-[7px] py-[3px] text-[11px] leading-4 font-bold text-ink tabular-nums">
            {earn}
          </span>
        ) : null}
      </div>
      {onlineSalesEnabled ? (
        <p className="m-0 inline-flex items-center gap-1.5 px-1 text-caption font-semibold text-ink">
          <span aria-hidden="true" className={cn("size-[7px] shrink-0 rounded-full", line.dot)} />
          {line.text}
        </p>
      ) : null}
      <div className="mt-auto">
        {onlineSalesEnabled ? (
          <AddToCart
            compact
            locale={locale}
            productId={product.id}
            productPath={path}
            state={stock === "out_of_stock" ? "sold_out" : "available"}
            labels={{ add: copy.add, soldOut: copy.soldOut, salesOff: copy.salesOff }}
          />
        ) : (
          <Link
            href={path}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-strong text-label text-ink no-underline transition-colors hover:border-gold hover:bg-gold-soft"
          >
            {copy.details}
            <Icon name="arrow-right" size={16} className="text-gold-ink" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function LiveCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface-raised p-3"
    >
      <span className="block aspect-square skeleton rounded-[14px]" />
      <span className="h-3 w-1/2 skeleton rounded-sm" />
      <span className="h-4 w-[85%] skeleton rounded-sm" />
      <span className="h-4 w-2/5 skeleton rounded-sm" />
      <span className="h-11 skeleton rounded-md" />
    </div>
  );
}
