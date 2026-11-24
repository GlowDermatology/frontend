import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ProductArt, type ProductArtKind } from "@/components/brand/product-art";
import { Icon } from "@/components/ui/icon";
import type { ShopProductCard } from "@/domain/shop";
import { stockState } from "@/domain/shop";
import { SPOTLIGHT_MAX, type SpotlightReason } from "@/domain/shop-live";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { AddToCart } from "../components/add-to-cart";
import { localizeVolume } from "../content/volume";
import { homeCopy } from "../copy/home";
import { shopPath } from "../routing/routes";
import { cashbackLabel, stockLine, type CashbackRates } from "./live-card";
import { ShowcasePause } from "./showcase-pause";

/**
 * The hero's «live showcase»: up to eight spotlight products on the banner
 * stage with the brand's gold rings. The rotation is CSS only
 * (`.gd-spot*` in globals.css): every frame shares one keyframe set per
 * frame count, offset by 6 s; hover, keyboard focus and the pause button
 * stop it, reduced motion shows the first frame still. On phones the frames
 * become a swipeable scroll-snap row. Only the first frame's photo is
 * preloaded (LCP); the rest load lazily.
 */

export interface ShowcaseFrame {
  reason: SpotlightReason | null;
  product: ShopProductCard;
}

const ART: ReadonlyArray<ProductArtKind> = ["dropper", "tube", "jar", "pump", "toner"];
const pad = (value: number) => String(value).padStart(2, "0");
const NEXT_UP = 3;

function FrameArt({
  product,
  preload,
  small = false,
}: {
  product: ShopProductCard;
  preload?: boolean;
  small?: boolean;
}) {
  const src = small
    ? (product.imageThumb ?? product.image)
    : (product.imageMedium ?? product.image);
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes={small ? "76px" : "(min-width: 72rem) 420px, (min-width: 37.5rem) 50vw, 80vw"}
        preload={preload}
        className={cn("object-contain media-dim", small ? "p-1.5" : "p-[clamp(12px,3vw,40px)]")}
      />
    );
  }
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <ProductArt
        kind={ART[product.id % ART.length] ?? "jar"}
        width={small ? 48 : 200}
        className="media-dim"
      />
    </span>
  );
}

