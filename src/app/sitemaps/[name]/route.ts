import { siteConfig } from "@/config/site";
import { getAllProducts, getCategories, getSpecialists } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import {
  categoryEntries,
  pageEntries,
  parseSitemapName,
  productEntries,
  specialistEntries,
  urlsetXml,
  type SitemapEntry,
} from "@/features/shop/seo/sitemap";

/** `/sitemaps/{type}-{locale}.xml` — one type of page in one language (api mode). */
export async function GET(_request: Request, context: RouteContext<"/sitemaps/[name]">) {
  const { name } = await context.params;
  const parsed = parseSitemapName(name);
  if (!parsed || !(await storefrontEnabled())) return new Response("Not found", { status: 404 });
  let entries: SitemapEntry[];
  switch (parsed.type) {
    case "pages":
      entries = pageEntries();
      break;
    case "categories":
      entries = categoryEntries(await getCategories(parsed.locale));
      break;
    case "products":
      // Slugs and images are language-independent: one cached uz listing serves all three.
      entries = productEntries(await getAllProducts());
      break;
    case "specialists":
      entries = specialistEntries(await getSpecialists(parsed.locale));
      break;
  }
  return new Response(urlsetXml(siteConfig.url, parsed.locale, entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
