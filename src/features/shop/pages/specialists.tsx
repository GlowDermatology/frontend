import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import { getSpecialist, getSpecialists } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { formatDuration, formatPhone, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

/** Uzbek routes pass the locale; `[locale]` routes pass it as a promise from `params`. */
type LocaleInput = Locale | Promise<Locale>;

import { EmptyState } from "../components/empty-state";
import { Container, Eyebrow, PageHeading } from "../components/layout-primitives";
import { ShopBreadcrumbs } from "../components/shop-breadcrumbs";
import { CardsSkeleton, SpecialistSkeleton } from "../components/skeletons";
import { SpecialistCard, SpecialistPortrait } from "../components/specialist-card";
import { getShopDictionary } from "../content";
import { shopHref, shopPath } from "../routing/routes";
import { JsonLd } from "../seo/json-ld-script";
import { inPageLanguage } from "../seo/describe";
import { breadcrumbLd, itemListLd, specialistLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";

type SlugParams = Promise<{ slug: string }>;
const NOT_FOUND_METADATA: Metadata = { robots: { index: false, follow: false } };

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export async function specialistsMetadata(locale: Locale): Promise<Metadata> {
  if (!(await storefrontEnabled())) return NOT_FOUND_METADATA;
  const dict = getShopDictionary(locale);
  return buildShopMetadata({
    locale,
    route: { kind: "specialists" },
    title: dict.meta.specialistsTitle,
    description: dict.meta.specialistsDescription,
    images: [{ url: `/og/home/${locale}`, width: 1200, height: 630, alt: dict.meta.ogAlt }],
  });
}

async function SpecialistsBody({ locale }: { locale: Locale }) {
  if (!(await storefrontEnabled())) notFound();
  const dict = getShopDictionary(locale);
  const specialists = await getSpecialists(locale);
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.product.breadcrumbHome, url: siteConfig.url },
            {
              name: dict.specialists.title,
              url: absoluteUrl(shopPath(locale, { kind: "specialists" })),
            },
          ]),
          itemListLd(
            specialists.map((specialist) =>
              absoluteUrl(shopPath(locale, { kind: "specialist", slug: specialist.segment })),
            ),
          ),
        ]}
      />
      <ShopBreadcrumbs
        label={dict.product.breadcrumbLabel}
        items={[
          { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
          { label: dict.specialists.title },
        ]}
      />
      <PageHeading title={dict.specialists.title} lead={dict.specialists.lead} />
      {specialists.length === 0 ? (
        <EmptyState title={dict.specialists.title} body={dict.specialists.empty} />
      ) : (
        <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 nav:grid-cols-3">
          {specialists.map((specialist) => (
            <li key={specialist.id}>
              <SpecialistCard
                specialist={specialist}
                locale={locale}
                dict={dict}
                headingLevel="h2"
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export function SpecialistsPage({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<CardsSkeleton count={3} />}>
      <SpecialistsBody locale={locale} />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function specialistMetadata(
  localeInput: LocaleInput,
  params: SlugParams,
): Promise<Metadata> {
  if (!(await storefrontEnabled())) return NOT_FOUND_METADATA;
  const locale = await localeInput;
  const { slug } = await params;
  const specialist = await getSpecialist(locale, slug);
  if (!specialist) return NOT_FOUND_METADATA;
  const dict = getShopDictionary(locale);
  const services = specialist.services.map((service) => service.shortName).join(", ");
  return buildShopMetadata({
    locale,
    route: { kind: "specialist", slug: specialist.segment },
    title: dict.meta.specialistTitle(specialist.name, specialist.roleLabel),
    // An Uzbek bio on a ru/en page gives way to the generated sentence (U6).
    description:
      (inPageLanguage(specialist.contentLanguage, locale) && specialist.bio) ||
      dict.meta.specialistDescription(specialist.name, specialist.roleLabel, services),
    // Its own branded card first (name and role), then the portrait (U14).
    images: [
      {
        url: `/og/specialist/${locale}/${encodeURIComponent(specialist.segment)}`,
        width: 1200,
        height: 630,
        alt: specialist.name,
      },
      ...(specialist.photoUrl ? [{ url: specialist.photoUrl, alt: specialist.name }] : []),
    ],
    ogType: "profile",
  });
}

async function SpecialistBody({
  locale: localeInput,
  params,
}: {
  locale: LocaleInput;
  params: SlugParams;
}) {
  if (!(await storefrontEnabled())) notFound();
  const locale = await localeInput;
  const { slug } = await params;
  const specialist = await getSpecialist(locale, slug);
  if (!specialist) notFound();
  const dict = getShopDictionary(locale);
  const t = dict.specialists;
  const path = shopPath(locale, { kind: "specialist", slug: specialist.segment });
  // The booking flow opens on this specialist's services.
  const book = shopHref(locale, { kind: "booking" }, { specialist: specialist.id });
  const cheapest = specialist.services.reduce<number | null>(
    (min, service) => (min === null || service.price < min ? service.price : min),
    null,
  );
  const facts = [
    specialist.experienceYears ? t.experience(specialist.experienceYears) : null,
    specialist.services.length > 0 ? t.servicesCount(specialist.services.length) : null,
    cheapest !== null ? t.priceFrom(formatPrice(cheapest, locale)) : null,
  ].filter((fact): fact is string => fact !== null);
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={[
          specialistLd({ origin: siteConfig.url, specialist, url: absoluteUrl(path) }),
          breadcrumbLd([
            { name: dict.product.breadcrumbHome, url: siteConfig.url },
            { name: t.title, url: absoluteUrl(shopPath(locale, { kind: "specialists" })) },
            { name: specialist.name, url: absoluteUrl(path) },
          ]),
        ]}
      />
      <ShopBreadcrumbs
        label={dict.product.breadcrumbLabel}
        items={[
          { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
          { label: t.title, href: shopPath(locale, { kind: "specialists" }) },
          { label: specialist.name },
        ]}
      />
      <article
        aria-labelledby="specialist-title"
        className="grid gap-[clamp(32px,5vw,80px)] pt-10 nav:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
      >
        <div className="flex flex-col items-start gap-6">
          <SpecialistPortrait specialist={specialist} size={200} sizes="200px" priority />
          <div className="flex flex-col gap-2">
            <Eyebrow>{specialist.roleLabel}</Eyebrow>
            <h1
              id="specialist-title"
              className="m-0 font-serif text-headline font-semibold text-balance text-ink"
            >
              {specialist.name}
            </h1>
            {facts.length > 0 ? (
              <p className="m-0 text-body text-ink-muted">{facts.join(" · ")}</p>
            ) : null}
          </div>
          <Link
            href={book}
            prefetch={false}
            className={buttonStyles({ size: "lg", lift: true, className: "gap-2.5" })}
          >
            <Icon name="calendar" size={20} />
            {t.book}
          </Link>
          {specialist.location.name || specialist.location.address ? (
            <div className="flex flex-col gap-1.5 border-t border-line pt-5 text-body">
              <h2 className="m-0 text-overline text-ink-muted uppercase">{t.location}</h2>
              <p className="m-0 font-semibold text-ink">{specialist.location.name}</p>
              <address className="text-ink-muted not-italic">{specialist.location.address}</address>
              {specialist.location.phone ? (
                <a
                  href={`tel:${specialist.location.phone}`}
                  className="font-semibold text-ink no-underline decoration-gold underline-offset-4 hover:underline"
                >
                  {formatPhone(specialist.location.phone)}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-10">
          {specialist.bio ? (
            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2
                id="about-title"
                className="m-0 font-serif text-headline-sm font-semibold text-ink"
              >
                {t.about}
              </h2>
              <p className="m-0 max-w-prose text-lead text-pretty whitespace-pre-line text-ink-muted">
                {specialist.bio}
              </p>
            </section>
          ) : null}
          {specialist.qualifications ? (
            <section aria-labelledby="qualifications-title" className="flex flex-col gap-3">
              <h2
                id="qualifications-title"
                className="m-0 font-serif text-headline-sm font-semibold text-ink"
              >
                {t.qualifications}
              </h2>
              <p className="m-0 max-w-prose text-body text-pretty whitespace-pre-line text-ink-muted">
                {specialist.qualifications}
              </p>
            </section>
          ) : null}
          {specialist.services.length > 0 ? (
            <section aria-labelledby="services-title" className="flex flex-col gap-4">
              <h2
                id="services-title"
                className="m-0 font-serif text-headline-sm font-semibold text-ink"
              >
                {t.services}
              </h2>
              <table className="w-full border-collapse text-left text-body">
                <thead>
                  <tr className="border-b border-line text-overline text-ink-muted uppercase">
                    <th scope="col" className="py-3 pr-4 font-bold">
                      {t.serviceColumns.service}
                    </th>
                    <th scope="col" className="py-3 pr-4 font-bold whitespace-nowrap">
                      {t.serviceColumns.duration}
                    </th>
                    <th scope="col" className="py-3 text-right font-bold">
                      {t.serviceColumns.price}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specialist.services.map((service) => (
                    <tr key={service.id} className="border-b border-line">
                      <th scope="row" className="py-4 pr-4 font-semibold text-ink">
                        {/* Straight to the booking flow with this service chosen. */}
                        <Link
                          href={shopHref(
                            locale,
                            { kind: "booking" },
                            { specialist: specialist.id, service: service.id },
                          )}
                          prefetch={false}
                          aria-label={t.bookService(service.name)}
                          className="text-ink underline decoration-gold underline-offset-4 hover:text-gold-ink"
                        >
                          {service.name}
                        </Link>
                      </th>
                      <td className="py-4 pr-4 whitespace-nowrap text-ink-muted">
                        {formatDuration(service.durationMin, locale)}
                      </td>
                      <td className="py-4 text-right font-bold whitespace-nowrap text-ink tabular-nums">
                        {formatPrice(service.price, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </article>
      <Suspense fallback={null}>
        <OtherSpecialists locale={locale} currentId={specialist.id} />
      </Suspense>
    </Container>
  );
}

/** The rest of the team under a profile (up to three). */
async function OtherSpecialists({ locale, currentId }: { locale: Locale; currentId: number }) {
  const dict = getShopDictionary(locale);
  const others = (await getSpecialists(locale).catch(() => [])).filter((s) => s.id !== currentId);
  if (others.length === 0) return null;
  return (
    <section
      aria-labelledby="other-specialists-title"
      className="mt-[clamp(48px,6vw,96px)] flex flex-col gap-8 border-t border-line pt-[clamp(40px,5vw,72px)]"
    >
      <h2
        id="other-specialists-title"
        className="m-0 font-serif text-headline-sm font-semibold text-ink"
      >
        {dict.specialists.others}
      </h2>
      <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 nav:grid-cols-3">
        {others.slice(0, 3).map((other) => (
          <li key={other.id}>
            <SpecialistCard specialist={other} locale={locale} dict={dict} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SpecialistPage({ locale, params }: { locale: LocaleInput; params: SlugParams }) {
  return (
    <Suspense fallback={<SpecialistSkeleton />}>
      <SpecialistBody locale={locale} params={params} />
    </Suspense>
  );
}
