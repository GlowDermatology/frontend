"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Button, buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { changeOrderStatus, loadOrder, retryShipment } from "@/data/orders.actions";
import type { ActionResult } from "@/data/types";
import {
  isYandexDelivery,
  refundStateLine,
  shipmentPending,
  type Order,
  type OrderStatus,
} from "@/domain/order";
import { dispatchPhase, pollProgressLabel } from "@/domain/order-dispatch";
import { cn } from "@/lib/cn";
import { formatDateTimeLong } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { FULFILMENT_LABEL, ORDER_STATUS_META, OrderStatusBadge } from "../shared/status";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { ConfirmReturnDialog } from "./confirm-return-dialog";
import { OpenIssuesSection, OrderDeliveryCard } from "./delivery-card";
import {
  DISPATCH_TIMEOUT_TOAST,
  dispatchOffer,
  dispatchToast,
  withOpenIssue,
  type DispatchToast,
} from "./delivery-view";
import { DispatchDialog } from "./dispatch-dialog";
import { initialDispatchProgress, pollDispatch, type DispatchProgress } from "./dispatch-poll";
import { IncidentDialog } from "./incident-dialog";
import {
  OrderCashbackCard,
  OrderCustomerCard,
  OrderHistoryCard,
  OrderItemsCard,
  OrderPaymentCard,
  OrderShipmentCard,
} from "./order-sections";
import { isStaleRefusal } from "./refusals";
import { pollShipment } from "./shipment-poll";

const CHANNEL_LABEL: Record<Order["channel"], string> = {
  ios: "Mobil ilova (iOS)",
  android: "Mobil ilova (Android)",
  web: "Veb-sayt",
};

function transitionHint(order: Order, status: OrderStatus): string {
  if (status === "delivered" && order.fulfilment === "pickup") return "Mijoz do‘kondan olib ketdi";
  // Listed by the server for a Yandex order only while a `parcel_unaccounted` issue is open.
  if (isYandexDelivery(order)) return "Yandex posilkani kuzatmayapti, mijoz olgan bo‘lsa";
  return "BTS webhook kelmagan bo‘lsa";
}

