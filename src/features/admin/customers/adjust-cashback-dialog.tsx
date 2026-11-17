"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, type FormEvent } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AffixInput, Field, TextArea } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { adjustCashback, type CashbackAdjustment } from "@/data/customers.actions";
import { customerDataCopy, type CustomerDataCopy } from "@/domain/copy/customers";
import { cn } from "@/lib/cn";
import { useRhfReveal } from "@/lib/forms/rhf";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { customersCopy } from "./copy";

/** The fields the dialog renders; any other field error becomes the toast message. */
const FIELDS = ["direction", "amount", "reason"] as const;

/** The largest single adjustment (contract §2.6; the Server Action checks the same). */
const AMOUNT_MAX = 10_000_000;

/** The dialog's rules in one admin language (pure, for tests). */
export function adjustmentSchema(m: CustomerDataCopy, locale: Locale) {
  const v = validationCopy[locale];
  return z.object({
    direction: z.enum(["add", "subtract"], { error: m.chooseDirection }),
    amount: z
      .number({ error: m.enterAmount })
      .int(m.enterAmount)
      .min(1, m.enterAmount)
      .max(AMOUNT_MAX, m.amountTooLarge),
    reason: z.string().trim().min(3, v.minChars(3)).max(300, v.maxChars(300)),
  });
}

type Values = z.infer<ReturnType<typeof adjustmentSchema>>;

const DEFAULTS: Values = { direction: "add", amount: Number.NaN, reason: "" };

interface AdjustCashbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  /** Current balance (the preview shows balance → balance ± amount). */
  balance: number;
  /** What can be subtracted: balance − active holds (contract §2.6 `available`). */
  available: number;
  onAdjusted: (adjustment: CashbackAdjustment) => void;
  onError?: (message: string) => void;
}

/**
 * The cashback adjustment (contract §2.6): add or subtract an amount with a
 * mandatory reason. Invalid fields are listed above the form, the first one
 * is scrolled to, focused and marked (`useRhfReveal`); the server's
 * `insufficient_balance` lands on the amount the same way.
 */
export function AdjustCashbackDialog({
  open,
  onOpenChange,
  customerId,
  balance,
  available,
  onAdjusted,
  onError,
}: AdjustCashbackDialogProps) {
  // React Hook Form must re-run `register` after `reset()` (see ProductEditor).
  "use no memo";
  const t = useCopy(customersCopy).adjust;
  const m = useCopy(customerDataCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const resolver = useMemo(() => zodResolver(adjustmentSchema(m, locale)), [m, locale]);
  // One key per dialog instance: reused on retries and re-opens, renewed
  // after a success or a 422 `idempotency_key_reused` (contract §1.7).
  const idempotency = useIdempotencyKey();
  // A double click or an Enter repeat lands before `isSubmitting` re-renders.
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver, defaultValues: DEFAULTS, shouldFocusError: false });
  const errorsUi = useRhfReveal<Values>({
    formRef,
    labels: { direction: t.direction, amount: t.amount, reason: t.reasonLabel },
    errors,
  });
  const direction = useWatch({ control, name: "direction" });
  const amount = useWatch({ control, name: "amount" });

  const signed = Number.isFinite(amount) ? (direction === "add" ? amount : -amount) : 0;
  const after = balance + signed;

  const showServerErrors = (fieldErrors: Record<string, string>) => {
    const tree: FieldErrors<Values> = {};
    for (const [path, message] of Object.entries(fieldErrors)) {
      setError(path as Path<Values>, { type: "server", message });
      tree[path as keyof Values] = { type: "server", message };
    }
    errorsUi.onInvalid(tree);
  };

  const submit = handleSubmit(async (values) => {
    if (values.direction === "subtract" && values.amount > available) {
      showServerErrors({ amount: m.subtractTooMuch });
      return;
    }
    const result = idempotency.settle(
      await runAction((csrf) => adjustCashback(customerId, values, idempotency.key, csrf)),
    );
    if (!result.ok) {
      // `insufficient_balance` arrives on `amount`; unknown fields go to the toast.
      const { fieldErrors, formError } = partitionFieldErrors(result, FIELDS);
      if (Object.keys(fieldErrors).length > 0) showServerErrors(fieldErrors);
      if (formError) onError?.(formError);
      return;
    }
    errorsUi.clear();
    reset(DEFAULTS);
    onAdjusted(result.data);
  }, errorsUi.onInvalid);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await submit(event);
    } finally {
      inFlight.current = false;
    }
  };

  const close = () => {
    reset(DEFAULTS);
    errorsUi.clear();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) {
          close();
          return;
        }
        onOpenChange(next);
      }}
      title={t.title}
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={errorsUi.summary} onSelect={errorsUi.select} />
        <Controller
          control={control}
          name="direction"
          render={({ field, fieldState }) => (
            <div
              className="flex flex-col gap-1.5"
              data-field="direction"
              data-invalid={fieldState.error ? "true" : undefined}
            >
              <SegmentedControl
                label={t.direction}
                layout="fill"
                size="lg"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "add", label: t.add },
                  { value: "subtract", label: t.subtract },
                ]}
              />
              {fieldState.error?.message && (
                <p role="alert" className="m-0 text-body-sm font-semibold text-danger">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field
              label={t.amount}
              name="amount"
              error={fieldState.error?.message}
              hint={direction === "subtract" ? t.available(fmt.som(available)) : undefined}
            >
              {(c) => (
                <AffixInput
                  {...c}
                  ref={field.ref}
                  name={field.name}
                  suffix={t.currency}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={Number.isFinite(field.value) ? fmt.number(field.value) : ""}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
                    field.onChange(digits ? Number(digits) : Number.NaN);
                  }}
                  onBlur={field.onBlur}
                />
              )}
            </Field>
          )}
        />
        <Field label={t.reason} name="reason" error={errors.reason?.message}>
          {(c) => (
            <TextArea
              {...c}
              {...register("reason")}
              rows={3}
              maxLength={300}
              aria-required="true"
              placeholder={t.reasonPlaceholder}
              className="text-[14px] leading-5"
            />
          )}
        </Field>
        <p
          aria-live="polite"
          className="m-0 flex flex-wrap justify-between gap-3 rounded-md bg-surface px-3.5 py-3 text-[14px] leading-5 text-ink tabular-nums"
        >
          <span>{t.newBalance}</span>
          <b className={cn(after < 0 && "text-danger")}>
            {fmt.number(balance)} → {fmt.som(after)}
          </b>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabledReason={isSubmitting && t.busyReason}
            onClick={close}
          >
            {t.cancel}
          </Button>
          <Button type="submit" busy={isSubmitting}>
            {isSubmitting ? t.saving : t.confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
