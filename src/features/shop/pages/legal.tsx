import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";
import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { formatLongDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import { EmptyState } from "../components/empty-state";
import { Container, PageHeading, textLink } from "../components/layout-primitives";
import { ShopBreadcrumbs } from "../components/shop-breadcrumbs";
import { ProseSkeleton } from "../components/skeletons";
import { getShopDictionary, type ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { JsonLd } from "../seo/json-ld-script";
import { breadcrumbLd } from "../seo/json-ld";
import { absoluteUrl, buildShopMetadata } from "../seo/metadata";

export type LegalKind = "terms" | "privacy" | "bookingPolicy";

function titleOf(kind: LegalKind, dict: ShopDictionary): string {
  return kind === "terms"
    ? dict.meta.termsTitle
    : kind === "privacy"
      ? dict.meta.privacyTitle
      : dict.meta.bookingPolicyTitle;
}

/** Paragraphs split on blank lines; single newlines stay as line breaks. */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function legalMetadata(locale: Locale, kind: LegalKind): Promise<Metadata> {
  if (!(await storefrontEnabled())) return { robots: { index: false, follow: false } };
  const dict = getShopDictionary(locale);
  const settings = await getSettings(locale);
  const text =
    kind === "terms"
      ? settings.terms
      : kind === "privacy"
        ? settings.privacyPolicy
        : settings.bookingPolicy;
  const title = titleOf(kind, dict);
  const lead = paragraphs(text)[0];
  return buildShopMetadata({
    locale,
    route: { kind },
    title,
    description: lead && lead.length >= 40 ? lead : dict.meta.legalDescription(title),
    // An unpublished text is an empty page: keep it out of the index.
    noindex: text.length === 0,
  });
}

async function LegalBody({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  if (!(await storefrontEnabled())) notFound();
  const dict = getShopDictionary(locale);
  const settings = await getSettings(locale);
  const text =
    kind === "terms"
      ? settings.terms
      : kind === "privacy"
        ? settings.privacyPolicy
        : settings.bookingPolicy;
  const title = titleOf(kind, dict);
  const versioned = kind !== "bookingPolicy";
  const meta = [
    versioned && settings.termsUpdatedAt
      ? dict.legal.updated(formatLongDate(settings.termsUpdatedAt, locale))
      : null,
    versioned && settings.termsVersion ? dict.legal.version(settings.termsVersion) : null,
  ].filter(Boolean);
  const others = (["terms", "privacy", "bookingPolicy"] as const).filter((other) => other !== kind);
  const path = shopPath(locale, { kind });
  return (
    <Container className="pb-[clamp(64px,8vw,120px)]">
      <JsonLd
        data={breadcrumbLd([
          { name: dict.product.breadcrumbHome, url: siteConfig.url },
          { name: title, url: absoluteUrl(path) },
        ])}
      />
      <ShopBreadcrumbs
        label={dict.product.breadcrumbLabel}
        items={[
          { label: dict.product.breadcrumbHome, href: shopPath(locale, { kind: "home" }) },
          { label: title },
        ]}
      />
      <div className="grid gap-12 nav:grid-cols-[minmax(0,1fr)_240px]">
        <article aria-labelledby="page-title" className="max-w-prose">
          <PageHeading title={title}>
            {meta.length > 0 ? (
              <p className="m-0 text-body-sm text-ink-muted">{meta.join(" · ")}</p>
            ) : null}
          </PageHeading>
          {text ? (
            <div className="flex flex-col gap-5 text-[17px] leading-[30px] text-pretty text-ink">
              {paragraphs(text).map((paragraph, index) => (
                <p key={index} className="m-0 whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <EmptyState title={title} body={dict.legal.empty} />
          )}
        </article>
        <nav aria-label={dict.legal.docsLabel} className="nav:pt-[clamp(32px,5vw,72px)]">
          <ul className="m-0 flex list-none flex-col gap-3 border-t border-line p-0 pt-5 nav:sticky nav:top-6">
            {others.map((other) => (
              <li key={other}>
                <Link
                  href={shopPath(locale, { kind: other })}
                  className={cn("text-[15px] font-semibold text-ink", textLink)}
                >
                  {titleOf(other, dict)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Container>
  );
}

export function LegalPage({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  return (
    <Suspense fallback={<ProseSkeleton />}>
      <LegalBody locale={locale} kind={kind} />
    </Suspense>
  );
}
