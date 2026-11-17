import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { STAFF_SIGN_IN_PATH } from "@/components/brand/audience-switch";
import { AuthLayout } from "@/components/brand/auth-layout";
import type { IconName } from "@/components/ui/icon";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { readCustomerSession } from "@/data/customer-auth/session";
import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import type { Locale } from "@/lib/i18n/locales";

import { privateMetadata } from "../../account/account-shell";
import { AuthPanel, type AuthMode } from "../../auth/auth-panel";
import { socialConfig } from "../../auth/social-config";
import { getShopDictionary } from "../../content";
import { authCopy } from "../../copy/auth";
import { commonCopy } from "../../copy/common";
import { shopPath } from "../../routing/routes";
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

/** Stands in for the panel's first step (keeps the «Mijoz | Xodim» switch in place). */
function FormSkeleton() {
  return (
    <div aria-busy="true" data-auth-first-step className="flex flex-col gap-5">
      <span className="block h-10 w-2/3 skeleton rounded-sm" />
      <span className="block h-5 w-full skeleton rounded-sm" />
      <span className="block h-11 w-full skeleton rounded-md" />
      <span className="block h-11 w-full skeleton rounded-md" />
      <span className="block h-[52px] w-full skeleton rounded-md" />
    </div>
  );
}

/**
 * The customer side of the shared sign-in design (DESIGN §F): `AuthLayout` (embedded in the
 * storefront chrome) around the unchanged `AuthPanel`. «Mijoz | Xodim» shows on the panel's
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
      frame="embedded"
      switchVisibility="first-step"
      switchLinks={{
        label: copy.audience.label,
        customer: { href: shopPath(locale, { kind: "signIn" }), label: copy.audience.customer },
        staff: { href: STAFF_SIGN_IN_PATH, label: copy.audience.staff },
      }}
      eyebrow={copy.eyebrow}
      headline={
        <>
          {dict.home.heroTitleStart}{" "}
          <em className="text-banner-ink not-italic">{dict.home.heroTitleEmphasis}</em>{" "}
          {dict.home.heroTitleEnd}
        </>
      }
      points={BENEFITS.map((benefit) => ({ icon: benefit.icon, text: nav[benefit.key] }))}
    >
      <Suspense fallback={<FormSkeleton />}>
        <Body locale={locale} searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}
