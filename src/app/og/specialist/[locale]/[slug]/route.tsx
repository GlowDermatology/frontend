import { getSpecialist } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { getShopDictionary } from "@/features/shop/content";
import { brandImage } from "@/features/shop/og/og-image";
import { isLocale } from "@/lib/i18n/locales";

/** `GET /og/specialist/{locale}/{slug}` — a specialist page's Open Graph image (U14). */
export async function GET(
  _request: Request,
  context: RouteContext<"/og/specialist/[locale]/[slug]">,
) {
  const { locale, slug } = await context.params;
  if (!isLocale(locale) || !(await storefrontEnabled())) {
    return new Response("Not found", { status: 404 });
  }
  const specialist = await getSpecialist(locale, slug);
  if (!specialist) return new Response("Not found", { status: 404 });
  const dict = getShopDictionary(locale);
  return brandImage({
    eyebrow: specialist.roleLabel,
    title: specialist.name,
    footer: specialist.location.name || dict.footer.clinicHeading,
  });
}
