import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getOrder, getOrders, type OrderScope } from "@/data/shop/account";
import { getSettings } from "@/data/shop/catalog";
import { paymentSandboxEnabled } from "@/data/shop/payment-sandbox";
import { privateRead } from "@/data/shop/private";
import type { OrderStatus, ShopOrder, ShopProgressStep } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import { formatDateTime, formatShortDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import {
  AccountShell,
  AccountSkeleton,
  BodySkeleton,
  Pager,
  Panel,
  privateMetadata,
} from "../../account/account-shell";
import { EmptyState } from "../../components/empty-state";
import { ordersCopy } from "../../copy/orders";
import { OrderActions } from "../../orders/order-actions";
import { PaymentReturn, PaymentSandbox } from "../../orders/payment-return";
import { shopHref, shopPath } from "../../routing/routes";
import { settle } from "../settle";
import { first, pageNumber, privateGate, type LocaleInput, type SearchParams } from "./shared";

/** `/buyurtmalar` · `/{ru,en}/orders` and one order (`/buyurtmalar/{id}`, also the payment return). */

const SCOPES: ReadonlyArray<OrderScope> = ["all", "active", "completed", "cancelled"];

export function statusTone(status: OrderStatus): Tone {
  if (status === "awaiting_payment") return "warning";
  if (status === "cancelled") return "muted";
  if (status === "delivered") return "success";
  return "gold";
}

export async function ordersMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "orders" }, ordersCopy[locale].orders.title);
}

export async function orderMetadata(
  localeInput: LocaleInput,
  params: Promise<{ id: string }>,
): Promise<Metadata> {
  const locale = await localeInput;
  const { id } = await params;
  const number = Number(id);
  const copy = ordersCopy[locale];
  // The tab must not promise an order the customer does not have (U13).
  const order =
    Number.isInteger(number) && number > 0
      ? await getOrder(locale, number).catch(() => undefined)
      : null;
  const title =
    order === null
      ? copy.order.notFoundTitle
      : Number.isInteger(number)
        ? copy.order.titleNumber(number)
        : copy.orders.title;
  return privateMetadata(locale, { kind: "order", slug: id }, title);
}

