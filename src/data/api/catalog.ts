import "server-only";

import { apiFetch, cachedGet, type ApiResponse, type QueryValue } from "./client";
import type {
  ApiBanner,
  ApiBannerPatch,
  ApiBannerResults,
  ApiCategory,
  ApiCategoryPatch,
  ApiCategoryResults,
  ApiCategoryWrite,
  ApiImagesResponse,
  ApiJob,
  ApiPaginatedBanners,
  ApiPaginatedCategories,
  ApiPaginatedProducts,
  ApiProduct,
  ApiProductImage,
  ApiProductPatch,
  ApiProductStats,
  ApiProductWrite,
} from "./types";

/**
 * Typed calls to the catalog endpoints (contract §2.3–§2.5, §2.14). Reads go
 * through `cachedGet` (deduplicated per render), writes through `apiFetch`.
 * Every function throws `ApiError` for a non-2xx answer; the dispatchers in
 * `src/data/*.ts` and the Server Actions map those to `null` / `ActionResult`.
 */

const BASE = "/api/v1/admin";

/* --- Products --- */

export function apiListProducts(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedProducts>(`${BASE}/products/`, params, token);
}

export function apiGetProduct(token: string, id: string) {
  return cachedGet<ApiProduct>(`${BASE}/products/${encodeURIComponent(id)}/`, undefined, token);
}

export function apiProductStats(token: string) {
  return cachedGet<ApiProductStats>(`${BASE}/products/stats/`, undefined, token);
}

/** Keyed (contract §1.7 optional): a replay answers the stored 201 with the product id. */
export function apiCreateProduct(token: string, body: ApiProductWrite, idempotencyKey: string) {
  return apiFetch<ApiProduct>(`${BASE}/products/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiPatchProduct(token: string, id: string, body: ApiProductPatch) {
  return apiFetch<ApiProduct>(`${BASE}/products/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body,
    token,
  });
}

/** Multipart with one `file` part; fetch sets the boundary (contract §2.3). */
export function apiUploadProductImage(token: string, id: string, formData: FormData) {
  return apiFetch<ApiProductImage>(`${BASE}/products/${encodeURIComponent(id)}/images/`, {
    method: "POST",
    formData,
    token,
    timeoutMs: 30_000,
  });
}

export function apiDeleteProductImage(token: string, id: string, imageId: string) {
  return apiFetch<undefined>(
    `${BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}/`,
    { method: "DELETE", token },
  );
}

export function apiReorderProductImages(token: string, id: string, imageIds: number[]) {
  return apiFetch<ApiImagesResponse>(`${BASE}/products/${encodeURIComponent(id)}/images/order/`, {
    method: "PUT",
    body: { image_ids: imageIds },
    token,
  });
}

/* --- Billz import and jobs --- */

export function apiStartBillzImport(token: string, idempotencyKey: string) {
  return apiFetch<ApiJob>(`${BASE}/integrations/billz/import/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}

export function apiGetJob(token: string, id: string): Promise<ApiResponse<ApiJob>> {
  // Not `cachedGet`: the poller wants a fresh answer on every call.
  return apiFetch<ApiJob>(`${BASE}/jobs/${encodeURIComponent(id)}/`, { token });
}

/* --- Categories --- */

export function apiListCategories(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedCategories>(`${BASE}/categories/`, params, token);
}

export function apiCreateCategory(token: string, body: ApiCategoryWrite, idempotencyKey: string) {
  return apiFetch<ApiCategory>(`${BASE}/categories/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiPatchCategory(
  token: string,
  slug: string,
  body: ApiCategoryPatch,
  idempotencyKey: string,
) {
  return apiFetch<ApiCategory>(`${BASE}/categories/${encodeURIComponent(slug)}/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey,
  });
}

export function apiDeleteCategory(token: string, slug: string) {
  return apiFetch<undefined>(`${BASE}/categories/${encodeURIComponent(slug)}/`, {
    method: "DELETE",
    token,
  });
}

export function apiReorderCategories(token: string, slugs: string[]) {
  return apiFetch<ApiCategoryResults>(`${BASE}/categories/order/`, {
    method: "PUT",
    body: { slugs },
    token,
  });
}

/* --- Banners --- */

export function apiListBanners(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedBanners>(`${BASE}/banners/`, params, token);
}

export function apiGetBanner(token: string, id: string) {
  return apiFetch<ApiBanner>(`${BASE}/banners/${encodeURIComponent(id)}/`, { token });
}

export function apiCreateBanner(token: string, formData: FormData, idempotencyKey: string) {
  return apiFetch<ApiBanner>(`${BASE}/banners/`, {
    method: "POST",
    formData,
    token,
    idempotencyKey,
    timeoutMs: 30_000,
  });
}

/** JSON when there is no new image, multipart otherwise (contract §2.5). */
export function apiPatchBanner(
  token: string,
  id: string,
  body: { json: ApiBannerPatch } | { formData: FormData },
  idempotencyKey: string,
) {
  const path = `${BASE}/banners/${encodeURIComponent(id)}/`;
  return "json" in body
    ? apiFetch<ApiBanner>(path, { method: "PATCH", body: body.json, token, idempotencyKey })
    : apiFetch<ApiBanner>(path, {
        method: "PATCH",
        formData: body.formData,
        token,
        idempotencyKey,
        timeoutMs: 30_000,
      });
}

export function apiDeleteBanner(token: string, id: string) {
  return apiFetch<undefined>(`${BASE}/banners/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    token,
  });
}

export function apiReorderBanners(token: string, ids: number[]) {
  return apiFetch<ApiBannerResults>(`${BASE}/banners/order/`, {
    method: "PUT",
    body: { ids },
    token,
  });
}
