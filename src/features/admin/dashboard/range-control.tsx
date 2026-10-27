"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
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
import { addDays, formatDayMonthShort } from "@/lib/format";

import { DateRangeFields } from "../shared/date-range-fields";
import { dashboardHref } from "./query";

const OPTIONS: ReadonlyArray<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
];

/** "23-okt – 24-okt" (one day: "24-okt"). */
export function customRangeLabel(from: string, to: string): string {
  const a = formatDayMonthShort(`${from}T12:00:00+05:00`);
  const b = formatDayMonthShort(`${to}T12:00:00+05:00`);
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
    const found = validateCustomRange(nextFrom || undefined, nextTo || undefined, today);
    setErrors(found);
    if (found.from || found.to) {
      // First invalid field takes focus, like the other forms.
      const name = found.from ? "from" : "to";
      event.currentTarget.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();
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
        label="Davr"
        options={OPTIONS}
        value={optimistic.range === "custom" ? ("" as DashboardRange) : optimistic.range}
        onChange={(range) => go({ range })}
        className="bg-transparent p-0"
      />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-pressed={custom !== null}
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
        {custom ? customRangeLabel(custom.from, custom.to) : "Tanlash"}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Sana oralig‘i"
        description={`Toshkent vaqti bo‘yicha, ko‘pi bilan ${CUSTOM_RANGE_MAX_DAYS} kun. Ikki kungacha soatlar, undan uzunrog‘i kunlar bo‘yicha ko‘rsatiladi.`}
      >
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
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
            <DialogClose className={buttonStyles({ variant: "outline" })}>Orqaga</DialogClose>
            <Button type="submit" disabled={pending}>
              Ko‘rsatish
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
