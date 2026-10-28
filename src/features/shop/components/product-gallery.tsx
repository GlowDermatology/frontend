import Image from "next/image";

import type { ShopProduct } from "@/domain/shop";

import type { ShopDictionary } from "../content";
import { ProductImage } from "./product-image";

const MAIN_SIZES = "(min-width: 72rem) 640px, (min-width: 37.5rem) 80vw, 100vw";

/**
 * Product photos without client JavaScript: a scroll-snap track (swipe on
 * phones) and thumbnails that are in-page links to each slide. The first
 * photo is the page's LCP image (`priority`), the frame keeps its 4:5 space
 * before any image loads.
 */
export function ProductGallery({ product, dict }: { product: ShopProduct; dict: ShopDictionary }) {
  const photos = product.images.filter((image) => image.image);
  if (photos.length <= 1) {
    return (
      <ProductImage
        src={photos[0]?.image ?? product.image}
        alt={product.name}
        sizes={MAIN_SIZES}
        priority
        seed={product.id}
      />
    );
  }
  return (
    <section aria-label={dict.product.galleryLabel} className="flex flex-col gap-3">
      <ul
        // Keyboard users scroll the photos with the arrow keys once focused.
        tabIndex={0}
        aria-label={dict.product.galleryLabel}
        className="m-0 flex snap-x snap-mandatory [scrollbar-width:none] list-none overflow-x-auto overscroll-x-contain rounded-lg p-0"
      >
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            id={`photo-${index + 1}`}
            className="w-full shrink-0 snap-center scroll-mt-24"
          >
            <ProductImage
              src={photo.image}
              alt={
                index === 0
                  ? product.name
                  : `${product.name} — ${dict.product.imageLabel(index + 1, photos.length)}`
              }
              sizes={MAIN_SIZES}
              priority={index === 0}
              seed={product.id}
            />
          </li>
        ))}
      </ul>
      <ul className="m-0 flex list-none gap-2.5 p-0">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <a
              href={`#photo-${index + 1}`}
              aria-label={dict.product.imageLabel(index + 1, photos.length)}
              className="relative block size-16 overflow-hidden rounded-md border border-line bg-image-well transition-[border-color] duration-150 hover:border-gold sm:size-20"
            >
              <Image src={photo.image!} alt="" fill sizes="80px" className="object-cover" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
