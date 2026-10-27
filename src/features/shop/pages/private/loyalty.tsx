import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCashback, getLedger } from "@/data/shop/account";
import { privateRead } from "@/data/shop/private";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import {
  AccountShell,
  BodySkeleton,
  Pager,
  Panel,
  privateMetadata,
} from "../../account/account-shell";
import { loyaltyCopy } from "../../copy/loyalty";
import { QrPanel } from "../../loyalty/qr-panel";
import { shopHref, shopPath } from "../../routing/routes";
import { pageNumber, privateGate, type LocaleInput, type SearchParams } from "./shared";

/** `/cashback` · `/{ru,en}/cashback` and the QR (`/qr-kod` · `/{ru,en}/qr`). */

export async function cashbackMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "cashback" }, loyaltyCopy[locale].cashback.title);
}

export async function qrMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "qr" }, loyaltyCopy[locale].qr.title);
}

/** "1.00" → "1", "1.50" → "1,5" (uz/ru) or "1.5" (en), like the contract's percent rule. */
export function percentLabel(value: string, locale: Locale): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const text = String(Math.round(number * 100) / 100);
  return locale === "en" ? text : text.replace(".", ",");
}

async function CashbackBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const page = pageNumber((await searchParams).page);
  const next = shopHref(locale, { kind: "cashback" }, { page: page > 1 ? page : undefined });
  await privateGate(locale, next);
  const [summary, ledger] = await Promise.all([
    privateRead(next, () => getCashback(locale)),
    privateRead(next, () => getLedger(locale, page)),
  ]);
  const copy = loyaltyCopy[locale];
  const t = copy.cashback;
  const money = copy.money;

  return (
    <>
      <section
        aria-labelledby="cashback-balance"
        className="relative overflow-hidden rounded-lg bg-banner p-[clamp(24px,4vw,44px)] text-banner-ink-soft"
      >
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="cashback-balance" className="m-0 text-overline text-banner-ink uppercase">
              {t.available}
            </h2>
            <p className="m-0 font-serif text-[clamp(44px,6vw,72px)] leading-none font-semibold tabular-nums">
              {money(summary.available)}
            </p>
            <p className="m-0 text-body-sm text-nav-ink-muted">
              {t.balance}: {money(summary.balance)}
              {summary.held > 0 ? ` · ${t.held}: ${money(summary.held)}` : ""}
            </p>
          </div>
          <Link
            href={shopPath(locale, { kind: "qr" })}
            className={buttonStyles({ size: "lg", lift: true })}
          >
            <Icon name="qr" size={20} />
            {t.showQr}
          </Link>
        </div>
        {summary.negative ? <p className="relative m-0 mt-4 text-body-sm">{t.negative}</p> : null}
      </section>

      <Panel
        title={summary.tier ? t.tier(percentLabel(summary.tier.percent, locale)) : t.noTier}
        titleId="cashback-tier"
      >
        {summary.nextTier ? (
          <div className="flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label={t.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(summary.nextTier.progress * 100)}
              className="h-2 w-full overflow-hidden rounded-full bg-gold-soft"
            >
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.round(summary.nextTier.progress * 100)}%` }}
              />
            </div>
            <p className="m-0 text-body-sm text-ink-muted">
              {t.nextTier(
                money(summary.nextTier.remaining),
                percentLabel(summary.nextTier.percent, locale),
              )}
            </p>
          </div>
        ) : summary.tier ? (
          <p className="m-0 text-body text-ink-muted">{t.topTier}</p>
        ) : null}
        <p className="m-0 text-body-sm text-ink-muted">
          {t.lifetime}:{" "}
          <span className="font-semibold text-ink">{money(summary.lifetimeTotal)}</span>
        </p>
        {summary.tiers.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <h3 className="m-0 text-subheading">{t.tiersTitle}</h3>
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
              {summary.tiers.map((band) => {
                const active = summary.tier?.from === band.from;
                return (
                  <li
                    key={band.from}
                    className={cn(
                      "flex flex-col gap-1 rounded-md border p-4",
                      active ? "border-gold-ink bg-gold-soft/60" : "border-line",
                    )}
                  >
                    <span className="font-serif text-[28px] leading-8 font-semibold">
                      {percentLabel(band.percent, locale)}%
                    </span>
                    <span className="text-body-sm text-ink-muted">
                      {t.tierRow(money(band.from), band.to === null ? null : money(band.to))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="m-0 text-body-sm text-ink-muted">{t.promoRule}</p>
          </div>
        ) : null}
      </Panel>

      <Panel title={t.ledgerTitle} titleId="cashback-ledger">
        {ledger.items.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">{t.ledgerEmpty}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {ledger.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label text-ink">{item.title}</span>
                  <span className="text-body-sm text-ink-muted">
                    {[item.subtitle, formatDateTime(item.at, locale)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={cn(
                      "text-label tabular-nums",
                      item.amount >= 0 ? "text-success" : "text-ink",
                    )}
                  >
                    {item.amount > 0 ? "+" : item.amount < 0 ? "−" : ""}
                    {money(Math.abs(item.amount))}
                  </span>
                  <span className="text-caption text-ink-muted tabular-nums">
                    {money(item.balanceAfter)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pager
          locale={locale}
          page={ledger.page}
          pageCount={ledger.pageCount}
          hrefFor={(n) => shopHref(locale, { kind: "cashback" }, { page: n > 1 ? n : undefined })}
        />
      </Panel>
    </>
  );
}

export async function CashbackPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = loyaltyCopy[locale].cashback;
  return (
    <AccountShell locale={locale} section="cashback" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <CashbackBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}

async function QrBody({ locale }: { locale: Locale }) {
  await privateGate(locale, shopPath(locale, { kind: "qr" }));
  return <QrPanel locale={locale} />;
}

export async function QrPage({ locale: localeInput }: { locale: LocaleInput }) {
  const locale = await localeInput;
  const copy = loyaltyCopy[locale].qr;
  return (
    <AccountShell locale={locale} section="qr" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <QrBody locale={locale} />
      </Suspense>
    </AccountShell>
  );
}
