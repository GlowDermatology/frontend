"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { confirmOrderReturn } from "@/data/orders.actions";
import type { Order } from "@/domain/order";
import { RETURN_NOTE_MAX } from "@/domain/order-dispatch";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { confirmReturnRefusal } from "./carrier-refusals";

interface ConfirmReturnDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (order: Order) => void;
  /** 409 `invalid_transition` / `conflict`, 404: toast, close, re-read. */
  onStale: (title: string, message: string) => void;
}

/**
 * "Qaytganini tasdiqlash" (`POST orders/{id}/confirm-return/`, plan §3.8):
 * the returning / returned Yandex parcel is physically back. The optional
 * note (≤ 1000) becomes the resolution note of the `return_pending` issue.
 * The order status does not change: an open order can be dispatched again
 * or cancelled, a cancelled one stays cancelled.
 */
export function ConfirmReturnDialog({
  order,
  open,
  onOpenChange,
  onConfirmed,
  onStale,
}: ConfirmReturnDialogProps) {
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const idempotency = useIdempotencyKey();

  const reset = () => {
    setNote("");
    setFieldError(null);
    setFormError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (note.trim().length > RETURN_NOTE_MAX) {
      setFieldError(`${RETURN_NOTE_MAX} belgidan oshmasin.`);
      textarea.current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setFieldError(null);
    setFormError(null);
    const orderId = order.id;
    const result = idempotency.settle(
      await runAction((csrf) => confirmOrderReturn(orderId, note.trim(), idempotency.key, csrf)),
    );
    busy.current = false;
    setPending(false);
    if (result.ok) {
      reset();
      onConfirmed(result.data);
      return;
    }
    const refusal = confirmReturnRefusal(result);
    if (refusal.kind === "field") {
      setFieldError(refusal.message);
      textarea.current?.focus();
    } else if (refusal.kind === "stale") {
      reset();
      onStale(refusal.title, refusal.message);
    } else {
      setFormError(refusal.message);
    }
  };

  const cancelled = order.status === "cancelled";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={`Buyurtma №${order.id}: posilka qaytganini tasdiqlash`}
      description={
        cancelled
          ? "Posilka omborga qaytib kelganini tekshiring. «Qaytish kutilmoqda» muammosi yopiladi; buyurtma bekor qilinganicha qoladi."
          : "Posilka omborga qaytib kelganini tekshiring. «Qaytish kutilmoqda» muammosi yopiladi; buyurtma holati o‘zgarmaydi — keyin kuryerni qayta chaqiring yoki buyurtmani bekor qiling."
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Field
          label="Izoh (ixtiyoriy)"
          error={fieldError ?? undefined}
          aside={
            <span className="text-caption text-ink-muted tabular-nums">
              {note.trim().length}/{RETURN_NOTE_MAX}
            </span>
          }
        >
          {(control) => (
            <TextArea
              {...control}
              ref={textarea}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={RETURN_NOTE_MAX + 50}
              placeholder="Masalan: qadoq butun, mahsulotlar joyida"
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
          <DialogClose disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </DialogClose>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Saqlanmoqda…" : "Qaytganini tasdiqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
