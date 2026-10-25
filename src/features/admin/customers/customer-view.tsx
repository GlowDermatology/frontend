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
import { ledgerBalance, type LedgerEntry } from "@/domain/cashback";
import { lifetimeTotal, type Customer } from "@/domain/customer";
import {
  formatDateLong,
  formatDateTimeShort,
  formatDayMonthShort,
  formatMillions,
  formatPhone,
  formatSom,
  formatTime,
} from "@/lib/format";

import { AdjustCashbackDialog } from "./adjust-cashback-dialog";
import { LedgerTable, PurchasesTable, withRunningBalance } from "./ledger";

const LANGUAGE_NAME = { uz: "O‘zbekcha", ru: "Ruscha", en: "Inglizcha" } as const;
const LEDGER_PREVIEW = 6;

export interface TierInfo {
  percent: number | null;
  next: { percent: number; remaining: number; progress: number } | null;
}

interface CustomerViewProps {
  customer: Customer;
  tier: TierInfo;
  /** Render time, for "bugun, 09:12" in the device tab. */
  now: string;
}

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

export function CustomerView({ customer, tier, now }: CustomerViewProps) {
  const toast = useToast();
  const [ledger, setLedger] = useState<LedgerEntry[]>(customer.ledger);
  // The server balance after the last adjustment, when the API sent one;
  // otherwise the balance is the sum of the ledger rows (the demo rule).
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const [tab, setTab] = useState("cashback");
  const [showAll, setShowAll] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const balance = serverBalance ?? ledgerBalance(ledger);
  const rows = withRunningBalance(ledger);
  const visibleRows = showAll ? rows : rows.slice(0, LEDGER_PREVIEW);
  const lifetime = lifetimeTotal(customer);
  const { device } = customer;
  const sameDay = device && formatDayMonthShort(device.lastActiveAt) === formatDayMonthShort(now);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Mijozlar", href: "/admin/customers" }, { label: customer.name }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} size={64} className="text-[22px]" />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
                {customer.name}
              </h1>
              {customer.status === "active" ? (
                <Badge tone="success">Faol</Badge>
              ) : (
                <Badge tone="muted">O‘chirilgan</Badge>
              )}
            </div>
            <p className="m-0 text-body-sm text-ink-muted tabular-nums">
              {formatPhone(customer.phone)} · Ro‘yxatdan o‘tgan:{" "}
              {formatDateLong(customer.registeredAt)} · {LANGUAGE_NAME[customer.language]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="px-4" onClick={() => setAdjustOpen(true)}>
            <Icon name="coins" size={18} />
            Cashback tuzatish
          </Button>
          <Link
            href={`/admin/notifications?customer=${customer.id}`}
            className={buttonStyles({ variant: "secondary" })}
          >
            <Icon name="bell" size={18} />
            Bildirishnoma yuborish
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Metric
          label="Jami xaridlar"
          value={formatSom(lifetime)}
          note={`Do‘kon ${formatMillions(customer.totals.store)} · Onlayn ${formatMillions(customer.totals.online)}`}
        />
        <Metric
          label="Cashback foizi"
          value={tier.percent === null ? "—" : `${tier.percent}%`}
          note={
            tier.next
              ? `${tier.next.percent}% gacha ${formatSom(tier.next.remaining)}`
              : "Eng yuqori daraja"
          }
        >
          {tier.next && (
            <span
              role="progressbar"
              aria-label={`${tier.next.percent}% darajagacha`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(tier.next.progress * 100)}
              className="flex h-1.5 rounded-full bg-gold-soft"
            >
              <span
                className="rounded-full bg-gold"
                style={{ width: `${Math.round(tier.next.progress * 100)}%` }}
              />
            </span>
          )}
        </Metric>
        <Metric
          label="Cashback balansi"
          value={formatSom(balance)}
          note="Yozuvlar yig‘indisidan hisoblanadi"
        />
        <Metric
          label="Onlayn buyurtmalar"
          value={`${customer.onlineOrders.count} ta`}
          note={
            customer.onlineOrders.lastOrderAt && customer.onlineOrders.lastOrderId
              ? `Oxirgisi: ${formatDayMonthShort(customer.onlineOrders.lastOrderAt)}, №${customer.onlineOrders.lastOrderId}`
              : "Hali buyurtma yo‘q"
          }
        />
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Tabs.Root
          value={tab}
          onValueChange={setTab}
          className="min-w-0 flex-[2_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
          aria-label="Mijoz tarixi"
          asChild
        >
          <section>
            <Tabs.List
              aria-label="Bo‘limlar"
              className="flex flex-wrap gap-1 border-b border-line px-3 pt-2"
            >
              <Tabs.Trigger value="cashback" className={tabTrigger}>
                Cashback tarixi
              </Tabs.Trigger>
              <Tabs.Trigger value="purchases" className={tabTrigger}>
                Xaridlar
              </Tabs.Trigger>
              <Tabs.Trigger value="device" className={tabTrigger}>
                Qurilma
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="cashback" className="focus-visible:outline-offset-[-2px]">
              {rows.length > 0 ? (
                <LedgerTable rows={visibleRows} />
              ) : (
                <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">
                  Hali cashback yozuvlari yo‘q.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-3.5">
                <p className="m-0 flex gap-2.5 text-[12px] leading-[18px] text-ink-muted">
                  <Icon name="shield" size={16} className="mt-px shrink-0 text-gold-ink" />
                  Yozuvlar o‘zgarmaydi va o‘chirilmaydi. Xato faqat yangi tuzatish yozuvi bilan
                  to‘g‘rilanadi.
                </p>
                {rows.length > LEDGER_PREVIEW && (
                  <button
                    type="button"
                    aria-expanded={showAll}
                    onClick={() => setShowAll((value) => !value)}
                    className="text-[13px] leading-[18px] font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
                  >
                    {showAll
                      ? "Kamroq ko‘rsatish"
                      : `Yana ${rows.length - LEDGER_PREVIEW} ta yozuv`}
                  </button>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="purchases" className="focus-visible:outline-offset-[-2px]">
              {customer.purchases.length > 0 ? (
                <PurchasesTable purchases={customer.purchases} />
              ) : (
                <p className="m-0 px-5 py-10 text-center text-body-sm text-ink-muted">
                  Hali xaridlar yo‘q.
                </p>
              )}
            </Tabs.Content>

            <Tabs.Content
              value="device"
              className="flex flex-col gap-3.5 p-5 focus-visible:outline-offset-[-2px]"
            >
              {device ? (
                <div className="flex items-center gap-3.5 rounded-md bg-surface px-4 py-3.5">
                  <Icon name="phone" size={24} className="shrink-0 text-gold-ink" />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[14px] leading-5 font-bold text-ink">
                      {device.model} · {device.os}
                    </span>
                    <span className="text-caption font-normal text-ink-muted tabular-nums">
                      Ilova {device.appVersion} · oxirgi faollik{" "}
                      {sameDay
                        ? `bugun, ${formatTime(device.lastActiveAt)}`
                        : formatDateTimeShort(device.lastActiveAt)}{" "}
                      · push {device.pushEnabled ? "yoqilgan" : "o‘chirilgan"}
                    </span>
                  </span>
                  <Badge tone="success">Faol</Badge>
                </div>
              ) : (
                <p className="m-0 text-body-sm text-ink-muted">Faol qurilma yo‘q.</p>
              )}
              <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink-muted">
                <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
                Bitta hisob — bitta faol qurilma. Yangi qurilmadan kirilganda bu sessiya tugatiladi
                va eski qurilmada “Hisobingizga boshqa qurilmadan kirildi” xabari chiqadi.
              </p>
            </Tabs.Content>
          </section>
        </Tabs.Root>

        <Card
          aria-labelledby="customer-profile-title"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-3"
        >
          <CardTitle id="customer-profile-title">Profil</CardTitle>
          <dl className="m-0 flex flex-col gap-3">
            <DetailRow label="Manzil" className="leading-5">
              {customer.address ?? "—"}
            </DetailRow>
            <DetailRow label="Ilova tili" className="leading-5">
              {LANGUAGE_NAME[customer.language]}
            </DetailRow>
            <DetailRow label="Qabullar" className="leading-5">
              {customer.upcomingAppointments > 0
                ? `${customer.upcomingAppointments} ta rejalashtirilgan`
                : "Rejalashtirilmagan"}
            </DetailRow>
          </dl>
          <span aria-hidden="true" className="h-px bg-line" />
          <h3 className="m-0 text-body-sm font-semibold text-ink-muted">Guruhlar</h3>
          {customer.groups.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {customer.groups.map((group) => (
                <li
                  key={group}
                  className="h-7 rounded-full bg-gold-soft px-2.5 text-[12px] leading-7 font-semibold text-ink"
                >
                  {group}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-body-sm text-ink-muted">Guruhga kirmagan</p>
          )}
          <span aria-hidden="true" className="h-px bg-line" />
          <p className="m-0 flex gap-2.5 text-[12px] leading-[18px] text-ink-muted">
            <Icon name="info" size={16} className="mt-px shrink-0" />
            Hisob o‘chirilsa ham xaridlar va cashback telefon raqamiga bog‘langan holda saqlanadi.
          </p>
        </Card>
      </div>

      <AdjustCashbackDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        customerId={customer.id}
        balance={balance}
        onError={(message) =>
          toast({ tone: "info", title: "Amal bajarilmadi", description: message })
        }
        onAdjusted={({ entry, balance: next }) => {
          setLedger((current) => [entry, ...current]);
          if (next !== undefined) setServerBalance(next);
          setTab("cashback");
          setAdjustOpen(false);
          toast({
            title: "Tuzatish yozuvi qo‘shildi",
            description: "Sabab va admin amallar jurnaliga yozildi",
          });
        }}
      />
    </>
  );
}
