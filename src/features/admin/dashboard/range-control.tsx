"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  CUSTOM_RANGE_MAX_DAYS,
  validateCustomRange,
  type CustomRangeErrors,
  type DashboardQuery,
  type DashboardRange,
} from "@/domain/dashboard";
import { cn } from "@/lib/cn";
import { addDays, type AdminFormatter } from "@/lib/format";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { DateRangeFields } from "../shared/date-range-fields";
import { dashboardCopy } from "./copy";
import { dashboardHref } from "./query";

/** "23-okt – 24-okt" (one day: "24-okt"), in the formatter's language. */
export function customRangeLabel(fmt: AdminFormatter, from: string, to: string): string {
  const a = fmt.dayMonthShort(`${from}T12:00:00+05:00`);
  const b = fmt.dayMonthShort(`${to}T12:00:00+05:00`);
  return from === to ? b : `${a} – ${b}`;
}

interface RangeControlProps {
  value: DashboardQuery;
  /** Today in Tashkent from the server clock (`YYYY-MM-DD`): the latest day a range may end on. */
  today: string;
  /** Errors the server found in the requested custom range (contract §2.10). */
  errors?: CustomRangeErrors;
}

/**
 * Period switch; the choice lives in the URL (`?range=week`, or
 * `?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`) so a view can be shared or
 * reloaded. "Tanlash" opens a dialog with two days, checked with the
 * backend's own rules before navigating (a missing day, `from` after `to`, an
 * end after today, more than 366 days), so the API rarely has to refuse.
 */
export function RangeControl({ value, today, errors: serverErrors }: RangeControlProps) {
  const t = useCopy(dashboardCopy).range;
  const locale = useAdminLocale();
  const fmt = useFormat();
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const custom = optimistic.range === "custom" ? optimistic : null;
  const [open, setOpen] = useState(Boolean(serverErrors?.from || serverErrors?.to));
  const [from, setFrom] = useState(custom?.from ?? addDays(today, -6));
  const [to, setTo] = useState(custom?.to ?? today);
  const [errors, setErrors] = useState<CustomRangeErrors>(serverErrors ?? {});

  const go = (next: DashboardQuery) => {
    startTransition(() => {
      setOptimistic(next);
      router.replace(dashboardHref(next) as Route, { scroll: false });
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The inputs' current values, so a day typed a moment ago (its draft not
    // yet applied to the state) is what gets checked and sent.
    const data = new FormData(event.currentTarget);
    const nextFrom = String(data.get("from") ?? "");
    const nextTo = String(data.get("to") ?? "");
    setFrom(nextFrom);
    setTo(nextTo);
    const found = validateCustomRange(nextFrom || undefined, nextTo || undefined, today, locale);
    setErrors(found);
    if (found.from || found.to) {
      // The first invalid day is scrolled to, focused and marked, like the other forms.
      reveal();
      return;
    }
    setOpen(false);
    go({ range: "custom", from: nextFrom, to: nextTo });
  };

  return (
    <div
      className="flex flex-wrap gap-1 rounded-md bg-gold-soft p-1"
      data-pending={pending || undefined}
    >
      <SegmentedControl
        label={t.label}
        options={[
          { value: "today", label: t.today },
          { value: "week", label: t.week },
          { value: "month", label: t.month },
        ]}
        value={optimistic.range === "custom" ? ("" as DashboardRange) : optimistic.range}
        onChange={(range) => go({ range })}
        className="bg-transparent p-0"
      />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-pressed={custom !== null}
        aria-label={
          custom ? t.customLabel(customRangeLabel(fmt, custom.from, custom.to)) : undefined
        }
        onClick={() => {
          setErrors(serverErrors ?? {});
          setOpen(true);
        }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-label text-ink transition-colors duration-150 hover:bg-surface-raised/50",
          custom && "bg-surface-raised font-semibold shadow-sm hover:bg-surface-raised",
        )}
      >
        <Icon name="calendar" size={18} />
        {/* On a phone the four choices do not fit one line in Russian: «Выбрать» stays the
            button's name but only the calendar shows (a chosen range keeps its dates). */}
        <span className={cn("tabular-nums", !custom && "max-[420px]:sr-only")}>
          {custom ? customRangeLabel(fmt, custom.from, custom.to) : t.custom}
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogText(CUSTOM_RANGE_MAX_DAYS)}
      >
        <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <DateRangeFields
            variant="form"
            names={{ from: "from", to: "to" }}
            from={from}
            to={to}
            max={today}
            errors={errors}
            onCommit={(patch) => {
              if ("dateFrom" in patch) setFrom(patch.dateFrom ?? "");
              if ("dateTo" in patch) setTo(patch.dateTo ?? "");
            }}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t.back}</Button>
            </DialogClose>
            <Button type="submit" busy={pending}>
              {t.show}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
