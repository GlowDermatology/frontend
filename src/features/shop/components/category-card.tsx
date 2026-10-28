import Image from "next/image";
import Link from "next/link";

import { ProductArt, type ProductArtKind } from "@/components/brand/product-art";
import { Icon } from "@/components/ui/icon";
import type { ShopCategory } from "@/domain/shop";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { liftCard } from "./layout-primitives";

const ART: ReadonlyArray<ProductArtKind> = ["dropper", "pump", "jar", "tube", "toner"];

export function CategoryCard({
  category,
  index,
  locale,
  dict,
}: {
  category: ShopCategory;
  index: number;
  locale: Locale;
  dict: ShopDictionary;
}) {
  return (
    <Link
      href={shopPath(locale, { kind: "category", slug: category.slug })}
      className={cn("group flex flex-col gap-4 rounded-lg text-ink no-underline", liftCard)}
    >
      <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-gold-soft">
        {category.image ? (
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(min-width: 72rem) 240px, (min-width: 37.5rem) 30vw, 46vw"
            className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute size-[86%]">
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                strokeWidth="1"
                strokeOpacity=".45"
                className="stroke-gold"
              />
              <circle
                cx="100"
                cy="100"
                r="64"
                fill="none"
                strokeWidth="1"
                strokeOpacity=".25"
                className="stroke-gold"
              />
            </svg>
            <ProductArt
              kind={ART[index % ART.length] ?? "jar"}
              width={92}
              className="relative transition-transform duration-700 ease-soft group-hover:-translate-y-1"
            />
          </>
        )}
      </span>
      <span className="flex items-start justify-between gap-3 px-1">
        <span className="flex flex-col gap-0.5">
          <span className="text-price">{category.name}</span>
          <span className="text-body-sm text-ink-muted">
            {dict.catalog.results(category.productCount)}
          </span>
        </span>
        <Icon
          name="arrow-right"
          size={20}
          className="mt-0.5 shrink-0 text-gold-ink transition-transform duration-300 ease-soft group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}
