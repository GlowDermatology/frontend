"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { AffixInput, Field, TextArea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { adjustCashback } from "@/data/customers.actions";
import type { LedgerEntry } from "@/domain/cashback";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

const schema = z.object({
  direction: z.enum(["add", "subtract"]),
  amount: z
    .number({ error: "Summani kiriting." })
    .int()
    .min(1, "Summani kiriting.")
    .max(10_000_000, "Summa juda katta."),
  reason: z
    .string()
    .trim()
    .min(3, "Kamida 3 ta belgi kiriting.")
    .max(300, "300 belgidan oshmasin."),
});

type Values = z.infer<typeof schema>;

const DEFAULTS: Values = { direction: "add", amount: Number.NaN, reason: "" };

interface AdjustCashbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onAdjusted: (entry: LedgerEntry) => void;
}

export function AdjustCashbackDialog({
  open,
  onOpenChange,
  balance,
  onAdjusted,
}: AdjustCashbackDialogProps) {
  // React Hook Form must re-run `register` after `reset()` (see ProductEditor).
  "use no memo";
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const direction = useWatch({ control, name: "direction" });
  const amount = useWatch({ control, name: "amount" });

  const signed = Number.isFinite(amount) ? (direction === "add" ? amount : -amount) : 0;
  const after = balance + signed;

  const onSubmit = handleSubmit(async (values) => {
    if (values.direction === "subtract" && values.amount > balance) {
      setError("amount", { message: "Balansdan ko‘p ayirib bo‘lmaydi." }, { shouldFocus: true });
      return;
    }
    const result = await adjustCashback(balance, values);
    if (!result.ok) {
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as Path<Values>, { message });
      }
      return;
    }
    reset(DEFAULTS);
    onAdjusted(result.data);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) reset(DEFAULTS);
        onOpenChange(next);
      }}
      title="Cashback tuzatish"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <SegmentedControl
              label="Amal"
              layout="fill"
              size="lg"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "add", label: "Qo‘shish" },
                { value: "subtract", label: "Ayirish" },
              ]}
            />
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field label="Summa" error={fieldState.error?.message}>
              {(c) => (
                <AffixInput
                  {...c}
                  ref={field.ref}
                  name={field.name}
                  suffix="so‘m"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={Number.isFinite(field.value) ? formatNumber(field.value) : ""}
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
        <Field label="Sabab (majburiy)" error={errors.reason?.message}>
          {(c) => (
            <TextArea
              {...c}
              {...register("reason")}
              rows={3}
              aria-required="true"
              placeholder="Masalan: kassada QR o‘qilmadi, chek qo‘lda bog‘landi"
              className="text-[14px] leading-5"
            />
          )}
        </Field>
        <p
          aria-live="polite"
          className="m-0 flex justify-between gap-3 rounded-md bg-surface px-3.5 py-3 text-[14px] leading-5 text-ink tabular-nums"
        >
          <span>Yangi balans</span>
          <b className={cn(after < 0 && "text-danger")}>
            {formatNumber(balance)} → {formatNumber(after)} so‘m
          </b>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose disabled={isSubmitting} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Saqlanmoqda…" : "Tasdiqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
