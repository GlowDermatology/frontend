import type { Metadata } from "next";
import { Suspense } from "react";

import { getAddresses, getMe, getRegions, getSessions } from "@/data/shop/account";
import { privateRead } from "@/data/shop/private";
import type { Locale } from "@/lib/i18n/locales";

import { AccountShell, BodySkeleton, privateMetadata } from "../../account/account-shell";
import { AccountView } from "../../account/account-view";
import { SessionsView } from "../../account/sessions-view";
import { socialConfig } from "../../auth/social-config";
import { accountCopy } from "../../copy/account";
import { shopPath } from "../../routing/routes";
import { settle } from "../settle";
import { privateGate, type LocaleInput } from "./shared";

/** `/hisob` · `/{ru,en}/account` and `/faol-seanslar` · `/{ru,en}/sessions` (private). */

export async function accountMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "account" }, accountCopy[locale].meta.title);
}

export async function sessionsMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "sessions" }, accountCopy[locale].meta.sessionsTitle);
}

async function AccountBody({ locale }: { locale: Locale }) {
  const next = shopPath(locale, { kind: "account" });
  await privateGate(locale, next);
  const [me, addresses, regions] = await Promise.all([
    privateRead(next, () => getMe(locale)),
    privateRead(next, () => getAddresses(locale)),
    settle(getRegions(locale), [], "delivery regions"),
  ]);
  return (
    <AccountView
      locale={locale}
      initialMe={me}
      addresses={addresses}
      regions={regions}
      social={socialConfig()}
      termsHref={shopPath(locale, { kind: "terms" })}
    />
  );
}

export async function AccountPage({ locale: localeInput }: { locale: LocaleInput }) {
  const locale = await localeInput;
  const copy = accountCopy[locale];
  return (
    <AccountShell locale={locale} section="account" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <AccountBody locale={locale} />
      </Suspense>
    </AccountShell>
  );
}

async function SessionsBody({ locale }: { locale: Locale }) {
  const next = shopPath(locale, { kind: "sessions" });
  await privateGate(locale, next);
  const sessions = await privateRead(next, () => getSessions(locale));
  return <SessionsView locale={locale} initial={sessions} />;
}

export async function SessionsPage({ locale: localeInput }: { locale: LocaleInput }) {
  const locale = await localeInput;
  const copy = accountCopy[locale].sessions;
  return (
    <AccountShell locale={locale} section="sessions" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <SessionsBody locale={locale} />
      </Suspense>
    </AccountShell>
  );
}
