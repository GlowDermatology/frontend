import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Rings } from "@/components/brand/rings";
import { Icon, type IconName } from "@/components/ui/icon";
import { safeShopNext } from "@/data/customer-auth/next-param";
import { readCustomerSession } from "@/data/customer-auth/session";
import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import type { Locale } from "@/lib/i18n/locales";

import { privateMetadata } from "../../account/account-shell";
import { AuthPanel, type AuthMode } from "../../auth/auth-panel";
import { socialConfig } from "../../auth/social-config";
import { Container, Eyebrow } from "../../components/layout-primitives";
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

function Aside({ locale }: { locale: Locale }) {
  const dict = getShopDictionary(locale);
  const nav = commonCopy[locale].nav;
  return (
    <aside className="relative hidden overflow-hidden rounded-lg bg-banner p-[clamp(32px,4vw,56px)] text-banner-ink-soft nav:flex nav:flex-col nav:justify-between">
      <Rings
        viewBox={600}
        rings={[
          [120, 0.5],
          [180, 0.32],
          [240, 0.18],
          [300, 0.1],
        ]}
        className="absolute -right-40 -bottom-40 size-[620px]"
      />
      <Eyebrow onDark>{authCopy[locale].eyebrow}</Eyebrow>
      <p className="relative m-0 max-w-[420px] font-serif text-headline font-semibold text-banner-ink-soft">
        {dict.home.heroTitleStart}{" "}
        <em className="text-banner-ink not-italic">{dict.home.heroTitleEmphasis}</em>{" "}
        {dict.home.heroTitleEnd}
      </p>
      <ul className="relative m-0 flex list-none flex-col gap-3 p-0">
        {BENEFITS.map((benefit) => (
          <li key={benefit.key} className="flex items-center gap-3 text-label">
            <span className="flex size-9 items-center justify-center rounded-full border border-banner-ink/40 text-banner-ink">
              <Icon name={benefit.icon} size={18} />
            </span>
            {nav[benefit.key]}
          </li>
        ))}
      </ul>
    </aside>
  );
}

async function Body({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  if (!(await storefrontEnabled())) notFound();
  const params = await searchParams;
  const rawNext = first(params.next);
  const session = await readCustomerSession();
  if (session.accessToken) {
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

function FormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="block h-10 w-2/3 skeleton rounded-sm" />
      <span className="block h-5 w-full skeleton rounded-sm" />
      <span className="block h-11 w-full skeleton rounded-md" />
      <span className="block h-11 w-full skeleton rounded-md" />
      <span className="block h-[52px] w-full skeleton rounded-md" />
    </div>
  );
}

export async function SignInPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  return (
    <Container className="py-[clamp(28px,5vw,72px)]">
      <div className="grid gap-8 nav:min-h-[640px] nav:grid-cols-[minmax(0,1fr)_minmax(0,520px)] nav:gap-12">
        <Aside locale={locale} />
        <section
          aria-labelledby="page-title"
          className="mx-auto flex w-full max-w-[520px] flex-col justify-center rounded-lg border border-line bg-surface-raised p-[clamp(20px,4vw,44px)]"
        >
          <Suspense fallback={<FormSkeleton />}>
            <Body locale={locale} searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </Container>
  );
}
