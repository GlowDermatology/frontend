import type { Route } from "next";

import type { IconName } from "@/components/ui/icon";
import type { DashboardData } from "@/domain/dashboard";
import { formatWeekdayShortDateTime } from "@/lib/format";

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

/** §5.7 (M2) `attention.bts_polling_failing`. */
export const BTS_POLLING_FAILING_TITLE =
  "BTS kuzatuvi ishlamayapti · buyurtma holatlari yangilanmayapti";

/** §5.7 (gap CB-9.2.4) `attention.cashback_policy_missing`. */
export const CASHBACK_POLICY_MISSING_TITLE =
  "Cashback siyosati yo‘q · xaridlarga cashback yozilmayapti";

export function attentionItems(attention: DashboardData["attention"]): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (attention.btsFailed > 0) {
    items.push({
      key: "bts-failed",
      // No shipment filter on `orders/`: processing delivery orders of every date hold them.
      href: "/admin/orders?status=processing&fulfilment=delivery&period=all",
      icon: "truck",
      title: `${attention.btsFailed} ta buyurtma BTS ga yuborilmadi`,
      body: "Avtomatik urinish muvaffaqiyatsiz. Qo‘lda yuboring.",
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
      title: BTS_POLLING_FAILING_TITLE,
      tone: "danger",
    });
  }
  if (attention.cashbackPolicyMissing) {
    items.push({
      key: "cashback-policy",
      href: "/admin/cashback",
      icon: "percent",
      title: CASHBACK_POLICY_MISSING_TITLE,
      body: "Cashback sozlamalarida yangi versiya qo‘shing.",
      tone: "danger",
    });
  }
  if (attention.pendingAppointments > 0) {
    items.push({
      key: "appointments",
      href: "/admin/appointments",
      icon: "calendar",
      title: `${attention.pendingAppointments} ta qabul tasdiq kutmoqda`,
      body: attention.nextAppointmentAt
        ? `Eng yaqini: ${formatWeekdayShortDateTime(attention.nextAppointmentAt)}`
        : "Ko‘rib chiqing",
      tone: "warning",
    });
  }
  if (attention.refundsNeedingAction > 0) {
    items.push({
      key: "refunds",
      href: "/admin/payments?refund=needs_action",
      icon: "card",
      title: `${attention.refundsNeedingAction} ta qaytarish tekshiruv kutmoqda`,
      body: "Xato, holati noma’lum yoki qo‘lda qaytariladigan qaytarishlarni ko‘rib chiqing.",
      tone: "danger",
    });
  }
  if (attention.newFromBillz > 0) {
    items.push({
      key: "billz",
      href: "/admin/products?new=1",
      icon: "refresh",
      title: `Billz’dan ${attention.newFromBillz} ta yangi mahsulot`,
      body: "Tavsif va rasmlarni to‘ldirib, faollashtiring.",
      tone: "neutral",
    });
  }

  return items;
}
