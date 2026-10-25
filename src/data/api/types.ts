/**
 * Named aliases over the generated OpenAPI types (`npm run gen:api`), so the
 * auth code and the mappers never spell `components["schemas"][...]`.
 */
import type { components } from "./schema";

export type Schemas = components["schemas"];

/** `POST auth/login/` 200 (also `auth/oauth/{provider}/`). */
export type LoginResponse = Schemas["LoginResponse"];
/** `POST auth/refresh/` 200. */
export type AccessResponse = Schemas["Access"];
/** `GET auth/me/` and `LoginResponse.user`. */
export type Me = Schemas["Me"];
/** Every non-2xx body (contract §1.6). */
export type ErrorEnvelope = Schemas["ErrorEnvelope"];
export type ErrorItem = Schemas["ErrorItem"];

export type LoginRequest = Schemas["LoginRequest"];
export type RefreshRequest = Schemas["RefreshRequest"];
export type LogoutRequest = Schemas["LogoutRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];

/* --- Catalog (contract §2.3–§2.5, §2.14) --- */

export type ApiProduct = Schemas["Product"];
export type ApiProductImage = Schemas["ProductImage"];
export type ApiProductTexts = Schemas["ProductTexts"];
export type ApiProductStats = Schemas["ProductStats"];
export type ApiLastChange = Schemas["LastChange"];
export type ApiProductWrite = Schemas["ProductWriteRequest"];
/**
 * `PATCH products/{id}/`. The generated schema reuses the create shape for
 * `texts` (`uz.name` required), but the server merges `texts` at leaf level
 * (contract §2.3), so a patch carries only the changed leaves.
 */
export type ApiProductPatch = Omit<Partial<Schemas["PatchedProductWriteRequest"]>, "texts"> & {
  texts?: Partial<Record<"uz" | "ru" | "en", Schemas["ProductTextRequest"]>>;
};
export type ApiPaginatedProducts = Schemas["PaginatedProductList"];
export type ApiImagesResponse = Schemas["ImagesResponse"];

export type ApiCategory = Schemas["Category"];
export type ApiCategoryWrite = Schemas["CategoryWriteRequest"];
export type ApiCategoryPatch = Partial<Schemas["PatchedCategoryWriteRequest"]>;
export type ApiPaginatedCategories = Schemas["PaginatedCategoryList"];
export type ApiCategoryResults = Schemas["CategoryResults"];

export type ApiBanner = Schemas["Banner"];
export type ApiBannerLink = Schemas["BannerLink"];
export type ApiBannerPatch = Partial<Schemas["PatchedBannerWriteRequest"]>;
export type ApiPaginatedBanners = Schemas["PaginatedBannerList"];
export type ApiBannerResults = Schemas["BannerResults"];

export type ApiJob = Schemas["Job"];
export type ApiJobState = Schemas["JobStateEnum"];
export type ApiBillzImportRequest = Partial<Schemas["BillzImportRequest"]>;
