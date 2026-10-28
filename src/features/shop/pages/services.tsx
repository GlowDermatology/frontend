import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getServices, getSpecialists } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import type { ShopService } from "@/domain/shop";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import { EmptyState } from "../components/empty-state";
import { Container, PageHeading, textLink } from "../components/layout-primitives";
import { ShopBreadcrumbs } from "../components/shop-breadcrumbs";
import { CardsSkeleton } from "../components/skeletons";
import { getShopDictionary } from "../content";
import { shopHref, shopPath } from "../routing/routes";
import { JsonLd } from "../seo/json-ld-script";
import { breadcrumbLd, serviceLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

export async function servicesMetadata(locale: Locale): Promise<Metadata> {
  if (!(await storefrontEnabled())) return { robots: { index: false, follow: false } };
  const dict = getShopDictionary(locale);
  return buildShopMetadata({
    locale,
    route: { kind: "services" },
    title: dict.meta.servicesTitle,
    description: dict.meta.servicesDescription,
    images: [{ url: `/og/home/${locale}`, width: 1200, height: 630, alt: dict.meta.ogAlt }],
  });
}

function groupByCategory(services: ReadonlyArray<ShopService>) {
  const groups = new Map<string, { label: string; items: ShopService[] }>();
  for (const service of services) {
    const group = groups.get(service.category) ?? { label: service.categoryLabel, items: [] };
    group.items.push(service);
    groups.set(service.category, group);
  }
  return [...groups.entries()];
}

async function ServicesBody({ locale }: { locale: Locale }) {
  if (!(await storefrontEnabled())) notFound();
  const dict = getShopDictionary(locale);
  const t = dict.services;
  const [services, specialists] = await Promise.all([
    getServices(locale),
    settle(getSpecialists(locale), [], "specialists"),
  ]);
  const byId = new Map(specialists.map((specialist) => [specialist.id, specialist]));
  const pageUrl = absoluteUrl(shopPath(locale, { kind: "services" }));
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.product.breadcrumbHome, url: siteConfig.url },
            { name: t.title, url: pageUrl },
          ]),
          ...services.map((service) =>
            serviceLd({ origin: siteConfig.url, service, url: `${pageUrl}#service-${service.id}` }),
          ),
        ]}
      />
      <ShopBreadcrumbs
        label={dict.product.breadcrumbLabel}
        items={[
          { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
          { label: t.title },
        ]}
      />
      <PageHeading title={t.title} lead={t.lead} />
      {services.length === 0 ? (
        <EmptyState title={t.title} body={t.empty} />
      ) : (
        <div className="flex flex-col gap-14">
          {groupByCategory(services).map(([category, group]) => (
            <section
              key={category}
              aria-labelledby={`group-${category}`}
              className="flex flex-col gap-6"
            >
              <h2
                id={`group-${category}`}
                className="m-0 font-serif text-headline-sm font-semibold text-ink"
              >
                {group.label}
              </h2>
              <ul className="m-0 grid list-none gap-5 p-0 nav:grid-cols-2">
                {group.items.map((service) => {
                  const offeredBy = service.specialistIds
                    .map((id) => byId.get(id))
                    .filter((specialist) => specialist !== undefined);
                  return (
                    <li key={service.id} id={`service-${service.id}`} className="scroll-mt-24">
                      <article className="flex h-full flex-col gap-4 rounded-lg border border-line bg-surface-raised p-[clamp(20px,2.4vw,32px)]">
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                          <h3 className="m-0 text-heading text-ink">{service.name}</h3>
                          <p className="m-0 text-price whitespace-nowrap text-ink tabular-nums">
                            {service.priceFrom === service.priceTo
                              ? formatPrice(service.priceFrom, locale)
                              : t.priceRange(
                                  formatPrice(service.priceFrom, locale),
                                  formatPrice(service.priceTo, locale),
                                )}
                          </p>
                        </div>
                        {service.description ? (
                          <p className="m-0 text-body text-pretty text-ink-muted">
                            {service.description}
                          </p>
                        ) : null}
                        <dl className="m-0 mt-auto grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 border-t border-line pt-4 text-body-sm">
                          <dt className="text-ink-muted">{t.duration}</dt>
                          <dd className="m-0 text-ink">
                            {formatDuration(service.durationMin, locale)}
                          </dd>
                          {offeredBy.length > 0 ? (
                            <>
                              <dt className="text-ink-muted">{t.offeredBy}</dt>
                              <dd className="m-0 flex flex-wrap gap-x-3 gap-y-1">
                                {offeredBy.map((specialist) => (
                                  <Link
                                    key={specialist.id}
                                    href={shopPath(locale, {
                                      kind: "specialist",
                                      slug: specialist.segment,
                                    })}
                                    className={cn("font-semibold text-ink", textLink)}
                                  >
                                    {specialist.name}
                                  </Link>
                                ))}
                              </dd>
                            </>
                          ) : null}
                        </dl>
                        <Link
                          href={shopHref(locale, { kind: "booking" }, { service: service.id })}
                          prefetch={false}
                          className={buttonStyles({ variant: "outline", className: "self-start" })}
                        >
                          {t.book}
                        </Link>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}

export function ServicesPage({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<CardsSkeleton count={4} />}>
      <ServicesBody locale={locale} />
    </Suspense>
  );
}
