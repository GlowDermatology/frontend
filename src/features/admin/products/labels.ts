import type { Tone } from "@/components/ui/badge";
import type { CategoryId, ProductStatus } from "@/domain/product";

/** Category names as managed under "Kategoriyalar" (from the API later). */
export const CATEGORY_LABEL: Record<CategoryId, string> = {
  serums: "Serumlar",
  cleansing: "Tozalash",
  moisturizing: "Namlantirish",
  sun: "Quyoshdan himoya",
  toners: "Tonerlar",
};

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: Tone }> = {
  active: { label: "Faol", tone: "success" },
  hidden: { label: "Yashirin", tone: "neutral" },
};
