import { ShopNotFound } from "@/features/shop/pages/errors";

/** Localized 404 inside the shop chrome; the title and robots tag come from `ShopNotFound`. */
export default function UzShopNotFound() {
  return <ShopNotFound locale="uz" />;
}
