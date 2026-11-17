"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { cancelOrder } from "@/data/orders.actions";
import { isYandexDelivery, type Order, type ShipmentStage } from "@/domain/order";
import { createFormatter } from "@/lib/format";
import { useRhfReveal } from "@/lib/forms/rhf";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { PROVIDER_LABEL } from "../shared/status";
import { cancelOutcome, type CancelOutcome } from "./carrier-refusals";
import { ordersCopy } from "./copy";

/** The backend's rule for the cancel reason (3..500 after trimming), in the admin language. */
const cancelSchemas = localized(validationCopy, (m) =>
  z.object({ reason: z.string().trim().min(3, m.minChars(3)).max(500, m.maxChars(500)) }),
);

type FormValues = { reason: string };

/** Yandex's fee rule, stated (never computed): plan §3.8, fees undocumented by Yandex. */
export const YANDEX_CANCEL_FEE_NOTE = ordersCopy.uz.cancel.yandexFee;

const CLAIM_BEFORE_PICKUP: ReadonlyArray<ShipmentStage> = [
  "courier_requested",
  "courier_assigned",
  "courier_arrived",
];
const WITH_COURIER: ReadonlyArray<ShipmentStage> = ["in_transit", "at_destination"];

/**
 * The carrier lines of a Yandex order's cancel (plan §3.8 matrix), by stage:
 * an open claim before pickup is cancelled at Yandex (a fee is possible once
 * a courier is assigned); a parcel with the courier is asked back first and
 * the order stays open until Yandex confirms; a returning or returned parcel
 * needs no call.
 */
function yandexCancelLines(stage: ShipmentStage | null, locale: Locale): string[] {
  const t = ordersCopy[locale].cancel;
  if (stage !== null && CLAIM_BEFORE_PICKUP.includes(stage)) return [t.yandexClaim, t.yandexFee];
  if (stage !== null && WITH_COURIER.includes(stage)) {
    return [t.yandexWithCourier, t.yandexReturnFee];
  }
  if (stage === "returning") return [t.yandexReturning];
  if (stage === "returned") return [t.yandexReturned];
  return [];
}

/** What cancelling this order will do, computed from its money and shipment state. */
export function cancellationEffects(order: Order, locale: Locale = "uz"): string[] {
  const t = ordersCopy[locale].cancel;
  const fmt = createFormatter(locale);
  const effects: string[] = [];
  if (order.payment.status === "paid") {
    effects.push(t.refund(fmt.som(order.total), PROVIDER_LABEL[order.payment.provider]));
  }
  if (order.status === "awaiting_payment") effects.push(t.reservation);
  for (const entry of order.cashback) {
    if (entry.kind === "debit") effects.push(t.cashbackBack(fmt.som(-entry.amount)));
    else if (entry.kind === "credit") effects.push(t.cashbackReverse(fmt.som(entry.amount)));
  }
  if (isYandexDelivery(order)) {
    // A Yandex order's tracking number is the courier claim's id: not a number to show here.
    effects.push(...yandexCancelLines(order.delivery?.stage ?? null, locale));
  } else if (order.shipment.state === "created") {
    effects.push(t.bts(order.shipment.trackingNumber));
  }
  return effects;
}

interface CancelOrderDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: (order: Order) => void;
  /**
   * A refusal from the server (`cancelOutcome`): 409 `not_cancellable` incl.
   * the BTS text and the Yandex cases, 409 `return_requested` (Yandex asked
   * to bring the parcel back; the order stays open), the busy-order or
   * carrier `conflict`, 503 `provider_unavailable`, …: the view toasts it and
   * closes the dialog and re-reads the order unless it is a `retry`.
   */
  onRefused: (outcome: CancelOutcome) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
  onCancelled,
  onRefused,
  onCloseAutoFocus,
}: CancelOrderDialogProps) {
  // See ProductEditor: React Hook Form must re-run `register` after `reset()`.
  "use no memo";
  const locale = useAdminLocale();
  const t = useCopy(ordersCopy).cancel;
  const schema = useLocalized(cancelSchemas);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // One key per dialog instance: reused on retries and re-opens, renewed on success.
  const idempotency = useIdempotencyKey();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
    shouldFocusError: false,
  });
  const errorsUi = useRhfReveal<FormValues>({
    formRef,
    labels: { reason: t.reasonShort },
    errors,
    toast: false,
  });

  const onSubmit = handleSubmit(async ({ reason }) => {
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => cancelOrder(order.id, reason, idempotency.key, csrf)),
    );
    if (!result.ok) {
      if (result.fieldErrors?.reason) {
        setError("reason", { type: "server", message: result.fieldErrors.reason });
        errorsUi.onInvalid({ reason: { type: "server", message: result.fieldErrors.reason } });
        return;
      }
      const outcome = cancelOutcome(result, isYandexDelivery(order), locale);
      if (outcome.kind === "retry") {
        // Transient: kept next to the button too, for a retry with the same key.
        setFormError(outcome.message);
      } else {
        // Cancelled no more, or a return was asked first: the view closes the dialog.
        reset();
        setFormError(null);
      }
      onRefused(outcome);
      return;
    }
    errorsUi.clear();
    reset();
    onCancelled(result.data);
  }, errorsUi.onInvalid);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      reset();
      errorsUi.clear();
      setFormError(null);
    }
    onOpenChange(next);
  };

  const effects = cancellationEffects(order, locale);

  return (
    <AlertDialog
      open={open}
      onOpenChange={handleOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={t.title(order.id)}
      description={
        effects.length > 0 ? (
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-[14px] leading-5 text-ink">
            {effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[14px] leading-5 text-ink">{t.noEffects}</p>
        )
      }
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {errorsUi.summary.length > 1 && (
          <FormErrorSummary errors={errorsUi.summary} onSelect={errorsUi.select} />
        )}
        <div data-field="reason">
          <Field label={t.reason} error={errors.reason?.message}>
            {(control) => (
              <TextArea
                {...control}
                {...register("reason")}
                rows={3}
                required
                aria-required="true"
                maxLength={550}
                placeholder={t.reasonPlaceholder}
                className="text-[14px] leading-5"
              />
            )}
          </Field>
        </div>
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabledReason={isSubmitting && t.busyReason}>
              {t.back}
            </Button>
          </AlertDialogCancel>
          <Button type="submit" variant="destructive" busy={isSubmitting}>
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </div>
      </form>
    </AlertDialog>
  );
}
