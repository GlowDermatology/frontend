"use server";

import { z } from "zod";

import type { Category } from "@/domain/category";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import {
  apiCreateCategory,
  apiDeleteCategory,
  apiPatchCategory,
  apiReorderCategories,
} from "./api/catalog";
import { categoryCreateBody, categoryPatchBody, mapCategory, toActionResult } from "./api/mappers";
import { categoryFormData } from "./api/mappers/categories";
import {
  categoryEditSchema,
  categoryFormSchema,
  categoryImageSchema,
  categorySlugSchema,
  type CategoryEditValues,
  type CategoryFormValues,
} from "./categories.schema";
import type { ActionFailure } from "./types";
import * as mock from "./mock/categories.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Category mutations (contract §2.4): `POST categories/`, `PATCH
 * categories/{slug}/` (the slug is immutable and never sent), `DELETE
 * categories/{slug}/` (409 `conflict` while it has products) and `PUT
 * categories/order/` with the exact set of slugs. Create and update carry
 * the dialog's idempotency key; delete and reorder are idempotent by nature.
 *
 * Gap ADM-5.1: create and update take an optional `media` `FormData` from
 * the dialog — an `image` part (sent as multipart with the values) or
 * `remove_image=true` (a JSON PATCH with `remove_image: true`).
 */

type ParsedMedia = { ok: true; image: File | null; remove: boolean } | ActionFailure;

function parseMedia(media: FormData | null | undefined): ParsedMedia {
  if (!(media instanceof FormData)) return { ok: true, image: null, remove: false };
  const picked = media.get("image");
  const image = categoryImageSchema.safeParse(
    picked instanceof File && picked.size > 0 ? picked : undefined,
  );
  if (!image.success) {
    return {
      ok: false,
      error: "Rasmni tekshiring.",
      fieldErrors: { image: image.error.issues[0]?.message ?? "Rasmni tekshiring." },
    };
  }
  const remove = media.get("remove_image") === "true";
  if (image.data && remove) {
    return { ok: false, error: "Rasmni tekshiring.", fieldErrors: { image: "Rasmni tekshiring." } };
  }
  return { ok: true, image: image.data ?? null, remove };
}

export async function createCategory(
  values: CategoryFormValues,
  key: string,
  csrf: string,
  media?: FormData | null,
): Promise<ActionResult<Category>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedKey = z.object({ key: idempotencyKeySchema }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error);
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const file = parseMedia(media);
  if (!file.ok) return file;
  const image = file.image;
  if ((await dataSource()) === "api") {
    return apiMutation("createCategory", async () => {
      try {
        const { data } = await apiCreateCategory(
          sessionToken(guard.session),
          image
            ? { formData: categoryFormData(parsed.data, image) }
            : { json: categoryCreateBody(parsed.data) },
          parsedKey.data.key,
        );
        return { ok: true, data: mapCategory(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.createCategory(parsed.data, image);
}

export async function updateCategory(
  slug: string,
  values: CategoryEditValues,
  key: string,
  csrf: string,
  media?: FormData | null,
): Promise<ActionResult<Category>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedSlug = categorySlugSchema.safeParse(slug);
  if (!parsedSlug.success) return { ok: false, error: "Kategoriya topilmadi.", code: "not_found" };
  const parsedKey = z.object({ key: idempotencyKeySchema }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error);
  const parsed = categoryEditSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const file = parseMedia(media);
  if (!file.ok) return file;
  const { image, remove } = file;
  if ((await dataSource()) === "api") {
    return apiMutation("updateCategory", async () => {
      try {
        const { data } = await apiPatchCategory(
          sessionToken(guard.session),
          parsedSlug.data,
          image
            ? { formData: categoryFormData(parsed.data, image) }
            : {
                json: remove
                  ? { ...categoryPatchBody(parsed.data), remove_image: true }
                  : categoryPatchBody(parsed.data),
              },
          parsedKey.data.key,
        );
        return { ok: true, data: mapCategory(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.updateCategory(parsedSlug.data, parsed.data, { image, remove });
}

export async function deleteCategory(
  slug: string,
  csrf: string,
): Promise<ActionResult<{ slug: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedSlug = categorySlugSchema.safeParse(slug);
  if (!parsedSlug.success) return { ok: false, error: "Kategoriya topilmadi.", code: "not_found" };
  if ((await dataSource()) === "api") {
    return apiMutation("deleteCategory", async () => {
      try {
        await apiDeleteCategory(sessionToken(guard.session), parsedSlug.data);
        return { ok: true, data: { slug: parsedSlug.data } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.deleteCategory(parsedSlug.data);
}

/** The complete new order (every current slug exactly once). */
export async function reorderCategories(
  slugs: string[],
  csrf: string,
): Promise<ActionResult<Category[]>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .array(categorySlugSchema)
    .max(200)
    .refine((list) => new Set(list).size === list.length, { error: "Sluglar takrorlanmoqda." })
    .safeParse(slugs);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Tartibni tekshiring.");
  if ((await dataSource()) === "api") {
    return apiMutation("reorderCategories", async () => {
      try {
        const { data } = await apiReorderCategories(sessionToken(guard.session), parsed.data);
        return {
          ok: true,
          data: data.results.map(mapCategory).sort((a, b) => a.position - b.position),
        };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.reorderCategories(parsed.data);
}