export function Showcase({
  locale,
  frames,
  onlineSalesEnabled,
  cashback,
}: {
  locale: Locale;
  frames: ReadonlyArray<ShowcaseFrame>;
  onlineSalesEnabled: boolean;
  cashback: CashbackRates;
}) {
  const copy = homeCopy[locale];
  const shown = frames.slice(0, SPOTLIGHT_MAX);
  const count = shown.length;
  if (count === 0) return null;
  const animated = count > 1;

  return (
    <section
      aria-label={copy.stage.label}
      data-spot=""
      data-count={animated ? count : undefined}
      style={{ "--gd-spot-n": count } as CSSProperties}
      className="gd-spot relative min-w-0 flex-[1_1_560px] sm:min-h-[600px] sm:overflow-hidden sm:rounded-lg sm:bg-banner sm:shadow-lg"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 800 800"
        className="pointer-events-none absolute top-[44%] left-[40%] hidden size-[900px] -translate-x-1/2 -translate-y-1/2 text-gold sm:block"
      >
        <circle cx="400" cy="400" r="150" fill="currentColor" opacity="0.07" />
        <circle
          cx="400"
          cy="400"
          r="150"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <circle cx="400" cy="400" r="218" fill="none" stroke="currentColor" opacity="0.32" />
        <circle cx="400" cy="400" r="290" fill="none" stroke="currentColor" opacity="0.2" />
        <circle cx="400" cy="400" r="368" fill="none" stroke="currentColor" opacity="0.12" />
      </svg>

      {animated ? (
        <div className="absolute inset-x-6 top-[18px] z-[3] hidden items-center gap-3.5 sm:flex">
          <div aria-hidden="true" className="flex flex-1 gap-1.5">
            {shown.map((frame, index) => (
              <span
                key={frame.product.id}
                className="block h-[3px] flex-1 overflow-hidden rounded-full bg-banner-ink-soft/20"
              >
                <span
                  className="gd-spot-tick block h-full origin-left bg-banner-ink"
                  style={{ "--gd-spot-i": index } as CSSProperties}
                />
              </span>
            ))}
          </div>
          <ShowcasePause pause={copy.stage.pause} play={copy.stage.play} />
        </div>
      ) : null}

      <ul
        className={cn(
          "m-0 list-none p-0",
          "max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2",
          "sm:grid sm:h-full",
        )}
      >
        {shown.map((frame, index) => {
          const { product } = frame;
          const path = shopPath(locale, { kind: "product", slug: product.segment });
          const stock = stockState(product.available, product.inStock);
          const line = stockLine(product, locale);
          const earn = cashbackLabel(product.price, product.promo, cashback, locale);
          const meta = [
            product.volume ? localizeVolume(product.volume, locale) : null,
            product.category?.name ?? null,
          ].filter(Boolean);
          const nextUp = animated
            ? Array.from(
                { length: Math.min(NEXT_UP, count - 1) },
                (_, k) => shown[(index + k + 1) % count]!,
              )
            : [];
          return (
            <li
              key={product.id}
              aria-label={copy.stage.frame(index + 1, count)}
              style={{ "--gd-spot-i": index } as CSSProperties}
              className={cn(
                "gd-spot-frame relative flex min-h-[520px] flex-col",
                "max-sm:shrink-0 max-sm:basis-[86%] max-sm:snap-center max-sm:overflow-hidden max-sm:rounded-lg max-sm:bg-banner",
                "sm:min-h-[600px] sm:[grid-area:1/1]",
              )}
            >
              {/* Reason chip and counter */}
              <div className="relative z-[3] flex flex-wrap items-center gap-2.5 px-5 pt-5 sm:px-6 sm:pt-[62px]">
                {frame.reason ? (
                  <>
                    <span className="inline-flex h-[26px] items-center rounded-full border border-gold/35 bg-gold/15 px-3 text-overline text-banner-ink uppercase">
                      {copy.stage.reasons[frame.reason]}
                    </span>
                    <span className="text-body-sm text-banner-ink-soft/80">
                      {copy.stage.reasonLines[frame.reason]}
                    </span>
                  </>
                ) : null}
                {animated ? (
                  <span className="ml-auto text-caption font-bold tracking-[0.08em] text-banner-ink-soft tabular-nums">
                    {copy.stage.counter(pad(index + 1), pad(count))}
                  </span>
                ) : null}
              </div>

              {/* Product art */}
              <Link
                href={path}
                tabIndex={-1}
                aria-hidden="true"
                className="relative mx-auto my-2 block aspect-square w-[72%] flex-1 sm:absolute sm:top-24 sm:bottom-44 sm:left-[8%] sm:my-0 sm:aspect-auto sm:w-[58%]"
              >
                <FrameArt product={product} preload={index === 0} />
              </Link>

              {/* Next up */}
              {nextUp.length ? (
                <div className="absolute top-1/2 right-5 z-[3] hidden -translate-y-[58%] flex-col gap-2.5 lg:flex">
                  <span className="text-center text-overline text-banner-ink-soft/70 uppercase">
                    {copy.stage.nextUp}
                  </span>
                  {nextUp.map((next) => (
                    <Link
                      key={next.product.id}
                      href={shopPath(locale, { kind: "product", slug: next.product.segment })}
                      title={next.product.name}
                      className="relative block size-[76px] overflow-hidden rounded-[14px] border border-banner-ink-soft/15 bg-banner-ink-soft/5 transition-colors hover:border-gold"
                    >
                      <span className="sr-only">{next.product.name}</span>
                      <FrameArt product={next.product} small />
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* Info panel */}
              <div className="relative z-[3] m-4 mt-auto flex flex-wrap items-end justify-between gap-4 rounded-[16px] border border-banner-ink-soft/15 bg-banner-ink-soft/[0.07] p-[18px] backdrop-blur-md sm:absolute sm:right-5 sm:bottom-5 sm:left-5 sm:m-0 lg:right-[120px]">
                <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                  {meta.length ? (
                    <span className="text-caption text-banner-ink-soft/80">{meta.join(" · ")}</span>
                  ) : null}
                  <Link
                    href={path}
                    className="text-[19px] leading-[25px] font-bold text-banner-ink-soft no-underline hover:underline"
                  >
                    {product.name}
                  </Link>
                  {onlineSalesEnabled ? (
                    <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-banner-ink-soft">
                      <span aria-hidden="true" className={cn("size-2 rounded-full", line.dot)} />
                      {line.text}
                    </span>
                  ) : (
                    <span className="text-body-sm text-banner-ink-soft/80">
                      {copy.stage.askInStore}
                    </span>
                  )}
                </div>
                <div className="flex flex-none flex-col items-start gap-2.5 sm:items-end">
                  <span className="text-[26px] leading-[30px] font-extrabold tracking-[-0.01em] text-banner-ink tabular-nums">
                    {formatPrice(product.price, locale)}
                  </span>
                  {earn ? (
                    <span className="text-caption font-semibold text-banner-ink-soft/80 tabular-nums">
                      {earn}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={path}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-label no-underline",
                        onlineSalesEnabled
                          ? "border border-banner-ink-soft/30 text-banner-ink-soft hover:border-gold"
                          : "bg-gold text-on-gold hover:shadow-lg",
                      )}
                    >
                      {copy.card.details}
                      {onlineSalesEnabled ? null : <Icon name="arrow-right" size={16} />}
                    </Link>
                    {onlineSalesEnabled && stock !== "out_of_stock" ? (
                      <div className="min-w-[132px]">
                        <AddToCart
                          compact
                          locale={locale}
                          productId={product.id}
                          productPath={path}
                          state="available"
                          labels={{
                            add: copy.card.addShort,
                            soldOut: copy.card.soldOut,
                            salesOff: copy.card.salesOff,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ShowcaseSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-[520px] min-w-0 flex-[1_1_560px] overflow-hidden rounded-lg bg-banner sm:min-h-[600px]"
    >
      <span className="absolute inset-x-5 bottom-5 block h-[132px] rounded-[16px] bg-banner-ink-soft/[0.07]" />
    </div>
  );
}
