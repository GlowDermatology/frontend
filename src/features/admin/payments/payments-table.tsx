"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { useToast } from "@/components/ui/toast";
import { closeFailedRefund, resolveRefund, retryRefund } from "@/data/payments.actions";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { DELETED_CUSTOMER_LABEL } from "@/domain/customer";
import { manualRefundNote, refundStateLine, type Refund } from "@/domain/order";
import { refundOperations, type PaymentRecord } from "@/domain/payment";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";

import { runAction } from "../shared/action-client";
import { newIdempotencyKey } from "../shared/idempotency";
import { PAYMENT_STATUS_META, PROVIDER_LABEL, REFUND_TONE } from "../shared/status";
import { paymentsCopy, type PaymentsCopy } from "./copy";
import {
  canSubmit,
  CLOSED_DIALOG,
  dialogReducer,
  isPayout,
  keysToDrop,
  nextStep,
  operationKey,
  successToast,
  type RefundOperation,
} from "./refund-dialog";

/** The confirmation dialog's texts for `op` (pure, for tests). */
export function dialogCopy(
  op: RefundOperation,
  t: PaymentsCopy,
  fmt: Pick<AdminFormatter, "som">,
): { title: string; body: string; confirm: string } {
  const d = t.dialog;
  const order = op.payment.orderId;
  const amount = fmt.som(op.refund.amount);
  const provider = PROVIDER_LABEL[op.refund.provider];
  if (op.kind === "retry") {
    return {
      title: d.retryTitle,
      body:
        op.refund.provider === "payme"
          ? d.retryPayme(order, amount)
          : d.retryAutomatic(provider, order, amount),
      confirm: d.retryConfirm,
    };
  }
  if (op.kind === "close") {
    return op.manualPayout
      ? { title: d.payoutTitle, body: d.payoutBody(order, amount), confirm: d.payoutConfirm }
      : { title: d.closeTitle, body: d.closeBody(order, amount), confirm: d.closeConfirm };
  }
  if (op.state === "succeeded") {
    // A manual Click or Uzum refund is paid to the customer outside the provider (§5.1, M2).
    const check =
      op.refund.state === "manual_required" && op.refund.provider !== "payme"
        ? d.checkManualClick(amount)
        : d.checkCabinet(provider, amount);
    return {
      title: d.succeededTitle,
      body: d.succeededBody(order, check),
      confirm: d.succeededConfirm,
    };
  }
  return { title: d.failedTitle, body: d.failedBody(order, amount), confirm: d.failedConfirm };
}

/**
 * The operations a payment row offers, one group per refund that has any
 * (newest first). A failed Click refund offers "Yakunlash" (the server asks
 * Click first) and, once Click answered that it still holds the money,
 * "Qo‘lda to‘landi" (`stillPaid`). While another operation runs, every item
 * stays reachable and says why it waits (`disabledReason`).
 */
export function rowItems(
  payment: PaymentRecord,
  open: (op: RefundOperation) => void,
  pending: boolean,
  stillPaid: ReadonlySet<number>,
  t: PaymentsCopy,
  fmt: Pick<AdminFormatter, "som">,
  locale: Locale,
): ActionMenuItem[] {
  const many = payment.refunds.length > 1;
  const reason = pending ? t.items.busyReason : null;
  return payment.refunds.flatMap((refund) => {
    const ops = refundOperations(refund, payment);
    const suffix = many ? ` · #${refund.id}` : "";
    const hint = `${refundStateLine(refund, locale)} · ${fmt.som(refund.amount)}`;
    const item = (key: string, label: string, op: RefundOperation): ActionMenuItem => ({
      key: `${refund.id}-${key}`,
      label: `${label}${suffix}`,
      hint,
      disabledReason: reason,
      onSelect: () => open(op),
    });
    const items: ActionMenuItem[] = [];
    if (ops.retry) items.push(item("retry", t.items.retry, { kind: "retry", payment, refund }));
    if (ops.close) {
      items.push(
        item("close", t.items.close, { kind: "close", manualPayout: false, payment, refund }),
      );
      if (stillPaid.has(refund.id)) {
        items.push(
          item("payout", t.items.payout, { kind: "close", manualPayout: true, payment, refund }),
        );
      }
    }
    if (ops.resolve) {
      items.push(
        item("succeeded", t.items.succeeded, {
          kind: "resolve",
          state: "succeeded",
          payment,
          refund,
        }),
        item("failed", t.items.failed, { kind: "resolve", state: "failed", payment, refund }),
      );
    }
    return items;
  });
}

/**
 * The newest refund: its state, the §5.1 line of a manual one (by
 * `manual_reason` and provider) with why a Click refund is paid by hand
 * (`Refund.manual_reason`, M3), and the amount.
 */
