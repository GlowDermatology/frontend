import type { Tone } from "@/components/ui/badge";
import type { ProductStatus } from "@/domain/product";

/**
 * Category names come from the data (`getCategories()` → `Category.name.uz`,
 * see `categoryLabel` in `@/domain/category`); the status labels live in
 * `productsCopy.status` (contract §5.8), their badge tones here.
 */
export const PRODUCT_STATUS_TONE: Record<ProductStatus, Tone> = {
  active: "success",
  hidden: "neutral",
};
