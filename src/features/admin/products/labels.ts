import type { Tone } from "@/components/ui/badge";
import type { ProductStatus } from "@/domain/product";

/**
 * Category names come from the data (`getCategories()` → `Category.name.uz`,
 * see `categoryLabel` in `@/domain/category`); only the status labels are
 * static (contract §5.8).
 */
export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: Tone }> = {
  active: { label: "Faol", tone: "success" },
  hidden: { label: "Yashirin", tone: "neutral" },
};
