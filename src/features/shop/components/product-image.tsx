import Image from "next/image";

import { ProductArt, type ProductArtKind } from "@/components/brand/product-art";
import { cn } from "@/lib/cn";

const ART: ReadonlyArray<ProductArtKind> = ["pump", "jar", "dropper", "tube", "toner"];

interface ProductImageProps {
  /** Optimisable URL (allowed media host) or `null`. */
  src: string | null;
  alt: string;
  /** `sizes` for the responsive srcset: what fraction of the viewport the frame takes. */
  sizes: string;
  /** Above-the-fold image (LCP): preloaded, not lazy. */
  priority?: boolean;
  /** Seed for the illustration shown when a product has no photo yet. */
  seed?: number;
  className?: string;
  /** Hover zoom inside a card (`group` on the card). */
  zoom?: boolean;
}

/**
 * A product photo in a fixed 4:5 frame on the warm image well. The frame
 * reserves its space before the image loads (no layout shift) and, without
 * a photo, shows the brand's product illustration instead of a broken image.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  seed = 0,
  className,
  zoom = false,
}: ProductImageProps) {
  return (
    <span
      className={cn(
        "relative block aspect-product w-full overflow-hidden rounded-lg bg-image-well",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover",
            zoom &&
              "transition-transform duration-700 ease-soft group-hover:scale-[1.035] group-focus-visible:scale-[1.035]",
          )}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute size-[78%]">
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              strokeWidth="1"
              strokeOpacity=".45"
              className="stroke-gold"
            />
          </svg>
          <ProductArt
            kind={ART[Math.abs(seed) % ART.length] ?? "jar"}
            width={96}
            className="relative"
          />
          {alt ? <span className="sr-only">{alt}</span> : null}
        </span>
      )}
    </span>
  );
}
