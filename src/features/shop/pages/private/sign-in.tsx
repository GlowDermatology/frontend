import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { STAFF_SIGN_IN_PATH } from "@/components/brand/audience-switch";
import { AuthLanguageMenu } from "@/components/brand/auth-language-menu";
import { AuthCaption, AuthLayout } from "@/components/brand/auth-layout";
import { themeCopy } from "@/components/brand/copy";
import type { IconName } from "@/components/ui/icon";
import { ThemeMenu } from "@/components/ui/theme-control";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { readCustomerSession } from "@/data/customer-auth/session";
import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { cn } from "@/lib/cn";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

import { privateMetadata } from "../../account/account-shell";
import { AuthPanel, type AuthMode } from "../../auth/auth-panel";
import { socialConfig } from "../../auth/social-config";
import { getShopDictionary } from "../../content";
import { textLink } from "../../components/layout-primitives";
import { authCopy } from "../../copy/auth";
import { commonCopy } from "../../copy/common";
import { shopHref, shopPath } from "../../routing/routes";
import { settle } from "../settle";
import { first, type LocaleInput, type SearchParams } from "./shared";

/**
 * `/kirish` · `/{ru,en}/sign-in` — sign in, sign up (`?mode=signup`) and
 * password reset (`?mode=reset`), with `?next=` (validated: a storefront
 * path only). A customer who is already signed in goes straight to `next`.
 */

export async function signInMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  const copy = authCopy[locale].meta;
  return privateMetadata(locale, { kind: "signIn" }, copy.signInTitle, copy.description);
}

function modeOf(value: string | undefined): AuthMode {
  return value === "signup" || value === "reset" ? value : "signin";
}

const BENEFITS: ReadonlyArray<{ icon: IconName; key: "orders" | "cashback" | "appointments" }> = [
  { icon: "receipt", key: "orders" },
  { icon: "coins", key: "cashback" },
  { icon: "calendar", key: "appointments" },
];

async function Body({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  if (!(await storefrontEnabled())) notFound();
  const params = await searchParams;
  const rawNext = first(params.next);
  const session = await readCustomerSession();
  // `?switch=1` (the phone gate's "sign in with this number"): sign in as
  // another account on this browser, which replaces this browser's session.
  if (session.accessToken && first(params.switch) !== "1") {
    redirect(rawNext ? safeShopNext(rawNext, locale) : shopPath(locale, { kind: "account" }));
  }
  const next = safeShopNext(rawNext, locale);
  const settings = await settle(getSettings(locale), null, "settings");
  return (
    <AuthPanel
      locale={locale}
      mode={modeOf(first(params.mode))}
      next={next}
      termsVersion={settings?.termsVersion ?? null}
      termsHref={shopPath(locale, { kind: "terms" })}
      privacyHref={shopPath(locale, { kind: "privacy" })}
      social={socialConfig()}
    />
  );
}

/**
 * Stands in for the panel's first step, laid out like it (the tabs, the heading and its lead, two
 * fields, the button), so the tabs and the form do not move when it streams in. Marked
 * `data-auth-first-step`: the «Mijoz | Xodim» switch keeps its place.
 */
function FormSkeleton() {
  return (
    <div aria-busy="true" data-auth-first-step className="flex flex-col gap-6">
      <span className="block h-12 w-full skeleton rounded-md" />
      <span className="flex flex-col gap-3">
        <span className="flex h-[1.1em] items-center text-headline-sm">
          <span className="block h-[0.8em] w-3/5 skeleton rounded-sm" />
        </span>
        <span className="flex h-[22px] items-center">
          <span className="block h-3.5 w-4/5 skeleton rounded-sm" />
        </span>
      </span>
      <span className="flex flex-col gap-5">
        {[0, 1].map((index) => (
          <span key={index} className="flex flex-col gap-2">
            <span className="block h-[18px] w-40 skeleton rounded-sm" />
            <span className="block h-11 w-full skeleton rounded-md" />
          </span>
        ))}
        <span className="block h-[52px] w-full skeleton rounded-md" />
      </span>
    </div>
  );
}

/**
 * The card's top row on the customer side (the page has no store header): the wordmark to the
 * home page, the way back to the store, the language links (plain anchors, no JS needed) and the
 * theme menu (light · dark · like the device).
 */
async function CustomerLanguageMenu({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = first(params.next);
  const hrefs = Object.fromEntries(
    LOCALES.map((target) => [
      target,
      shopHref(
        target,
        { kind: "signIn" },
        {
          mode: modeOf(first(params.mode)),
          switch: first(params.switch) === "1",
          next: next ? safeShopNext(next, target) : undefined,
        },
      ),
    ]),
  ) as Record<Locale, string>;
  return (
    <AuthLanguageMenu
      current={locale}
      label={getShopDictionary(locale).header.languageLabel}
      hrefs={hrefs}
    />
  );
}

function CardBrand({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  const dict = getShopDictionary(locale);
  const home = shopPath(locale, { kind: "home" });
  return (
    <div className="flex min-h-[38px] flex-wrap items-center justify-between gap-3">
      <Link
        href={home}
        aria-label={authCopy[locale].backToStore}
        title={dict.header.home}
        className={cn(
          "font-serif text-title font-semibold tracking-[-0.01em] whitespace-nowrap text-ink",
          textLink,
        )}
      >
        Glow Derma
      </Link>
      <div className="flex items-center gap-2">
        <Suspense
          fallback={<span aria-hidden="true" className="h-[38px] w-[76px] skeleton rounded-full" />}
        >
          <CustomerLanguageMenu locale={locale} searchParams={searchParams} />
        </Suspense>
        <ThemeMenu labels={themeCopy[locale]} />
      </div>
    </div>
  );
}

/**
 * The customer side of the shared sign-in design (DESIGN §F): the full-screen `AuthLayout` (the
 * route sits in the `(auth)` groups, outside the store header and footer; its card carries the
 * brand row with the way back to the store and the languages) around `AuthPanel`. «Mijoz | Xodim» shows on the panel's
 * first step only (sign-in / sign-up tabs); the staff link is a plain navigation to the admin
 * panel's own sign-in page.
 */
export async function SignInPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = authCopy[locale];
  const dict = getShopDictionary(locale);
  const nav = commonCopy[locale].nav;
  return (
    <AuthLayout
      audience="customer"
      switchVisibility="first-step"
      switchLinks={{
        label: copy.audience.label,
        customer: { href: shopPath(locale, { kind: "signIn" }), label: copy.audience.customer },
        staff: { href: `${STAFF_SIGN_IN_PATH}?lang=${locale}`, label: copy.audience.staff },
      }}
      caption={
        <AuthCaption
          eyebrow={copy.eyebrow}
          headline={
            <>
              {dict.home.heroTitleStart}{" "}
              <em className="text-banner-ink not-italic">{dict.home.heroTitleEmphasis}</em>{" "}
              {dict.home.heroTitleEnd}
            </>
          }
          points={BENEFITS.map((benefit) => ({ icon: benefit.icon, text: nav[benefit.key] }))}
        />
      }
      header={<CardBrand locale={locale} searchParams={searchParams} />}
    >
      <Suspense fallback={<FormSkeleton />}>
        <Body locale={locale} searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}
