import { brandImage } from "@/features/shop/og/og-image";
import { getShopDictionary } from "@/features/shop/content";
import { siteConfig } from "@/config/site";
import { isLocale } from "@/lib/i18n/locales";

/** `GET /og/home/{uz|ru|en}` — the home page's Open Graph image. */
export async function GET(_request: Request, context: RouteContext<"/og/home/[locale]">) {
  const { locale } = await context.params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const dict = getShopDictionary(locale);
  return brandImage({
    eyebrow: dict.home.heroEyebrow,
    title: `${dict.home.heroTitleStart} ${dict.home.heroTitleEmphasis} ${dict.home.heroTitleEnd}`,
    // The deployment's own host (NEXT_PUBLIC_SITE_URL), never a hardcoded domain.
    footer: new URL(siteConfig.url).host,
  });
}
