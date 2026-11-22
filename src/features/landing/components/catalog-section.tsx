import { ProductArt, type ProductArtKind } from "@/components/brand/product-art";
import { Icon } from "@/components/ui/icon";
import { SECTION_IDS } from "@/config/site";
import { cn } from "@/lib/cn";

import type { LandingDictionary } from "../content/uz";
import { liftCard } from "./pillars";
import { Eyebrow, SectionTitle, gutter, textLink } from "./primitives";

const ART: ReadonlyArray<ProductArtKind> = ["pump", "jar", "dropper", "tube", "toner"];

export function CatalogSection({ dict }: { dict: LandingDictionary["catalog"] }) {
  return (
    <section
      id={SECTION_IDS.catalog}
      aria-labelledby="catalog-title"
      className={cn("pb-[clamp(72px,9vw,128px)]", gutter)}
    >
      <div className="mx-auto flex max-w-[1184px] flex-col gap-[clamp(32px,4vw,60px)]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="flex flex-col gap-4">
            <Eyebrow>{dict.eyebrow}</Eyebrow>
            <SectionTitle id="catalog-title" className="text-wrap">
              {dict.title}
            </SectionTitle>
          </div>
          <a
            href={`#${SECTION_IDS.download}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-ink",
              textLink,
            )}
          >
            {dict.link}
            <Icon name="arrow-right" size={20} className="text-gold-ink" />
          </a>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-7 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {dict.categories.map((category, index) => (
            <li key={category}>
              <a
                href={`#${SECTION_IDS.download}`}
                className={cn("flex flex-col gap-4 rounded-lg text-ink no-underline", liftCard)}
              >
                <span className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-line bg-gold-soft">
                  <ProductArt
                    kind={ART[index] ?? "jar"}
                    width={120}
                    className="relative max-w-[60%]"
                  />
                </span>
                <span className="flex items-center justify-between gap-2 px-1 text-[clamp(15px,1.5vw,20px)] font-semibold">
                  {category}
                  <Icon name="arrow-right" size={20} className="text-gold-ink" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
