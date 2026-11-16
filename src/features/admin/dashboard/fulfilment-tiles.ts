import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";
import type { FulfilmentCounters } from "@/domain/dashboard";

import { orderListHref } from "../orders/query";

/**
 * The dashboard's order-state tiles (`dashboard.fulfilment`, Yandex
 * Delivery plan §3.10/§4). Each opens the orders list filtered as closely as
 * `orders/` can (`status`, `provider`, `stage`, `attention`, every date):
 * the issue tiles match their counter exactly; "To‘langan · tayyorlash",
 * "Kuryerga berish kerak", "Yetkazilmoqda" and "Bugun yakunlangan" open the
 * smallest list that contains their orders (the API has no multi-stage or
 * delivered-on filter), and "Qaytarilmoqda" opens the parcels on their way
 * back (`stage=returning`).
 */

export interface FulfilmentTile {
  key: keyof FulfilmentCounters;
  label: string;
  value: number;
  note: string;
  href: Route;
  icon: IconName;
  /** `danger` when the count is work that must not wait. */
  tone: "neutral" | "warning" | "danger";
}

const ALL = { period: "all" } as const;

export function fulfilmentTiles(counters: FulfilmentCounters): FulfilmentTile[] {
  return [
    {
      key: "paidToPrepare",
      label: "To‘langan · tayyorlash",
      value: counters.paidToPrepare,
      note: "to‘langan, hali yig‘ilmagan",
      href: orderListHref({ ...ALL, status: "processing" }),
      icon: "bag",
      tone: "neutral",
    },
    {
      key: "toHandToCourier",
      label: "Kuryerga berish kerak",
      value: counters.toHandToCourier,
      note: "Yandex kuryeri chaqirilgan",
      href: orderListHref({ ...ALL, status: "processing", provider: "yandex" }),
      icon: "truck",
      tone: counters.toHandToCourier > 0 ? "warning" : "neutral",
    },
    {
      key: "inDelivery",
      label: "Yetkazilmoqda",
      value: counters.inDelivery,
      note: "kuryerda, yo‘lda",
      href: orderListHref({ ...ALL, status: "handed_to_courier" }),
      icon: "map-pin",
      tone: "neutral",
    },
    {
      key: "returning",
      label: "Qaytarilmoqda",
      value: counters.returning,
      note: "omborga qaytayotgan jo‘natmalar",
      href: orderListHref({ ...ALL, provider: "yandex", stage: "returning" }),
      icon: "refresh",
      tone: counters.returning > 0 ? "warning" : "neutral",
    },
    {
      key: "completedToday",
      label: "Bugun yakunlangan",
      value: counters.completedToday,
      note: "bugun topshirilgan",
      href: orderListHref({ ...ALL, status: "delivered" }),
      icon: "check",
      tone: "neutral",
    },
    {
      key: "needsAction",
      label: "Harakat kerak",
      value: counters.needsAction,
      note: "ochiq yetkazish muammolari",
      href: orderListHref({ ...ALL, attention: "open" }),
      icon: "alert-circle",
      tone: counters.needsAction > 0 ? "warning" : "neutral",
    },
    {
      key: "urgent",
      label: "Shoshilinch",
      value: counters.urgent,
      note: "darhol ko‘rib chiqing",
      href: orderListHref({ ...ALL, attention: "urgent" }),
      icon: "alert-triangle",
      tone: counters.urgent > 0 ? "danger" : "neutral",
    },
  ];
}
