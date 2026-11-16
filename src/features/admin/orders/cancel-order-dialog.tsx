"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cancelOrder } from "@/data/orders.actions";
import { isYandexDelivery, type Order, type ShipmentStage } from "@/domain/order";
import { formatSom } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { PROVIDER_LABEL } from "../shared/status";
import { cancelOutcome, type CancelOutcome } from "./carrier-refusals";

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Kamida 3 ta belgi kiriting.")
    .max(500, "500 belgidan oshmasin."),
});

type FormValues = z.infer<typeof schema>;

/** Yandex's fee rule, stated (never computed): plan §3.8, fees undocumented by Yandex. */
export const YANDEX_CANCEL_FEE_NOTE =
  "Kuryer biriktirilgan bo‘lsa, Yandex bekor qilish uchun haq olishi mumkin: summani Yandex belgilaydi, u yetkazish xarajatiga yoziladi.";

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
function yandexCancelLines(stage: ShipmentStage | null): string[] {
  if (stage !== null && CLAIM_BEFORE_PICKUP.includes(stage)) {
    return ["Yandex kuryer buyurtmasi bekor qilish uchun yuboriladi.", YANDEX_CANCEL_FEE_NOTE];
  }
  if (stage !== null && WITH_COURIER.includes(stage)) {
    return [
      "Posilka kuryerda: avval Yandexdan uni omborga qaytarish so‘raladi. Yandex qaytarishni tasdiqlaguncha buyurtma ochiq qoladi, so‘ng bekor qilishni qayta bosing.",
      "Qaytarish va bekor qilish uchun Yandex haq olishi mumkin: summani Yandex belgilaydi.",
    ];
  }
  if (stage === "returning") return ["Posilka omborga qaytmoqda: Yandexga so‘rov yuborilmaydi."];
  if (stage === "returned") return ["Posilka omborga qaytgan: Yandexga so‘rov yuborilmaydi."];
  return [];
}

/** What cancelling this order will do, computed from its money and shipment state. */
export function cancellationEffects(order: Order): string[] {
  const effects: string[] = [];
  if (order.payment.status === "paid") {
    effects.push(
      `${formatSom(order.total)} ${PROVIDER_LABEL[order.payment.provider]} orqali mijozga qaytariladi.`,
    );
  }
  if (order.status === "awaiting_payment") {
    effects.push("Band qilingan mahsulotlar omborga qaytariladi.");
  }
  for (const entry of order.cashback) {
    if (entry.kind === "debit") {
      effects.push(`Ishlatilgan ${formatSom(-entry.amount)} cashback balansga qaytadi.`);
    } else if (entry.kind === "credit") {
      effects.push(
        `Hisoblangan ${formatSom(entry.amount)} cashback qarama-qarshi yozuv bilan bekor qilinadi.`,
      );
    }
  }
  if (isYandexDelivery(order)) {
    // A Yandex order's tracking number is the courier claim's id: not a number to show here.
    effects.push(...yandexCancelLines(order.delivery?.stage ?? null));
  } else if (order.shipment.state === "created") {
    effects.push(`BTS buyurtmasi ${order.shipment.trackingNumber} bekor qilish uchun yuboriladi.`);
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
  const [formError, setFormError] = useState<string | null>(null);
  // One key per dialog instance: reused on retries and re-opens, renewed on success.
  const idempotency = useIdempotencyKey();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });

  const onSubmit = handleSubmit(async ({ reason }) => {
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => cancelOrder(order.id, reason, idempotency.key, csrf)),
    );
    if (!result.ok) {
      if (result.fieldErrors?.reason) {
        setError("reason", { message: result.fieldErrors.reason }, { shouldFocus: true });
        return;
      }
      const outcome = cancelOutcome(result, isYandexDelivery(order));
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
    reset();
    onCancelled(result.data);
  });

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      reset();
      setFormError(null);
    }
    onOpenChange(next);
  };

  const effects = cancellationEffects(order);

  return (
    <AlertDialog
      open={open}
      onOpenChange={handleOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={`Buyurtma №${order.id} ni bekor qilasizmi?`}
      description={
        effects.length > 0 ? (
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-[14px] leading-5 text-ink">
            {effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[14px] leading-5 text-ink">Buyurtma bekor qilinadi.</p>
        )
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Field label="Sabab (majburiy)" error={errors.reason?.message}>
          {(control) => (
            <TextArea
              {...control}
              {...register("reason")}
              rows={3}
              required
              aria-required="true"
              placeholder="Masalan: mijoz so‘rovi bilan"
              className="text-[14px] leading-5"
            />
          )}
        </Field>
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            disabled={isSubmitting}
            className={buttonStyles({ variant: "outline" })}
          >
            Orqaga
          </AlertDialogCancel>
          <Button
            type="submit"
            variant="destructive"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Bekor qilinmoqda…" : "Buyurtmani bekor qilish"}
          </Button>
        </div>
      </form>
    </AlertDialog>
  );
}
