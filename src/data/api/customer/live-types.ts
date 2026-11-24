import type { components } from "../schema";
import type { ApiCustomerProductCard } from "./types";

/**
 * The live landing endpoints (`home/`, `catalog/feed/`,
 * `specialists/availability/`, `clinics/`), as aliases over the generated
 * schema (`npm run gen:api`). Product cards are swapped for
 * `ApiCustomerProductCard` (the optional B-W1 fields, as in `./types.ts`).
 * The mappers (`./live-mappers.ts`) still read every field defensively.
 */
type Schemas = components["schemas"];

export type ApiSpotlightReason = Schemas["HomeSpotlightReasonEnum"];
export type ApiRailKey = Schemas["HomeRailKeyEnum"];

/** `GET home/` (cached 60 s by the API). */
export type ApiHome = Omit<Schemas["Home"], "spotlight" | "rails"> & {
  spotlight: Array<{ reason: ApiSpotlightReason; product: ApiCustomerProductCard }>;
  rails: Array<{ key: ApiRailKey; items: ApiCustomerProductCard[] }>;
};

/** `GET catalog/feed/?cursor=&category=` (cached 30 s): 24 cards per page. */
export type ApiCatalogFeed = Omit<Schemas["ProductFeed"], "results"> & {
  results: ApiCustomerProductCard[];
};

/** `GET specialists/availability/?days=7` (cached 60 s). */
export type ApiSpecialistAvailability = Schemas["SpecialistNextSlotList"];

/** `GET clinics/` (cached 60 s). */
export type ApiClinicList = Schemas["ClinicList"];
