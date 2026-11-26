import type { Product, ProductImage, ProductImageMedia } from "@/domain/product";

/**
 * Bringing a photo the server changed outside the product save (its screen shapes set in the
 * renditions dialog) into the editor without touching the admin's unsaved work.
 *
 * The editor holds two things (see `product-editor.tsx`):
 *
 * - `saved`, its baseline: the product as the server holds it. Every PATCH is diffed against it,
 *   `persistProduct` reads the server's image ids and alt texts from it, and a new `saved`
 *   identity normally resets the form (`reset(toFormValues(saved))`).
 * - the form's values: texts, order, alt texts, pending uploads — what the admin edits. They never
 *   carry `media` (`toFormValues` leaves it out): the server owns it, nothing in the form edits it.
 *
 * A photo's `media` (size, source, product box, renditions) therefore lives on `saved.images`
 * only, and the tiles look it up by id. `adoptImage` returns a new baseline whose photo of the
 * same id has the server's new `media`; ids, order, labels and alt texts stay as they were. The
 * editor sets its reset guard (`formBaseline.current`) to that baseline before `setSaved`, so the
 * reset does not run and every unsaved edit stays; the form's values are not touched at all, so
 * `isDirty` is unchanged and `persistProduct` sees the same ids it saw before (no phantom delete,
 * upload or reorder). On the next save `persistProduct` re-attaches `media` to the returned
 * images by id (`withMedia`), so the shapes survive it as well.
 */

/** `saved` with `image.media` on its photo of the same id; `saved` itself when nothing changes. */
export function adoptImage(saved: Product, image: ProductImage): Product {
  const media = image.media;
  if (!media) return saved;
  const index = saved.images.findIndex((candidate) => candidate.id === image.id);
  if (index === -1) return saved;
  const images = saved.images.map((candidate, at) =>
    at === index ? { ...candidate, media } : candidate,
  );
  return { ...saved, images };
}

/** The `media` of each photo id, from the first list that has it. */
export function mediaById(
  ...lists: ReadonlyArray<ReadonlyArray<ProductImage> | null | undefined>
): Map<string, ProductImageMedia> {
  const out = new Map<string, ProductImageMedia>();
  for (const list of lists) {
    for (const image of list ?? []) {
      if (image.media && !out.has(image.id)) out.set(image.id, image.media);
    }
  }
  return out;
}

/** `image` with the server's `media` for its id when known (else its own, if any). */
export function withMedia(
  image: ProductImage,
  media: ReadonlyMap<string, ProductImageMedia>,
): ProductImage {
  const known = media.get(image.id) ?? image.media;
  if (!known) {
    const { media: _, ...rest } = image;
    void _;
    return rest;
  }
  return { ...image, media: known };
}

/** A photo as the form holds it: everything but the server-owned `media`. */
export function formImage<T extends ProductImage>(image: T): Omit<T, "media"> {
  const { media: _, ...rest } = image;
  void _;
  return rest;
}
