import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";
import type { FulfilmentCounters } from "@/domain/dashboard";

import { orderListHref } from "../orders/query";
import { dashboardCopy, type DashboardCopy } from "./copy";

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

/** The tiles in the admin language (`t` = `dashboardCopy[locale].fulfilment.tiles`). */
export function fulfilmentTiles(
  counters: FulfilmentCounters,
  t: DashboardCopy["fulfilment"]["tiles"] = dashboardCopy.uz.fulfilment.tiles,
): FulfilmentTile[] {
  return [
    {
      key: "paidToPrepare",
      label: t.paidToPrepare.label,
      value: counters.paidToPrepare,
      note: t.paidToPrepare.note,
      href: orderListHref({ ...ALL, status: "processing" }),
      icon: "bag",
      tone: "neutral",
    },
    {
      key: "toHandToCourier",
      label: t.toHandToCourier.label,
      value: counters.toHandToCourier,
      note: t.toHandToCourier.note,
      href: orderListHref({ ...ALL, status: "processing", provider: "yandex" }),
      icon: "truck",
      tone: counters.toHandToCourier > 0 ? "warning" : "neutral",
    },
    {
      key: "inDelivery",
      label: t.inDelivery.label,
      value: counters.inDelivery,
      note: t.inDelivery.note,
      href: orderListHref({ ...ALL, status: "handed_to_courier" }),
      icon: "map-pin",
      tone: "neutral",
    },
    {
      key: "returning",
      label: t.returning.label,
      value: counters.returning,
      note: t.returning.note,
      href: orderListHref({ ...ALL, provider: "yandex", stage: "returning" }),
      icon: "refresh",
      tone: counters.returning > 0 ? "warning" : "neutral",
    },
    {
      key: "completedToday",
      label: t.completedToday.label,
      value: counters.completedToday,
      note: t.completedToday.note,
      href: orderListHref({ ...ALL, status: "delivered" }),
      icon: "check",
      tone: "neutral",
    },
    {
      key: "needsAction",
      label: t.needsAction.label,
      value: counters.needsAction,
      note: t.needsAction.note,
      href: orderListHref({ ...ALL, attention: "open" }),
      icon: "alert-circle",
      tone: counters.needsAction > 0 ? "warning" : "neutral",
    },
    {
      key: "urgent",
      label: t.urgent.label,
      value: counters.urgent,
      note: t.urgent.note,
      href: orderListHref({ ...ALL, attention: "urgent" }),
      icon: "alert-triangle",
      tone: counters.urgent > 0 ? "danger" : "neutral",
    },
  ];
}