async function OrdersBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawScope = first(params.scope);
  const scope = SCOPES.find((value) => value === rawScope) ?? "all";
  const page = pageNumber(params.page);
  const next = shopHref(
    locale,
    { kind: "orders" },
    { scope: scope === "all" ? undefined : scope, page: page > 1 ? page : undefined },
  );
  await privateGate(locale, next);
  const orders = await privateRead(next, () => getOrders(locale, scope, page));
  const copy = ordersCopy[locale];

  return (
    <>
      <nav aria-label={copy.orders.scopeLabel} className="flex flex-wrap gap-2">
        {SCOPES.map((value) => (
          <Link
            key={value}
            href={shopHref(
              locale,
              { kind: "orders" },
              { scope: value === "all" ? undefined : value },
            )}
            aria-current={value === scope ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-4 text-label no-underline transition-colors",
              value === scope
                ? "border-ink bg-ink text-surface"
                : "border-line text-ink hover:bg-gold-soft",
            )}
          >
            {copy.orders.scopes[value]}
          </Link>
        ))}
      </nav>
      {orders.items.length === 0 ? (
        <EmptyState
          title={copy.orders.emptyTitle}
          body={copy.orders.emptyBody}
          action={
            <Link
              href={shopPath(locale, { kind: "catalog" })}
              className={buttonStyles({ size: "lg" })}
            >
              {copy.cart.toCatalog}
            </Link>
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {orders.items.map((order) => (
            <li key={order.id}>
              <Link
                href={shopPath(locale, { kind: "order", slug: String(order.id) })}
                className="group flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-5 no-underline transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex shrink-0 -space-x-3">
                  {order.previewImages.length > 0 ? (
                    order.previewImages.map((src, index) => (
                      <span
                        key={src + index}
                        className="relative size-14 overflow-hidden rounded-full border-2 border-surface-raised bg-image-well"
                      >
                        <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                      </span>
                    ))
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                      <Icon name="bag" size={22} />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[22px] leading-7 font-semibold text-ink">
                      {copy.orders.number(order.id)}
                    </span>
                    <Badge tone={statusTone(order.status)}>{order.statusLabel}</Badge>
                  </div>
                  <span className="text-body-sm text-ink-muted">
                    {formatDateTime(order.createdAt, locale)} · {copy.orders.items(order.itemCount)}
                  </span>
                  {order.status === "awaiting_payment" && order.payBy ? (
                    <span className="text-body-sm font-semibold text-ink">
                      {copy.orders.payBy(formatShortDateTime(order.payBy, locale))}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <span className="text-price text-ink tabular-nums">
                    {copy.money(order.total)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-label text-ink">
                    {copy.orders.open}
                    <Icon
                      name="chevron-right"
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager
        locale={locale}
        page={orders.page}
        pageCount={orders.pageCount}
        hrefFor={(n) =>
          shopHref(
            locale,
            { kind: "orders" },
            { scope: scope === "all" ? undefined : scope, page: n > 1 ? n : undefined },
          )
        }
      />
    </>
  );
}

export async function OrdersPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = ordersCopy[locale].orders;
  return (
    <AccountShell locale={locale} section="orders" title={copy.title} lead={copy.lead}>
      <Suspense fallback={<BodySkeleton />}>
        <OrdersBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}

/* --- one order ------------------------------------------------------------- */

function Progress({ steps, label }: { steps: ReadonlyArray<ShopProgressStep>; label: string }) {
  if (steps.length === 0) return null;
  return (
    <ol
      aria-label={label}
      className="m-0 grid list-none gap-0 p-0 sm:auto-cols-fr sm:grid-flow-col"
    >
      {steps.map((step, index) => {
        const done = step.state === "done";
        const current = step.state === "current";
        return (
          <li
            key={`${step.step}-${index}`}
            className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 left-[13px] -mt-5 h-5 w-0.5 sm:top-[13px] sm:right-1/2 sm:left-auto sm:mt-0 sm:h-0.5 sm:w-full",
                  done || current ? "bg-gold" : "bg-line",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                done && "border-gold bg-gold text-on-gold",
                current && "border-gold bg-surface-raised text-gold-ink",
                !done && !current && "border-line bg-surface-raised text-ink-muted",
                step.state === "skipped" && "border-dashed",
              )}
            >
              {done ? (
                <Icon name="check" size={14} strokeWidth={2.4} />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className="flex flex-col gap-0.5 pt-0.5 sm:pt-2">
              <span
                className={cn(
                  "text-label",
                  done || current ? "text-ink" : "text-ink-muted",
                  step.state === "skipped" && "line-through",
                )}
              >
                {step.label}
                <span className="sr-only">{done ? " ✓" : current ? " …" : ""}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Timeline({ order, locale, title }: { order: ShopOrder; locale: Locale; title: string }) {
  if (order.timeline.length === 0) return null;
  return (
    <Panel title={title} titleId="order-timeline">
      <ol className="m-0 flex list-none flex-col p-0">
        {order.timeline.map((entry, index) => (
          <li
            key={`${entry.type}-${entry.at}-${index}`}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < order.timeline.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-4 bottom-0 left-[5px] w-px bg-line"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-1.5 size-[11px] shrink-0 rounded-full",
                index === 0 ? "bg-gold" : "bg-line-strong",
              )}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label text-ink">{entry.title}</span>
              {entry.subtitle ? (
                <span className="text-body-sm text-ink-muted">{entry.subtitle}</span>
              ) : null}
              <time dateTime={entry.at} className="text-caption text-ink-muted">
                {formatDateTime(entry.at, locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

async function OrderBody({
  locale,
  params,
  searchParams,
}: {
  locale: Locale;
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const copy = ordersCopy[locale];
  const next = shopPath(locale, { kind: "order", slug: id });
  await privateGate(locale, next);
  const orderId = Number(id);
  const order =
    Number.isInteger(orderId) && orderId > 0
      ? await privateRead(next, () => getOrder(locale, orderId))
      : null;
  if (!order) {
    return (
      <EmptyState
        title={copy.order.notFoundTitle}
        body={copy.order.notFoundBody}
        action={
          <Link
            href={shopPath(locale, { kind: "orders" })}
            className={buttonStyles({ size: "lg" })}
          >
            {copy.order.back}
          </Link>
        }
      />
    );
  }
  const settings = await settle(getSettings(locale), null, "settings");
  const returned = first(query.paid) === "1";
  const sandbox =
    first(query.sandbox) === "1" && paymentSandboxEnabled() && order.status === "awaiting_payment";
  const t = copy.order;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-body text-ink-muted">
        <Badge tone={statusTone(order.status)}>{order.statusLabel}</Badge>
        <span>{t.placedAt(formatDateTime(order.createdAt, locale))}</span>
        {order.status === "awaiting_payment" && order.payBy ? (
          <span className="font-semibold text-ink">
            {t.payBy(formatShortDateTime(order.payBy, locale))}
          </span>
        ) : null}
      </div>

      {returned ? (
        <PaymentReturn
          locale={locale}
          orderId={order.id}
          initial={{ status: order.status, payment: order.payment }}
        />
      ) : null}
      {sandbox ? (
        <PaymentSandbox
          locale={locale}
          orderId={order.id}
          returnUrl={shopHref(locale, { kind: "order", slug: String(order.id) }, { paid: 1 })}
        />
      ) : null}

      <Panel>
        <Progress steps={order.progress} label={t.progressLabel} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Panel title={t.itemsTitle} titleId="order-items">
            <ul className="m-0 flex list-none flex-col p-0">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center gap-4 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-image-well">
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label text-ink">{item.name}</span>
                    <span className="text-body-sm text-ink-muted tabular-nums">
                      {t.quantityPrice(item.quantity, copy.money(item.unitPrice))}
                    </span>
                  </span>
                  <span className="shrink-0 text-label tabular-nums">
                    {copy.money(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="m-0 flex flex-col gap-2 border-t border-line pt-4 text-body">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t.subtotal}</dt>
                <dd className="m-0 tabular-nums">{copy.money(order.itemsSubtotal)}</dd>
              </div>
              {order.fulfilment === "delivery" ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t.deliveryFee}</dt>
                  <dd className="m-0 tabular-nums">{copy.money(order.deliveryFee)}</dd>
                </div>
              ) : null}
              {order.cashbackUsed > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t.cashback}</dt>
                  <dd className="m-0 text-ink tabular-nums">−{copy.money(order.cashbackUsed)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 pt-2">
                <dt className="text-subheading">{t.total}</dt>
                <dd className="m-0 text-price-lg tabular-nums">{copy.money(order.total)}</dd>
              </div>
            </dl>
          </Panel>
          <Timeline order={order} locale={locale} title={t.timelineTitle} />
        </div>

        <div className="flex flex-col gap-6">
          <OrderActions
            locale={locale}
            orderId={order.id}
            provider={order.payment.provider}
            actions={order.actions}
            providers={settings?.paymentProviders ?? [order.payment.provider]}
          />
          <Panel title={t.paymentTitle} titleId="order-payment">
            <dl className="m-0 flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t.provider[order.payment.provider]}</dt>
                <dd className="m-0 font-semibold">
                  {order.paymentDetail.inProgressLabel ?? order.payment.statusLabel}
                </dd>
              </div>
              {order.paymentDetail.confirmedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t.total}</dt>
                  <dd className="m-0 tabular-nums">{copy.money(order.paymentDetail.amount)}</dd>
                </div>
              ) : null}
              {order.cashback.earned > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t.cashback}</dt>
                  <dd className="m-0 text-ink tabular-nums">
                    +{copy.money(order.cashback.earned)}
                  </dd>
                </div>
              ) : null}
              {order.refund ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t.refund}</dt>
                  <dd className="m-0">
                    {order.refund.stateLabel} · {copy.money(order.refund.amount)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>
          <Panel title={t.deliveryTitle} titleId="order-delivery">
            <p className="m-0 text-label">{order.fulfilmentLabel}</p>
            {order.address ? (
              <p className="m-0 text-body-sm text-ink-muted">
                {order.address}
                {order.addressComment ? ` · ${order.addressComment}` : ""}
              </p>
            ) : null}
            {order.pickupAddress ? (
              <p className="m-0 text-body-sm text-ink-muted">{order.pickupAddress}</p>
            ) : null}
            {order.shipment ? (
              <p className="m-0 text-body-sm">
                {order.shipment.carrier} · {t.tracking(order.shipment.trackingNumber)}
                {order.shipment.trackingUrl ? (
                  <>
                    {" "}
                    <a
                      href={order.shipment.trackingUrl}
                      rel="noopener"
                      target="_blank"
                      className="font-semibold text-ink underline"
                    >
                      {t.trackOnline}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
            {order.customerNote ? (
              <p className="m-0 text-body-sm text-ink-muted">
                {t.note}: {order.customerNote}
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
    </>
  );
}

async function OrderShell({
  locale: localeInput,
  params,
  searchParams,
}: {
  locale: LocaleInput;
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const { id } = await params;
  const copy = ordersCopy[locale];
  const number = Number(id);
  return (
    <AccountShell
      locale={locale}
      section="orders"
      title={
        Number.isInteger(number) && number > 0 ? copy.order.titleNumber(number) : copy.orders.title
      }
      actions={
        <Link
          href={shopPath(locale, { kind: "orders" })}
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          <Icon name="chevron-left" size={16} />
          {copy.order.back}
        </Link>
      }
    >
      <Suspense fallback={<BodySkeleton />}>
        <OrderBody locale={locale} params={params} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}

export function OrderPage({
  locale,
  params,
  searchParams,
}: {
  locale: LocaleInput;
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  // The order id is request data: nothing here may wait outside Suspense.
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <OrderShell locale={locale} params={params} searchParams={searchParams} />
    </Suspense>
  );
}
