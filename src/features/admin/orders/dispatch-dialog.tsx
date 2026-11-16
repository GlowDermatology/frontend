"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { AffixInput, Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { loadOpenIssue } from "@/data/delivery-issues.actions";
import { dispatchOrder } from "@/data/orders.actions";
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
import { formatSom } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { dispatchRefusal, rememberMethodRefusal } from "./carrier-refusals";
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
  return value === null ? (
    <span className="text-ink-muted">—</span>
  ) : (
    <span className="tabular-nums">{formatSom(value)}</span>
  );
}

function ReviewSummary({ review }: { review: DispatchReview }) {
  return (
    <>
      <p className="m-0 text-body-sm text-ink">{reviewReasonLabel(review.code)}</p>
      <dl className="m-0 flex flex-col gap-1.5">
        <DetailRow label="Mijoz to‘lagan" className="leading-5">
          <Amount value={review.paidFee} />
        </DetailRow>
        <DetailRow label="Checkout taxmini" className="leading-5">
          <Amount value={review.estimatePrice} />
        </DetailRow>
        <DetailRow label="Yandex taklifi" className="leading-5">
          <span className="font-bold">
            <Amount value={review.offerPrice} />
          </span>
        </DetailRow>
        {review.increase !== null && (
          <DetailRow label="Taxmindan oshishi" className="leading-5">
            <Amount value={review.increase} />
          </DetailRow>
        )}
        {review.loss !== null && (
          <DetailRow label="Zarar" className="leading-5">
            <Amount value={review.loss} />
          </DetailRow>
        )}
        {review.approvedPrice !== null && (
          <DetailRow label="Avval tasdiqlangan" className="leading-5">
            <Amount value={review.approvedPrice} />
          </DetailRow>
        )}
      </dl>
      {review.warnings.length > 0 && (
        <p className="m-0 text-[12px] leading-[18px] text-ink">
          Yandex ogohlantirishlari:{" "}
          {review.warnings.map((code, index) => (
            <span key={code}>
              {index > 0 ? ", " : ""}
              <code>{code}</code>
            </span>
          ))}
        </p>
      )}
      <p className="m-0 text-[12px] leading-[18px] text-ink-muted">
        Narxlarni server hisoblagan. Mijoz to‘lagan narx o‘zgarmaydi; tasdiqlasangiz, yangi
        chaqiruvda shu narxgacha bo‘lgan taklif qabul qilinadi.
      </p>
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
  const delivery = order.delivery;
  const current: DeliveryMethod | null = delivery?.method ?? null;
  const offer = dispatchOffer(order);
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
  const weightInput = useRef<HTMLInputElement>(null);
  const contentsInput = useRef<HTMLInputElement>(null);
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
    const parsed = parseParcelWeight(weight);
    const nextErrors = {
      contents: contents ? undefined : "Jo‘natma tarkibini tekshirganingizni tasdiqlang.",
      weight: parsed.ok ? undefined : parsed.message,
    };
    if (nextErrors.contents || nextErrors.weight) {
      setErrors(nextErrors);
      (nextErrors.contents ? contentsInput : weightInput).current?.focus();
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
    const refusal = dispatchRefusal(result);
    switch (refusal.kind) {
      case "field":
        setErrors({ [refusal.field === "contents" ? "contents" : "weight"]: refusal.message });
        (refusal.field === "contents" ? contentsInput : weightInput).current?.focus();
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
    ? "Yuborilmoqda…"
    : switched
      ? `Yandex ${DELIVERY_METHOD_LABEL[chosen!]} bilan chaqirish`
      : approving
        ? `Taklifni tasdiqlash · ${formatSom(approvable!)}`
        : reviewRef
          ? "Qayta chaqirish"
          : "Kuryer chaqirish";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={`Buyurtma №${order.id}: kuryer chaqirish`}
      description={`${carrierLabel(order)} kuryeri chaqiriladi. Yandex taklifi chegaradan oshsa, kuryer chaqirilmaydi va narx sizga tasdiqlash uchun qaytadi.`}
      className="max-w-[540px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {reviewRef && (
          <section
            aria-labelledby="dispatch-review-title"
            className="flex flex-col gap-2 rounded-md bg-warning-soft px-3.5 py-3"
          >
            <h3 id="dispatch-review-title" className="m-0 text-body-sm font-bold text-ink">
              Narxni tasdiqlash kerak
            </h3>
            {reviewLoading ? (
              <p className="m-0 text-body-sm text-ink-muted" aria-live="polite">
                Taklif ma’lumotlari yuklanmoqda…
              </p>
            ) : review ? (
              <ReviewSummary review={review} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 text-body-sm text-ink">
                  {reviewState?.failed
                    ? "Taklif ma’lumotlarini yuklab bo‘lmadi."
                    : "Ko‘rib chiqiladigan taklif topilmadi."}
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
                    Qayta yuklash
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
            <input
              ref={contentsInput}
              type="checkbox"
              checked={contents}
              onChange={(event) => setContents(event.target.checked)}
              aria-invalid={errors.contents ? true : undefined}
              aria-describedby={errors.contents ? "dispatch-contents-error" : undefined}
              required
              className="mt-0.5 size-4 shrink-0 accent-gold-ink"
            />
            <span className="flex flex-col gap-0.5">
              Jo‘natma tarkibini tekshirdim (majburiy)
              <span className="text-caption font-normal text-ink-muted">
                Mahsulotlar buyurtmaga mos, qadoq butun va yopilgan.
              </span>
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

        <Field
          label="Jo‘natma og‘irligi (majburiy)"
          hint="Tarozida tortilgan og‘irlik, 1 dan 20 000 g gacha."
          error={errors.weight}
        >
          {(control) => (
            <AffixInput
              {...control}
              ref={weightInput}
              suffix="g"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-required="true"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Masalan: 650"
              className="max-w-[220px]"
            />
          )}
        </Field>

        {methods && (
          <div className="flex flex-col gap-2">
            <span aria-hidden="true" className="text-label text-ink">
              Yetkazish usuli
            </span>
            <SegmentedControl<DeliveryMethod>
              label="Yetkazish usuli"
              options={methods.map((value) => ({
                value,
                label: `Yandex ${DELIVERY_METHOD_LABEL[value]}${value === current ? " (joriy)" : ""}`,
              }))}
              value={chosen ?? methods[0]!}
              onChange={setMethod}
              className="self-start"
            />
            <p className="m-0 text-[12px] leading-[18px] text-ink-muted">
              Mijoz to‘lagan yetkazish narxi usul o‘zgarsa ham o‘zgarmaydi.
            </p>
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
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
              disabled={pending}
              onClick={() => {
                reset();
                onCancelOrder();
              }}
            >
              Buyurtmani bekor qilish
            </Button>
          )}
          <DialogClose disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </DialogClose>
          <Button type="submit" disabled={pending || reviewLoading} aria-busy={pending}>
            <Icon name="truck" size={18} />
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
