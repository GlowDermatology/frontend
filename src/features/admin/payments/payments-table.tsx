"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { closeFailedRefund, resolveRefund, retryRefund } from "@/data/payments.actions";
import type { ActionResult } from "@/data/types";
import { refundStateLine, type Refund } from "@/domain/order";
import { refundOperations, type PaymentRecord } from "@/domain/payment";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatNumber, formatPhone, formatSom } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { newIdempotencyKey, shouldRenewKey } from "../shared/idempotency";
import { PaymentStatusBadge, PROVIDER_LABEL, RefundStateBadge } from "../shared/status";
import { isClickStillPaidRefusal, isStaleRefundRefusal, refundRefusalMessage } from "./refusals";

/** One refund operation the admin confirmed in the dialog. */
export type RefundOperation =
  | { kind: "retry"; payment: PaymentRecord; refund: Refund }
  | { kind: "resolve"; state: "succeeded" | "failed"; payment: PaymentRecord; refund: Refund }
  | {
      /** A failed Click refund closed after a Click status check; `manualPayout` = paid by hand. */
      kind: "close";
      manualPayout: boolean;
      payment: PaymentRecord;
      refund: Refund;
    };

/** One key per payment, refund and step: the two close steps send different bodies. */
const operationKey = (op: RefundOperation) => {
  const step =
    op.kind === "retry"
      ? "retry"
      : op.kind === "resolve"
        ? `resolve-${op.state}`
        : op.manualPayout
          ? "payout"
          : "close";
  return `${op.payment.id}:${op.refund.id}:${step}`;
};

/** The dialog's line under the text: Click's answer before the payout step, or a refusal. */
interface DialogNotice {
  tone: "info" | "error";
  text: string;
}

function dialogCopy(op: RefundOperation): { title: string; body: string; confirm: string } {
  const amount = formatSom(op.refund.amount);
  const provider = PROVIDER_LABEL[op.refund.provider];
  if (op.kind === "retry") {
    return {
      title: `Qaytarishni qayta yuborasizmi?`,
      body:
        op.refund.provider === "click"
          ? `Buyurtma №${op.payment.orderId}: ${amount} Click orqali yangi qaytarish sifatida yuboriladi.`
          : `Buyurtma №${op.payment.orderId}: ${amount} uchun yangi qaytarish ochiladi; Payme kabinetida qo‘lda qaytariladi.`,
      confirm: "Qayta yuborish",
    };
  }
  if (op.kind === "close") {
    return op.manualPayout
      ? {
          title: "Mijozga qo‘lda to‘landimi?",
          body: `Buyurtma №${op.payment.orderId}: ${amount} mijozga Click’dan tashqari to‘langanini tekshirdingizmi? Click holati yana tekshiriladi va qaytarish «Qaytarildi» deb yopiladi; jurnalga «qo‘lda to‘landi» deb yoziladi.`,
          confirm: "Qo‘lda to‘landi",
        }
      : {
          title: "Qaytarishni yakunlaysizmi?",
          body: `Buyurtma №${op.payment.orderId}: Click’dan to‘lov holati qayta so‘raladi. Click ${amount} ni qaytargan bo‘lsa, qaytarish «Qaytarildi» deb yopiladi va mijozga qo‘lda to‘lash kerak emas. Qaytarmagan bo‘lsa, mijozga qo‘lda to‘lab, «Qo‘lda to‘landi» bilan yakunlaysiz.`,
          confirm: "Yakunlash",
        };
  }
  if (op.state === "succeeded") {
    // A manual Click refund is paid to the customer outside Click (§5.1, M2).
    const check =
      op.refund.state === "manual_required" && op.refund.provider === "click"
        ? `${amount} mijozga qo‘lda to‘langanini tekshirdingizmi?`
        : `${provider} kabinetida ${amount} mijozga qaytarilganini tekshirdingizmi?`;
    return {
      title: "Qaytarish bajarildimi?",
      body: `Buyurtma №${op.payment.orderId}: ${check} Qaytarish «Qaytarildi» deb yopiladi.`,
      confirm: "Qaytarildi deb belgilash",
    };
  }
  return {
    title: "Qaytarish bajarilmadimi?",
    body: `Buyurtma №${op.payment.orderId}: ${amount} qaytarilmagan deb yopiladi. Keyin uni qayta yuborish mumkin.`,
    confirm: "Bajarilmadi deb belgilash",
  };
}

