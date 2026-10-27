import type { ProductBaseline, ProductFormValues } from "@/data/products.schema";
import type { ActionResult } from "@/data/types";
import type { Product, ProductImage } from "@/domain/product";

/**
 * Product save orchestration (spec "Frontend wiring › Product save
 * orchestration", contract §2.3 and §7.7), framework-free so it can be unit
 * tested with stubbed actions:
 *
 * 1. create the product (always hidden, idempotency-keyed) or PATCH what
 *    differs from the editor's baseline;
 * 2. delete the removed images;
 * 3. upload the new files (appended last by the server);
 * 4. save the image order — only when it differs from the order the server
 *    now holds;
 * 5. PATCH `status: "active"` when activation was requested and the product
 *    was not already active.
 *
 * Deletes run before uploads so swapping a photo of a product that already
 * has 8 never makes the server see 9 (`images` `max_items`). An active
 * product that keeps active keeps one removed image as an anchor until the
 * first upload has landed, so the "last image of an active product" 409
 * cannot happen. Progress survives a failed step in `PendingImages`
 * (uploaded files, the server's image ids, the scalar values the server now
 * holds), so a retry neither re-uploads, re-deletes, nor re-sends a patch.
 */

export interface PersistActions {
  save: (
    id: string | null,
    values: ProductFormValues,
    baseline: ProductBaseline | null,
  ) => Promise<ActionResult<Product>>;
  upload: (productId: string, file: File) => Promise<ActionResult<ProductImage>>;
  remove: (productId: string, imageId: string) => Promise<ActionResult<{ id: string }>>;
  reorder: (productId: string, imageIds: string[]) => Promise<ActionResult<{ imageIds: string[] }>>;
}

/** Save progress kept outside React state (nothing renders from it). */
export interface PendingImages {
  /** Temporary `upload-…` id → the picked file, until it is uploaded. */
  files: Map<string, File>;
  /** Temporary id → the server's image, once uploaded (insertion order = upload order). */
  uploaded: Map<string, ProductImage>;
  /** The image ids the server holds, in its order, as far as this editor knows; `null` before a save. */
  server: string[] | null;
  /** The scalar values the server holds after a partially failed save (the next diff's baseline). */
  committed: ProductBaseline | null;
}

export function createPendingImages(): PendingImages {
  return { files: new Map(), uploaded: new Map(), server: null, committed: null };
}

/** After a complete save: the saved product becomes the editor's new baseline. */
export function clearPendingImages(pending: PendingImages): void {
  pending.files.clear();
  pending.uploaded.clear();
  pending.server = null;
  pending.committed = null;
}

/** The editable scalar fields of a product or of the form (the PATCH baseline). */
export function productBaseline(source: Product | ProductFormValues): ProductBaseline {
  return {
    texts: structuredClone(source.texts),
    price: source.price,
    category: source.category ?? "",
    billzId: source.billzId,
    promo: source.promo,
    status: source.status,
    slug: source.slug,
    seo: structuredClone(source.seo),
  };
}

/** Whether the server's image order (after deletes and uploads) differs from the wanted one. */
export function needsReorder(serverIds: ReadonlyArray<string>, finalIds: ReadonlyArray<string>) {
  return (
    serverIds.length !== finalIds.length || serverIds.some((id, index) => id !== finalIds[index])
  );
}

type Failure = Extract<ActionResult<never>, { ok: false }>;

export interface PersistResult {
  result: ActionResult<Product>;
  /** The id of a product created by this call (kept even when a later step failed). */
  createdId: string | null;
}

export async function persistProduct(input: {
  /** The product as the editor loaded it (`null` for a new one). */
  saved: Product | null;
  /** The id to patch; `null` creates. */
  targetId: string | null;
  values: ProductFormValues;
  pending: PendingImages;
  actions: PersistActions;
}): Promise<PersistResult> {
  const { saved, targetId, values, pending, actions } = input;
  const baseline = pending.committed ?? (saved ? productBaseline(saved) : null);
  pending.server ??= saved?.images.map((image) => image.id) ?? [];

  const serverIdOf = (image: ProductImage): string | null =>
    pending.uploaded.get(image.id)?.id ?? (pending.files.has(image.id) ? null : image.id);
  const keptIds = new Set(
    values.images
      .map(serverIdOf)
      .filter((id): id is string => id !== null && pending.server!.includes(id)),
  );
  const toDelete = pending.server.filter((id) => !keptIds.has(id));
  const toUpload = values.images.filter((image) => pending.files.has(image.id));

  const wantActive = values.status === "active";
  // An active product stays active through the image steps (the anchor rule
  // keeps one image on it); anything else is hidden first and activated last.
  const firstStatus = wantActive && baseline?.status === "active" ? "active" : "hidden";

  const first = await actions.save(targetId, { ...values, status: firstStatus }, baseline);
  if (!first.ok) return { result: first, createdId: null };
  const id = first.data.id;
  const createdId = targetId === null ? id : null;
  pending.committed = { ...productBaseline(values), status: firstStatus };

  const fail = (failure: Failure, message?: string): PersistResult => ({
    result: { ...failure, error: message ?? failure.error, fieldErrors: undefined },
    createdId,
  });

  const removeImage = async (imageId: string): Promise<Failure | null> => {
    const deleted = await actions.remove(id, imageId);
    // 404: already gone (an earlier attempt, or another admin) — the goal holds.
    if (!deleted.ok && deleted.code !== "not_found") return deleted;
    pending.server = pending.server!.filter((serverId) => serverId !== imageId);
    return null;
  };

  let anchor =
    firstStatus === "active" && keptIds.size === 0 && toDelete.length > 0
      ? toDelete[toDelete.length - 1]!
      : null;
  for (const imageId of toDelete) {
    if (imageId === anchor) continue;
    const failure = await removeImage(imageId);
    if (failure) return fail(failure);
  }

  for (const image of toUpload) {
    const file = pending.files.get(image.id)!;
    const upload = await actions.upload(id, file);
    if (!upload.ok) {
      return fail(upload, upload.fieldErrors?.file ?? upload.fieldErrors?.images);
    }
    // Keep the local preview when the server sent no URL (demo mode).
    const uploaded = { ...upload.data, src: upload.data.src ?? image.src };
    pending.uploaded.set(image.id, uploaded);
    pending.files.delete(image.id);
    pending.server.push(uploaded.id);
    if (anchor) {
      const failure = await removeImage(anchor);
      if (failure) return fail(failure);
      anchor = null;
    }
  }
  if (anchor) {
    const failure = await removeImage(anchor);
    if (failure) return fail(failure);
  }

  const finalImages = values.images.map((image) => pending.uploaded.get(image.id) ?? image);
  const finalIds = finalImages.map((image) => image.id);
  if (needsReorder(pending.server, finalIds)) {
    const ordered = await actions.reorder(id, finalIds);
    if (!ordered.ok) return fail(ordered);
    pending.server = [...finalIds];
  }

  let product: Product = { ...first.data, images: finalImages };
  if (wantActive && firstStatus !== "active") {
    const activated = await actions.save(
      id,
      { ...values, status: "active", images: finalImages },
      pending.committed,
    );
    if (!activated.ok) return { result: activated, createdId };
    pending.committed = { ...pending.committed, status: "active" };
    product = { ...activated.data, images: finalImages };
  }
  return { result: { ok: true, data: product }, createdId };
}