function noTransitionsMessage(status: OrderStatus, yandex: boolean): string {
  // Plan decision 8: a Yandex order follows the courier's statuses, never a manual step.
  if (yandex && (status === "processing" || status === "handed_to_courier")) {
    return "Yandex buyurtmasining holati kuryer holatidan avtomatik yangilanadi.";
  }
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

/**
 * "Now" after a mutation: the server stamped the newest history row at the
 * moment of the change, so it is the reference for "hozir" (the client clock
 * is not: in demo mode the server runs on the fixed demo instant).
 */
function latestEventAt(order: Order, fallback: string): string {
  return order.history[0]?.at ?? fallback;
}

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
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  // Each "Kuryer chaqirish" (or "Holatni tekshirish") starts one 3-minute poll.
  const [dispatchPoll, setDispatchPoll] = useState(0);
  const [progress, setProgress] = useState<DispatchProgress | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"status" | "shipment" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnClose = useRef(false);
  const toast = useToast();
  // One key per pending change; the two buttons never run at the same time.
  const statusKey = useIdempotencyKey();
  const shipmentKey = useIdempotencyKey();

  const replaceOrder = (next: Order) => {
    setOrder(next);
    setNow((current) => latestEventAt(next, current));
  };

  /** Re-reads the order (after a refusal that says it changed). */
  const reload = async () => {
    const fresh = await runAction((csrf) => loadOrder(order.id, csrf));
    if (fresh.ok) replaceOrder(fresh.data);
  };

  /** Re-reads the order after a refusal that says it changed (`isStaleRefusal`). */
  const reloadIfStale = async (result: ActionResult<unknown>) => {
    if (isStaleRefusal(result)) await reload();
  };

  const showToast = (message: DispatchToast | null) => {
    if (message) toast(message);
  };

  /** Starts (or restarts) the status poll of a dispatched order. */
  const startDispatchPoll = () => {
    setProgress(initialDispatchProgress());
    setDispatchPoll((run) => run + 1);
  };

  const apply = (result: ActionResult<Order>, success: { title: string; description?: string }) => {
    if (!result.ok) {
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      return false;
    }
    replaceOrder(result.data);
    toast(success);
    return true;
  };

  // A BTS create is queued or in flight (after "BTS ga yuborish", or already
  // when the page loaded): re-read the order until the outcome arrives, at
  // most POLL_MAX_ATTEMPTS times; leaving the page stops the poll.
  const awaitingShipment = shipmentPending(order.shipment);
  const orderId = order.id;
  useEffect(() => {
    if (!awaitingShipment) return;
    const controller = new AbortController();
    void pollShipment({
      load: () => runAction((csrf) => loadOrder(orderId, csrf)),
      signal: controller.signal,
      onPending: (next) => setOrder(next),
    }).then((outcome) => {
      if (outcome.kind === "aborted") return;
      if (outcome.kind === "timeout") {
        toast({
          tone: "info",
          title: "BTS javobi hali kelmadi",
          description: "So‘rov navbatda. Sahifani birozdan so‘ng yangilang.",
        });
        return;
      }
      setOrder(outcome.order);
      setNow((current) => latestEventAt(outcome.order, current));
      const { shipment } = outcome.order;
      toast(
        shipment.state === "created"
          ? {
              title: "BTS buyurtmasi yaratildi",
              description: `Yetkazish raqami ${shipment.trackingNumber}`,
            }
          : {
              tone: "info",
              title: "BTS ga yuborilmadi",
              description:
                "Urinish muvaffaqiyatsiz tugadi. Manzilni tekshirib, qayta urinib ko‘ring.",
            },
      );
    });
    return () => controller.abort();
  }, [awaitingShipment, orderId, toast]);

  // After "Kuryer chaqirish" (202, stage `courier_requested`): re-read the order every 10 s
  // for at most 3 minutes while Yandex searches; any other stage or a dispatch issue ends it.
  useEffect(() => {
    if (dispatchPoll === 0) return;
    const controller = new AbortController();
    void pollDispatch({
      load: () => runAction((csrf) => loadOrder(orderId, csrf)),
      signal: controller.signal,
      onAttempt: setProgress,
      onSearching: (next) => setOrder(next),
    }).then((outcome) => {
      if (outcome.kind === "aborted") return;
      setProgress(null);
      if (outcome.kind === "timeout") {
        toast(DISPATCH_TIMEOUT_TOAST);
        return;
      }
      setOrder(outcome.order);
      setNow((current) => latestEventAt(outcome.order, current));
      const message = dispatchToast(outcome.phase, outcome.order);
      if (message) toast(message);
    });
    return () => controller.abort();
  }, [dispatchPoll, orderId, toast]);

  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);
  const [confirmShown, setConfirmShown] = useState<OrderStatus | null>(null);
  if (confirmStatus !== null && confirmStatus !== confirmShown) setConfirmShown(confirmStatus);

  const runStatusChange = (status: OrderStatus) => {
    setPendingAction("status");
    startTransition(async () => {
      const result = statusKey.settle(
        await runAction((csrf) => changeOrderStatus(order.id, status, statusKey.key, csrf)),
      );
      apply(result, {
        title: "Holat yangilandi",
        description: result.ok
          ? `«${ORDER_STATUS_META[status].label}» · ${result.data.history[0]?.note ?? ""}`
          : undefined,
      });
      await reloadIfStale(result);
      setPendingAction(null);
    });
  };

  const runShipmentRetry = () => {
    setPendingAction("shipment");
    startTransition(async () => {
      const result = shipmentKey.settle(
        await runAction((csrf) => retryShipment(order.id, shipmentKey.key, csrf)),
      );
      // The API answers 202 with `shipment.pending` (the poll above takes over);
      // the demo creates the parcel at once.
      const shipment = result.ok ? result.data.shipment : null;
      const ok = apply(
        result,
        shipment?.state === "created"
          ? {
              title: "BTS buyurtmasi yaratildi",
              description: `Yetkazish raqami ${shipment.trackingNumber}`,
            }
          : {
              title: "BTS ga yuborildi",
              description: "Natija kelishi bilan sahifa yangilanadi.",
            },
      );
      await reloadIfStale(result);
      setPendingAction(null);
      // The retry button turns into a disabled status; keep focus on the page.
      if (ok) headingRef.current?.focus();
    });
  };

  const statusItems: ActionMenuItem[] = order.availableActions.transitions.map((status) => ({
    key: status,
    label: ORDER_STATUS_META[status].label,
    hint: transitionHint(order, status),
    // Gap ADM-14.1: a forward transition cannot be undone and pushes to the customer.
    onSelect: () => setConfirmStatus(status),
  }));

  const { shipment } = order;
  const yandex = isYandexDelivery(order);
  const dispatch = dispatchOffer(order);
  const searching = yandex && dispatchPhase(order).kind === "searching";
  const polling = progress !== null;
  const issuesSection = order.delivery ? (
    <OpenIssuesSection
      orderId={order.id}
      issues={order.delivery.openIssues}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIncidentOpen(true)}
          disabled={pending}
        >
          <Icon name="alert-circle" size={16} />
          Hodisa qayd etish
        </Button>
      }
    />
  ) : null;

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
            empty={noTransitionsMessage(order.status, yandex)}
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

          {polling ? (
            <span className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled
                aria-describedby="dispatch-progress"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-line-strong px-4 text-label font-bold text-ink-muted"
              >
                <Icon name="refresh" size={18} className="animate-spin" />
                Kuryer qidirilmoqda…
              </button>
              <span
                id="dispatch-progress"
                role="status"
                className="text-[12px] leading-4 text-ink-muted tabular-nums"
              >
                Holat har 10 soniyada tekshiriladi · {pollProgressLabel(progress.elapsedMs)}
              </span>
            </span>
          ) : searching ? (
            <Button
              variant="secondary"
              className={headerButton}
              onClick={startDispatchPoll}
              disabled={pending}
              title="Yandex kuryer qidirmoqda"
            >
              <Icon name="refresh" size={18} />
              Holatni tekshirish
            </Button>
          ) : dispatch ? (
            <Button
              className={headerButton}
              onClick={() => setDispatchOpen(true)}
              disabled={pending}
            >
              <Icon name="truck" size={18} />
              {dispatch.label}
            </Button>
          ) : null}

          {yandex && order.availableActions.confirmReturn && (
            <Button
              variant="secondary"
              className={headerButton}
              onClick={() => setReturnOpen(true)}
              disabled={pending}
            >
              <Icon name="store" size={18} />
              Qaytganini tasdiqlash
            </Button>
          )}

          {yandex ? null : awaitingShipment ? (
            <button
              type="button"
              disabled
              aria-live="polite"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-line-strong px-4 text-label font-bold text-ink-muted"
            >
              <Icon name="refresh" size={18} className="animate-spin" />
              BTS ga yuborilmoqda…
            </button>
          ) : order.availableActions.retryShipment ? (
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

          {order.availableActions.cancel && (
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
          {order.fulfilment === "delivery" &&
            (yandex ? (
              <OrderDeliveryCard
                order={order}
                disabled={pending}
                onMarkDelivered={() => setConfirmStatus("delivered")}
              >
                {issuesSection}
              </OrderDeliveryCard>
            ) : (
              <OrderShipmentCard order={order}>{issuesSection}</OrderShipmentCard>
            ))}
          <OrderCashbackCard order={order} />
        </div>
      </div>

      <AlertDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null);
        }}
        title={
          confirmShown
            ? `Holatni «${ORDER_STATUS_META[confirmShown].label}» ga o‘zgartirasizmi?`
            : ""
        }
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            {yandex &&
              confirmShown === "delivered" &&
              "Yandex bu posilkani kuzatmayapti: faqat mijoz olganini aniq bilsangiz belgilang. "}
            Buyurtma №{order.id} mijozi push xabar oladi. Bu amalni qaytarib bo‘lmaydi.
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </AlertDialogCancel>
          <Button
            onClick={() => {
              const status = confirmStatus;
              setConfirmStatus(null);
              if (status) runStatusChange(status);
            }}
          >
            Holatni o‘zgartirish
          </Button>
        </div>
      </AlertDialog>
      {order.delivery && (
        <IncidentDialog
          orderId={order.id}
          open={incidentOpen}
          onOpenChange={setIncidentOpen}
          onOpened={({ issue, created }) => {
            setIncidentOpen(false);
            setOrder((current) =>
              withOpenIssue(current, {
                id: issue.id,
                kind: issue.kind,
                code: issue.code,
                urgent: issue.urgent,
                openedAt: issue.openedAt,
              }),
            );
            toast({
              title: created ? "Hodisa qayd etildi" : "Ochiq hodisa yangilandi",
              description: issue.urgent
                ? "Shoshilinch: xodimlarga xabar yuborildi."
                : "Muammolar ro‘yxatiga qo‘shildi.",
            });
          }}
          onStale={(message) => {
            setIncidentOpen(false);
            toast({ tone: "info", title: "Amal bajarilmadi", description: message });
            void runAction((csrf) => loadOrder(order.id, csrf)).then((fresh) => {
              if (fresh.ok) replaceOrder(fresh.data);
            });
          }}
        />
      )}
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
          const refund = cancelled.refunds[0];
          const newRefund = refund && !order.refunds.some((r) => r.id === refund.id);
          focusHeadingOnClose.current = true;
          replaceOrder(cancelled);
          setCancelOpen(false);
          toast({
            title: "Buyurtma bekor qilindi",
            description: newRefund
              ? refundStateLine(refund)
              : "Band qilingan mahsulotlar bo‘shatildi",
          });
        }}
        onRefused={(outcome) => {
          toast({ tone: "info", title: outcome.title, description: outcome.message });
          // `return_requested`: Yandex was asked to bring the parcel back; the order (and its new
          // `return_pending` issue) is re-read, the cancel is pressed again once Yandex confirms.
          if (outcome.kind !== "retry") {
            setCancelOpen(false);
            void reload();
          }
        }}
      />
      {yandex && (
        <DispatchDialog
          order={order}
          open={dispatchOpen}
          onOpenChange={setDispatchOpen}
          onDispatched={(next) => {
            setDispatchOpen(false);
            replaceOrder(next);
            const phase = dispatchPhase(next);
            showToast(dispatchToast(phase, next));
            if (phase.kind === "searching") startDispatchPoll();
          }}
          onStale={(title, message) => {
            setDispatchOpen(false);
            toast({ tone: "info", title, description: message });
            void reload();
          }}
          onReload={() => void reload()}
          onCancelOrder={() => {
            setDispatchOpen(false);
            setCancelOpen(true);
          }}
        />
      )}
      {yandex && (
        <ConfirmReturnDialog
          order={order}
          open={returnOpen}
          onOpenChange={setReturnOpen}
          onConfirmed={(next) => {
            setReturnOpen(false);
            replaceOrder(next);
            toast({
              title: "Posilka qaytgani tasdiqlandi",
              description:
                next.status === "cancelled"
                  ? "«Qaytish kutilmoqda» yopildi; buyurtma bekor qilinganicha qoladi."
                  : "Posilka omborda. Kerak bo‘lsa, kuryerni qayta chaqiring yoki buyurtmani bekor qiling.",
            });
          }}
          onStale={(title, message) => {
            setReturnOpen(false);
            toast({ tone: "info", title, description: message });
            void reload();
          }}
        />
      )}
    </>
  );
}
