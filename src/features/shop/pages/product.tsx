import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge, dotClass } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import { getProduct, getRelatedProducts, getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { stockState, type ShopProduct } from "@/domain/shop";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

/** Uzbek routes pass the locale; `[locale]` routes pass it as a promise from `params`. */
type LocaleInput = Locale | Promise<Locale>;
import { cn } from "@/lib/cn";

import { localizeVolume } from "../content/volume";
import { AddToCart, type AddToCartState } from "../components/add-to-cart";
import { Container, Eyebrow, sectionSpacing, textLink } from "../components/layout-primitives";
import { ProductGrid } from "../components/product-card";
import { ProductGallery } from "../components/product-gallery";
import { ShopBreadcrumbs } from "../components/shop-breadcrumbs";
import { ProductGridSkeleton, ProductSkeleton } from "../components/skeletons";
import { getShopDictionary, type ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { productDescription, productTitle, type UzTexts } from "../seo/describe";
import { JsonLd } from "../seo/json-ld-script";
import { breadcrumbLd, productLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

type SlugParams = Promise<{ slug: string }>;

export async function productMetadata(
  localeInput: LocaleInput,
  params: SlugParams,
): Promise<Metadata> {
  if (!(await storefrontEnabled())) return { robots: { index: false, follow: false } };
  const locale = await localeInput;
  const { slug } = await params;
  const product = await getProduct(locale, slug);
  if (!product) return { robots: { index: false, follow: false } };
  const dict = getShopDictionary(locale);
  const image = product.images[0]?.url ?? product.imageUrl;
  const uz = await uzTexts(locale, slug);
  return buildShopMetadata({
    locale,
    route: { kind: "product", slug: product.segment },
    title: productTitle(product, locale, uz),
    description: productDescription(product, locale, dict, uz),
    ogType: "product",
    images: image
      ? [{ url: image, alt: product.name }]
      : [{ url: `/og/home/${locale}`, width: 1200, height: 630, alt: dict.meta.ogAlt }],
  });
}

/** The Uzbek texts behind a ru/en page, to spot untranslated fallbacks (U6). */
async function uzTexts(locale: Locale, slug: string): Promise<UzTexts> {
  if (locale === "uz") return null;
  const uz = await getProduct("uz", slug).catch(() => null);
  return uz
    ? { description: uz.description, seoTitle: uz.seoTitle, seoDescription: uz.seoDescription }
    : null;
}

function StockLine({ product, dict }: { product: ShopProduct; dict: ShopDictionary }) {
  const state = stockState(product.available, product.inStock);
  const tone = state === "in_stock" ? "success" : state === "low" ? "warning" : "muted";
  const text =
    state === "in_stock"
      ? dict.product.inStock
      : state === "low"
        ? dict.product.lowStock(product.available)
        : dict.product.outOfStock;
  return (
    <p className="m-0 flex items-center gap-2 text-label text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", dotClass(tone))} />
      {text}
    </p>
  );
}

function Details({ product, dict }: { product: ShopProduct; dict: ShopDictionary }) {
  const sections = [
    { id: "description", title: dict.product.description, body: product.description },
    { id: "ingredients", title: dict.product.ingredients, body: product.ingredients },
    { id: "usage", title: dict.product.usage, body: product.usage },
  ].filter((section) => section.body);
  if (sections.length === 0) return null;
  return (
    <div className="flex flex-col border-t border-line">
      {sections.map((section, index) => (
        <details key={section.id} open={index === 0} className="group border-b border-line">
          <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-subheading text-ink [&::-webkit-details-marker]:hidden">
            <h2 className="m-0 text-subheading">{section.title}</h2>
            <Icon
              name="chevron-down"
              size={20}
              className="shrink-0 text-gold-ink transition-transform duration-300 ease-soft group-open:rotate-180"
            />
          </summary>
          <div className="flex max-w-prose flex-col gap-3 pb-6 text-body text-pretty whitespace-pre-line text-ink-muted">
            {section.body}
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * A sold-out product: up to three in-stock alternatives right under the
 * buy button, above the fold, instead of only at the bottom (polish).
 */
async function Alternatives({
  locale,
  product,
  dict,
}: {
  locale: Locale;
  product: ShopProduct;
  dict: ShopDictionary;
}) {
  const related = await settle(getRelatedProducts(locale, product, 4), [], "related products");
  const inStock = related.filter((item) => item.inStock && item.available > 0).slice(0, 3);
  if (inStock.length === 0) return null;
  return (
    <section
      aria-labelledby="alternatives-title"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4"
    >
      <h2 id="alternatives-title" className="m-0 text-label text-ink">
        {dict.product.alternatives}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {inStock.map((item) => (
          <li key={item.id}>
            <Link
              href={shopPath(locale, { kind: "product", slug: item.segment })}
              className="flex items-center gap-3 rounded-md p-1.5 text-ink no-underline hover:bg-gold-soft"
            >
              <span className="relative block aspect-product w-12 shrink-0 overflow-hidden rounded-sm bg-gold-soft">
                {item.image ? (
                  <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label">{item.name}</span>
                {item.volume ? (
                  <span className="text-caption text-ink-muted">
                    {localizeVolume(item.volume, locale)}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-label tabular-nums">
                {formatPrice(item.price, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Related({
  locale,
  product,
  dict,
}: {
  locale: Locale;
  product: ShopProduct;
  dict: ShopDictionary;
}) {
  const related = await settle(getRelatedProducts(locale, product, 4), [], "related products");
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-title" className={cn("border-t border-line", sectionSpacing)}>
      <div className="flex flex-col gap-10">
        <h2 id="related-title" className="m-0 font-serif text-headline-sm font-semibold text-ink">
          {dict.product.related}
        </h2>
        <ProductGrid products={related} locale={locale} dict={dict} />
      </div>
    </section>
  );
}

async function ProductBody({
  locale: localeInput,
  params,
}: {
  locale: LocaleInput;
  params: SlugParams;
}) {
  if (!(await storefrontEnabled())) notFound();
  const locale = await localeInput;
  const { slug } = await params;
  const product = await getProduct(locale, slug);
  if (!product) notFound();
  const dict = getShopDictionary(locale);
  const settings = await settle(getSettings(locale), null, "settings");
  const path = shopPath(locale, { kind: "product", slug: product.segment });
  const url = absoluteUrl(path);
  const state: AddToCartState =
    settings && !settings.onlineSalesEnabled
      ? "sales_off"
      : product.inStock && product.maxQuantity > 0
        ? "available"
        : "sold_out";
  const crumbs = [
    { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
    { label: dict.product.breadcrumbCatalog, href: shopPath(locale, { kind: "catalog" }) },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href: shopPath(locale, { kind: "category", slug: product.category.slug }),
          },
        ]
      : []),
    { label: product.name },
  ];
  return (
    <Container className="pb-[clamp(48px,6vw,96px)]">
      <JsonLd
        data={[
          productLd({
            origin: siteConfig.url,
            product,
            url,
            description: productDescription(product, locale, dict, await uzTexts(locale, slug)),
          }),
          breadcrumbLd(
            crumbs.map((crumb) => ({
              name: crumb.label,
              url: crumb.href ? absoluteUrl(crumb.href) : url,
            })),
          ),
        ]}
      />
      <ShopBreadcrumbs items={crumbs} label={dict.product.breadcrumbLabel} />
      <article
        aria-labelledby="product-title"
        className="grid gap-[clamp(32px,5vw,88px)] pt-8 pb-[clamp(48px,6vw,96px)] nav:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      >
        <div className="nav:sticky nav:top-6 nav:self-start">
          <ProductGallery product={product} dict={dict} />
        </div>
        <div className="flex animate-reveal flex-col gap-6">
          {product.category ? (
            <Link
              href={shopPath(locale, { kind: "category", slug: product.category.slug })}
              className="self-start no-underline"
            >
              <Eyebrow>{product.category.name}</Eyebrow>
            </Link>
          ) : null}
          <div className="flex flex-col gap-3">
            <h1
              id="product-title"
              className="m-0 font-serif text-headline font-semibold text-balance text-ink"
            >
              {product.name}
            </h1>
            {product.volume || product.brand ? (
              <p className="m-0 text-body text-ink-muted">
                {[product.brand, localizeVolume(product.volume, locale)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p className="m-0 font-sans text-price-lg text-ink tabular-nums">
              {formatPrice(product.price, locale)}
            </p>
            {product.promo ? (
              <Badge tone="gold" dot={false}>
                {dict.product.promo}
              </Badge>
            ) : null}
          </div>
          <StockLine product={product} dict={dict} />
          <AddToCart
            locale={locale}
            productId={product.id}
            productPath={path}
            state={state}
            labels={{
              add: dict.product.addToCart,
              soldOut: state === "sales_off" ? dict.product.addToCart : dict.product.soldOut,
              salesOff: dict.product.salesOff,
            }}
          />
          {state === "sold_out" ? (
            <Suspense fallback={null}>
              <Alternatives locale={locale} product={product} dict={dict} />
            </Suspense>
          ) : null}
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-body text-ink">
            <li className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name="truck" size={18} />
              </span>
              {dict.product.pickupNote}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name="coins" size={18} />
              </span>
              {dict.product.cashbackNote}
            </li>
          </ul>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 border-t border-line pt-5 text-body">
            {product.volume ? (
              <>
                <dt className="text-ink-muted">{dict.product.volume}</dt>
                <dd className="m-0 text-ink">{localizeVolume(product.volume, locale)}</dd>
              </>
            ) : null}
            {product.brand ? (
              <>
                <dt className="text-ink-muted">{dict.product.brand}</dt>
                <dd className="m-0 text-ink">{product.brand}</dd>
              </>
            ) : null}
            {product.category ? (
              <>
                <dt className="text-ink-muted">{dict.product.category}</dt>
                <dd className="m-0">
                  <Link
                    href={shopPath(locale, { kind: "category", slug: product.category.slug })}
                    className={cn("font-semibold text-ink", textLink)}
                  >
                    {product.category.name}
                  </Link>
                </dd>
              </>
            ) : null}
          </dl>
          <Details product={product} dict={dict} />
        </div>
      </article>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Related locale={locale} product={product} dict={dict} />
      </Suspense>
    </Container>
  );
}

export function ProductPage({ locale, params }: { locale: LocaleInput; params: SlugParams }) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductBody locale={locale} params={params} />
    </Suspense>
  );
}
