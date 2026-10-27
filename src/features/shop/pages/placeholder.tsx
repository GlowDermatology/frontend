import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import type { Locale } from "@/lib/i18n/locales";

import { Container } from "../components/layout-primitives";
import { getShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { buildShopMetadata } from "../seo/metadata";
import { settle } from "./settle";

/**
 * W3a placeholders for the private pages the public ones already link to
 * (cart, sign-in, booking). Private: `noindex`, never cached, and the proxy
 * mints the device id and csrf cookies on them. W3b replaces each with the
 * real screen at the same URL.
 */
export type PlaceholderKind = "cart" | "signIn" | "booking";

function copy(kind: PlaceholderKind, locale: Locale) {
  const t = getShopDictionary(locale).placeholder;
  if (kind === "cart") return { title: t.cartTitle, body: t.cartBody };
  if (kind === "signIn") return { title: t.signInTitle, body: t.signInBody };
  return { title: t.bookingTitle, body: t.bookingBody };
}

export function placeholderMetadata(locale: Locale, kind: PlaceholderKind): Metadata {
  const { title, body } = copy(kind, locale);
  return buildShopMetadata({ locale, route: { kind }, title, description: body, noindex: true });
}

async function StoreLinks({ locale }: { locale: Locale }) {
  if (!(await storefrontEnabled())) return null;
  const settings = await settle(getSettings(locale), null, "settings");
  if (!settings) return null;
  const t = getShopDictionary(locale).placeholder;
  const phone = settings.cosmetologistPhone ?? settings.supportPhone;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {settings.storeUrls.ios ? (
        <a
          href={settings.storeUrls.ios}
          rel="noopener"
          className={buttonStyles({ variant: "secondary" })}
        >
          {t.appStore}
        </a>
      ) : null}
      {settings.storeUrls.android ? (
        <a
          href={settings.storeUrls.android}
          rel="noopener"
          className={buttonStyles({ variant: "secondary" })}
        >
          {t.googlePlay}
        </a>
      ) : null}
      {phone ? (
        <a href={`tel:${phone}`} className={buttonStyles({ variant: "secondary" })}>
          {t.callUs}
        </a>
      ) : null}
    </div>
  );
}

export function PlaceholderPage({ locale, kind }: { locale: Locale; kind: PlaceholderKind }) {
  const { title, body } = copy(kind, locale);
  const t = getShopDictionary(locale).placeholder;
  return (
    <Container className="py-[clamp(48px,8vw,120px)]">
      <section
        aria-labelledby="page-title"
        className="relative mx-auto flex max-w-[680px] flex-col items-center gap-6 overflow-hidden rounded-lg border border-line bg-surface-raised px-6 py-[clamp(48px,7vw,96px)] text-center"
      >
        <Rings
          viewBox={600}
          rings={[
            [90, 0.45],
            [150, 0.28],
            [210, 0.16],
            [270, 0.08],
          ]}
          className="absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2"
        />
        <h1
          id="page-title"
          className="relative m-0 font-serif text-headline font-semibold text-ink"
        >
          {title}
        </h1>
        <p className="relative m-0 max-w-[480px] text-lead text-pretty text-ink-muted">{body}</p>
        <div className="relative flex flex-col items-center gap-4">
          <Link
            href={shopPath(locale, { kind: "catalog" })}
            className={buttonStyles({ size: "lg", lift: true })}
          >
            {t.backToCatalog}
          </Link>
          <Suspense fallback={null}>
            <StoreLinks locale={locale} />
          </Suspense>
        </div>
      </section>
    </Container>
  );
}
