"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { confirmOrderReturn } from "@/data/orders.actions";
import type { Order } from "@/domain/order";
import { RETURN_NOTE_MAX } from "@/domain/order-dispatch";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { confirmReturnRefusal } from "./carrier-refusals";
import { ordersCopy } from "./copy";

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
  const locale = useAdminLocale();
  const t = useCopy(ordersCopy).confirmReturn;
  const v = useCopy(validationCopy);
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
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
      setFieldError(v.maxChars(RETURN_NOTE_MAX));
      reveal();
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
    const refusal = confirmReturnRefusal(result, locale);
    if (refusal.kind === "field") {
      setFieldError(refusal.message);
      reveal();
    } else if (refusal.kind === "stale") {
      reset();
      onStale(refusal.title, refusal.message);
    } else {
      setFormError(refusal.message);
    }
  };

  const length = note.trim().length;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t.title(order.id)}
      description={order.status === "cancelled" ? t.descriptionCancelled : t.descriptionOpen}
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div data-field="note">
          <Field
            label={t.note}
            error={fieldError ?? undefined}
            aside={
              <span
                className={
                  length > RETURN_NOTE_MAX
                    ? "text-caption font-bold text-danger tabular-nums"
                    : "text-caption text-ink-muted tabular-nums"
                }
              >
                {length}/{RETURN_NOTE_MAX}
              </span>
            }
          >
            {(control) => (
              <TextArea
                {...control}
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={RETURN_NOTE_MAX + 50}
                placeholder={t.notePlaceholder}
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
          <DialogClose asChild>
            <Button type="button" variant="outline" disabledReason={pending && t.busyReason}>
              {t.back}
            </Button>
          </DialogClose>
          <Button type="submit" busy={pending}>
            {pending ? t.saving : t.submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
