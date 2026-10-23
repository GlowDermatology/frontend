import { ProductArt, type ProductArtKind } from "@/components/brand/product-art";
import { Rings } from "@/components/brand/rings";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";

const CATEGORY_ART: ReadonlyArray<{ kind: ProductArtKind; width: number }> = [
  { kind: "pump", width: 22 },
  { kind: "jar", width: 26 },
  { kind: "dropper", width: 22 },
  { kind: "tube", width: 22 },
];

const PRODUCT_ART: ReadonlyArray<ProductArtKind> = ["dropper", "jar"];

/**
 * Illustration of the app's catalog screen. It is a single image to assistive
 * technology (`role="img"` + label); the miniature UI inside is decoration.
 */
export function PhoneMockup({ dict, label }: { dict: LandingDictionary["phone"]; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative h-[596px] w-[290px] shrink-0 rounded-[46px] bg-on-gold p-[9px] shadow-[0_48px_90px_-28px_#000000b3,0_0_0_1px_#c9a24b55]"
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[38px] bg-surface">
        <div className="flex items-center justify-between px-4 pt-[30px] pb-2">
          <span className="font-serif text-[19px] font-semibold text-ink">Glow Derma</span>
          <span className="flex gap-3 text-ink">
            <Icon name="search" size={17} strokeWidth={1.9} />
            <span className="relative flex">
              <Icon name="bell" size={17} strokeWidth={1.9} />
              <span className="absolute top-0 right-0 size-1.5 rounded-full bg-danger" />
            </span>
          </span>
        </div>

        <div className="relative mx-3.5 mt-1 h-[104px] overflow-hidden rounded-[14px] bg-banner p-3.5">
          <Rings
            viewBox={200}
            strokeWidth={1.5}
            rings={[
              [30, 0.6],
              [50, 0.4],
              [70, 0.25],
              [90, 0.12],
            ]}
            className="absolute -top-12 -right-16 size-[200px]"
          />
          <div className="relative text-[7.5px] font-bold tracking-[0.08em] text-banner-ink uppercase">
            {dict.promoEyebrow}
          </div>
          <div className="relative mt-[5px] max-w-[150px] font-serif text-[18px] leading-[19px] font-semibold text-banner-ink">
            {dict.promoTitle}
          </div>
          <div className="relative mt-[5px] text-[9px] text-banner-ink-soft">{dict.promoBody}</div>
          <div className="absolute bottom-2.5 left-3.5 flex gap-1">
            <span className="h-1 w-3 rounded-full bg-gold" />
            <span className="size-1 rounded-full bg-nav-ink-muted" />
            <span className="size-1 rounded-full bg-nav-ink-muted" />
          </div>
        </div>

        <div className="mx-3.5 mt-2.5 flex h-[30px] items-center gap-1.5 rounded-[9px] border border-line bg-surface-raised px-2.5 text-[9.5px] text-ink-muted">
          <Icon name="search" size={12} strokeWidth={2} />
          {dict.search}
        </div>

        <div className="mx-3.5 mt-3 flex justify-between">
          {dict.categories.map((category, index) => {
            const art = CATEGORY_ART[index] ?? CATEGORY_ART[0]!;
            return (
              <span key={category} className="flex w-[52px] flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-[42px] items-center justify-center rounded-full bg-gold-soft",
                    index === 0 && "shadow-[inset_0_0_0_1.5px_var(--gd-gold)]",
                  )}
                >
                  <ProductArt kind={art.kind} detail="glyph" width={art.width} />
                </span>
                <span
                  className={cn(
                    "text-[8px] font-semibold",
                    index === 0 ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {category}
                </span>
              </span>
            );
          })}
        </div>

        <div className="mx-3.5 mt-3 grid grid-cols-2 gap-2">
          {dict.products.map((product, index) => (
            <div
              key={product.name}
              className="flex flex-col gap-1 rounded-[13px] bg-surface-raised p-1.5 shadow-sm"
            >
              <div className="flex h-[92px] items-center justify-center rounded-[9px] bg-gold-soft">
                <ProductArt kind={PRODUCT_ART[index] ?? "dropper"} detail="card" width={54} />
              </div>
              <div className="px-0.5 text-[9.5px] leading-3 font-semibold text-ink">
                {product.name}
              </div>
              <div className="px-0.5 text-[8px] text-ink-muted">{product.meta}</div>
              {index === 0 ? (
                <div className="flex h-6 items-center justify-center rounded-[7px] bg-gold text-[10px] font-bold text-on-gold tabular-nums">
                  {product.price}
                </div>
              ) : (
                <div className="flex h-6 items-center justify-between rounded-[7px] border border-line-strong px-2 text-[10px] font-bold text-ink tabular-nums">
                  <span>−</span>
                  <span>1</span>
                  <span>+</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex h-[54px] items-center justify-around bg-nav px-1.5">
          <span className="flex h-[22px] w-9 items-center justify-center rounded-full bg-gold text-on-gold">
            <Icon name="grid" size={14} strokeWidth={2} />
          </span>
          <Icon name="qr" size={15} strokeWidth={1.9} className="text-nav-ink-muted" />
          <span className="relative flex text-nav-ink-muted">
            <Icon name="bag" size={15} strokeWidth={1.9} />
            <span className="absolute -top-[5px] -right-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-gold text-[7px] font-extrabold text-on-gold">
              2
            </span>
          </span>
          <Icon name="sparkle" size={15} strokeWidth={1.9} className="text-nav-ink-muted" />
          <Icon name="user" size={15} strokeWidth={1.9} className="text-nav-ink-muted" />
        </div>
      </div>
    </div>
  );
}
