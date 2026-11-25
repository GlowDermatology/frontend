import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { homeActionAccent, homeActionStyles } from "@/components/brand/home-actions";
import { Icon, type IconName } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import {
  getBanners,
  getCategories,
  getFeaturedProducts,
  getSettings,
  getSpecialists,
  listProducts,
} from "@/data/shop/catalog";
import { getAvailability, getClinics, getFeedPage, getHome } from "@/data/shop/live";
import { requestNow } from "@/data/now";
import { toPin } from "@/domain/geo-pin";
import {
  specialistLocations,
  type ShopBanner,
  type ShopSettings,
  type ShopSpecialist,
} from "@/domain/shop";
import {
  earliestSlot,
  type ShopAvailability,
  type ShopClinic,
  type ShopHome as ShopHomeData,
  type ShopNextSlot,
} from "@/domain/shop-live";
import { serverEnv } from "@/lib/env.server";
import { addDays, createFormatter, formatPrice, toLocalIsoDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import { accountCopy } from "../copy/account";
import { homeCopy, type HomeCopy } from "../copy/home";
import { HomeLocations, type VisitLocation } from "../components/home-locations";
import { CategoryCard } from "../components/category-card";
import { Container, Eyebrow, textLink } from "../components/layout-primitives";
import { SpecialistPortrait } from "../components/specialist-card";
import { getShopDictionary, type ShopDictionary } from "../content";
import { DiscoverFeed } from "../home/discover-feed";
import {
  LiveCardSkeleton,
  LiveProductCard,
  liveCardGrid,
  type CashbackRates,
} from "../home/live-card";
import { RailTabs } from "../home/rail-tabs";
import { Showcase, ShowcaseSkeleton, type ShowcaseFrame } from "../home/showcase";
import { Ticker, tickerItems } from "../home/ticker";
import { shopHref, shopPath } from "../routing/routes";
import { JsonLd } from "../seo/json-ld-script";
import { clinicFacts } from "../seo/clinic-facts";
import { clinicLd, organizationLd, websiteLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

/**
 * The live storefront home (api mode), top to bottom: ticker (above the
 * sticky header), hero with the live showcase, the live strip, categories,
 * product rails, banners, specialists with their next free slots, cashback,
 * clinics and the «Kashf eting» feed. Every section is its own async Server
 * Component in Suspense with a skeleton of its size, reads its own cached
 * data through `settle()` and hides (or falls back) on its own when its data
 * is missing, so a backend without the live endpoints still serves a page.
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

const SECTION_IDS = {
  specialists: "specialists",
  cashback: "cashback",
  clinics: "clinics",
  discover: "discover",
} as const;

const sectionGap = "pt-[clamp(48px,6vw,88px)]";
const headingTitle = "m-0 font-serif text-headline-sm font-semibold text-balance text-ink";
const arrowLink = cn(
  "inline-flex min-h-11 items-center gap-1.5 text-label font-bold text-ink",
  textLink,
);

/* -------------------------------------------------------------------------- */
/* Shared reads and helpers                                                    */
/* -------------------------------------------------------------------------- */

const readHome = (locale: Locale) => settle(getHome(locale), null, "home summary");
const readSettings = (locale: Locale) => settle(getSettings(locale), null, "settings");

function salesOn(home: ShopHomeData | null, settings: ShopSettings | null): boolean {
  return home?.onlineSalesEnabled ?? settings?.onlineSalesEnabled ?? true;
}

function rates(home: ShopHomeData | null): CashbackRates {
  return home?.cashback ?? null;
}

function Heading({
  id,
  eyebrow,
  title,
  lead,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className={headingTitle}>
          {title}
        </h2>
        {lead ? <p className="m-0 max-w-[520px] text-body text-ink-muted">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ArrowLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className={arrowLink}>
      {children}
      <Icon name="arrow-right" size={16} className="text-gold-ink" />
    </Link>
  );
}

/** "Bugun, 11:30" / "Ertaga, 09:00" / "28-noy, 10:00" in Tashkent time. */
function slotWhen(start: string, now: Date, locale: Locale, copy: HomeCopy["when"]): string {
  const fmt = createFormatter(locale);
  const day = toLocalIsoDate(start);
  const today = toLocalIsoDate(now);
  const label =
    day === today
      ? copy.today
      : day === addDays(today, 1)
        ? copy.tomorrow
        : fmt.dayMonthShort(start);
  return copy.at(label, fmt.time(start));
}

function slotHref(locale: Locale, specialistId: number, slot: ShopNextSlot): Route {
  const fmt = createFormatter(locale);
  return shopHref(
    locale,
    { kind: "booking" },
    {
      specialist: specialistId,
      service: slot.serviceId,
      location: slot.locationId,
      date: toLocalIsoDate(slot.start),
      time: fmt.time(slot.start),
    },
  );
}

function SectionSkeleton({ cards = 5, tall = false }: { cards?: number; tall?: boolean }) {
  return (
    <Container className={sectionGap}>
      <div aria-hidden="true" className="mb-6 flex flex-col gap-3">
        <span className="h-3 w-28 skeleton rounded-sm" />
        <span className="h-10 w-72 max-w-full skeleton rounded-sm" />
      </div>
      {tall ? (
        <div aria-hidden="true" className="h-[380px] skeleton rounded-lg" />
      ) : (
        <ul aria-hidden="true" className={liveCardGrid}>
          {Array.from({ length: cards }, (_, index) => (
            <li key={index}>
              <LiveCardSkeleton />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Ticker                                                                   */
/* -------------------------------------------------------------------------- */

async function HomeTicker({ locale }: { locale: Locale }) {
  const settings = await readSettings(locale);
  if (!settings) return null;
  return <Ticker items={tickerItems(settings, locale)} label={homeCopy[locale].ticker.label} />;
}

/** The ticker bar for `ShopChrome`'s `top` slot (above the sticky header). */
export function HomeTickerSlot({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-10 bg-nav" />}>
      <HomeTicker locale={locale} />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Hero                                                                     */
/* -------------------------------------------------------------------------- */

function HeroIntro({
  locale,
  pill,
  chips,
}: {
  locale: Locale;
  pill: { main: string; sub: string | null } | null;
  chips: ReadonlyArray<{ slug: string; name: string }>;
}) {
  const copy = homeCopy[locale].hero;
  const catalog = shopPath(locale, { kind: "catalog" });
  return (
    <div className="flex min-w-0 flex-[1_1_420px] flex-col justify-center gap-6 py-2">
      {pill ? (
        <p className="m-0 inline-flex items-center gap-2.5 self-start rounded-full border border-line bg-surface-raised py-[7px] pr-3.5 pl-2.5 text-body-sm font-semibold text-ink shadow-sm">
          <span aria-hidden="true" className="gd-pulse size-2 rounded-full bg-success" />
          <span className="tabular-nums">{pill.main}</span>
          {pill.sub ? <span className="font-medium text-ink-muted">· {pill.sub}</span> : null}
        </p>
      ) : (
        <span aria-hidden="true" className="block h-[34px]" />
      )}
      <h1
        id="hero-title"
        className="m-0 font-serif text-[clamp(44px,5.7vw,86px)] leading-[0.98] font-semibold tracking-[-0.015em] text-balance text-ink"
      >
        {copy.titleStart}
        <br />
        {copy.titleMiddle}{" "}
        <em className="font-medium text-gold-ink italic">{copy.titleEmphasis}</em>
      </h1>
      <p className="m-0 max-w-[520px] text-[17px] leading-[27px] text-pretty text-ink-muted">
        {copy.lead}
      </p>
      <form
        role="search"
        action={catalog}
        method="get"
        className="flex max-w-[560px] items-center gap-2 rounded-[16px] border border-line-strong bg-surface-raised py-1.5 pr-1.5 pl-[18px] shadow-sm focus-within:border-gold"
      >
        <Icon name="search" size={20} className="shrink-0 text-ink-muted" />
        <label htmlFor="hero-search" className="sr-only">
          {copy.searchLabel}
        </label>
        <input
          id="hero-search"
          type="search"
          name="q"
          minLength={2}
          maxLength={100}
          autoComplete="off"
          placeholder={copy.searchPlaceholder}
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] leading-[22px] font-medium text-ink placeholder:text-ink-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-md bg-gold px-5 text-label font-bold text-on-gold hover:shadow-lg"
        >
          {copy.searchSubmit}
        </button>
      </form>
      {chips.length ? (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-caption font-semibold text-ink-muted">{copy.chipsLabel}</span>
          {chips.map((chip) => (
            <Link
              key={chip.slug}
              href={shopPath(locale, { kind: "category", slug: chip.slug })}
              className="inline-flex h-8 items-center rounded-full border border-line bg-surface-raised px-3 text-body-sm font-semibold text-ink no-underline hover:border-gold hover:text-gold-ink"
            >
              {chip.name}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={catalog} className={homeActionStyles()}>
          {copy.catalog}
          <Icon name="arrow-right" size={18} className={homeActionAccent} />
        </Link>
        <Link
          href={shopPath(locale, { kind: "specialists" })}
          className={homeActionStyles({ secondary: true })}
        >
          <Icon name="calendar" size={18} className="shrink-0 text-gold-ink" />
          {copy.book}
        </Link>
      </div>
    </div>
  );
}

async function Hero({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale].hero;
  const fmt = createFormatter(locale);
  const [home, settings, categories] = await Promise.all([
    readHome(locale),
    readSettings(locale),
    settle(getCategories(locale), [], "categories"),
  ]);
  const online = salesOn(home, settings);
  let frames: ShowcaseFrame[] = home ? [...home.spotlight] : [];
  if (frames.length === 0) {
    // No `home/` yet (or no spotlight): the featured selection, without a reason chip.
    const featured = await settle(getFeaturedProducts(locale, 6), [], "featured products");
    frames = featured.map((product) => ({ reason: product.promo ? "promo" : null, product }));
  }
  const pill = home
    ? {
        main:
          online && home.stats.productsInStock !== null
            ? copy.pillInStock(fmt.number(home.stats.productsInStock))
            : copy.pillCatalog(fmt.number(home.stats.products)),
        sub:
          home.stats.categories > 0 ? copy.pillCategories(fmt.number(home.stats.categories)) : null,
      }
    : null;
  const chips = [...categories]
    .filter((category) => category.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 5);
  return (
    <Container className="flex flex-wrap items-stretch gap-[clamp(24px,3.6vw,56px)]">
      <HeroIntro locale={locale} pill={pill} chips={chips} />
      <Showcase
        locale={locale}
        frames={frames}
        onlineSalesEnabled={online}
        cashback={rates(home)}
      />
    </Container>
  );
}

function HeroSkeleton({ locale }: { locale: Locale }) {
  return (
    <Container className="flex flex-wrap items-stretch gap-[clamp(24px,3.6vw,56px)]">
      <HeroIntro locale={locale} pill={null} chips={[]} />
      <ShowcaseSkeleton />
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Live strip                                                               */
/* -------------------------------------------------------------------------- */

interface StripTile {
  key: string;
  icon: IconName;
  live?: boolean;
  over: string;
  value: string;
  note: string | null;
  href: string;
}

function deliveryTile(
  settings: ShopSettings,
  copy: HomeCopy["strip"],
  locale: Locale,
): StripTile | null {
  const providers = settings.deliveryProviders;
  const href = shopPath(locale, { kind: "catalog" });
  const tile = { key: "delivery", icon: "truck" as const, over: copy.delivery, href };
  if (providers.includes("yandex")) {
    return {
      ...tile,
      value: copy.tashkent,
      note: providers.includes("bts") ? copy.viaYandexAndBts : copy.viaYandex,
    };
  }
  if (providers.includes("bts")) return { ...tile, value: copy.regions, note: copy.viaBts };
  if (settings.fulfilmentMethods.includes("pickup")) {
    return { ...tile, icon: "store", value: copy.pickupOnly, note: settings.pickupAddress || null };
  }
  return null;
}

function slotTile(
  specialists: ReadonlyArray<ShopSpecialist>,
  availability: ShopAvailability | null,
  now: Date,
  locale: Locale,
): StripTile | null {
  if (!availability) return null;
  const copy = homeCopy[locale];
  const next = earliestSlot(
    specialists.flatMap((specialist) => {
      const slot = availability.bySpecialist[specialist.id]?.nextSlot;
      return slot ? [{ specialistId: specialist.id, slot }] : [];
    }),
  );
  const specialist = next && specialists.find((item) => item.id === next.specialistId);
  if (!next || !specialist) return null;
  const service = specialist.services.find((item) => item.id === next.slot.serviceId);
  return {
    key: "slot",
    icon: "calendar",
    over: copy.strip.slot,
    value: `${specialist.name} · ${slotWhen(next.slot.start, now, locale, copy.when)}`,
    note: service
      ? `${service.shortName} · ${formatPrice(service.price, locale)}`
      : specialist.roleLabel,
    href: slotHref(locale, specialist.id, next.slot),
  };
}

async function LiveStrip({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale];
  const fmt = createFormatter(locale);
  const [home, settings, specialists, availability, clinics, now] = await Promise.all([
    readHome(locale),
    readSettings(locale),
    settle(getSpecialists(locale), [], "specialists"),
    settle(getAvailability(locale), null, "availability"),
    settle(getClinics(locale), null, "clinics"),
    requestNow(),
  ]);
  const open = clinics?.find((clinic) => clinic.openNow && clinic.todayHours);
  const cashback = home?.cashback;
  const tiles = [
    slotTile(specialists, availability, now, locale),
    open?.todayHours
      ? {
          key: "clinic",
          icon: "map-pin" as const,
          live: true,
          over: copy.strip.clinicOpen,
          value: copy.strip.openUntil(open.todayHours.end),
          note: open.address || open.name,
          href: `#${SECTION_IDS.clinics}`,
        }
      : null,
    cashback
      ? {
          key: "cashback",
          icon: "coins" as const,
          over: copy.strip.cashback,
          value: copy.strip.cashbackValue(
            cashback.minPercent === cashback.maxPercent
              ? fmt.percent(cashback.maxPercent)
              : `${fmt.percent(cashback.minPercent)} – ${fmt.percent(cashback.maxPercent)}`,
          ),
          note: copy.strip.cashbackNote,
          href: `#${SECTION_IDS.cashback}`,
        }
      : null,
    settings ? deliveryTile(settings, copy.strip, locale) : null,
  ].filter((tile): tile is StripTile => tile !== null);
  if (tiles.length === 0) return null;
  return (
    <Container className="pt-5">
      <ul
        aria-label={copy.strip.label}
        className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3 p-0"
      >
        {tiles.map((tile) => (
          <li key={tile.key}>
            <a
              href={tile.href}
              className="flex h-full min-w-0 items-center gap-3.5 rounded-lg border border-line bg-surface-raised p-4 text-ink no-underline shadow-sm transition-[transform,box-shadow] duration-300 ease-soft hover:-translate-y-[3px] hover:shadow-lg"
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name={tile.icon} size={20} />
                {tile.live ? (
                  <span
                    aria-hidden="true"
                    className="gd-pulse absolute top-px right-px size-[9px] rounded-full border-2 border-surface-raised bg-success"
                  />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-overline text-ink-muted uppercase">{tile.over}</span>
                <span className="text-[15px] leading-5 font-bold text-ink tabular-nums">
                  {tile.value}
                </span>
                {tile.note ? (
                  <span className="truncate text-caption font-normal text-ink-muted">
                    {tile.note}
                  </span>
                ) : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function LiveStripSkeleton() {
  return (
    <Container className="pt-5">
      <div
        aria-hidden="true"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="h-[78px] skeleton rounded-lg" />
        ))}
      </div>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Categories                                                               */
/* -------------------------------------------------------------------------- */

const MIN_CATEGORIES = 3;

async function Categories({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const copy = homeCopy[locale].categories;
  const categories = await settle(getCategories(locale), [], "categories");
  if (categories.length < MIN_CATEGORIES) return null;
  return (
    <section aria-labelledby="categories-title" className={sectionGap}>
      <Container>
        <Heading
          id="categories-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          action={<ArrowLink href={shopPath(locale, { kind: "catalog" })}>{copy.link}</ArrowLink>}
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

/* -------------------------------------------------------------------------- */
/* 5. Rails                                                                    */
/* -------------------------------------------------------------------------- */

async function Rails({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale].rails;
  const fmt = createFormatter(locale);
  const [home, settings] = await Promise.all([readHome(locale), readSettings(locale)]);
  if (!home || home.rails.length === 0) return null;
  const online = salesOn(home, settings);
  return (
    <section aria-labelledby="rails-title" className={sectionGap}>
      <Container>
        <Heading id="rails-title" eyebrow={copy.eyebrow} title={copy.title} />
        <RailTabs
          label={copy.tabsLabel}
          tabs={home.rails.map((rail) => ({
            key: rail.key,
            label: copy.tabs[rail.key],
            count: fmt.number(rail.items.length),
            panel: (
              <ul className={liveCardGrid}>
                {rail.items.map((product) => (
                  <li key={product.id}>
                    <LiveProductCard
                      product={product}
                      locale={locale}
                      onlineSalesEnabled={online}
                      cashback={rates(home)}
                    />
                  </li>
                ))}
              </ul>
            ),
          }))}
        />
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Banners (image and title: banners have no subtitle or call to action)    */
/* -------------------------------------------------------------------------- */

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

const bannerFrame =
  "group relative block aspect-banner w-full overflow-hidden rounded-lg border border-nav-line bg-banner no-underline";

function BannerFrame({ banner, locale }: { banner: ShopBanner; locale: Locale }) {
  const href = bannerHref(banner, locale);
  const body = (
    <>
      {banner.image ? (
        <Image
          src={banner.image}
          alt=""
          fill
          sizes="(min-width: 72rem) 620px, (min-width: 37.5rem) 50vw, 100vw"
          className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
        />
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-linear-to-t from-banner/85 to-transparent p-[clamp(18px,2.4vw,32px)] pt-20">
        <span className="font-serif text-[clamp(24px,2.6vw,34px)] leading-[1.1] font-semibold text-banner-ink-soft">
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
  if (!href) return <div className={bannerFrame}>{body}</div>;
  if (banner.link.kind === "url") {
    return (
      <a href={href} rel="noopener" className={bannerFrame}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href as Route} className={bannerFrame}>
      {body}
    </Link>
  );
}

async function Campaigns({ locale }: { locale: Locale }) {
  const banners = (await settle(getBanners(locale), [], "banners")).filter(
    (banner) => banner.image,
  );
  if (!banners.length) return null;
  return (
    <Container className={sectionGap}>
      <ul
        aria-label={homeCopy[locale].banners.label}
        className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2"
      >
        {banners.map((banner) => (
          <li key={banner.id}>
            <BannerFrame banner={banner} locale={locale} />
          </li>
        ))}
      </ul>
    </Container>
  );
}

function CampaignsSkeleton() {
  return (
    <Container className={sectionGap}>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        <span className="block aspect-banner skeleton rounded-lg" />
        <span className="hidden aspect-banner skeleton rounded-lg sm:block" />
      </div>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Specialists (all of them, with their next free slot)                     */
/* -------------------------------------------------------------------------- */

function SpecialistRow({
  specialist,
  availability,
  now,
  locale,
  dict,
}: {
  specialist: ShopSpecialist;
  availability: ShopAvailability | null;
  now: Date;
  locale: Locale;
  dict: ShopDictionary;
}) {
  const copy = homeCopy[locale].specialists;
  const fmt = createFormatter(locale);
  const profile = shopPath(locale, { kind: "specialist", slug: specialist.segment });
  const cheapest = specialist.services.reduce<number | null>(
    (min, service) => (min === null || service.price < min ? service.price : min),
    null,
  );
  const live = availability?.bySpecialist[specialist.id] ?? null;
  const slot = live?.nextSlot ?? null;
  const when = slot ? slotWhen(slot.start, now, locale, homeCopy[locale].when) : null;
  const services = specialist.services.map((service) => service.shortName).slice(0, 3);
  return (
    <article className="flex h-full min-w-0 gap-4 rounded-lg border border-line bg-surface-raised p-4 shadow-sm">
      <SpecialistPortrait specialist={specialist} size={96} sizes="96px" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="m-0 text-overline text-ink-muted uppercase">{specialist.roleLabel}</p>
        <h3 className="m-0 text-[18px] leading-6 font-bold text-ink">
          <Link
            href={profile}
            className="text-ink no-underline hover:text-gold-ink hover:underline"
          >
            {specialist.name}
          </Link>
        </h3>
        {services.length ? (
          <p className="m-0 text-body-sm text-ink-muted">{services.join(" · ")}</p>
        ) : null}
        {cheapest !== null ? (
          <p className="m-0 text-body-sm font-bold text-ink tabular-nums">
            {dict.specialists.priceFrom(formatPrice(cheapest, locale))}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {slot && when ? (
            <>
              <span className="mr-0.5 text-caption font-bold text-ink">{copy.nextSlot}:</span>
              <Link
                href={slotHref(locale, specialist.id, slot)}
                aria-label={copy.bookAt(specialist.name, when)}
                className="inline-flex h-9 items-center rounded-full border border-line-strong px-3 text-body-sm font-bold text-ink tabular-nums no-underline hover:border-gold hover:bg-gold-soft"
              >
                {when}
              </Link>
              {live && live.slotsToday > 0 ? (
                <span className="text-caption text-ink-muted">
                  {copy.slotsToday(fmt.number(live.slotsToday))}
                </span>
              ) : null}
            </>
          ) : cheapest !== null ? (
            <Link
              href={shopHref(locale, { kind: "booking" }, { specialist: specialist.id })}
              className={homeActionStyles({ compact: true, secondary: true })}
            >
              <Icon name="calendar" size={16} className="shrink-0 text-gold-ink" />
              {copy.book}
            </Link>
          ) : (
            <Link href={profile} className={arrowLink}>
              {copy.profile}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

async function Specialists({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const copy = homeCopy[locale].specialists;
  const [specialists, availability, now] = await Promise.all([
    settle(getSpecialists(locale), [], "specialists"),
    settle(getAvailability(locale), null, "availability"),
    requestNow(),
  ]);
  if (specialists.length === 0) return null;
  return (
    <section
      id={SECTION_IDS.specialists}
      aria-labelledby="specialists-title"
      className={cn(sectionGap, "scroll-mt-24")}
    >
      <Container>
        <Heading
          id="specialists-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          action={<ArrowLink href={shopPath(locale, { kind: "services" })}>{copy.link}</ArrowLink>}
        />
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4 p-0">
          {specialists.map((specialist) => (
            <li key={specialist.id}>
              <SpecialistRow
                specialist={specialist}
                availability={availability}
                now={now}
                locale={locale}
                dict={dict}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Cashback (the live policy only: never a made-up percent)                 */
/* -------------------------------------------------------------------------- */

async function Cashback({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale].cashback;
  const fmt = createFormatter(locale);
  const [home, settings] = await Promise.all([readHome(locale), readSettings(locale)]);
  const policy = home?.cashback;
  if (!policy) return null;
  const stores = [
    settings?.storeUrls.ios ? { href: settings.storeUrls.ios, label: copy.appStore } : null,
    settings?.storeUrls.android
      ? { href: settings.storeUrls.android, label: copy.googlePlay }
      : null,
  ].filter((store): store is { href: string; label: string } => store !== null);
  return (
    <section
      id={SECTION_IDS.cashback}
      aria-labelledby="cashback-title"
      className={cn(sectionGap, "scroll-mt-24")}
    >
      <Container className="flex flex-wrap gap-4">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5 rounded-lg bg-gold-soft p-[clamp(24px,3vw,40px)]">
          <p className="m-0 text-overline text-ink uppercase">{copy.eyebrow}</p>
          <h2 id="cashback-title" className={cn(headingTitle, "max-w-[520px]")}>
            {copy.title}
          </h2>
          <p className="m-0 max-w-[520px] text-body text-ink">{copy.lead}</p>
          {policy.tiers.length ? (
            <ol
              aria-label={copy.tiersLabel}
              className="m-0 flex max-w-[560px] list-none flex-col gap-2.5 p-0"
            >
              {policy.tiers.map((tier) => {
                const range =
                  tier.to === null
                    ? copy.from(formatPrice(tier.from, locale))
                    : tier.from === 0
                      ? copy.upTo(formatPrice(tier.to, locale))
                      : copy.range(fmt.number(tier.from), formatPrice(tier.to, locale));
                const width = Math.max(6, Math.round((tier.percent / policy.maxPercent) * 100));
                return (
                  <li key={tier.from} className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                    <span className="w-16 shrink-0 text-[24px] leading-[30px] font-extrabold tracking-[-0.01em] text-ink tabular-nums">
                      {fmt.percent(tier.percent)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-2.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-surface-raised"
                    >
                      <span
                        className="block h-full rounded-full bg-gold"
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span className="text-body-sm font-semibold text-ink tabular-nums sm:w-[220px]">
                      {range}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          <p className="m-0 text-caption text-ink">
            {copy.promoRule} {copy.source}
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 rounded-lg bg-banner p-[clamp(24px,3vw,40px)] text-banner-ink-soft">
          <p className="m-0 text-overline text-banner-ink uppercase">{copy.storeEyebrow}</p>
          <p className="m-0 font-serif text-[32px] leading-9 font-semibold text-banner-ink">
            {copy.storeTitle}
          </p>
          <p className="m-0 text-body text-banner-ink-soft">{copy.storeBody}</p>
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
            <span
              data-theme="light"
              aria-hidden="true"
              className="flex size-[92px] items-center justify-center rounded-[14px] bg-surface text-ink"
            >
              <Icon name="qr" size={56} />
            </span>
            <div className="flex flex-col gap-2">
              <Link
                href={shopPath(locale, { kind: "qr" })}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-4 text-label font-bold text-on-gold no-underline hover:shadow-lg"
              >
                {copy.openQr}
              </Link>
              {stores.length ? (
                <ul aria-label={copy.appsLabel} className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {stores.map((store) => (
                    <li key={store.label}>
                      <a
                        href={store.href}
                        rel="noopener"
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-banner-ink-soft/35 px-4 text-label font-bold text-banner-ink-soft no-underline hover:border-gold"
                      >
                        {store.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Clinics                                                                  */
/* -------------------------------------------------------------------------- */

function clinicLocations(
  clinics: ReadonlyArray<ShopClinic> | null,
  specialists: ReadonlyArray<ShopSpecialist>,
  locale: Locale,
  dict: ShopDictionary,
): VisitLocation[] {
  const copy = homeCopy[locale].clinics;
  const fmt = createFormatter(locale);
  const bookingFor = (clinicId: number) => {
    const available = specialists.filter(
      (specialist) =>
        specialist.services.length > 0 &&
        specialist.locations.some((location) => location.id === clinicId),
    );
    const single = available.length === 1 ? available[0] : undefined;
    return {
      bookingHref: single
        ? shopHref(locale, { kind: "booking" }, { specialist: single.id, location: clinicId })
        : available.length > 1
          ? shopPath(locale, { kind: "specialists" })
          : undefined,
      bookingLabel: single ? dict.specialists.book : dict.home.specialistsLink,
    };
  };
  const phone = (value: string | null) =>
    value ? { value, display: fmt.phone(value), label: copy.call } : undefined;
  if (clinics) {
    return clinics.map((clinic) => ({
      id: `clinic-${clinic.id}`,
      name: clinic.name,
      address: clinic.address,
      directions: clinic.directions,
      pin: toPin(clinic.latitude, clinic.longitude),
      status: clinic.todayHours
        ? clinic.openNow
          ? { label: copy.openNow(clinic.todayHours.end), open: true }
          : { label: copy.closedNow, open: false }
        : { label: copy.closedToday, open: false },
      details: [
        clinic.todayHours ? copy.todayHours(clinic.todayHours.start, clinic.todayHours.end) : null,
        clinic.specialistCount > 0 ? copy.specialists(fmt.number(clinic.specialistCount)) : null,
      ].filter((detail): detail is string => detail !== null),
      phone: phone(clinic.phone),
      ...bookingFor(clinic.id),
    }));
  }
  // No `clinics/` yet: the clinics the specialists work at, as before.
  return specialistLocations(specialists).map((clinic) => ({
    id: `clinic-${clinic.id}`,
    name: clinic.name,
    address: clinic.address,
    directions: clinic.directions,
    pin: toPin(clinic.latitude, clinic.longitude),
    phone: phone(clinic.phone),
    ...bookingFor(clinic.id),
  }));
}

function phonesOf(settings: ShopSettings, dict: ShopDictionary) {
  return [
    { label: dict.footer.support, value: settings.supportPhone },
    { label: dict.footer.store, value: settings.storePhone },
    { label: dict.footer.clinic, value: settings.cosmetologistPhone },
  ].filter((phone): phone is { label: string; value: string } => Boolean(phone.value));
}

async function Clinics({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const copy = homeCopy[locale].clinics;
  const [settings, specialists, clinics] = await Promise.all([
    readSettings(locale),
    settle(getSpecialists(locale), [], "specialists"),
    settle(getClinics(locale), null, "clinics"),
  ]);
  const locations = clinicLocations(clinics, specialists, locale, dict);
  if (!settings && locations.length === 0) return null;
  const pickupAddress = settings?.pickupAddress.trim();
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
  const fmt = createFormatter(locale);
  return (
    <section
      id={SECTION_IDS.clinics}
      aria-labelledby="clinic-title"
      className={cn(sectionGap, "scroll-mt-24")}
    >
      {settings ? (
        <JsonLd
          data={[
            organizationLd({ origin, settings }),
            clinicLd({
              origin,
              settings,
              location: specialistLocations(specialists)[0],
              facts: clinicFacts(),
            }),
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
        <Heading
          id="clinic-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          action={
            <ArrowLink href={shopPath(locale, { kind: "services" })}>
              {dict.home.servicesLink}
            </ArrowLink>
          }
        />
        <div className="flex flex-col gap-7 rounded-[24px] border border-line bg-image-well/50 p-[clamp(16px,4vw,42px)]">
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
                    {fmt.phone(phone.value)}
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

/* -------------------------------------------------------------------------- */
/* 10. Discover feed                                                           */
/* -------------------------------------------------------------------------- */

async function Discover({ locale }: { locale: Locale }) {
  const [home, settings, categories] = await Promise.all([
    readHome(locale),
    readSettings(locale),
    settle(getCategories(locale), [], "categories"),
  ]);
  // The unfiltered feed continues after the «Yangi kelganlar» rail, so the
  // landing never shows those products twice (category chips start afresh).
  const feed = await settle(getFeedPage(locale, home?.feedCursor ?? null, null), null, "feed");
  let initial = feed?.items ?? [];
  let total = home?.stats.products ?? null;
  if (!feed) {
    // No `catalog/feed/` yet: the catalog's first page, without paging or filters.
    const fallback = await settle(
      listProducts(locale, { q: "", category: null, sort: "default", inStock: false, page: 1 }),
      null,
      "feed fallback",
    );
    initial = fallback?.page.items ?? [];
    total ??= fallback?.page.total ?? null;
  }
  if (initial.length === 0) return null;
  return (
    <DiscoverFeed
      locale={locale}
      initial={initial}
      initialCursor={feed?.nextCursor ?? null}
      total={total}
      categories={
        feed
          ? categories
              .filter((category) => category.productCount > 0)
              .map((category) => ({
                slug: category.slug,
                name: category.name,
                count: category.productCount,
              }))
          : []
      }
      onlineSalesEnabled={salesOn(home, settings)}
      cashback={rates(home)}
    />
  );
}

function DiscoverSection({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale].feed;
  return (
    <section
      id={SECTION_IDS.discover}
      aria-labelledby="discover-title"
      className={cn(sectionGap, "scroll-mt-24 pb-[clamp(48px,6vw,88px)]")}
    >
      <Container>
        <div className="mb-4 flex flex-col gap-2">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2 id="discover-title" className={headingTitle}>
            {copy.title}
          </h2>
        </div>
        <Suspense
          fallback={
            <ul aria-hidden="true" className={liveCardGrid}>
              {Array.from({ length: 10 }, (_, index) => (
                <li key={index}>
                  <LiveCardSkeleton />
                </li>
              ))}
            </ul>
          }
        >
          <Discover locale={locale} />
        </Suspense>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function ShopHome({ locale }: { locale: Locale }) {
  const dict = getShopDictionary(locale);
  return (
    <>
      <section aria-labelledby="hero-title" className="pt-[clamp(20px,3.4vw,48px)]">
        <Suspense fallback={<HeroSkeleton locale={locale} />}>
          <Hero locale={locale} />
        </Suspense>
        <Suspense fallback={<LiveStripSkeleton />}>
          <LiveStrip locale={locale} />
        </Suspense>
      </section>
      <Suspense fallback={<SectionSkeleton />}>
        <Categories locale={locale} dict={dict} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Rails locale={locale} />
      </Suspense>
      <Suspense fallback={<CampaignsSkeleton />}>
        <Campaigns locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton cards={3} />}>
        <Specialists locale={locale} dict={dict} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <Cashback locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <Clinics locale={locale} dict={dict} />
      </Suspense>
      <DiscoverSection locale={locale} />
    </>
  );
}
