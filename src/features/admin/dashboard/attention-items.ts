import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";
import type { DashboardData } from "@/domain/dashboard";
import { createFormatter, type AdminFormatter } from "@/lib/format";

import { dashboardCopy, type DashboardCopy } from "./copy";

/** The dashboard's attention block, item by item (contract §5.7). */

export interface AttentionItem {
  key: string;
  /** Where the item leads; an item without a list to open is plain text. */
  href?: Route;
  icon: IconName;
  title: string;
  body?: string;
  tone: "danger" | "warning" | "neutral";
}

/** §5.7 (M2) `attention.bts_polling_failing` (Uzbek, the contract's line). */
export const BTS_POLLING_FAILING_TITLE = dashboardCopy.uz.attention.btsPolling;

/** Yandex Delivery plan §3.9 `attention.yandex_failing`. */
export const YANDEX_FAILING_TITLE = dashboardCopy.uz.attention.yandex;

/** §5.7 (gap CB-9.2.4) `attention.cashback_policy_missing`. */
export const CASHBACK_POLICY_MISSING_TITLE = dashboardCopy.uz.attention.cashbackPolicy;

/** The items in the admin language (`t` = `dashboardCopy[locale].attention`, `fmt` its formatter). */
export function attentionItems(
  attention: DashboardData["attention"],
  t: DashboardCopy["attention"] = dashboardCopy.uz.attention,
  fmt: AdminFormatter = createFormatter("uz"),
): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (attention.btsFailed > 0) {
    items.push({
      key: "bts-failed",
      // No shipment filter on `orders/`: processing delivery orders of every date hold them.
      href: "/admin/orders?status=processing&fulfilment=delivery&period=all",
      icon: "truck",
      title: t.btsFailed(attention.btsFailed),
      body: t.btsFailedBody,
      tone: "danger",
    });
  }
  if (attention.btsPollingFailing) {
    // §5.7 (M2): BTS tracking is down. The contract names no screen for it
    // (no order is wrong yet, their statuses are just not moving), so the
    // item is text, not a link.
    items.push({
      key: "bts-polling",
      icon: "truck",
      title: t.btsPolling,
      tone: "danger",
    });
  }
  if (attention.yandexFailing) {
    // Repeated auth / payment errors of the price checks or the status poll:
    // new orders cannot get a Yandex quote and courier statuses stand still.
    items.push({
      key: "yandex-failing",
      href: "/admin/delivery-issues",
      icon: "truck",
      title: t.yandex,
      body: t.yandexBody,
      tone: "danger",
    });
  }
  if (attention.cashbackPolicyMissing) {
    items.push({
      key: "cashback-policy",
      href: "/admin/cashback",
      icon: "percent",
      title: t.cashbackPolicy,
      body: t.cashbackPolicyBody,
      tone: "danger",
    });
  }
  if (attention.pendingAppointments > 0) {
    items.push({
      key: "appointments",
      href: "/admin/appointments",
      icon: "calendar",
      title: t.appointments(attention.pendingAppointments),
      body: attention.nextAppointmentAt
        ? t.nextAppointment(fmt.weekdayShortDateTime(attention.nextAppointmentAt))
        : t.review,
      tone: "warning",
    });
  }
  if (attention.refundsNeedingAction > 0) {
    items.push({
      key: "refunds",
      href: "/admin/payments?refund=needs_action",
      icon: "card",
      title: t.refunds(attention.refundsNeedingAction),
      body: t.refundsBody,
      tone: "danger",
    });
  }
  if (attention.newFromBillz > 0) {
    items.push({
      key: "billz",
      href: "/admin/products?new=1",
      icon: "refresh",
      title: t.billz(attention.newFromBillz),
      body: t.billzBody,
      tone: "neutral",
    });
  }

  return items;
}