function successToast(op: RefundOperation): { title: string; description?: string } {
  if (op.kind === "retry") {
    return { title: "Qaytarish qayta yuborildi", description: `Buyurtma №${op.payment.orderId}` };
  }
  if (op.kind === "close") {
    return { title: "Qaytarish yakunlandi", description: `Buyurtma №${op.payment.orderId}` };
  }
  return {
    title: op.state === "succeeded" ? "Qaytarish yakunlandi" : "Qaytarish bajarilmadi deb yopildi",
    description: `Buyurtma №${op.payment.orderId}`,
  };
}

/**
 * The operations a payment row offers, one group per refund that has any
 * (newest first). A failed Click refund offers "Yakunlash" (the server asks
 * Click first) and, once Click answered that it still holds the money,
 * "Qo‘lda to‘landi" (`stillPaid`).
 */
function rowItems(
  payment: PaymentRecord,
  open: (op: RefundOperation) => void,
  disabled: boolean,
  stillPaid: ReadonlySet<number>,
): ActionMenuItem[] {
  const many = payment.refunds.length > 1;
  return payment.refunds.flatMap((refund) => {
    const ops = refundOperations(refund, payment);
    const suffix = many ? ` · #${refund.id}` : "";
    const hint = `${refundStateLine(refund)} · ${formatSom(refund.amount)}`;
    const items: ActionMenuItem[] = [];
    if (ops.retry) {
      items.push({
        key: `${refund.id}-retry`,
        label: `Qayta yuborish${suffix}`,
        hint,
        disabled,
        onSelect: () => open({ kind: "retry", payment, refund }),
      });
    }
    if (ops.close) {
      items.push({
        key: `${refund.id}-close`,
        label: `Yakunlash${suffix}`,
        hint,
        disabled,
        onSelect: () => open({ kind: "close", manualPayout: false, payment, refund }),
      });
      if (stillPaid.has(refund.id)) {
        items.push({
          key: `${refund.id}-payout`,
          label: `Qo‘lda to‘landi${suffix}`,
          hint,
          disabled,
          onSelect: () => open({ kind: "close", manualPayout: true, payment, refund }),
        });
      }
    }
    if (ops.resolve) {
      items.push(
        {
          key: `${refund.id}-succeeded`,
          label: `Qaytarildi deb belgilash${suffix}`,
          hint,
          disabled,
          onSelect: () => open({ kind: "resolve", state: "succeeded", payment, refund }),
        },
        {
          key: `${refund.id}-failed`,
          label: `Bajarilmadi deb belgilash${suffix}`,
          hint,
          disabled,
          onSelect: () => open({ kind: "resolve", state: "failed", payment, refund }),
        },
      );
    }
    return items;
  });
}

function RefundSummary({ refunds }: { refunds: ReadonlyArray<Refund> }) {
  const newest = refunds[0];
  if (!newest) {
    return (
      <span className="text-ink-muted" aria-label="Qaytarish yo‘q">
        —
      </span>
    );
  }
  return (
    <span className="flex max-w-[240px] flex-col items-start gap-1">
      <RefundStateBadge state={newest.state} />
      {newest.state === "manual_required" && (
        <span className="text-[12px] leading-4 text-ink">{refundStateLine(newest)}</span>
      )}
      <span className="text-[12px] text-ink-muted tabular-nums">
        {formatSom(newest.amount)}
        {refunds.length > 1 && ` · jami ${refunds.length} ta`}
      </span>
    </span>
  );
}

interface PaymentsTableProps {
  payments: PaymentRecord[];
  sortHref: Route;
  sortedAscending: boolean;
}

