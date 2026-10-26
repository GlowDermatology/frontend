"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState, useTransition } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { resolveRefund, retryRefund } from "@/data/payments.actions";
import type { ActionResult } from "@/data/types";
import { REFUND_STATE_LABEL, type Refund } from "@/domain/order";
import { refundOperations, type PaymentRecord } from "@/domain/payment";
import { formatDateTimeShort, formatNumber, formatPhone, formatSom } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { newIdempotencyKey, shouldRenewKey } from "../shared/idempotency";
import { PaymentStatusBadge, PROVIDER_LABEL, RefundStateBadge } from "../shared/status";

/** One refund operation the admin confirmed in the dialog. */
export type RefundOperation =
  | { kind: "retry"; payment: PaymentRecord; refund: Refund }
  | { kind: "resolve"; state: "succeeded" | "failed"; payment: PaymentRecord; refund: Refund };

const operationKey = (op: RefundOperation) =>
  `${op.payment.id}:${op.refund.id}:${op.kind === "retry" ? "retry" : `resolve-${op.state}`}`;

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
  if (op.state === "succeeded") {
    return {
      title: "Qaytarish bajarildimi?",
      body: `Buyurtma №${op.payment.orderId}: ${provider} kabinetida ${amount} mijozga qaytarilganini tekshirdingizmi? Qaytarish «Qaytarildi» deb yopiladi.`,
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
  return {
    title: op.state === "succeeded" ? "Qaytarish yakunlandi" : "Qaytarish bajarilmadi deb yopildi",
    description: `Buyurtma №${op.payment.orderId}`,
  };
}

/** The operations a payment row offers, one group per refund that has any (newest first). */
function rowItems(
  payment: PaymentRecord,
  open: (op: RefundOperation) => void,
  disabled: boolean,
): ActionMenuItem[] {
  const many = payment.refunds.length > 1;
  return payment.refunds.flatMap((refund) => {
    const ops = refundOperations(refund, payment);
    const suffix = many ? ` · #${refund.id}` : "";
    const hint = `${REFUND_STATE_LABEL[refund.state]} · ${formatSom(refund.amount)}`;
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
    <span className="flex flex-col items-start gap-1">
      <RefundStateBadge state={newest.state} />
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
 * failed refund (a new refund of the paid payment) and "Qaytarildi / Bajarilmadi
 * deb belgilash" for an unknown or manual_required one. Each operation is
 * confirmed in a dialog and sent with its own idempotency key (kept per
 * payment, refund and operation across retries, renewed after a success or
 * a 422 reuse). The answer is the updated payment row, shown at once; in api
 * mode the action also refreshes the route, so filters and counts follow.
 */
export function PaymentsTable({ payments, sortHref, sortedAscending }: PaymentsTableProps) {
  const toast = useToast();
  const [updated, setUpdated] = useState<ReadonlyMap<number, PaymentRecord>>(new Map());
  const [source, setSource] = useState(payments);
  const [operation, setOperation] = useState<RefundOperation | null>(null);
  const [pending, startTransition] = useTransition();
  const keys = useRef(new Map<string, string>());
  const submitting = useRef(false);

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
    startTransition(async () => {
      const result: ActionResult<PaymentRecord> = await runAction((csrf) =>
        op.kind === "retry"
          ? retryRefund(op.payment.id, op.refund.id, key, csrf)
          : resolveRefund(op.payment.id, op.refund.id, op.state, key, csrf),
      );
      submitting.current = false;
      if (shouldRenewKey(result)) keys.current.delete(operationKey(op));
      if (!result.ok) {
        toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
        // A refusal (409) means the row changed under us: close; a transient
        // failure keeps the dialog open for a retry with the same key.
        if (result.code === "invalid_transition" || result.code === "not_found") {
          setOperation(null);
        }
        return;
      }
      setUpdated((current) => new Map(current).set(result.data.id, result.data));
      setOperation(null);
      toast(successToast(op));
    });
  };

  const rows = payments.map((payment) => updated.get(payment.id) ?? payment);
  const copy = operation ? dialogCopy(operation) : null;

  return (
    <>
      <ScrollRegion
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
              const items = rowItems(payment, setOperation, pending);
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
          if (!open && !pending) setOperation(null);
        }}
        title={copy?.title ?? ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{copy?.body}</p>}
      >
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
            {pending ? "Yuborilmoqda…" : copy?.confirm}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
