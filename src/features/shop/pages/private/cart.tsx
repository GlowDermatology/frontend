import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { getAddresses, getCart, getRegions } from "@/data/shop/account";
import { getSettings } from "@/data/shop/catalog";
import { privateRead } from "@/data/shop/private";
import type { Locale } from "@/lib/i18n/locales";

import { BodySkeleton, privateMetadata } from "../../account/account-shell";
import { CartView } from "../../cart/cart-view";
import { CheckoutView } from "../../cart/checkout-view";
import { Container, PageHeading } from "../../components/layout-primitives";
import { ordersCopy } from "../../copy/orders";
import { shopPath } from "../../routing/routes";
import { settle } from "../settle";
import { privateGate, type LocaleInput } from "./shared";

/** `/savat` · `/{ru,en}/cart` and `/rasmiylashtirish` · `/{ru,en}/checkout`. */

export async function cartMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "cart" }, ordersCopy[locale].cart.title);
}

export async function checkoutMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "checkout" }, ordersCopy[locale].checkout.title);
}

async function CartBody({ locale }: { locale: Locale }) {
  const next = shopPath(locale, { kind: "cart" });
  await privateGate(locale, next);
  const [cart, settings] = await Promise.all([
    privateRead(next, () => getCart(locale)),
    settle(getSettings(locale), null, "settings"),
  ]);
  return (
    <CartView
      locale={locale}
      initial={cart}
      canCheckout={{
        sales: settings?.onlineSalesEnabled ?? true,
        payments: (settings?.paymentProviders.length ?? 1) > 0,
      }}
      supportPhone={settings?.supportPhone ?? null}
    />
  );
}

async function CheckoutBody({ locale }: { locale: Locale }) {
  const next = shopPath(locale, { kind: "checkout" });
  await privateGate(locale, next);
  const [cart, addresses, regions, settings] = await Promise.all([
    privateRead(next, () => getCart(locale)),
    privateRead(next, () => getAddresses(locale)),
    settle(getRegions(locale), [], "delivery regions"),
    settle(getSettings(locale), null, "settings"),
  ]);
  if (cart.lines.length === 0 || cart.hasProblems) redirect(shopPath(locale, { kind: "cart" }));
  return (
    <CheckoutView
      locale={locale}
      cart={cart}
      addresses={addresses}
      regions={regions}
      fulfilmentMethods={settings?.fulfilmentMethods ?? ["pickup"]}
      providers={settings?.paymentProviders ?? ["click", "payme"]}
      pickupAddress={settings?.pickupAddress ?? ""}
      termsVersion={settings?.termsVersion ?? null}
      termsHref={shopPath(locale, { kind: "terms" })}
    />
  );
}

function Frame({
  locale,
  title,
  lead,
  children,
}: {
  locale: Locale;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <Container className="pb-[clamp(56px,7vw,112px)]">
      <PageHeading eyebrow={ordersCopy[locale].cart.eyebrow} title={title} lead={lead} />
      {children}
    </Container>
  );
}

export async function CartPage({ locale: localeInput }: { locale: LocaleInput }) {
  const locale = await localeInput;
  const copy = ordersCopy[locale].cart;
  return (
    <Frame locale={locale} title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <CartBody locale={locale} />
      </Suspense>
    </Frame>
  );
}

export async function CheckoutPage({ locale: localeInput }: { locale: LocaleInput }) {
  const locale = await localeInput;
  const copy = ordersCopy[locale].checkout;
  return (
    <Frame locale={locale} title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <CheckoutBody locale={locale} />
      </Suspense>
    </Frame>
  );
}
