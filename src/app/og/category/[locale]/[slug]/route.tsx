import { getCategory } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { getShopDictionary } from "@/features/shop/content";
import { brandImage } from "@/features/shop/og/og-image";
import { isLocale } from "@/lib/i18n/locales";

/** `GET /og/category/{locale}/{slug}` — a category page's Open Graph image. */
export async function GET(
  _request: Request,
  context: RouteContext<"/og/category/[locale]/[slug]">,
) {
  const { locale, slug } = await context.params;
  if (!isLocale(locale) || !(await storefrontEnabled())) {
    return new Response("Not found", { status: 404 });
  }
  const category = await getCategory(locale, slug);
  if (!category) return new Response("Not found", { status: 404 });
  const dict = getShopDictionary(locale);
  return brandImage({
    eyebrow: dict.catalog.categoryLabel,
    title: category.name,
    footer: dict.catalog.results(category.productCount),
  });
}
