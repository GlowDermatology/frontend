import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";
import { getCategories, getCategory, listProducts } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import type { Locale } from "@/lib/i18n/locales";

/** Uzbek routes pass the locale; `[locale]` routes pass it as a promise from `params`. */
type LocaleInput = Locale | Promise<Locale>;

import { CatalogView } from "../components/catalog-view";
import { Container, PageHeading } from "../components/layout-primitives";
import { ShopBreadcrumbs } from "../components/shop-breadcrumbs";
import { CatalogSkeleton } from "../components/skeletons";
import { getShopDictionary } from "../content";
import {
  isActiveSearch,
  isIndexableCatalogView,
  parseCatalogQuery,
  type RawSearchParams,
} from "../routing/catalog-query";
import { shopPath } from "../routing/routes";
import { categoryDescription, categoryTitle } from "../seo/describe";
import { JsonLd } from "../seo/json-ld-script";
import { breadcrumbLd, itemListLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

type SearchParamsPromise = Promise<RawSearchParams>;
type SlugParams = Promise<{ slug: string }>;

const NOT_FOUND_METADATA: Metadata = { robots: { index: false, follow: false } };

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export async function catalogMetadata(
  locale: Locale,
  searchParams: SearchParamsPromise,
): Promise<Metadata> {
  if (!(await storefrontEnabled())) return NOT_FOUND_METADATA;
  const dict = getShopDictionary(locale);
  const query = parseCatalogQuery(await searchParams);
  const indexable = isIndexableCatalogView(query) && query.category === null;
  const searching = isActiveSearch(query.q);
  const base = searching ? dict.meta.searchTitle(query.q) : dict.meta.catalogTitle;
  const title = query.page > 1 ? `${base} — ${dict.meta.pageSuffix(query.page)}` : base;
  return buildShopMetadata({
    locale,
    route: { kind: "catalog" },
    title,
    description: dict.meta.catalogDescription,
    // A filtered view points at the plain list; pages keep their number.
    query: indexable && query.page > 1 ? { page: query.page } : undefined,
    noindex: !indexable,
    images: [{ url: `/og/home/${locale}`, width: 1200, height: 630, alt: dict.meta.ogAlt }],
  });
}

async function CatalogBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParamsPromise;
}) {
  if (!(await storefrontEnabled())) notFound();
  const dict = getShopDictionary(locale);
  const requested = parseCatalogQuery(await searchParams);
  const [categories, { page, query }] = await Promise.all([
    settle(getCategories(locale), [], "categories"),
    listProducts(locale, requested),
  ]);
  const crumbs = [
    { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
    { label: dict.catalog.title },
  ];
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.product.breadcrumbHome, url: siteConfig.url },
            { name: dict.catalog.title, url: absoluteUrl(shopPath(locale, { kind: "catalog" })) },
          ]),
          itemListLd(
            page.items.map((item) =>
              absoluteUrl(shopPath(locale, { kind: "product", slug: item.segment })),
            ),
          ),
        ]}
      />
      <ShopBreadcrumbs items={crumbs} label={dict.product.breadcrumbLabel} />
      <PageHeading title={dict.catalog.title} lead={dict.catalog.lead} />
      <CatalogView
        locale={locale}
        dict={dict}
        route={{ kind: "catalog" }}
        query={query}
        page={page}
        categories={categories}
      />
    </Container>
  );
}

export function CatalogPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParamsPromise;
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogBody locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Category                                                            */
/* ------------------------------------------------------------------ */

export async function categoryMetadata(
  localeInput: LocaleInput,
  params: SlugParams,
  searchParams: SearchParamsPromise,
): Promise<Metadata> {
  if (!(await storefrontEnabled())) return NOT_FOUND_METADATA;
  const locale = await localeInput;
  const { slug } = await params;
  const category = await getCategory(locale, slug);
  if (!category) return NOT_FOUND_METADATA;
  const dict = getShopDictionary(locale);
  const query = parseCatalogQuery(await searchParams);
  const indexable = isIndexableCatalogView(query);
  const base = categoryTitle(category, dict);
  return buildShopMetadata({
    locale,
    route: { kind: "category", slug },
    title: query.page > 1 ? `${base} — ${dict.meta.pageSuffix(query.page)}` : base,
    description: categoryDescription(category, dict),
    query: indexable && query.page > 1 ? { page: query.page } : undefined,
    noindex: !indexable,
    images: [
      {
        url: `/og/category/${locale}/${encodeURIComponent(slug)}`,
        width: 1200,
        height: 630,
        alt: category.name,
      },
    ],
  });
}

async function CategoryBody({
  locale: localeInput,
  params,
  searchParams,
}: {
  locale: LocaleInput;
  params: SlugParams;
  searchParams: SearchParamsPromise;
}) {
  if (!(await storefrontEnabled())) notFound();
  const locale = await localeInput;
  const { slug } = await params;
  const category = await getCategory(locale, slug);
  if (!category) notFound();
  const dict = getShopDictionary(locale);
  const requested = { ...parseCatalogQuery(await searchParams), category: slug };
  const { page, query } = await listProducts(locale, requested);
  const path = shopPath(locale, { kind: "category", slug });
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.product.breadcrumbHome, url: siteConfig.url },
            { name: dict.catalog.title, url: absoluteUrl(shopPath(locale, { kind: "catalog" })) },
            { name: category.name, url: absoluteUrl(path) },
          ]),
          itemListLd(
            page.items.map((item) =>
              absoluteUrl(shopPath(locale, { kind: "product", slug: item.segment })),
            ),
          ),
        ]}
      />
      <ShopBreadcrumbs
        label={dict.product.breadcrumbLabel}
        items={[
          { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
          { label: dict.catalog.title, href: shopPath(locale, { kind: "catalog" }) },
          { label: category.name },
        ]}
      />
      <PageHeading
        eyebrow={dict.catalog.categoryLabel}
        title={category.name}
        lead={category.description ?? dict.catalog.results(category.productCount)}
      />
      <CatalogView
        locale={locale}
        dict={dict}
        route={{ kind: "category", slug }}
        query={query}
        page={page}
        categories={[]}
      />
    </Container>
  );
}

export function CategoryPage(props: {
  locale: LocaleInput;
  params: SlugParams;
  searchParams: SearchParamsPromise;
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CategoryBody {...props} />
    </Suspense>
  );
}
