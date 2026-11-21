"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { saveWorkingHours } from "@/data/clinic.actions";
import { clinicSchemas } from "@/data/clinic.schema";
import { WEEKDAYS, type ClinicLocation, type ClinicSpecialist } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { cn } from "@/lib/cn";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { clinicOptions } from "../clinics/options";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { specialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";

interface DayRow {
  working: boolean;
  locationId: string;
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
          locationId: day.locationId,
          start: day.start,
          end: day.end,
          breakStart: day.breakStart ?? "",
          breakEnd: day.breakEnd ?? "",
        }
      : {
          working: false,
          locationId: specialist.locationId ?? "",
          start: "09:00",
          end: "18:00",
          breakStart: "",
          breakEnd: "",
        };
  });
}

/** Only what is sent counts: a day off's times are not compared. */
const signature = (rows: DayRow[]) =>
  JSON.stringify(
    rows.map((r) => (r.working ? [r.locationId, r.start, r.end, r.breakStart, r.breakEnd] : null)),
  );

const TIME_FIELDS = ["start", "end", "breakStart", "breakEnd"] as const;
const FIELDS = ["locationId", ...TIME_FIELDS] as const;

/** `days.N.*` (N = the index of the sent days) → `<weekday>.<field>` of the rows (pure, for tests). */
export function placeDayErrors(
  fieldErrors: Readonly<Record<string, string>>,
  sent: ReadonlyArray<number>,
): { errors: Record<string, string>; unplaced: string | null } {
  const errors: Record<string, string> = {};
  let unplaced: string | null = null;
  for (const [path, message] of Object.entries(fieldErrors)) {
    const match = /^days\.(\d+)\.(\w+)$/.exec(path);
    const weekday = match ? sent[Number(match[1])] : undefined;
    if (match && weekday !== undefined) errors[`${weekday}.${match[2]}`] ??= message;
    else unplaced ??= message;
  }
  return { errors, unplaced };
}

/**
 * Haftalik ish vaqti (contract §2.17 `PUT specialists/{id}/working-hours/`):
 * one interval per weekday plus an optional break, Tashkent time on a
 * 5-minute grid; a day switched off is not a working day. Booked
 * appointments outside the new hours stay and are listed as conflicts.
 */
export function HoursCard({
  specialist,
  clinics,
  onUpdated,
}: {
  specialist: ClinicSpecialist;
  clinics: ReadonlyArray<ClinicLocation>;
  onUpdated: (specialist: ClinicSpecialist) => void;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.hours;
  const clinicCopy = copy.location;
  const locale = useAdminLocale();
  const activeClinics = clinics.filter((clinic) => clinic.isActive);
  const defaultClinic =
    activeClinics.find((clinic) => clinic.id === specialist.locationId) ?? activeClinics[0];
  const days = useCopy(clinicDataCopy).weekday;
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [source, setSource] = useState(specialist);
  const [rows, setRows] = useState(() => toRows(specialist));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const reveal = useErrorReveal(container);
  const fieldLabel = {
    locationId: clinicCopy.title,
    start: t.start,
    end: t.end,
    breakStart: t.breakStart,
    breakEnd: t.breakEnd,
  };
  const summary = errorItems(
    errors,
    (name) => {
      const [weekday, field] = name.split(".");
      const day = days[Number(weekday)];
      return day && field && field in fieldLabel
        ? t.fieldOf(day, fieldLabel[field as keyof typeof fieldLabel])
        : undefined;
    },
    WEEKDAYS.flatMap((weekday) => FIELDS.map((field) => `${weekday}.${field}`)),
  );
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
          locationId: row.locationId,
          start: row.start,
          end: row.end,
          breakStart: row.breakStart || null,
          breakEnd: row.breakEnd || null,
        };
      }),
    };
    // `days.N.*` (N = the index in `sent`) → `<weekday>.<field>` of the rows.
    const place = (fieldErrors: Record<string, string>) => {
      const placed = placeDayErrors(fieldErrors, sent);
      setErrors(placed.errors);
      setFormError(placed.unplaced);
      reveal();
    };
    const local = schemas.week.safeParse(values);
    if (!local.success) return place(issuesToErrors(local.error));
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
      toast({ tone: "danger", title: copy.saveFailed, description: result.error });
      if (result.fieldErrors) return place(result.fieldErrors);
      setErrors({});
      setFormError(result.error);
      return;
    }
    onUpdated(result.data);
    setRows(toRows(result.data));
    setErrors({});
    toast({ tone: "success", title: t.saved });
  };

  if (clinics.length === 0 && specialist.workingHours.length === 0) {
    // A draft without a clinic: nothing to schedule yet (the profile card assigns the first).
    return (
      <Card aria-labelledby="hours-title" className="flex flex-col gap-4">
        <CardTitle id="hours-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink">
          <Icon name="info" size={18} className="mt-px shrink-0 text-gold-ink" />
          {t.noClinic}
        </p>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="hours-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="hours-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{clinicCopy.scheduleHint}</p>
      </div>
      <div ref={container} className="flex flex-col gap-2">
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        {WEEKDAYS.map((weekday) => {
          const row = rows[weekday]!;
          const error = (field: string) => errors[`${weekday}.${field}`];
          const dayErrors = [...new Set(FIELDS.map(error).filter(Boolean))] as string[];
          const name = days[weekday] ?? "";
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
                  {row.working ? t.workday : t.dayOff}
                  <Switch
                    checked={row.working}
                    onCheckedChange={(checked) =>
                      update(weekday, {
                        working: checked,
                        locationId: activeClinics.some((clinic) => clinic.id === row.locationId)
                          ? row.locationId
                          : (defaultClinic?.id ?? ""),
                      })
                    }
                    aria-label={t.workdaySwitch(name)}
                  />
                </span>
              </div>
              {row.working && (
                <div
                  className="flex flex-col gap-1"
                  data-field={`${weekday}.locationId`}
                  data-invalid={error("locationId") ? "true" : undefined}
                >
                  <span aria-hidden="true" className="text-caption font-semibold text-ink-muted">
                    {clinicCopy.title}
                  </span>
                  <Select
                    aria-label={t.fieldOf(name, clinicCopy.title)}
                    aria-invalid={error("locationId") ? true : undefined}
                    value={row.locationId}
                    onValueChange={(locationId) => update(weekday, { locationId })}
                    options={clinicOptions(
                      clinics.filter((clinic) => clinic.isActive || clinic.id === row.locationId),
                      locale,
                    )}
                    placeholder={clinicCopy.placeholder}
                    disabledReason={activeClinics.length === 0 && clinicCopy.none}
                  />
                </div>
              )}
              {row.working && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TIME_FIELDS.map((field) => {
                    const label = fieldLabel[field];
                    return (
                      <div
                        key={field}
                        className="flex flex-col gap-1"
                        data-field={`${weekday}.${field}`}
                        data-invalid={error(field) ? "true" : undefined}
                      >
                        <span
                          aria-hidden="true"
                          className="text-caption font-semibold text-ink-muted"
                        >
                          {label}
                        </span>
                        <TimePicker
                          aria-label={t.fieldOf(name, label.toLowerCase())}
                          aria-invalid={error(field) ? true : undefined}
                          value={row[field]}
                          step={5}
                          onValueChange={(value) => update(weekday, { [field]: value })}
                        />
                      </div>
                    );
                  })}
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
        <Button onClick={save} busy={busy} disabledReason={!busy && !dirty && copy.noChanges}>
          <Icon name="check" size={18} />
          {busy ? copy.saving : copy.save}
        </Button>
      </div>
    </Card>
  );
}
