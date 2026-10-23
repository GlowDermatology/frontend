"use client";

import { useRef, useState, useTransition } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { referenceNow } from "@/data/config";
import { changeOrderStatus, retryShipment } from "@/data/orders.actions";
import type { ActionResult } from "@/data/types";
import { canCancel, manualTransitions, type Order, type OrderStatus } from "@/domain/order";
import { cn } from "@/lib/cn";
import { formatDateTimeLong } from "@/lib/format";

import { FULFILMENT_LABEL, ORDER_STATUS_META, OrderStatusBadge } from "../shared/status";
import { CancelOrderDialog } from "./cancel-order-dialog";
import {
  OrderCashbackCard,
  OrderCustomerCard,
  OrderHistoryCard,
  OrderItemsCard,
  OrderPaymentCard,
  OrderShipmentCard,
} from "./order-sections";

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  ios: "Mobil ilova (iOS)",
  android: "Mobil ilova (Android)",
};

function transitionHint(order: Order, status: OrderStatus): string {
  if (status === "delivered" && order.fulfilment === "pickup") return "Mijoz do‘kondan olib ketdi";
  return "BTS webhook kelmagan bo‘lsa";
}

function noTransitionsMessage(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "To‘lov tasdiqlangach holat avtomatik «Jarayonda»ga o‘tadi.";
    case "delivered":
      return "Yetkazilgan buyurtma holati o‘zgarmaydi.";
    case "cancelled":
      return "Bekor qilingan buyurtma holati o‘zgarmaydi.";
    default:
      return "Hozircha qo‘lda o‘tish mumkin emas.";
  }
}

const headerButton = "px-4";

interface OrderDetailViewProps {
  initialOrder: Order;
  /** Render time, used to show events that just happened as "hozir". */
  now: string;
}

/**
 * The order detail screen. The order lives in local state so mutations
 * (status change, BTS retry, cancellation) replace it with the server's
 * response — with the API, that response is the updated order resource.
 */
export function OrderDetailView({ initialOrder, now: initialNow }: OrderDetailViewProps) {
  const [order, setOrder] = useState(initialOrder);
  const [now, setNow] = useState(initialNow);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"status" | "shipment" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnClose = useRef(false);
  const toast = useToast();

  const apply = (result: ActionResult<Order>, success: { title: string; description?: string }) => {
    if (!result.ok) {
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      return false;
    }
    setOrder(result.data);
    setNow(referenceNow().toISOString());
    toast(success);
    return true;
  };

  const runStatusChange = (status: OrderStatus) => {
    setPendingAction("status");
    startTransition(async () => {
      const result = await changeOrderStatus(order, status);
      apply(result, {
        title: "Holat yangilandi",
        description: `«${ORDER_STATUS_META[status].label}» · mijozga push yuborildi`,
      });
      setPendingAction(null);
    });
  };

  const runShipmentRetry = () => {
    setPendingAction("shipment");
    startTransition(async () => {
      const result = await retryShipment(order);
      const ok = apply(result, {
        title: "BTS buyurtmasi yaratildi",
        description:
          result.ok && result.data.shipment.state === "created"
            ? `Yetkazish raqami ${result.data.shipment.trackingNumber}`
            : undefined,
      });
      setPendingAction(null);
      // The retry button turns into a disabled status; keep focus on the page.
      if (ok) headingRef.current?.focus();
    });
  };

  const statusItems: ActionMenuItem[] = manualTransitions(order).map((status) => ({
    key: status,
    label: ORDER_STATUS_META[status].label,
    hint: transitionHint(order, status),
    onSelect: () => runStatusChange(status),
  }));

  const { shipment } = order;

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Buyurtmalar", href: "/admin/orders" }, { label: `№${order.id}` }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="m-0 font-serif text-display leading-10 tracking-normal text-ink tabular-nums focus:outline-none"
            >
              Buyurtma №{order.id}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="m-0 text-body-sm text-ink-muted">
            <time dateTime={order.createdAt}>{formatDateTimeLong(order.createdAt)}</time> ·{" "}
            {CHANNEL_LABEL[order.channel]} · {FULFILMENT_LABEL[order.fulfilment]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionMenu
            label="Yangi holat"
            items={statusItems}
            empty={noTransitionsMessage(order.status)}
            disabled={pending}
            triggerClassName={cn(
              buttonStyles({ variant: "secondary", className: headerButton }),
              "data-[state=open]:bg-surface",
            )}
            trigger={
              <>
                {pendingAction === "status" ? "Saqlanmoqda…" : "Holatni o‘zgartirish"}
                <Icon name="chevron-down" size={16} />
              </>
            }
          />

          {shipment.state === "failed" && order.status !== "cancelled" ? (
            <Button
              variant="secondary"
              className={headerButton}
              onClick={runShipmentRetry}
              disabled={pending}
              aria-busy={pendingAction === "shipment"}
            >
              <Icon name="truck" size={18} />
              {pendingAction === "shipment" ? "Yuborilmoqda…" : "BTS ga yuborish"}
            </Button>
          ) : order.fulfilment === "delivery" ? (
            <button
              type="button"
              disabled
              title={
                shipment.state === "created"
                  ? "BTS ga avtomatik yuborilgan"
                  : "To‘lov tasdiqlangach avtomatik yuboriladi"
              }
              className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-line-strong px-4 text-label font-bold text-ink-muted"
            >
              <Icon name="truck" size={18} />
              {shipment.state === "created" ? "BTS ga yuborilgan" : "BTS ga yuborilmagan"}
            </button>
          ) : null}

          {canCancel(order) && (
            <Button
              variant="danger"
              className={headerButton}
              onClick={() => setCancelOpen(true)}
              disabled={pending}
            >
              <Icon name="close" size={18} className="text-danger" />
              Bekor qilish
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <OrderItemsCard order={order} />
          <OrderHistoryCard events={order.history} now={now} />
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <OrderCustomerCard order={order} />
          <OrderPaymentCard order={order} />
          {order.fulfilment === "delivery" && <OrderShipmentCard order={order} />}
          <OrderCashbackCard order={order} />
        </div>
      </div>

      <CancelOrderDialog
        order={order}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCloseAutoFocus={(event) => {
          if (!focusHeadingOnClose.current) return;
          focusHeadingOnClose.current = false;
          event.preventDefault();
          headingRef.current?.focus();
        }}
        onCancelled={(cancelled) => {
          const paid = order.payment.status === "paid";
          focusHeadingOnClose.current = true;
          setOrder(cancelled);
          setNow(referenceNow().toISOString());
          setCancelOpen(false);
          toast({
            title: "Buyurtma bekor qilindi",
            description: paid
              ? "Qaytarish va cashback yozuvlari yaratildi"
              : "Band qilingan mahsulotlar bo‘shatildi",
          });
        }}
      />
    </>
  );
}
