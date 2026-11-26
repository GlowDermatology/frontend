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
  fit?: "cover" | "contain";
  /**
   * `src` is a 1:1 rendition (a crop staff chose): in a `contain` frame it fills a square box
   * centred in the well (`object-cover`, no padding) instead of floating with padding. The
   * box is the frame itself when the frame is square (`aspect-square`), so the crop is never
   * cut again.
   */
  square?: boolean;
}

/**
 * A product photo in a fixed 4:5 frame on the warm image well (pass the photo's 4:5 rendition
 * when it has one: it fills the frame exactly). The frame
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
  fit = "cover",
  square = false,
}: ProductImageProps) {
  const zoomClass =
    zoom &&
    "transition-transform duration-700 ease-soft group-hover:scale-[1.035] group-focus-visible:scale-[1.035]";
  return (
    <span
      className={cn(
        "relative block w-full overflow-hidden bg-image-well",
        fit === "contain" ? "aspect-[4/3] rounded-[14px]" : "aspect-product rounded-lg",
        className,
      )}
    >
      {src && square && fit === "contain" ? (
        <span className="absolute inset-y-0 left-1/2 aspect-square h-full max-w-full -translate-x-1/2 overflow-hidden">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn("object-cover media-dim", zoomClass)}
          />
        </span>
      ) : src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "media-dim",
            fit === "contain" ? "object-contain p-[clamp(16px,2vw,28px)]" : "object-cover",
            zoomClass,
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
            className="relative media-dim"
          />
          {alt ? <span className="sr-only">{alt}</span> : null}
        </span>
      )}
    </span>
  );
}
