"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { AffixInput, Field } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { loadOpenIssue } from "@/data/delivery-issues.actions";
import { dispatchOrder } from "@/data/orders.actions";
import { orderDataCopy, orderLabelsCopy } from "@/domain/copy/orders";
import {
  carrierLabel,
  DELIVERY_METHOD_LABEL,
  type DeliveryMethod,
  type Order,
} from "@/domain/order";
import {
  approvableOffer,
  dispatchInput,
  dispatchReviewOf,
  initialWeightText,
  methodChoice,
  parseParcelWeight,
  reviewReasonLabel,
  type DispatchInput,
  type DispatchReview,
} from "@/domain/order-dispatch";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { dispatchRefusal, rememberMethodRefusal } from "./carrier-refusals";
import { ordersCopy } from "./copy";
import { dispatchOffer } from "./delivery-view";

interface DispatchDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 202 (or the demo's answer): the page shows it and starts the status poll. */
  onDispatched: (order: Order, sent: DispatchInput) => void;
  /** The order changed (409 `invalid_transition` / `conflict`, 404): toast, close, re-read. */
  onStale: (title: string, message: string) => void;
  /** A warehouse-calendar refusal: the page re-reads the order (the dialog keeps the message). */
  onReload: () => void;
  /** "Buyurtmani bekor qilish" from a price review: the page opens its cancel dialog. */
  onCancelOrder: () => void;
}

type ReviewLoad = { issueId: number; review: DispatchReview | null; failed: boolean };

/** A server amount (never computed here), or a dash. */
function Amount({ value }: { value: number | null }) {
  const fmt = useFormat();
  return value === null ? (
    <span className="text-ink-muted">—</span>
  ) : (
    <span className="tabular-nums">{fmt.som(value)}</span>
  );
}

function ReviewSummary({ review }: { review: DispatchReview }) {
  const t = useCopy(ordersCopy).dispatch;
  const fmt = useFormat();
  return (
    <>
      <p className="m-0 text-body-sm text-ink">{reviewReasonLabel(review.code, fmt.locale)}</p>
      <dl className="m-0 flex flex-col gap-1.5">
        <DetailRow label={t.paidFee} className="leading-5">
          <Amount value={review.paidFee} />
        </DetailRow>
        <DetailRow label={t.estimate} className="leading-5">
          <Amount value={review.estimatePrice} />
        </DetailRow>
        <DetailRow label={t.offer} className="leading-5">
          <span className="font-bold">
            <Amount value={review.offerPrice} />
          </span>
        </DetailRow>
        {review.increase !== null && (
          <DetailRow label={t.increase} className="leading-5">
            <Amount value={review.increase} />
          </DetailRow>
        )}
        {review.loss !== null && (
          <DetailRow label={t.loss} className="leading-5">
            <Amount value={review.loss} />
          </DetailRow>
        )}
        {review.approvedPrice !== null && (
          <DetailRow label={t.approvedBefore} className="leading-5">
            <Amount value={review.approvedPrice} />
          </DetailRow>
        )}
      </dl>
      {review.warnings.length > 0 && (
        <p className="m-0 text-[12px] leading-[18px] break-words text-ink">
          {t.warnings}{" "}
          {review.warnings.map((code, index) => (
            <span key={`${code}-${index}`}>
              {index > 0 ? ", " : ""}
              <code>{code}</code>
            </span>
          ))}
        </p>
      )}
      <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{t.reviewNote}</p>
    </>
  );
}

/**
 * "Kuryer chaqirish" (`POST orders/{id}/dispatch/`, plan §3.6): staff confirm
 * they checked the contents and enter the parcel's weight (grams; the
 * server's earlier weight is prefilled). While a `dispatch_review` is open
 * the dialog shows its amounts (fee paid, estimate, offer, the exceeded
 * limit) and lets staff approve that offer (`approved_price`), switch the
 * method, or cancel the order. A method switch is offered only when the
 * server points to one (`methodChoice`). One idempotency key per dialog
 * instance, renewed after a success; a ref guards the submit.
 */
