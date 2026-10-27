import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import {
  getBanners,
  getCategories,
  getFeaturedProducts,
  getSettings,
  getSpecialists,
} from "@/data/shop/catalog";
import type { ShopBanner, ShopSettings } from "@/domain/shop";
import { formatPhone } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import { CategoryCard } from "../components/category-card";
import {
  Container,
  Eyebrow,
  SectionHeading,
  sectionSpacing,
  textLink,
} from "../components/layout-primitives";
import { ProductGrid } from "../components/product-card";
import { ProductGridSkeleton } from "../components/skeletons";
import { SpecialistCard } from "../components/specialist-card";
import { getShopDictionary, type ShopDictionary } from "../content";
import { shopHref, shopPath } from "../routing/routes";
import { JsonLd } from "../seo/json-ld-script";
import { clinicFacts } from "../seo/clinic-facts";
import { clinicLd, organizationLd, websiteLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

/**
 * The storefront home (api mode): hero with the current banners, categories,
 * a product selection, the specialists and the clinic. Every section reads
 * its own cached data and degrades on its own.
 */

export function homeMetadata(locale: Locale): Metadata {
  const dict = getShopDictionary(locale);
  return buildShopMetadata({
    locale,
    route: { kind: "home" },
    title: dict.meta.homeTitle,
    description: dict.meta.homeDescription,
    images: [
      {
        url: `/og/home/${locale}`,
        width: 1200,
        height: 630,
        alt: dict.meta.ogAlt,
      },
    ],
  });
}

function bannerHref(banner: ShopBanner, locale: Locale): string | null {
  switch (banner.link.kind) {
    case "product":
      return shopPath(locale, { kind: "product", slug: String(banner.link.productId) });
    case "category":
      return shopPath(locale, { kind: "category", slug: banner.link.slug });
    case "url":
      return banner.link.url;
    case "none":
      return null;
  }
}

function BannerFrame({
  banner,
  locale,
  priority,
  className,
  sizes,
}: {
  banner: ShopBanner;
  locale: Locale;
  priority: boolean;
  className?: string;
  sizes: string;
}) {
  const href = bannerHref(banner, locale);
  const body = (
    <>
      {banner.image ? (
        <Image
          src={banner.image}
          alt={banner.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
        />
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-linear-to-t from-banner/85 to-transparent p-[clamp(18px,2.4vw,32px)] pt-20">
        <span className="font-serif text-[clamp(24px,2.6vw,36px)] leading-[1.1] font-semibold text-banner-ink-soft">
          {banner.title}
        </span>
        {href ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold text-on-gold">
            <Icon name="arrow-right" size={20} />
          </span>
        ) : null}
      </span>
    </>
  );
  const frame = cn("group relative block overflow-hidden rounded-lg bg-banner", className);
  if (!href) return <div className={frame}>{body}</div>;
  if (banner.link.kind === "url") {
    return (
      <a href={href} rel="noopener" className={cn(frame, "no-underline")}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href as Route} className={cn(frame, "no-underline")}>
      {body}
    </Link>
  );
}

async function Hero({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const banners = await settle(getBanners(locale), [], "banners");
  const [lead, ...rest] = banners.filter((banner) => banner.image);
  return (
    <section aria-labelledby="hero-title" className="relative">
      <Container>
        <div className="grid items-center gap-[clamp(32px,5vw,72px)] pt-[clamp(28px,5vw,72px)] pb-[clamp(48px,6vw,96px)] nav:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="flex animate-reveal flex-col gap-7">
            <Eyebrow>{dict.home.heroEyebrow}</Eyebrow>
            <h1
              id="hero-title"
              className="m-0 font-serif text-hero font-semibold text-balance text-ink"
            >
              {dict.home.heroTitleStart}{" "}
              <em className="font-medium text-gold-ink italic">{dict.home.heroTitleEmphasis}</em>{" "}
              {dict.home.heroTitleEnd}
            </h1>
            <p className="m-0 max-w-[520px] text-lead text-pretty text-ink-muted">
              {dict.home.heroLead}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={shopPath(locale, { kind: "catalog" })}
                className={buttonStyles({ size: "lg", lift: true, className: "gap-2.5" })}
              >
                {dict.home.heroCatalog}
                <Icon name="arrow-right" size={20} />
              </Link>
              <Link
                href={shopPath(locale, { kind: "specialists" })}
                className={buttonStyles({ variant: "outline", size: "lg", lift: true })}
              >
                {dict.home.heroBook}
              </Link>
            </div>
          </div>
          {lead ? (
            <BannerFrame
              banner={lead}
              locale={locale}
              priority
              sizes="(min-width: 72rem) 620px, 100vw"
              className="aspect-[4/5] w-full sm:aspect-[4/3] nav:aspect-[4/5]"
            />
          ) : (
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-banner nav:aspect-[4/5]">
              <Rings
                viewBox={800}
                rings={[
                  [150, 0.55],
                  [210, 0.38],
                  [270, 0.25],
                  [330, 0.15],
                  [392, 0.08],
                ]}
                className="absolute top-1/2 left-1/2 size-[140%] -translate-x-1/2 -translate-y-1/2"
              />
              <p className="relative m-0 px-8 text-center font-serif text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-medium text-banner-ink italic">
                Glow Derma
              </p>
            </div>
          )}
        </div>
        {rest.length > 0 ? (
          <ul
            aria-label={dict.home.bannersLabel}
            className="m-0 -mt-[clamp(16px,3vw,48px)] grid list-none gap-4 p-0 pb-[clamp(48px,6vw,96px)] sm:grid-cols-2 nav:grid-cols-3"
          >
            {rest.slice(0, 3).map((banner) => (
              <li key={banner.id}>
                <BannerFrame
                  banner={banner}
                  locale={locale}
                  priority={false}
                  sizes="(min-width: 72rem) 400px, (min-width: 37.5rem) 50vw, 100vw"
                  className="aspect-banner w-full"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}

async function Categories({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const categories = await settle(getCategories(locale), [], "categories");
  if (categories.length === 0) return null;
  return (
    <section
      aria-labelledby="categories-title"
      className={cn("border-t border-line", sectionSpacing)}
    >
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="categories-title"
          eyebrow={dict.home.categoriesEyebrow}
          title={dict.home.categoriesTitle}
          action={
            <Link
              href={shopPath(locale, { kind: "catalog" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-ink",
                textLink,
              )}
            >
              {dict.home.categoriesLink}
              <Icon name="arrow-right" size={20} className="text-gold-ink" />
            </Link>
          }
        />
        <ul className="m-0 grid list-none grid-cols-2 gap-x-[clamp(12px,2vw,24px)] gap-y-8 p-0 sm:grid-cols-3 nav:grid-cols-5">
          {categories.map((category, index) => (
            <li key={category.slug}>
              <CategoryCard category={category} index={index} locale={locale} dict={dict} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function Featured({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const products = await settle(getFeaturedProducts(locale, 8), [], "featured products");
  if (products.length === 0) return null;
  return (
    <ProductGrid products={products} locale={locale} dict={dict} label={dict.home.featuredTitle} />
  );
}

async function Specialists({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const specialists = await settle(getSpecialists(locale), [], "specialists");
  if (specialists.length === 0) return null;
  return (
    <section
      aria-labelledby="specialists-title"
      className={cn("border-y border-line bg-surface-raised", sectionSpacing)}
    >
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="specialists-title"
          eyebrow={dict.home.specialistsEyebrow}
          title={dict.home.specialistsTitle}
          action={
            <Link
              href={shopPath(locale, { kind: "specialists" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-ink",
                textLink,
              )}
            >
              {dict.home.specialistsLink}
              <Icon name="arrow-right" size={20} className="text-gold-ink" />
            </Link>
          }
        />
        <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 nav:grid-cols-3">
          {specialists.slice(0, 3).map((specialist) => (
            <li key={specialist.id}>
              <SpecialistCard specialist={specialist} locale={locale} dict={dict} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function phonesOf(settings: ShopSettings, dict: ShopDictionary) {
  return [
    { label: dict.footer.support, value: settings.supportPhone },
    { label: dict.footer.store, value: settings.storePhone },
    { label: dict.footer.clinic, value: settings.cosmetologistPhone },
  ].filter((phone): phone is { label: string; value: string } => Boolean(phone.value));
}

async function Clinic({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const [settings, specialists] = await Promise.all([
    settle(getSettings(locale), null, "settings"),
    settle(getSpecialists(locale), [], "specialists"),
  ]);
  if (!settings) return null;
  // The first location with coordinates (the clinic's geo, U14).
  const location =
    specialists.find((s) => s.location.latitude !== null && s.location.longitude !== null)
      ?.location ?? null;
  const origin = siteConfig.url;
  const phones = phonesOf(settings, dict);
  return (
    <section
      aria-labelledby="clinic-title"
      className={cn("relative overflow-hidden bg-banner text-banner-ink-soft", sectionSpacing)}
    >
      <JsonLd
        data={[
          organizationLd({ origin, settings }),
          clinicLd({ origin, settings, location, facts: clinicFacts() }),
          websiteLd({
            origin,
            url: absoluteUrl(shopPath(locale, { kind: "home" })),
            locale,
            name: dict.meta.siteName,
            searchUrlTemplate: `${absoluteUrl(shopPath(locale, { kind: "catalog" }))}?q={search_term_string}`,
          }),
        ]}
      />
      <Rings
        viewBox={800}
        rings={[
          [180, 0.4],
          [260, 0.24],
          [340, 0.14],
          [400, 0.07],
        ]}
        className="absolute top-1/2 -right-[260px] size-[900px] -translate-y-1/2"
      />
      <Container className="relative grid gap-12 nav:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Eyebrow onDark>{dict.home.clinicEyebrow}</Eyebrow>
          <h2
            id="clinic-title"
            className="m-0 font-serif text-headline font-semibold text-balance text-banner-ink"
          >
            {dict.home.clinicTitle}
          </h2>
          <p className="m-0 max-w-[520px] text-lead text-pretty">{dict.home.clinicLead}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={shopPath(locale, { kind: "services" })}
              className={buttonStyles({ size: "lg", lift: true })}
            >
              {dict.home.servicesLink}
            </Link>
          </div>
        </div>
        <dl className="m-0 grid content-start gap-8 sm:grid-cols-2">
          {settings.pickupAddress ? (
            <div className="flex flex-col gap-2">
              <dt className="text-overline text-banner-ink uppercase">{dict.home.addressLabel}</dt>
              <dd className="m-0 text-[17px] leading-7">{settings.pickupAddress}</dd>
            </div>
          ) : null}
          {phones.length > 0 ? (
            <div className="flex flex-col gap-2">
              <dt className="text-overline text-banner-ink uppercase">{dict.home.phonesLabel}</dt>
              {phones.map((phone) => (
                <dd key={phone.value} className="m-0 text-[17px] leading-7">
                  <span className="text-nav-ink-muted">{phone.label}: </span>
                  <a
                    href={`tel:${phone.value}`}
                    className="font-semibold text-banner-ink-soft no-underline decoration-gold underline-offset-4 hover:underline"
                  >
                    {formatPhone(phone.value)}
                  </a>
                </dd>
              ))}
            </div>
          ) : null}
        </dl>
      </Container>
    </section>
  );
}

export function ShopHome({ locale }: { locale: Locale }) {
  const dict = getShopDictionary(locale);
  return (
    <>
      <Suspense fallback={<div aria-hidden="true" className="min-h-[clamp(560px,60vw,760px)]" />}>
        <Hero locale={locale} dict={dict} />
      </Suspense>
      <Suspense fallback={null}>
        <Categories locale={locale} dict={dict} />
      </Suspense>
      <section
        aria-labelledby="featured-title"
        className={cn("border-t border-line", sectionSpacing)}
      >
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="featured-title"
            eyebrow={dict.home.featuredEyebrow}
            title={dict.home.featuredTitle}
            action={
              <Link
                href={shopHref(locale, { kind: "catalog" })}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-ink",
                  textLink,
                )}
              >
                {dict.home.featuredLink}
                <Icon name="arrow-right" size={20} className="text-gold-ink" />
              </Link>
            }
          />
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <Featured locale={locale} dict={dict} />
          </Suspense>
        </Container>
      </section>
      <Suspense fallback={null}>
        <Specialists locale={locale} dict={dict} />
      </Suspense>
      <Suspense fallback={null}>
        <Clinic locale={locale} dict={dict} />
      </Suspense>
    </>
  );
}
