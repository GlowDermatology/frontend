import type { Metadata, Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { Container, Eyebrow, textLink } from "../components/layout-primitives";
import { commonCopy } from "../copy/common";
import { shopPath, type PrivateRoute } from "../routing/routes";
import { buildShopMetadata } from "../seo/metadata";

/**
 * The frame of the signed-in pages: a serif title with the "Shaxsiy kabinet"
 * eyebrow, the section navigation (a sticky column from the `nav` width, a
 * horizontally scrolling row of pills on phones) and the content column.
 * Server Component; the content streams inside it.
 */

export type AccountSection =
  "orders" | "appointments" | "cashback" | "qr" | "inbox" | "account" | "sessions";

const SECTIONS: ReadonlyArray<{ section: AccountSection; icon: IconName }> = [
  { section: "orders", icon: "receipt" },
  { section: "appointments", icon: "calendar" },
  { section: "cashback", icon: "coins" },
  { section: "qr", icon: "qr" },
  { section: "inbox", icon: "bell" },
  { section: "account", icon: "user" },
  { section: "sessions", icon: "shield-check" },
];

/** noindex metadata of a private page (never cached, never in the sitemap). */
export function privateMetadata(
  locale: Locale,
  route: PrivateRoute,
  title: string,
  description?: string,
): Metadata {
  return buildShopMetadata({
    locale,
    route,
    title,
    description: description ?? title,
    noindex: true,
    alternates: false,
  });
}

function AccountNav({ locale, current }: { locale: Locale; current: AccountSection | null }) {
  const copy = commonCopy[locale].nav;
  return (
    <nav aria-label={copy.label} className="min-w-0">
      <ul className="m-0 -mx-1 flex [scrollbar-width:none] list-none gap-1.5 overflow-x-auto p-1 nav:sticky nav:top-6 nav:mx-0 nav:flex-col nav:gap-0.5 nav:overflow-visible nav:p-0">
        {SECTIONS.map(({ section, icon }) => {
          const active = section === current;
          return (
            <li key={section} className="shrink-0">
              <Link
                href={shopPath(locale, { kind: section })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-full border px-4 text-label whitespace-nowrap no-underline transition-colors duration-150 nav:h-11 nav:rounded-md nav:border-transparent nav:px-3",
                  active
                    ? "border-ink bg-ink text-surface nav:bg-gold-soft nav:text-ink"
                    : "border-line text-ink hover:bg-gold-soft",
                )}
              >
                <Icon
                  name={icon}
                  size={18}
                  className={cn("hidden nav:block", active ? "text-gold-ink" : "text-ink-muted")}
                />
                {copy[section]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AccountShell({
  locale,
  section,
  title,
  lead,
  actions,
  children,
}: {
  locale: Locale;
  section: AccountSection | null;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="pb-[clamp(56px,7vw,112px)]">
      <div className="flex flex-col gap-4 pt-[clamp(28px,4vw,56px)] pb-[clamp(20px,3vw,36px)]">
        <Eyebrow>{commonCopy[locale].eyebrow}</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1
            id="page-title"
            className="m-0 font-serif text-headline font-semibold text-balance text-ink"
          >
            {title}
          </h1>
          {actions}
        </div>
        {lead ? (
          <p className="m-0 max-w-[620px] text-lead text-pretty text-ink-muted">{lead}</p>
        ) : null}
      </div>
      <div className="grid gap-6 nav:grid-cols-[220px_minmax(0,1fr)] nav:gap-12">
        <AccountNav locale={locale} current={section} />
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </Container>
  );
}

/** A raised panel of the private pages (the design system's card, a touch more air). */
export function Panel({
  title,
  titleId,
  aside,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  titleId?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      aria-labelledby={title && titleId ? titleId : undefined}
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-line bg-surface-raised p-[clamp(18px,2.4vw,28px)]",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 font-serif text-[26px] leading-8 font-semibold text-ink">
            {title}
          </h2>
          {aside}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

/** Previous / next links of a private list (`?page=`). */
export function Pager({
  locale,
  page,
  pageCount,
  hrefFor,
}: {
  locale: Locale;
  page: number;
  pageCount: number;
  hrefFor: (page: number) => Route;
}) {
  if (pageCount <= 1) return null;
  const copy = commonCopy[locale].pagination;
  const link =
    "inline-flex h-11 items-center gap-2 rounded-full px-4 text-label text-ink no-underline hover:bg-gold-soft";
  return (
    <nav aria-label={copy.label} className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={link}>
          <Icon name="chevron-left" size={18} />
          {copy.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-body-sm text-ink-muted tabular-nums">
        {copy.pageOf(page, pageCount)}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className={link}>
          {copy.next}
          <Icon name="chevron-right" size={18} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block skeleton rounded-sm", className)} />;
}

/** Loading state of a private page's content column. */
export function BodySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Bar className="h-40 w-full rounded-lg" />
      <Bar className="h-64 w-full rounded-lg" />
    </div>
  );
}

/** Loading state of a private page body (same footprint as the shell). */
export function AccountSkeleton() {
  return (
    <Container className="pb-24">
      <div aria-busy="true" className="flex flex-col gap-4 pt-[clamp(28px,4vw,56px)] pb-8">
        <Bar className="h-3.5 w-32" />
        <Bar className="h-[clamp(36px,4vw,56px)] w-1/2 max-w-[420px]" />
      </div>
      <div aria-hidden="true" className="grid gap-6 nav:grid-cols-[220px_minmax(0,1fr)] nav:gap-12">
        <div className="flex gap-2 nav:flex-col">
          {Array.from({ length: 5 }, (_, index) => (
            <Bar key={index} className="h-10 w-28 rounded-full nav:w-full nav:rounded-md" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Bar className="h-40 w-full rounded-lg" />
          <Bar className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </Container>
  );
}

/** A text link styled as the storefront's quiet gold-underline link. */
export function QuietLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className={cn("text-label font-semibold text-gold-ink", textLink)}>
      {children}
    </Link>
  );
}
