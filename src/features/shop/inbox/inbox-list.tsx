"use client";

import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { markAllNotificationsRead, markNotificationRead } from "@/data/shop/commerce.actions";
import type { InboxTarget, ShopInboxItem } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import { formatShortDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { useShopSession } from "../account/session-context";
import { useShopAction } from "../account/use-shop-action";
import { inboxCopy } from "../copy/inbox";
import { shopPath } from "../routing/routes";

/**
 * The inbox (contract §2.12): unread items stand out; opening one marks it
 * read (`me/notifications/{id}/read/`) and follows its deep link — an
 * order, the appointments, a product (its id URL redirects to the slug) or
 * an https page; "mark all as read" clears the header's badge.
 */

export function inboxHref(locale: Locale, target: InboxTarget): string | null {
  switch (target.kind) {
    case "order":
      return shopPath(locale, { kind: "order", slug: String(target.orderId) });
    case "appointment":
      return shopPath(locale, { kind: "appointments" });
    case "product":
      return shopPath(locale, { kind: "product", slug: String(target.productId) });
    case "url":
      return target.url;
    default:
      return null;
  }
}

const KIND_ICON: Record<ShopInboxItem["kind"], IconName> = {
  promo: "sparkles",
  general: "shield-check",
  order_status: "bag",
  appointment: "calendar",
};

export function InboxList({
  locale,
  items: initial,
  unread: initialUnread,
}: {
  locale: Locale;
  items: ShopInboxItem[];
  unread: number;
}) {
  const copy = inboxCopy[locale];
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const { run, pending } = useShopAction(locale);
  const { setUnread: setBadge } = useShopSession();

  const markRead = async (item: ShopInboxItem) => {
    if (item.read) return;
    const result = await run((csrf) => markNotificationRead({ locale, id: item.id, csrf }));
    if (result.ok) {
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      );
      setUnread(result.data.unread);
      setBadge(result.data.unread);
    }
  };

  const open = async (item: ShopInboxItem) => {
    await markRead(item);
    const href = inboxHref(locale, item.target);
    if (!href) return;
    if (item.target.kind === "url") window.open(href, "_blank", "noopener");
    else router.push(href as Route);
  };

  const markAll = async () => {
    const result = await run((csrf) => markAllNotificationsRead({ locale, csrf }));
    if (result.ok) {
      setItems((current) => current.map((row) => ({ ...row, read: true })));
      setUnread(0);
      setBadge(0);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface-raised px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <Icon name="bell" size={26} />
        </span>
        <p className="m-0 font-serif text-headline-sm font-semibold">{copy.empty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-body-sm text-ink-muted" role="status">
          {unread > 0 ? copy.unread(unread) : copy.allRead}
        </p>
        {unread > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => void markAll()} disabled={pending}>
            <Icon name="check" size={16} />
            {copy.markAll}
          </Button>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => {
          const href = inboxHref(locale, item.target);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void open(item)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                  item.read
                    ? "border-line bg-surface-raised hover:border-line-strong"
                    : "border-gold/60 bg-gold-soft/40 hover:border-gold-ink",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    item.read ? "bg-surface text-ink-muted" : "bg-gold text-on-gold",
                  )}
                >
                  <Icon name={KIND_ICON[item.kind]} size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-label", item.read ? "font-semibold" : "font-bold")}>
                      {item.title}
                    </span>
                    {!item.read ? (
                      <Badge tone="gold" dot>
                        {copy.newLabel}
                      </Badge>
                    ) : null}
                  </span>
                  {item.body ? (
                    <span className="text-body-sm text-pretty text-ink-muted">{item.body}</span>
                  ) : null}
                  <span className="text-caption text-ink-muted">
                    {copy.kinds[item.kind]} · {formatShortDateTime(item.createdAt, locale)}
                  </span>
                </span>
                {item.image ? (
                  <span className="relative hidden size-16 shrink-0 overflow-hidden rounded-md bg-image-well sm:block">
                    <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                ) : null}
                {href ? (
                  <Icon name="chevron-right" size={18} className="mt-2.5 shrink-0 text-gold-ink" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
