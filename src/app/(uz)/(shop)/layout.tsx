import { ShopChrome } from "@/features/shop/components/shop-chrome";

/** Storefront chrome (header, footer) around the Uzbek shop pages; static. */
export default function UzShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopChrome locale="uz">{children}</ShopChrome>;
}
