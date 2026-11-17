"use client";

import Link from "next/link";
import { Tabs } from "radix-ui";
import { useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { formatPercent, type LedgerEntry } from "@/domain/cashback";
import { customerDataCopy } from "@/domain/copy/customers";
import {
  canAdjustCashback,
  canNotify,
  lifetimeTotal,
  type Customer,
  type CustomerSession,
} from "@/domain/customer";
import type { Page } from "@/data/types";
import { cn } from "@/lib/cn";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { AdjustCashbackDialog } from "./adjust-cashback-dialog";
import { customersCopy } from "./copy";
import { balanceNote, customerDisplayName } from "./labels";
import { LedgerTable, PurchasesTable } from "./ledger";
import { SessionsSection } from "./sessions-section";

const LEDGER_PREVIEW = 6;

interface CustomerViewProps {
  customer: Customer;
  /** Render time, for "bugun, 09:12" in the device tab. */
  now: string;
  /** First page of «Faol seanslar» (`null`: it could not be read). */
  sessions: Page<CustomerSession> | null;
}

/** The card's ledger and balances, as last loaded or as the last adjustment left them. */
interface LedgerState {
  ledger: LedgerEntry[];
  balance: number;
  available: number;
}

const ledgerState = (customer: Customer): LedgerState => ({
  ledger: customer.ledger,
  balance: customer.balance,
  available: customer.available,
});

function Metric({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surface-raised p-5 shadow-sm">
      <span className="text-body-sm font-semibold text-ink-muted">{label}</span>
      <span className="text-[24px] leading-[30px] font-extrabold text-ink tabular-nums">
        {value}
      </span>
      {children}
      <span className="text-caption font-normal text-ink-muted tabular-nums">{note}</span>
    </div>
  );
}

const tabTrigger =
  "h-11 border-b-2 border-transparent px-3 text-[14px] leading-[18px] font-semibold text-ink transition-colors duration-150 hover:border-line-strong data-[state=active]:border-gold data-[state=active]:font-bold";

export function CustomerView({ customer, now, sessions }: CustomerViewProps) {
  const copy = useCopy(customersCopy);
  const t = copy.card;
  const domain = useCopy(customerDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const pct = (value: number | string) => formatPercent(value, locale);
  const toast = useToast();
  // Reset the local ledger whenever the server sends the card again (api
  // mode re-renders the route after an adjustment, so the new props already
  // contain the entry); mock mode keeps the locally prepended entry.
  const [source, setSource] = useState(customer);
  const [state, setState] = useState(() => ledgerState(customer));
  if (source !== customer) {
    setSource(customer);
    setState(ledgerState(customer));
  }
  const [tab, setTab] = useState("cashback");
  const [showAll, setShowAll] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { ledger: rows, balance, available } = state;
  const held = balance - available;
  const visibleRows = showAll ? rows : rows.slice(0, LEDGER_PREVIEW);
  const lifetime = lifetimeTotal(customer);
  const { tier, devices } = customer;
  const deleted = customer.status === "deleted";
  const adjustable = canAdjustCashback(customer);
  const lastActive = (at: string) => fmt.relativeDateTime(at, now);
  const allOrders = customer.onlineOrders.allCount ?? 0;
  const name = customerDisplayName(customer.name, locale);

  return (
    <>
      <Breadcrumbs items={[{ label: copy.title, href: "/admin/customers" }, { label: name }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={64} className="shrink-0 text-[22px]" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 font-serif text-display leading-10 tracking-normal break-words text-ink">
                {name}
              </h1>
              {deleted ? (
                <Badge tone="muted">{domain.status.deleted}</Badge>
              ) : (
                <Badge tone="success">{domain.status.active}</Badge>
              )}
            </div>
            <p className="m-0 text-body-sm text-ink-muted tabular-nums">
              {fmt.phone(customer.phone)} · {t.registered(fmt.dateLong(customer.registeredAt))}
              {deleted && customer.deletedAt
                ? ` · ${t.deletedAt(fmt.dateLong(customer.deletedAt))}`
                : ` · ${t.language[customer.language]}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {adjustable && (
            <Button variant="secondary" className="px-4" onClick={() => setAdjustOpen(true)}>
              <Icon name="coins" size={18} />
              {t.adjust}
            </Button>
          )}
          {canNotify(customer) && (
            <Link
              href={`/admin/notifications?customer=${customer.id}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              <Icon name="bell" size={18} />
              {t.notify}
            </Link>
          )}
        </div>
      </div>

      {deleted && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 text-body-sm text-ink shadow-sm"
        >
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          <span>
            <b>{t.deletedTitle}</b> {t.deletedText}
          </span>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Metric
          label={t.total}
          value={fmt.som(lifetime)}
          note={t.totalNote(
            fmt.millions(customer.totals.store),
            fmt.millions(customer.totals.online),
          )}
        />
        <Metric
          label={t.rate}
          value={tier.percent === null ? "—" : `${pct(tier.percent)}%`}
          note={
            tier.next
              ? t.nextTier(pct(tier.next.percent), fmt.som(tier.next.remaining))
              : tier.percent === null
                ? t.noTier
                : t.topTier
          }
        >
          {tier.next && (
            <span
              role="progressbar"
              aria-label={t.progress(pct(tier.next.percent))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(tier.next.progress * 100)}
              className="flex h-1.5 rounded-full bg-line"
            >
              <span
                className="rounded-full bg-gold"
                style={{
                  width: `${Math.min(100, Math.max(0, Math.round(tier.next.progress * 100)))}%`,
                }}
              />
            </span>
          )}
        </Metric>
        <Metric
          label={t.balance}
          value={fmt.som(balance)}
          note={balanceNote(held, available, copy, fmt)}
        />
        <Metric
          label={t.orders}
          value={t.ordersValue(
            customer.onlineOrders.count,
            fmt.number(customer.onlineOrders.count),
          )}
          note={
            customer.onlineOrders.lastOrderAt && customer.onlineOrders.lastOrderId
              ? t.lastOrder(
                  fmt.dayMonthShort(customer.onlineOrders.lastOrderAt),
                  customer.onlineOrders.lastOrderId,
                )
              : t.noOrders
          }
        >
          {allOrders > 0 && (
            <Link
              href={`/admin/orders?customer=${customer.id}`}
              className="self-start text-[13px] leading-[18px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
            >
              {t.allOrders(fmt.number(allOrders))}
            </Link>
          )}
        </Metric>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Tabs.Root
          value={tab}
          onValueChange={setTab}
          className="min-w-0 flex-[2_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
          aria-label={t.historyLabel}
          asChild
        >
          <section>
            <Tabs.List
              aria-label={t.tabsLabel}
              className="flex flex-wrap gap-1 border-b border-line px-3 pt-2"
            >
              <Tabs.Trigger value="cashback" className={tabTrigger}>
                {t.tabCashback}
              </Tabs.Trigger>
              <Tabs.Trigger value="purchases" className={tabTrigger}>
                {t.tabPurchases}
              </Tabs.Trigger>
              <Tabs.Trigger value="device" className={tabTrigger}>
                {t.tabDevices}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="cashback" className="focus-visible:outline-offset-[-2px]">
              {rows.length > 0 ? (
                <LedgerTable rows={visibleRows} />
              ) : (
                <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">
                  {t.noLedger}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-3.5">
                <p className="m-0 flex gap-2.5 text-[12px] leading-[18px] text-ink-muted">
                  <Icon name="shield" size={16} className="mt-px shrink-0 text-gold-ink" />
                  {t.ledgerNote}
                </p>
                {rows.length > LEDGER_PREVIEW && (
                  <button
                    type="button"
                    aria-expanded={showAll}
                    onClick={() => setShowAll((value) => !value)}
                    className="text-[13px] leading-[18px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
                  >
                    {showAll
                      ? t.showLess
                      : t.showMore(
                          rows.length - LEDGER_PREVIEW,
                          fmt.number(rows.length - LEDGER_PREVIEW),
                        )}
                  </button>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="purchases" className="focus-visible:outline-offset-[-2px]">
              {customer.purchases.length > 0 ? (
                <PurchasesTable purchases={customer.purchases} />
              ) : (
                <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">
                  {t.noPurchases}
                </p>
              )}
            </Tabs.Content>

            <Tabs.Content
              value="device"
              className="flex flex-col gap-3.5 p-5 focus-visible:outline-offset-[-2px]"
            >
              {devices.length > 0 ? (
                <ul aria-label={t.devicesLabel} className="m-0 flex list-none flex-col gap-2 p-0">
                  {devices.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3.5 rounded-md bg-surface px-4 py-3.5",
                        !row.isActive && "border border-dashed border-line bg-transparent",
                      )}
                    >
                      <Icon
                        name={row.platform === "web" ? "monitor" : "smartphone"}
                        size={24}
                        className={cn(
                          "shrink-0",
                          row.isActive ? "text-gold-ink" : "text-ink-muted",
                        )}
                      />
                      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                        <span className="text-[14px] leading-5 font-bold text-ink">
                          {domain.platform[row.platform]} · {row.model} · {row.os}
                        </span>
                        <span className="text-caption font-normal text-ink-muted tabular-nums">
                          {row.platform === "web" ? t.browser : t.app(row.appVersion)} ·{" "}
                          {t.lastActive}{" "}
                          <time dateTime={row.lastActiveAt}>{lastActive(row.lastActiveAt)}</time> ·{" "}
                          {row.pushEnabled ? t.pushOn : t.pushOff}
                        </span>
                      </span>
                      {row.isActive ? (
                        <Badge tone="success">{t.active}</Badge>
                      ) : (
                        <Badge tone="muted">{t.inactive}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-body-sm text-ink-muted">{t.noDevices}</p>
              )}
              <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink-muted">
                <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
                {t.devicesNote}
              </p>
            </Tabs.Content>
          </section>
        </Tabs.Root>

        <Card
          aria-labelledby="customer-profile-title"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-3"
        >
          <CardTitle id="customer-profile-title">{t.profile}</CardTitle>
          <dl className="m-0 flex flex-col gap-3">
            <DetailRow label={t.address} className="leading-5 break-words">
              {customer.address ?? "—"}
            </DetailRow>
            <DetailRow label={t.appLanguage} className="leading-5">
              {t.language[customer.language]}
            </DetailRow>
            <DetailRow label={t.appointments} className="leading-5">
              {customer.upcomingAppointments > 0
                ? t.planned(
                    customer.upcomingAppointments,
                    fmt.number(customer.upcomingAppointments),
                  )
                : t.notPlanned}
            </DetailRow>
          </dl>
          <span aria-hidden="true" className="h-px bg-line" />
          <h3 className="m-0 text-body-sm font-semibold text-ink-muted">{t.groupsTitle}</h3>
          {customer.groups.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {customer.groups.map((group) => (
                <li
                  key={group}
                  className="max-w-full truncate rounded-full bg-gold-soft px-2.5 text-[12px] leading-7 font-semibold text-ink"
                >
                  {group}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-body-sm text-ink-muted">{t.noGroups}</p>
          )}
          <span aria-hidden="true" className="h-px bg-line" />
          <p className="m-0 flex gap-2.5 text-[12px] leading-[18px] text-ink-muted">
            <Icon name="info" size={16} className="mt-px shrink-0" />
            {t.keptNote}
          </p>
        </Card>
      </div>

      <SessionsSection customerId={customer.id} initial={sessions} deleted={deleted} />

      {adjustable && (
        <AdjustCashbackDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          customerId={customer.id}
          balance={balance}
          available={available}
          onError={(message) =>
            toast({ tone: "danger", title: copy.adjust.failed, description: message })
          }
          onAdjusted={({ entry, balance: nextBalance, available: nextAvailable }) => {
            // The server's balances when it sent them (api mode, which also
            // re-renders the card); the demo adds the entry to what it shows.
            setState((current) => {
              // The refreshed card may already hold the entry (api mode).
              if (current.ledger.some((row) => row.id === entry.id)) return current;
              const balanceAfter = nextBalance ?? current.balance + entry.amount;
              return {
                ledger: [
                  { ...entry, balanceAfter: entry.balanceAfter ?? balanceAfter },
                  ...current.ledger,
                ],
                balance: balanceAfter,
                available: nextAvailable ?? current.available + entry.amount,
              };
            });
            setTab("cashback");
            setAdjustOpen(false);
            toast({ tone: "success", title: t.adjusted, description: t.adjustedText });
          }}
        />
      )}
    </>
  );
}