export function DispatchDialog({
  order,
  open,
  onOpenChange,
  onDispatched,
  onStale,
  onReload,
  onCancelOrder,
}: DispatchDialogProps) {
  const t = useCopy(ordersCopy).dispatch;
  const labels = useCopy(orderLabelsCopy);
  const data = useCopy(orderDataCopy);
  const fmt = useFormat();
  const delivery = order.delivery;
  const current: DeliveryMethod | null = delivery?.method ?? null;
  const offer = dispatchOffer(order, fmt.locale);
  const reviewRef = offer?.review ?? null;

  const [contents, setContents] = useState(false);
  const [weight, setWeight] = useState(() => initialWeightText(order));
  const [method, setMethod] = useState<DeliveryMethod | null>(current);
  const [refused, setRefused] = useState<{ disabled: DeliveryMethod[]; tooHeavy: boolean }>({
    disabled: [],
    tooHeavy: false,
  });
  const [errors, setErrors] = useState<{ contents?: string; weight?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState<ReviewLoad | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Each opening starts from the order as it is now (its weight may have come with a poll).
  const [openedWith, setOpenedWith] = useState(open);
  if (open !== openedWith) {
    setOpenedWith(open);
    if (open) {
      setContents(false);
      setWeight(initialWeightText(order));
      setMethod(current);
      setRefused({ disabled: [], tooHeavy: false });
      setErrors({});
      setFormError(null);
      setLoaded(null);
    }
  }
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();

  const orderId = order.id;
  const reviewId = reviewRef?.id ?? null;
  useEffect(() => {
    if (!open || reviewId === null) return;
    let live = true;
    void runAction((csrf) => loadOpenIssue(orderId, "dispatch_review", csrf)).then((result) => {
      if (!live) return;
      setLoaded({
        issueId: reviewId,
        review: result.ok ? dispatchReviewOf(result.data) : null,
        failed: !result.ok,
      });
    });
    return () => {
      live = false;
    };
  }, [open, orderId, reviewId, reloadToken]);

  const reviewState = reviewId !== null && loaded?.issueId === reviewId ? loaded : null;
  const reviewLoading = reviewId !== null && reviewState === null;
  const review = reviewState?.review ?? null;
  const approvable = approvableOffer(review);

  const methods = methodChoice({
    current,
    review: reviewRef !== null,
    tooHeavy: refused.tooHeavy,
    disabled: refused.disabled,
  });
  const chosen = methods && method && methods.includes(method) ? method : current;
  const switched = chosen !== null && chosen !== current;
  const approving = !switched && approvable !== null;

  const reset = () => {
    setContents(false);
    setWeight(initialWeightText(order));
    setMethod(current);
    setRefused({ disabled: [], tooHeavy: false });
    setErrors({});
    setFormError(null);
    setLoaded(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const parsed = parseParcelWeight(weight, fmt.locale);
    const nextErrors = {
      contents: contents ? undefined : data.confirmContents,
      weight: parsed.ok ? undefined : parsed.message,
    };
    if (nextErrors.contents || nextErrors.weight) {
      setErrors(nextErrors);
      reveal();
      return;
    }
    if (!parsed.ok) return;
    const input = dispatchInput({
      weightG: parsed.grams,
      current,
      method: chosen,
      approve: approving ? approvable : null,
    });
    busy.current = true;
    setPending(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => dispatchOrder(orderId, input, idempotency.key, csrf)),
    );
    busy.current = false;
    setPending(false);
    if (result.ok) {
      reset();
      onDispatched(result.data, input);
      return;
    }
    const refusal = dispatchRefusal(result, fmt.locale);
    switch (refusal.kind) {
      case "field":
        setErrors({ [refusal.field === "contents" ? "contents" : "weight"]: refusal.message });
        reveal();
        return;
      case "stale":
        reset();
        onStale(refusal.title, refusal.message);
        return;
      case "blocked":
        setFormError(refusal.message);
        setRefused((state) => rememberMethodRefusal(state, refusal.code, input.method ?? null));
        if (refusal.code === "method_disabled") setMethod(current);
        if (refusal.reload) onReload();
        return;
      case "retry":
        setFormError(refusal.message);
    }
  };

  const submitLabel = pending
    ? t.sending
    : switched
      ? t.callWith(DELIVERY_METHOD_LABEL[chosen!])
      : approving
        ? t.approve(fmt.som(approvable!))
        : reviewRef
          ? t.recall
          : t.call;

  const summary = [
    errors.contents ? { name: "contents", label: t.contentsShort, message: errors.contents } : null,
    errors.weight ? { name: "weight", label: t.weightShort, message: errors.weight } : null,
  ].filter((item) => item !== null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t.title(order.id)}
      description={t.description(carrierLabel(order, fmt.locale))}
      className="max-w-[540px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {summary.length > 1 && (
          <FormErrorSummary
            errors={summary}
            onSelect={(name) => void revealFirstError(formRef.current, { name })}
          />
        )}
        {reviewRef && (
          <section
            aria-labelledby="dispatch-review-title"
            className="flex flex-col gap-2 rounded-md bg-warning-soft px-3.5 py-3"
          >
            <h3 id="dispatch-review-title" className="m-0 text-body-sm font-bold text-ink">
              {t.review}
            </h3>
            {reviewLoading ? (
              <p className="m-0 text-body-sm text-ink-muted" aria-live="polite">
                {t.reviewLoading}
              </p>
            ) : review ? (
              <ReviewSummary review={review} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 text-body-sm text-ink">
                  {reviewState?.failed ? t.reviewFailed : t.reviewMissing}
                </p>
                {reviewState?.failed && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setLoaded(null);
                      setReloadToken((n) => n + 1);
                    }}
                  >
                    <Icon name="refresh" size={14} />
                    {t.reload}
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col gap-1.5" data-field="contents">
          <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
            <input
              type="checkbox"
              name="contents"
              checked={contents}
              onChange={(event) => {
                setContents(event.target.checked);
                if (event.target.checked) setErrors((e) => ({ ...e, contents: undefined }));
              }}
              aria-invalid={errors.contents ? true : undefined}
              aria-describedby={errors.contents ? "dispatch-contents-error" : undefined}
              required
              className="mt-0.5 size-4 shrink-0 accent-gold-ink"
            />
            <span className="flex flex-col gap-0.5">
              {t.contents}
              <span className="text-caption font-normal text-ink-muted">{t.contentsHint}</span>
            </span>
          </label>
          {errors.contents && (
            <p
              id="dispatch-contents-error"
              className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {errors.contents}
            </p>
          )}
        </div>

        <div data-field="weight">
          <Field label={t.weight} hint={t.weightHint} error={errors.weight}>
            {(control) => (
              <AffixInput
                {...control}
                name="weight"
                suffix={labels.grams("").trim()}
                inputMode="numeric"
                autoComplete="off"
                required
                aria-required="true"
                value={weight}
                maxLength={12}
                onChange={(event) => setWeight(event.target.value)}
                placeholder={t.weightPlaceholder}
                className="max-w-[220px]"
              />
            )}
          </Field>
        </div>

        {methods && (
          <div className="flex flex-col gap-2">
            <span aria-hidden="true" className="text-label text-ink">
              {t.method}
            </span>
            <SegmentedControl<DeliveryMethod>
              label={t.method}
              options={methods.map((value) => ({
                value,
                label: `Yandex ${DELIVERY_METHOD_LABEL[value]}${value === current ? t.current : ""}`,
              }))}
              value={chosen ?? methods[0]!}
              onChange={setMethod}
              className="self-start"
            />
            <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{t.methodNote}</p>
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
          {reviewRef && (
            <Button
              type="button"
              variant="danger"
              className="mr-auto"
              disabledReason={pending && t.busyReason}
              onClick={() => {
                reset();
                onCancelOrder();
              }}
            >
              {t.cancelOrder}
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline" disabledReason={pending && t.busyReason}>
              {t.back}
            </Button>
          </DialogClose>
          <Button
            type="submit"
            busy={pending}
            disabledReason={!pending && reviewLoading && t.loadingReason}
          >
            <Icon name="truck" size={18} />
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
