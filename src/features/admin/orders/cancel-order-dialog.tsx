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
import type { Order } from "@/domain/order";
import { formatSom } from "@/lib/format";

import { PROVIDER_LABEL } from "../shared/status";

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Kamida 3 ta belgi kiriting.")
    .max(500, "500 belgidan oshmasin."),
});

type FormValues = z.infer<typeof schema>;

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
  if (order.shipment.state === "created") {
    effects.push(`BTS buyurtmasi ${order.shipment.trackingNumber} bekor qilish uchun yuboriladi.`);
  }
  return effects;
}

interface CancelOrderDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: (order: Order) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
  onCancelled,
  onCloseAutoFocus,
}: CancelOrderDialogProps) {
  // See ProductEditor: React Hook Form must re-run `register` after `reset()`.
  "use no memo";
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });

  const onSubmit = handleSubmit(async ({ reason }) => {
    setFormError(null);
    const result = await cancelOrder(order, reason);
    if (!result.ok) {
      if (result.fieldErrors?.reason) {
        setError("reason", { message: result.fieldErrors.reason }, { shouldFocus: true });
      } else {
        setFormError(result.error);
      }
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