/**
 * Payment rows with the refund operations of §2.12: "Qayta yuborish" for a
 * failed refund (a new refund of the paid payment), "Qaytarildi / Bajarilmadi
 * deb belgilash" for an unknown or manual_required one, and "Yakunlash" for a
 * failed Click refund (§7 item 18, M2: the server asks Click first; when
 * Click still holds the money the dialog moves on to "Qo‘lda to‘landi",
 * `manual_payout`, once staff paid the customer by hand; Click's 503 keeps
 * the dialog open with the provider-unavailable message). Each operation is
 * confirmed in a dialog and sent with its own idempotency key (kept per
 * payment, refund and operation across retries, renewed after a success or
 * a 422 reuse). The answer is the updated payment row, shown at once; in api
 * mode the action also refreshes the route, so filters and counts follow.
 */
export function PaymentsTable({ payments, sortHref, sortedAscending }: PaymentsTableProps) {
  const toast = useToast();
  const router = useRouter();
  const [updated, setUpdated] = useState<ReadonlyMap<number, PaymentRecord>>(new Map());
  const [source, setSource] = useState(payments);
  const [operation, setOperation] = useState<RefundOperation | null>(null);
  const [notice, setNotice] = useState<DialogNotice | null>(null);
  /** Failed Click refunds Click still reports paid: the menu offers the payout step. */
  const [stillPaid, setStillPaid] = useState<ReadonlySet<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const keys = useRef(new Map<string, string>());
  const submitting = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  /** The payment whose menu opened the dialog: focus goes back to that row's trigger. */
  const [returnTo, setReturnTo] = useState<number | null>(null);

  // New rows from the server (navigation or the action's refresh) replace the local answers.
  if (source !== payments) {
    setSource(payments);
    setUpdated(new Map());
  }

  const keyFor = (op: RefundOperation) => {
    const id = operationKey(op);
    let key = keys.current.get(id);
    if (!key) {
      key = newIdempotencyKey();
      keys.current.set(id, key);
    }
    return key;
  };

  const confirm = () => {
    const op = operation;
    if (!op || submitting.current) return;
    submitting.current = true;
    const key = keyFor(op);
    setNotice(null);
    startTransition(async () => {
      const result: ActionResult<PaymentRecord> = await runAction((csrf) =>
        op.kind === "retry"
          ? retryRefund(op.payment.id, op.refund.id, key, csrf)
          : op.kind === "close"
            ? closeFailedRefund(op.payment.id, op.refund.id, op.manualPayout, key, csrf)
            : resolveRefund(op.payment.id, op.refund.id, op.state, key, csrf),
      );
      submitting.current = false;
      if (shouldRenewKey(result)) keys.current.delete(operationKey(op));
      if (!result.ok) {
        // Click still holds the money (409): the same dialog moves on to the
        // payout step with Click's answer under it (§7 item 18).
        if (op.kind === "close" && !op.manualPayout && isClickStillPaidRefusal(result)) {
          setStillPaid((current) => new Set(current).add(op.refund.id));
          setOperation({ ...op, manualPayout: true });
          setNotice({ tone: "info", text: result.error });
          return;
        }
        // A refusal that means the row changed under us (404, 409 other than
        // the busy order): close and re-read the board so the menu follows the
        // server; a transient failure (busy order, Click's 503, the network)
        // keeps the dialog open with the same key and says why inside it.
        if (isStaleRefundRefusal(result)) {
          toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
          setOperation(null);
          startTransition(() => router.refresh());
          return;
        }
        setNotice({ tone: "error", text: refundRefusalMessage(op.kind, result) });
        return;
      }
      setUpdated((current) => new Map(current).set(result.data.id, result.data));
      setStillPaid((current) => {
        const next = new Set(current);
        next.delete(op.refund.id);
        return next;
      });
      setOperation(null);
      toast(successToast(op));
    });
  };

  const openOperation = (op: RefundOperation) => {
    setReturnTo(op.payment.id);
    setNotice(null);
    setOperation(op);
  };

  // The menu item that opened the dialog is gone once it closes (and a
  // refresh may drop the row from a filtered view): focus the row's menu
  // trigger when it is still there, else the table region.
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const trigger = region.current?.querySelector<HTMLElement>(
      `tr[data-payment-id="${returnTo}"] [aria-haspopup="menu"]`,
    );
    (trigger ?? region.current)?.focus();
  };

  const rows = payments.map((payment) => updated.get(payment.id) ?? payment);
  const copy = operation ? dialogCopy(operation) : null;

  return (
    <>
      <ScrollRegion
        ref={region}
        label="To‘lovlar jadvali"
        className="transition-opacity duration-150 group-data-[pending]:opacity-60"
      >
        <table className="data-table min-w-[1120px]">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">BUYURTMA</th>
              <th scope="col">MIJOZ</th>
              <th scope="col">USUL</th>
              <th scope="col" className="!text-right">
                SUMMA, SO‘M
              </th>
              <th scope="col">HOLAT</th>
              <th scope="col" aria-sort={sortedAscending ? "ascending" : "descending"}>
                <Link
                  href={sortHref}
                  scroll={false}
                  className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
                >
                  YARATILGAN
                  <Icon name={sortedAscending ? "chevron-up" : "chevron-down"} size={14} />
                  <span className="sr-only">
                    {sortedAscending ? ", eskisi birinchi" : ", yangisi birinchi"} — tartibni
                    almashtirish
                  </span>
                </Link>
              </th>
              <th scope="col">QAYTARISH</th>
              <th scope="col">
                <span className="sr-only">Amallar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payment) => {
              const items = rowItems(payment, openOperation, pending, stillPaid);
              return (
                <tr key={payment.id} data-payment-id={payment.id}>
                  <td className="text-ink-muted tabular-nums">{payment.id}</td>
                  <td>
                    <Link
                      href={`/admin/orders/${payment.orderId}` as Route}
                      className="font-bold text-ink tabular-nums underline hover:decoration-gold"
                    >
                      №{payment.orderId}
                    </Link>
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span className="font-semibold">{payment.customer.name}</span>
                      <span className="text-[12px] text-ink-muted tabular-nums">
                        {formatPhone(payment.customer.phone)}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span>{PROVIDER_LABEL[payment.provider]}</span>
                      {payment.transactionId && (
                        <span className="font-mono text-[11px] text-ink-muted">
                          {payment.transactionId}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="text-right font-bold tabular-nums">
                    {formatNumber(payment.amount)}
                  </td>
                  <td>
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="text-ink-muted tabular-nums">
                    <time dateTime={payment.createdAt}>
                      {formatDateTimeShort(payment.createdAt)}
                    </time>
                  </td>
                  <td>
                    <RefundSummary refunds={payment.refunds} />
                  </td>
                  <td>
                    {items.length > 0 ? (
                      <ActionMenu
                        label={`Qaytarish amallari: №${payment.orderId}`}
                        items={items}
                        triggerClassName="flex size-9 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-gold-soft data-[state=open]:bg-gold-soft"
                        trigger={
                          <>
                            <Icon name="sliders" size={18} />
                            <span className="sr-only">Qaytarish amallari: №{payment.orderId}</span>
                          </>
                        }
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>

      <AlertDialog
        open={operation !== null}
        onOpenChange={(open) => {
          if (open || pending) return;
          setOperation(null);
          setNotice(null);
        }}
        onCloseAutoFocus={restoreFocus}
        title={copy?.title ?? ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{copy?.body}</p>}
      >
        {notice && (
          <p
            role="alert"
            className={cn(
              "m-0 flex items-start gap-1.5 text-body-sm leading-5 text-ink",
              notice.tone === "error" ? "font-semibold" : "rounded-md bg-warning-soft px-3 py-2",
            )}
          >
            {notice.tone === "error" && (
              <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0 text-danger" />
            )}
            {notice.text}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant={
              operation?.kind === "resolve" && operation.state === "failed"
                ? "destructive"
                : "primary"
            }
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending
              ? operation?.kind === "close"
                ? "Click tekshirilmoqda…"
                : "Yuborilmoqda…"
              : copy?.confirm}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
