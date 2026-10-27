"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveWorkingHours } from "@/data/clinic.actions";
import { workingWeekSchema } from "@/data/clinic.schema";
import { WEEKDAY_LABEL, WEEKDAYS, type ClinicSpecialist } from "@/domain/clinic";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

interface DayRow {
  working: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

function toRows(specialist: ClinicSpecialist): DayRow[] {
  return WEEKDAYS.map((weekday) => {
    const day = specialist.workingHours.find((d) => d.weekday === weekday);
    return day
      ? {
          working: true,
          start: day.start,
          end: day.end,
          breakStart: day.breakStart ?? "",
          breakEnd: day.breakEnd ?? "",
        }
      : { working: false, start: "09:00", end: "18:00", breakStart: "", breakEnd: "" };
  });
}

/** Only what is sent counts: a day off's times are not compared. */
const signature = (rows: DayRow[]) =>
  JSON.stringify(rows.map((r) => (r.working ? [r.start, r.end, r.breakStart, r.breakEnd] : null)));

const timeClass =
  "h-10 w-full min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface-raised px-2 text-body-sm text-ink tabular-nums aria-invalid:border-danger disabled:opacity-50";

/**
 * Haftalik ish vaqti (contract §2.17 `PUT specialists/{id}/working-hours/`):
 * one interval per weekday plus an optional break, Tashkent time on a
 * 5-minute grid; a day switched off is not a working day. Booked
 * appointments outside the new hours stay and are listed as conflicts.
 */
export function HoursCard({
  specialist,
  onUpdated,
}: {
  specialist: ClinicSpecialist;
  onUpdated: (specialist: ClinicSpecialist) => void;
}) {
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [rows, setRows] = useState(() => toRows(specialist));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const idempotency = useIdempotencyKey();

  const dirty = signature(rows) !== signature(toRows(source));
  if (specialist !== source) {
    setSource(specialist);
    if (!dirty) setRows(toRows(specialist));
  }

  const update = (weekday: number, patch: Partial<DayRow>) =>
    setRows((current) => current.map((row, i) => (i === weekday ? { ...row, ...patch } : row)));

  const save = async () => {
    if (inFlight.current) return;
    const sent = WEEKDAYS.filter((weekday) => rows[weekday]!.working);
    const values = {
      days: sent.map((weekday) => {
        const row = rows[weekday]!;
        return {
          weekday,
          start: row.start,
          end: row.end,
          breakStart: row.breakStart || null,
          breakEnd: row.breakEnd || null,
        };
      }),
    };
    // `days.N.*` (N = the index in `sent`) → `<weekday>.<field>` of the rows.
    const place = (fieldErrors: Record<string, string>) => {
      const next: Record<string, string> = {};
      let unplaced: string | null = null;
      for (const [path, message] of Object.entries(fieldErrors)) {
        const match = /^days\.(\d+)\.(\w+)$/.exec(path);
        const weekday = match ? sent[Number(match[1])] : undefined;
        if (match && weekday !== undefined) next[`${weekday}.${match[2]}`] ??= message;
        else unplaced ??= message;
      }
      setErrors(next);
      setFormError(unplaced);
      requestAnimationFrame(() =>
        container.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
    };
    const local = workingWeekSchema.safeParse(values);
    if (!local.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of local.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return place(fieldErrors);
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => saveWorkingHours(specialist.id, local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      if (result.fieldErrors) return place(result.fieldErrors);
      setErrors({});
      setFormError(result.error);
      return;
    }
    onUpdated(result.data);
    setRows(toRows(result.data));
    toast({ title: "Ish vaqti saqlandi" });
  };

  return (
    <Card aria-labelledby="hours-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="hours-title" className="text-heading">
          Haftalik ish vaqti
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Toshkent vaqti, 5 daqiqalik qadam. Tanaffus ixtiyoriy.
        </p>
      </div>
      <div ref={container} className="flex flex-col gap-2">
        {WEEKDAYS.map((weekday) => {
          const row = rows[weekday]!;
          const error = (field: string) => errors[`${weekday}.${field}`];
          const dayErrors = ["start", "end", "breakStart", "breakEnd"]
            .map(error)
            .filter(Boolean) as string[];
          const name = WEEKDAY_LABEL[weekday];
          return (
            <fieldset
              key={weekday}
              className={cn(
                "m-0 flex flex-col gap-2 rounded-md border border-line p-3",
                !row.working && "bg-surface",
              )}
            >
              <legend className="sr-only">{name}</legend>
              <div className="flex items-center justify-between gap-2">
                <span className="text-label text-ink">{name}</span>
                <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
                  {row.working ? "Ish kuni" : "Dam olish"}
                  <Switch
                    checked={row.working}
                    onCheckedChange={(checked) => update(weekday, { working: checked })}
                    aria-label={`${name} — ish kuni`}
                  />
                </span>
              </div>
              {row.working && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["start", "Boshlanishi"],
                      ["end", "Tugashi"],
                      ["breakStart", "Tanaffus boshi"],
                      ["breakEnd", "Tanaffus oxiri"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="flex flex-col gap-1">
                      <span className="text-caption font-semibold text-ink-muted">{label}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="SS:DD"
                        maxLength={5}
                        autoComplete="off"
                        aria-label={`${name}: ${label.toLowerCase()}`}
                        aria-invalid={error(field) ? true : undefined}
                        value={row[field]}
                        onChange={(event) =>
                          update(weekday, { [field]: event.target.value.replace(/[^\d:]/g, "") })
                        }
                        className={timeClass}
                      />
                    </label>
                  ))}
                </div>
              )}
              {row.working &&
                dayErrors.map((message) => (
                  <p
                    key={message}
                    className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
                  >
                    <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                    {message}
                  </p>
                ))}
            </fieldset>
          );
        })}
      </div>
      {formError && (
        <p
          role="alert"
          className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
        >
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          {formError}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy || !dirty} aria-busy={busy}>
          <Icon name="check" size={18} />
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </Button>
      </div>
    </Card>
  );
}
