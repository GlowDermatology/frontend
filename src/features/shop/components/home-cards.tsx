import Link from "next/link";

import { homeActionAccent, homeActionStyles } from "@/components/brand/home-actions";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { stockState, type ShopProductCard, type ShopSpecialist } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { localizeVolume } from "../content/volume";
import { shopHref, shopPath } from "../routing/routes";
import { AddToCart } from "./add-to-cart";
import { ProductImage } from "./product-image";
import { SpecialistPortrait } from "./specialist-card";

export const homeCardGrid = "m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3";
const card =
  "@container flex h-full min-w-0 flex-col rounded-[24px] border border-line bg-surface-raised p-[clamp(16px,2vw,24px)] shadow-sm transition-shadow hover:shadow-lg";

export function HomeProductCard({
  product,
  locale,
  dict,
  onlineSalesEnabled,
}: {
  product: ShopProductCard;
  locale: Locale;
  dict: ShopDictionary;
  onlineSalesEnabled: boolean;
}) {
  const stock = stockState(product.available, product.inStock);
  const state = !onlineSalesEnabled
    ? "sales_off"
    : stock === "out_of_stock"
      ? "sold_out"
      : "available";
  const path = shopPath(locale, { kind: "product", slug: product.segment });

  return (
    <article className={card}>
      <div className="group relative">
        <ProductImage
          src={product.renditions.square?.medium ?? product.imageMedium ?? product.image}
          alt=""
          sizes="(min-width: 1280px) 350px, (min-width: 1024px) 30vw, (min-width: 600px) 44vw, 90vw"
          seed={product.id}
          fit="contain"
          square={Boolean(product.renditions.square)}
          zoom
        />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
          {product.promo ? (
            <Badge tone="gold" dot={false} className="rounded-full bg-gold text-on-gold">
              {dict.product.promo}
            </Badge>
          ) : null}
          {stock !== "in_stock" ? (
            <Badge tone="muted" dot={false} className="rounded-full bg-surface-raised">
              {dict.stock[stock]}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 pt-4">
        {product.category ? (
          <p className="m-0 text-overline text-gold-ink uppercase">{product.category.name}</p>
        ) : null}
        <h3 className="m-0 font-serif text-[clamp(21px,2vw,28px)] leading-tight font-semibold text-ink">
          <Link href={path} className="text-ink no-underline hover:text-gold-ink hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.volume || product.brand ? (
          <p className="m-0 text-body-sm text-ink-muted">
            {[product.volume && localizeVolume(product.volume, locale), product.brand]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <div className="mt-auto grid items-start gap-3 border-t border-line pt-4 @min-[17rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <p className="m-0 flex min-h-11 flex-col justify-center gap-0.5 text-price text-ink tabular-nums">
            <span>{formatPrice(product.price, locale)}</span>
            {product.promo && product.oldPrice ? (
              <s className="text-body-sm font-normal text-ink-muted">
                <span className="sr-only">{dict.product.oldPrice}</span>
                {formatPrice(product.oldPrice, locale)}
              </s>
            ) : null}
          </p>
          <AddToCart
            compact
            locale={locale}
            productId={product.id}
            productPath={path}
            state={state}
            labels={{
              add: dict.product.addToCart,
              soldOut: state === "sales_off" ? dict.product.addToCart : dict.product.soldOut,
              salesOff: dict.product.salesOff,
            }}
          />
        </div>
      </div>
    </article>
  );
}

export function HomeSpecialistCard({
  specialist,
  locale,
  dict,
}: {
  specialist: ShopSpecialist;
  locale: Locale;
  dict: ShopDictionary;
}) {
  const copy = dict.specialists;
  const profile = shopPath(locale, { kind: "specialist", slug: specialist.segment });
  const booking = shopHref(locale, { kind: "booking" }, { specialist: specialist.id });
  const cheapest = specialist.services.reduce<number | null>(
    (price, service) => (price === null ? service.price : Math.min(price, service.price)),
    null,
  );
  const role = [
    specialist.roleLabel,
    specialist.experienceYears ? copy.experience(specialist.experienceYears) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={card}>
      <div className="flex flex-1 flex-col items-center gap-3 px-1 pt-2 pb-5 text-center">
        <SpecialistPortrait specialist={specialist} size={104} sizes="104px" />
        <div className="mt-2">
          <h3 className="m-0 text-[21px] leading-tight font-bold text-ink">
            <Link
              href={profile}
              className="text-ink no-underline hover:text-gold-ink hover:underline"
            >
              {specialist.name}
            </Link>
          </h3>
          <p className="m-0 mt-1 text-body-sm font-semibold text-gold-ink">{role}</p>
        </div>
        {specialist.bio ? (
          <p className="m-0 line-clamp-3 text-body-sm text-pretty text-ink-muted">
            {specialist.bio}
          </p>
        ) : null}
        {specialist.locations.length > 0 ? (
          <p className="m-0 inline-flex max-w-full items-center gap-2 rounded-full bg-gold-soft px-3 py-1.5 text-body-sm text-ink">
            <Icon name="map-pin" size={16} className="shrink-0 text-gold-ink" />
            {specialist.locations.map((clinic) => clinic.name).join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {cheapest !== null ? (
          <p className="m-0 flex flex-wrap items-baseline justify-between gap-2 text-body-sm text-ink-muted">
            <span>{dict.services.price}</span>
            <strong className="text-ink tabular-nums">
              {copy.priceFrom(formatPrice(cheapest, locale))}
            </strong>
          </p>
        ) : null}
        <Link
          href={cheapest !== null ? booking : profile}
          className={homeActionStyles({
            compact: true,
            secondary: cheapest === null,
            className: "w-full",
          })}
        >
          {cheapest !== null ? (
            <Icon name="calendar" size={18} className={homeActionAccent} />
          ) : null}
          {cheapest !== null ? copy.book : copy.viewProfile}
        </Link>
      </div>
    </article>
  );
}

export function HomeProductGridSkeleton({ count }: { count: number }) {
  return (
    <ul aria-hidden="true" className={homeCardGrid}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={card}>
          <span className="block aspect-[4/3] skeleton rounded-[14px]" />
          <span className="mt-4 h-4 w-1/3 skeleton rounded-sm" />
          <span className="mt-2 h-7 w-4/5 skeleton rounded-sm" />
          <span className="mt-5 h-11 w-full skeleton rounded-full" />
        </li>
      ))}
    </ul>
  );
}
