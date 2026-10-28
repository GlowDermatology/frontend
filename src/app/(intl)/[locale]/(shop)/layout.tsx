import { ShopChrome } from "@/features/shop/components/shop-chrome";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** Storefront chrome around the Russian and English shop pages; static per language. */
export default async function IntlShopLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await intlLocaleFrom(params);
  return <ShopChrome locale={locale}>{children}</ShopChrome>;
}
