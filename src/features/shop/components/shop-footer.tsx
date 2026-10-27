import Link from "next/link";
import { Suspense } from "react";

import { getSettings } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { gutter, textLink } from "./layout-primitives";

const footerLink = cn("text-[15px] leading-[22px] font-semibold text-ink", textLink);
const heading = "m-0 text-overline text-ink-muted uppercase";

/** Contacts from `settings/public/` (cached), streamed into the static footer. */
async function FooterContacts({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  if (!(await storefrontEnabled())) return null;
  const settings = await getSettings(locale);
  const phones = [
    { label: dict.footer.support, value: settings.supportPhone },
    { label: dict.footer.store, value: settings.storePhone },
    { label: dict.footer.clinic, value: settings.cosmetologistPhone },
  ].filter((phone): phone is { label: string; value: string } => Boolean(phone.value));
  return (
    <div className="flex flex-col gap-3">
      <h2 className={heading}>{dict.footer.contactsHeading}</h2>
      {settings.pickupAddress ? (
        <address className="max-w-[260px] text-[15px] leading-[22px] text-ink not-italic">
          {settings.pickupAddress}
        </address>
      ) : null}
      {phones.map((phone) => (
        <a key={phone.value} href={`tel:${phone.value}`} className={footerLink}>
          <span className="sr-only">{phone.label}: </span>
          {formatPhone(phone.value)}
        </a>
      ))}
      {settings.telegramUrl ? (
        <a href={settings.telegramUrl} rel="noopener" className={footerLink}>
          Telegram
        </a>
      ) : null}
      {settings.instagramUrl ? (
        <a href={settings.instagramUrl} rel="noopener" className={footerLink}>
          Instagram
        </a>
      ) : null}
    </div>
  );
}

export function ShopFooter({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const path = (kind: Parameters<typeof shopPath>[1]) => shopPath(locale, kind);
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className={cn("mx-auto flex max-w-page flex-col gap-12 pt-14 pb-8", gutter)}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-10">
          <div className="flex flex-col gap-3.5">
            <span className="font-serif text-[30px] leading-9 font-semibold text-ink">
              Glow Derma
            </span>
            <p className="m-0 max-w-[280px] text-[14px] leading-[22px] text-ink-muted">
              {dict.footer.tagline}
            </p>
          </div>
          <nav aria-labelledby="footer-shop" className="flex flex-col gap-3">
            <h2 id="footer-shop" className={heading}>
              {dict.footer.shopHeading}
            </h2>
            <Link href={path({ kind: "catalog" })} className={footerLink}>
              {dict.footer.allProducts}
            </Link>
            <Link href={path({ kind: "cart" })} prefetch={false} className={footerLink}>
              {dict.header.cart}
            </Link>
          </nav>
          <nav aria-labelledby="footer-clinic" className="flex flex-col gap-3">
            <h2 id="footer-clinic" className={heading}>
              {dict.footer.clinicHeading}
            </h2>
            <Link href={path({ kind: "specialists" })} className={footerLink}>
              {dict.header.specialists}
            </Link>
            <Link href={path({ kind: "services" })} className={footerLink}>
              {dict.header.services}
            </Link>
          </nav>
          <nav aria-labelledby="footer-docs" className="flex flex-col gap-3">
            <h2 id="footer-docs" className={heading}>
              {dict.footer.docsHeading}
            </h2>
            <Link href={path({ kind: "terms" })} className={footerLink}>
              {dict.meta.termsTitle}
            </Link>
            <Link href={path({ kind: "privacy" })} className={footerLink}>
              {dict.meta.privacyTitle}
            </Link>
            <Link href={path({ kind: "bookingPolicy" })} className={footerLink}>
              {dict.meta.bookingPolicyTitle}
            </Link>
          </nav>
          <Suspense fallback={null}>
            <FooterContacts locale={locale} dict={dict} />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-body-sm text-ink-muted">
          <span>{dict.footer.copyright(2026)}</span>
          <span>{dict.footer.languages}</span>
        </div>
      </div>
    </footer>
  );
}
