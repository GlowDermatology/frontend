import Image from "next/image";

import type { ShopProduct } from "@/domain/shop";

import type { ShopDictionary } from "../content";
import { ProductImage } from "./product-image";
import { ProductViewer, ViewerTrigger, type ViewerCopy, type ViewerPhoto } from "./product-viewer";

const MAIN_SIZES = "(min-width: 72rem) 640px, (min-width: 37.5rem) 80vw, 100vw";

/**
 * Product photos without client JavaScript: a scroll-snap track (swipe on
 * phones) and thumbnails that are in-page links to each slide. The first
 * photo is the page's LCP image (`priority`), the frame keeps its 4:5 space
 * before any image loads. A photo's 4:5 rendition (full size) fills the slides and its 1:1
 * rendition the thumbnails; without them the photo itself is shown, as before. Every slide opens the
 * full-screen viewer (the whole original photo, a slider, zoom): its magnifier chip or a click.
 */
export function ProductGallery({ product, dict }: { product: ShopProduct; dict: ShopDictionary }) {
  const photos = product.images.filter((image) => image.image);
  const total = Math.max(1, photos.length);
  const altOf = (index: number) =>
    photos[index]?.alt ||
    (index === 0
      ? product.name
      : `${product.name} — ${dict.product.imageLabel(index + 1, photos.length)}`);
  const viewerPhotos: ViewerPhoto[] = photos.length
    ? photos.map((photo, index) => ({
        src: photo.image!,
        alt: altOf(index),
        thumb: photo.renditions.square?.thumb ?? photo.thumb ?? null,
      }))
    : product.image
      ? [{ src: product.image, alt: product.name, thumb: null }]
      : [];
  const copy: ViewerCopy = {
    title: dict.product.viewer.title,
    close: dict.product.viewer.close,
    previous: dict.product.viewer.previous,
    next: dict.product.viewer.next,
    zoomIn: dict.product.viewer.zoomIn,
    zoomOut: dict.product.viewer.zoomOut,
    hint: dict.product.viewer.hint,
    hintZoomed: dict.product.viewer.hintZoomed,
    imageLabels: viewerPhotos.map((_, index) => dict.product.imageLabel(index + 1, total)),
  };
  if (photos.length <= 1) {
    const single = (
      <ProductImage
        src={
          photos[0]
            ? (photos[0].renditions.portrait?.url ?? photos[0].image)
            : (product.renditions.portrait?.url ?? product.image)
        }
        alt={photos[0]?.alt || product.name}
        sizes={MAIN_SIZES}
        priority
        seed={product.id}
      />
    );
    if (!viewerPhotos.length) return single;
    return (
      <ProductViewer photos={viewerPhotos} copy={copy}>
        <div className="relative">
          {single}
          <ViewerTrigger
            index={0}
            label={`${dict.product.viewer.enlarge}: ${dict.product.imageLabel(1, 1)}`}
            text={dict.product.viewer.enlarge}
          />
        </div>
      </ProductViewer>
    );
  }
  return (
    <ProductViewer photos={viewerPhotos} copy={copy}>
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
              className="relative w-full shrink-0 snap-center scroll-mt-24"
            >
              <ProductImage
                src={photo.renditions.portrait?.url ?? photo.image}
                alt={altOf(index)}
                sizes={MAIN_SIZES}
                priority={index === 0}
                seed={product.id}
              />
              <ViewerTrigger
                index={index}
                label={`${dict.product.viewer.enlarge}: ${dict.product.imageLabel(index + 1, photos.length)}`}
                text={dict.product.viewer.enlarge}
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
                <Image
                  src={(photo.renditions.square?.thumb ?? photo.thumb ?? photo.image)!}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover media-dim"
                />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </ProductViewer>
  );
}