function RefundSummary({ refunds }: { refunds: ReadonlyArray<Refund> }) {
  const t = useCopy(paymentsCopy);
  const labels = useCopy(orderLabelsCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const newest = refunds[0];
  if (!newest) {
    return (
      <span className="text-ink-muted" aria-label={t.noRefund}>
        —
      </span>
    );
  }
  const note = manualRefundNote(newest, locale);
  return (
    <span className="flex max-w-[240px] flex-col items-start gap-1">
      <Badge tone={REFUND_TONE[newest.state]}>{labels.refundState[newest.state]}</Badge>
      {newest.state === "manual_required" && (
        <span className="text-[12px] leading-4 text-ink">{refundStateLine(newest, locale)}</span>
      )}
      {note && <span className="text-[12px] leading-4 text-ink-muted">{note}</span>}
      <span className="text-[12px] text-ink-muted tabular-nums">
        {fmt.som(newest.amount)}
        {refunds.length > 1 && ` · ${t.refundsTotal(refunds.length)}`}
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
 * Click still holds the money — or, M3, the payment has no Click payment id
 * so Click cannot be asked — the dialog moves on to "Qo‘lda to‘landi",
 * `manual_payout`, once staff paid the customer by hand, with the backend's
 * answer above it; Click's 503 keeps the dialog open with the
 * provider-unavailable message). Each operation is
 * confirmed in a dialog and sent with its own idempotency key (kept per
 * payment, refund and operation across retries, renewed after a success or
 * a 422 reuse). The answer is the updated payment row, shown at once; in api
 * mode the action also refreshes the route, so filters and counts follow.
 *
 * The payout step never inherits the "Yakunlash" press: after Click's 409
 * focus moves to Click's answer and "Qo‘lda to‘landi" stays disabled until
 * staff tick "Mijozga … qo‘lda to‘ladim" (the step logic is the pure
 * `./refund-dialog`).
 */
export function PaymentsTable({ payments, sortHref, sortedAscending }: PaymentsTableProps) {
  const t = useCopy(paymentsCopy);
  const labels = useCopy(orderLabelsCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const toast = useToast();
  const router = useRouter();
  const [updated, setUpdated] = useState<ReadonlyMap<number, PaymentRecord>>(new Map());
  const [source, setSource] = useState(payments);
  const [dialog, dispatch] = useReducer(dialogReducer, CLOSED_DIALOG);
  const operation = dialog.op;
  const notice = dialog.notice;
  /** Failed Click refunds Click still reports paid: the menu offers the payout step. */
  const [stillPaid, setStillPaid] = useState<ReadonlySet<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const keys = useRef(new Map<string, string>());
  const submitting = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
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

  // Entering the payout step after Click's answer moves focus off the
  // primary button to that answer, so a repeated Enter or click cannot land
  // on "Qo‘lda to‘landi".
  useEffect(() => {
    if (dialog.noticeFocus > 0) noticeRef.current?.focus();
  }, [dialog.noticeFocus]);

  const confirm = () => {
    const op = operation;
    if (!op || submitting.current || !canSubmit(dialog, pending)) return;
    submitting.current = true;
    const key = keyFor(op);
    dispatch({ type: "submit" });
    startTransition(async () => {
      const result = await runAction((csrf) =>
        op.kind === "retry"
          ? retryRefund(op.payment.id, op.refund.id, key, csrf)
          : op.kind === "close"
            ? closeFailedRefund(op.payment.id, op.refund.id, op.manualPayout, key, csrf)
            : resolveRefund(op.payment.id, op.refund.id, op.state, key, csrf),
      );
      submitting.current = false;
      for (const id of keysToDrop(op, result)) keys.current.delete(id);
      const outcome = nextStep(op, result, t);
      dispatch({ type: "settle", op, outcome });
      switch (outcome.type) {
        case "payout":
          // Click still holds the money (409): the dialog shows the payout
          // step with Click's answer, and the row menu offers it from now on.
          setStillPaid((current) => new Set(current).add(op.refund.id));
          return;
        case "stale":
          // The row changed under us (404, 409 other than the busy order):
          // re-read the board so the menu follows the server.
          toast({ tone: "warning", title: t.toast.failed, description: outcome.message });
          startTransition(() => router.refresh());
          return;
        case "retryable":
          return;
        case "done":
          setUpdated((current) => new Map(current).set(outcome.payment.id, outcome.payment));
          setStillPaid((current) => {
            const next = new Set(current);
            next.delete(op.refund.id);
            return next;
          });
          toast({ tone: "success", ...successToast(op, t) });
      }
    });
  };

  const openOperation = (op: RefundOperation) => {
    setReturnTo(op.payment.id);
    dispatch({ type: "open", op });
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
  const copy = operation ? dialogCopy(operation, t, fmt) : null;
  const submittable = canSubmit(dialog, pending);
  const confirmReason =
    !pending && operation && !submittable && isPayout(operation) ? t.dialog.tickFirst : null;

  return (
    <>
      <ScrollRegion
        ref={region}
        label={t.tableLabel}
        className="transition-opacity duration-150 group-data-[pending]:opacity-60"
      >
        <table className="data-table min-w-[1120px]">
          <thead className="uppercase">
            <tr>
              <th scope="col">{t.columns.id}</th>
              <th scope="col">{t.columns.order}</th>
              <th scope="col">{t.columns.customer}</th>
              <th scope="col">{t.columns.provider}</th>
              <th scope="col" className="!text-right">
                {t.columns.amount}
              </th>
              <th scope="col">{t.columns.status}</th>
              <th scope="col" aria-sort={sortedAscending ? "ascending" : "descending"}>
                <Link
                  href={sortHref}
                  scroll={false}
                  className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
                >
                  {t.columns.created}
                  <Icon name={sortedAscending ? "chevron-up" : "chevron-down"} size={14} />
                  <span className="sr-only">
                    , {sortedAscending ? t.sortAscending : t.sortDescending}
                  </span>
                </Link>
              </th>
              <th scope="col">{t.columns.refund}</th>
              <th scope="col">
                <span className="sr-only">{t.columns.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payment) => {
              const items = rowItems(payment, openOperation, pending, stillPaid, t, fmt, locale);
              const customerName =
                payment.customer.name === DELETED_CUSTOMER_LABEL
                  ? labels.deletedCustomer
                  : payment.customer.name;
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
                      <span className="max-w-[220px] truncate font-semibold" title={customerName}>
                        {customerName}
                      </span>
                      <span className="text-[12px] text-ink-muted tabular-nums">
                        {fmt.phone(payment.customer.phone)}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span>{PROVIDER_LABEL[payment.provider]}</span>
                      {payment.transactionId && (
                        <span className="max-w-[200px] font-mono text-[11px] break-all text-ink-muted">
                          {payment.transactionId}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="text-right font-bold tabular-nums">
                    {fmt.number(payment.amount)}
                  </td>
                  <td>
                    <Badge tone={PAYMENT_STATUS_META[payment.status].tone}>
                      {labels.paymentStatus[payment.status]}
                    </Badge>
                  </td>
                  <td className="text-ink-muted tabular-nums">
                    <time dateTime={payment.createdAt}>{fmt.dateTimeShort(payment.createdAt)}</time>
                  </td>
                  <td>
                    <RefundSummary refunds={payment.refunds} />
                  </td>
                  <td>
                    {items.length > 0 ? (
                      <ActionMenu
                        label={t.menuLabel(payment.orderId)}
                        items={items}
                        triggerClassName="flex size-9 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-gold-soft data-[state=open]:bg-gold-soft"
                        trigger={
                          <>
                            <Icon name="sliders" size={18} />
                            <span className="sr-only">{t.menuLabel(payment.orderId)}</span>
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
          dispatch({ type: "close" });
        }}
        onCloseAutoFocus={restoreFocus}
        title={copy?.title ?? ""}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{copy?.body}</p>}
      >
        {notice && (
          <p
            ref={noticeRef}
            role="alert"
            tabIndex={-1}
            className={cn(
              "m-0 flex items-start gap-1.5 text-body-sm leading-5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
              notice.tone === "error" ? "font-semibold" : "rounded-md bg-warning-soft px-3 py-2",
            )}
          >
            {notice.tone === "error" && (
              <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0 text-danger" />
            )}
            {notice.text}
          </p>
        )}
        {operation && isPayout(operation) && (
          <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
            <input
              type="checkbox"
              checked={dialog.payoutConfirmed}
              onChange={(event) => {
                // While the payout is being sent the attestation stays as it is.
                if (!pending) dispatch({ type: "confirmPayout", checked: event.target.checked });
              }}
              aria-disabled={pending || undefined}
              className="mt-0.5 size-4 shrink-0 accent-gold-ink"
            />
            {t.dialog.paidByHand(fmt.som(operation.refund.amount))}
          </label>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabledReason={pending && t.dialog.busyReason}>
              {t.dialog.back}
            </Button>
          </AlertDialogCancel>
          <Button
            variant={
              operation?.kind === "resolve" && operation.state === "failed"
                ? "destructive"
                : "primary"
            }
            onClick={confirm}
            busy={pending}
            disabledReason={confirmReason}
          >
            {pending
              ? operation?.kind === "close"
                ? t.dialog.checkingClick
                : t.dialog.sending
              : copy?.confirm}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
