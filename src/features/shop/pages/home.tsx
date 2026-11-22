import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { CollectionHero } from "@/components/brand/collection-hero";
import { homeActionAccent, homeActionStyles } from "@/components/brand/home-actions";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import {
  getBanners,
  getCategories,
  getFeaturedProducts,
  getSettings,
  getSpecialists,
} from "@/data/shop/catalog";
import { toPin } from "@/domain/geo-pin";
import { specialistLocations, type ShopBanner, type ShopSettings } from "@/domain/shop";
import { serverEnv } from "@/lib/env.server";
import { formatPhone } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import { accountCopy } from "../copy/account";
import { HomeLocations, type VisitLocation } from "../components/home-locations";
import { CategoryCard } from "../components/category-card";
import {
  homeCardGrid,
  HomeProductCard,
  HomeProductGridSkeleton,
  HomeSpecialistCard,
} from "../components/home-cards";
import {
  Container,
  SectionHeading,
  sectionSpacing,
  textLink,
} from "../components/layout-primitives";
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
  className,
  sizes,
}: {
  banner: ShopBanner;
  locale: Locale;
  className?: string;
  sizes: string;
}) {
  const href = bannerHref(banner, locale);
  const body = (
    <>
      {banner.image ? (
        <Image
          src={banner.image}
          alt=""
          fill
          sizes={sizes}
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
  const frame = cn(
    "group relative block overflow-hidden rounded-lg border border-nav-line bg-banner",
    className,
  );
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

function Hero({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  return (
    <CollectionHero>
      <p className="m-0 inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-2 text-overline text-ink uppercase">
        <Icon name="shield-check" size={17} className="shrink-0 text-gold-ink" />
        {dict.home.heroEyebrow}
      </p>
      <h1
        id="hero-title"
        className="m-0 font-serif text-[clamp(40px,4.6vw,68px)] leading-[1.02] font-medium tracking-[-0.035em] text-balance text-ink"
      >
        {dict.home.heroTitleStart}{" "}
        <em className="font-medium text-gold-ink italic">{dict.home.heroTitleEmphasis}</em>{" "}
        {dict.home.heroTitleEnd}
      </h1>
      <p className="m-0 max-w-[520px] text-lead text-pretty text-ink-muted">{dict.home.heroLead}</p>
      <div className="flex flex-wrap gap-3">
        <Link href={shopPath(locale, { kind: "catalog" })} className={homeActionStyles()}>
          <Icon name="bag" size={20} className={homeActionAccent} />
          {dict.home.heroCatalog}
        </Link>
        <Link
          href={shopPath(locale, { kind: "specialists" })}
          className={homeActionStyles({ secondary: true })}
        >
          <Icon name="calendar" size={20} className="shrink-0 text-gold-ink" />
          {dict.home.heroBook}
        </Link>
      </div>
    </CollectionHero>
  );
}

async function Campaigns({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const banners = (await settle(getBanners(locale), [], "banners")).filter(
    (banner) => banner.image,
  );
  if (!banners.length) return null;
  return (
    <Container>
      <ul
        aria-label={dict.home.bannersLabel}
        className="m-0 grid list-none gap-4 p-0 pb-[clamp(48px,6vw,96px)] sm:grid-cols-2 nav:grid-cols-3"
      >
        {banners.map((banner) => (
          <li key={banner.id}>
            <BannerFrame
              banner={banner}
              locale={locale}
              sizes="(min-width: 72rem) 400px, (min-width: 37.5rem) 50vw, 100vw"
              className="aspect-banner w-full"
            />
          </li>
        ))}
      </ul>
    </Container>
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
      <Container className="flex flex-col gap-[clamp(32px,4vw,60px)]">
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

const featuredCount = 6;

async function Featured({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const [products, settings] = await Promise.all([
    settle(getFeaturedProducts(locale, featuredCount), [], "featured products"),
    settle(getSettings(locale), null, "settings"),
  ]);
  if (products.length === 0) return null;
  return (
    <ul aria-label={dict.home.featuredTitle} className={homeCardGrid}>
      {products.map((product) => (
        <li key={product.id}>
          <HomeProductCard
            product={product}
            locale={locale}
            dict={dict}
            onlineSalesEnabled={settings?.onlineSalesEnabled ?? true}
          />
        </li>
      ))}
    </ul>
  );
}

async function Specialists({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const specialists = await settle(getSpecialists(locale), [], "specialists");
  if (specialists.length === 0) return null;
  return (
    <section
      aria-labelledby="specialists-title"
      className={cn("border-y border-line bg-surface", sectionSpacing)}
    >
      <Container className="flex flex-col gap-[clamp(32px,4vw,60px)]">
        <SectionHeading
          id="specialists-title"
          eyebrow={dict.home.specialistsEyebrow}
          title={dict.home.specialistsTitle}
          lead={dict.specialists.lead}
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
        <ul className={homeCardGrid}>
          {specialists.slice(0, 3).map((specialist) => (
            <li key={specialist.id}>
              <HomeSpecialistCard specialist={specialist} locale={locale} dict={dict} />
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
  const clinics = specialistLocations(specialists);
  if (!settings && clinics.length === 0) return null;
  const pickupAddress = settings?.pickupAddress.trim();
  const locations: VisitLocation[] = clinics.map((clinic) => {
    const available = specialists.filter(
      (specialist) =>
        specialist.services.length > 0 &&
        specialist.locations.some((location) => location.id === clinic.id),
    );
    const single = available.length === 1 ? available[0] : undefined;
    return {
      id: `clinic-${clinic.id}`,
      name: clinic.name,
      address: clinic.address,
      directions: clinic.directions,
      pin: toPin(clinic.latitude, clinic.longitude),
      bookingHref: single
        ? shopHref(locale, { kind: "booking" }, { specialist: single.id, location: clinic.id })
        : available.length > 1
          ? shopPath(locale, { kind: "specialists" })
          : undefined,
      bookingLabel: single ? dict.specialists.book : dict.home.specialistsLink,
    };
  });
  if (pickupAddress) {
    locations.unshift({
      id: "pickup",
      primary: true,
      name: dict.home.addressLabel,
      address: pickupAddress,
      pin: serverEnv.publicPickupPin(),
    });
  }
  const origin = siteConfig.url;
  const phones = settings ? phonesOf(settings, dict) : [];
  const { zoomIn, zoomOut } = accountCopy[locale].addresses.map;
  return (
    <section aria-labelledby="clinic-title" className={cn("border-y border-line", sectionSpacing)}>
      {settings ? (
        <JsonLd
          data={[
            organizationLd({ origin, settings }),
            clinicLd({ origin, settings, location: clinics[0], facts: clinicFacts() }),
            websiteLd({
              origin,
              url: absoluteUrl(shopPath(locale, { kind: "home" })),
              locale,
              name: dict.meta.siteName,
              searchUrlTemplate: `${absoluteUrl(shopPath(locale, { kind: "catalog" }))}?q={search_term_string}`,
            }),
          ]}
        />
      ) : null}
      <Container>
        <div className="flex flex-col gap-7 rounded-[24px] border border-line bg-image-well/50 p-[clamp(16px,4vw,42px)]">
          <SectionHeading
            id="clinic-title"
            eyebrow={dict.home.clinicEyebrow}
            title={dict.home.clinicTitle}
            lead={dict.home.clinicLead}
            action={
              <Link
                href={shopPath(locale, { kind: "services" })}
                className={homeActionStyles({ secondary: true })}
              >
                {dict.home.servicesLink}
              </Link>
            }
          />
          {locations.length ? (
            <HomeLocations locations={locations} copy={{ ...dict.home.map, zoomIn, zoomOut }} />
          ) : null}
          {phones.length ? (
            <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-body-sm">
              <dt className="sr-only">{dict.home.phonesLabel}</dt>
              {phones.map((phone) => (
                <dd key={phone.value} className="m-0">
                  <span className="text-ink-muted">{phone.label}: </span>
                  <a
                    href={`tel:${phone.value}`}
                    className="font-semibold text-ink underline decoration-gold underline-offset-4"
                  >
                    {formatPhone(phone.value)}
                  </a>
                </dd>
              ))}
            </dl>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

export function ShopHome({ locale }: { locale: Locale }) {
  const dict = getShopDictionary(locale);
  return (
    <>
      <Hero locale={locale} dict={dict} />
      <Suspense fallback={null}>
        <Campaigns locale={locale} dict={dict} />
      </Suspense>
      <Suspense fallback={null}>
        <Categories locale={locale} dict={dict} />
      </Suspense>
      <section
        aria-labelledby="featured-title"
        className={cn("border-t border-line bg-image-well/50", sectionSpacing)}
      >
        <Container className="flex flex-col gap-[clamp(32px,4vw,60px)]">
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
          <Suspense fallback={<HomeProductGridSkeleton count={featuredCount} />}>
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
