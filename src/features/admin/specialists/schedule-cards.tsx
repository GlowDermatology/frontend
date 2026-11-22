"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { clinicSchemas } from "@/data/clinic.schema";
import {
  BLOCK_LABEL_MAX,
  clinicText,
  type ClinicLocation,
  OVERRIDE_NOTE_MAX,
  type BlockedPeriod,
  type BlockKind,
  type HoursOverride,
} from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { addDays, toLocalIsoDate, type AdminFormatter } from "@/lib/format";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { clinicOptions } from "../clinics/options";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import type { ScheduleActions, ScheduleEntryKind } from "./card-actions";
import { specialistsCopy } from "./copy";
import { errorItems, issuesToErrors } from "./form-kit";

/** A form-level error line (the server's message that has no field). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink">
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {message}
    </p>
  );
}

/**
 * Delete with a confirmation (the entry is removed for good; it can be added again) through
 * `actions.deleteEntry`. An entry already gone (`not_found`) counts as removed.
 */
export function useDeleteEntry<T extends { id: string }>(
  actions: Pick<ScheduleActions, "deleteEntry">,
  kind: ScheduleEntryKind,
  onDeleted: (id: string) => void,
) {
  const copy = useCopy(specialistsCopy);
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const [target, setTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const result = idempotency.settle(
      await runAction((csrf) => actions.deleteEntry(kind, target.id, idempotency.key, csrf)),
    );
    setBusy(false);
    if (!result.ok && result.code !== "not_found") {
      setError(result.error);
      toast({ tone: "danger", title: copy.remove.failed, description: result.error });
      return;
    }
    // The next removal is a new intent (`settle` renews only after a success).
    if (!result.ok) idempotency.renew();
    onDeleted(target.id);
    setTarget(null);
    toast({
      tone: "success",
      title: kind === "override" ? copy.overrides.removed : copy.blocks.removed,
    });
  };
  return { target, setTarget, busy, error, setError, confirm };
}

/** The confirmation of `useDeleteEntry` (cancel, or remove for good). */
export function DeleteDialog({
  open,
  busy,
  error,
  title,
  body,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = useCopy(specialistsCopy);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
      title={title}
      description={<p className="m-0 text-[14px] leading-5 text-ink">{body}</p>}
    >
      <FormError message={error} />
      <div className="mt-1.5 flex flex-wrap justify-end gap-2">
        <AlertDialogCancel asChild>
          <Button variant="outline" disabledReason={busy && copy.remove.busyReason}>
            {copy.cancel}
          </Button>
        </AlertDialogCancel>
        <Button variant="destructive" onClick={onConfirm} busy={busy}>
          {busy ? copy.remove.removing : copy.remove.confirm}
        </Button>
      </div>
    </AlertDialog>
  );
}

/** A date of an override as the list shows it ("26-oktabr 2026"). */
const overrideDay = (fmt: AdminFormatter, date: string) => fmt.dateLong(`${date}T12:00:00+05:00`);

/**
 * Alohida kunlar (contract §2.17 date overrides): one date's own hours or a
 * day off, from today up to a year ahead; they win over the weekly hours.
 */
export function OverridesCard({
  actions,
  clinics,
  defaultClinicId,
  overrides,
  today,
}: {
  actions: ScheduleActions;
  clinics: ReadonlyArray<ClinicLocation>;
  defaultClinicId: string;
  overrides: ReadonlyArray<HoursOverride>;
  today: string;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.overrides;
  const locationCopy = copy.location;
  const locale = useAdminLocale();
  const activeClinics = clinics.filter((clinic) => clinic.isActive);
  const defaultClinic =
    activeClinics.find((clinic) => clinic.id === defaultClinicId) ?? activeClinics[0];
  const m = useCopy(clinicDataCopy);
  const fmt = useFormat();
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [source, setSource] = useState(overrides);
  const [rows, setRows] = useState<ReadonlyArray<HoursOverride>>(overrides);
  if (overrides !== source) {
    setSource(overrides);
    setRows(overrides);
  }
  const [date, setDate] = useState(today);
  const [dayOff, setDayOff] = useState(true);
  const [pickedClinicId, setPickedClinicId] = useState("");
  const locationId = activeClinics.some((clinic) => clinic.id === pickedClinicId)
    ? pickedClinicId
    : (defaultClinic?.id ?? "");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("16:00");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();
  const remove = useDeleteEntry<HoursOverride>(actions, "override", (id) =>
    setRows((current) => current.filter((row) => row.id !== id)),
  );
  const labels: Record<string, string> = {
    date: t.date,
    locationId: locationCopy.title,
    start: t.start,
    end: t.end,
    note: t.noteLabel,
  };
  const summary = errorItems(errors, (name) => labels[name], [
    "date",
    "locationId",
    "start",
    "end",
    "note",
  ]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.override.safeParse({ date, dayOff, locationId, start, end, note });
    if (!local.success) {
      setErrors(issuesToErrors(local.error));
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => actions.createOverride(local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      setErrors(next);
      setFormError(Object.keys(next).length > 0 ? null : result.error);
      toast({ tone: "danger", title: t.addFailed, description: result.error });
      reveal();
      return;
    }
    setRows((current) => [...current, result.data].sort((a, b) => a.date.localeCompare(b.date)));
    setNote("");
    toast({ tone: "success", title: t.added, description: overrideDay(fmt, result.data.date) });
  };

  return (
    <Card aria-labelledby="overrides-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="overrides-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{t.text}</p>
      </div>
      {rows.length > 0 ? (
        <ul aria-label={t.listLabel} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((row) => {
            const clinic = clinics.find((item) => item.id === row.locationId);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink tabular-nums">
                    {overrideDay(fmt, row.date)} ·{" "}
                    {row.dayOff ? m.dayOff : `${row.start}–${row.end}`}
                  </span>
                  {(clinic || row.note || row.createdBy) && (
                    <span className="text-caption font-normal break-words text-ink-muted">
                      {[clinic && clinicText(clinic.name, locale), row.note, row.createdBy]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
                <IconButton
                  size="sm"
                  aria-label={t.removeOf(overrideDay(fmt, row.date))}
                  onClick={() => {
                    remove.setError(null);
                    remove.setTarget(row);
                  }}
                  className="hover:text-danger"
                >
                  <Icon name="trash" size={18} />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
          {t.empty}
        </p>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-line pt-4"
      >
        <span className="text-label text-ink">{t.add}</span>
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.date} name="date" error={errors.date}>
            {(c) => (
              <DatePicker
                {...c}
                value={date}
                onValueChange={setDate}
                min={today}
                max={addDays(today, 365)}
              />
            )}
          </Field>
          <div className="flex items-center justify-between gap-2 self-end rounded-md bg-surface px-3 py-2.5">
            <span className="text-body-sm text-ink">{t.dayOff}</span>
            <Switch checked={dayOff} onCheckedChange={setDayOff} aria-label={t.dayOff} />
          </div>
          {!dayOff && (
            <>
              <Field
                label={locationCopy.title}
                name="locationId"
                error={errors.locationId}
                className="sm:col-span-2"
              >
                {(control) => (
                  <Select
                    {...control}
                    value={locationId}
                    onValueChange={setPickedClinicId}
                    options={clinicOptions(activeClinics, locale)}
                    placeholder={locationCopy.placeholder}
                  />
                )}
              </Field>
              <Field label={t.start} name="start" error={errors.start}>
                {(c) => <TimePicker {...c} value={start} onValueChange={setStart} step={5} />}
              </Field>
              <Field label={t.end} name="end" error={errors.end}>
                {(c) => <TimePicker {...c} value={end} onValueChange={setEnd} step={5} />}
              </Field>
            </>
          )}
          <Field label={t.note} name="note" error={errors.note} className="sm:col-span-2">
            {(c) => (
              <TextInput
                {...c}
                maxLength={OVERRIDE_NOTE_MAX}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </Field>
        </div>
        <FormError message={formError} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? t.submitting : t.submit}
          </Button>
        </div>
      </form>
      <DeleteDialog
        open={remove.target !== null}
        busy={remove.busy}
        error={remove.error}
        title={t.removeTitle}
        body={t.removeText}
        onCancel={() => remove.setTarget(null)}
        onConfirm={remove.confirm}
      />
    </Card>
  );
}

/** "26-okt, 16:00 – 16:30" or across days "26-okt, 16:00 – 27-okt, 10:00". */
export function periodLabel(
  block: Pick<BlockedPeriod, "start" | "end">,
  fmt: Pick<AdminFormatter, "dateTimeShort" | "time">,
): string {
  const sameDay = toLocalIsoDate(block.start) === toLocalIsoDate(block.end);
  return `${fmt.dateTimeShort(block.start)} – ${sameDay ? fmt.time(block.end) : fmt.dateTimeShort(block.end)}`;
}

/**
 * Band vaqtlar (contract §2.17 blocked periods): an absolute busy or off
 * range (a meeting, a leave) in Tashkent time on a 5-minute grid; it removes
 * the free slots. Appointments inside it are kept (they become conflicts).
 */
export function BlocksCard({
  actions,
  blocks,
  today,
}: {
  actions: ScheduleActions;
  blocks: ReadonlyArray<BlockedPeriod>;
  today: string;
}) {
  const copy = useCopy(specialistsCopy);
  const t = copy.blocks;
  const m = useCopy(clinicDataCopy);
  const fmt = useFormat();
  const schemas = useLocalized(clinicSchemas);
  const toast = useToast();
  const [source, setSource] = useState(blocks);
  const [rows, setRows] = useState<ReadonlyArray<BlockedPeriod>>(blocks);
  if (blocks !== source) {
    setSource(blocks);
    setRows(blocks);
  }
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("13:00");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("14:00");
  const [kind, setKind] = useState<BlockKind>("busy");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();
  const remove = useDeleteEntry<BlockedPeriod>(actions, "block", (id) =>
    setRows((current) => current.filter((row) => row.id !== id)),
  );
  const labels: Record<string, string> = {
    startDate: t.startDate,
    startTime: t.startTime,
    endDate: t.endDate,
    endTime: t.endTime,
    kind: t.kind,
    label: t.noteLabel,
  };
  const summary = errorItems(errors, (name) => labels[name], Object.keys(labels));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schemas.block.safeParse({ startDate, startTime, endDate, endTime, kind, label });
    if (!local.success) {
      setErrors(issuesToErrors(local.error));
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => actions.createBlock(local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      setErrors(next);
      setFormError(Object.keys(next).length > 0 ? null : result.error);
      toast({ tone: "danger", title: t.addFailed, description: result.error });
      reveal();
      return;
    }
    setRows((current) => [...current, result.data].sort((a, b) => a.start.localeCompare(b.start)));
    setLabel("");
    toast({ tone: "success", title: t.added, description: periodLabel(result.data, fmt) });
  };

  return (
    <Card aria-labelledby="blocks-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="blocks-title" className="text-heading">
          {t.title}
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{t.text}</p>
      </div>
      {rows.length > 0 ? (
        <ul aria-label={t.listLabel} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold text-ink tabular-nums">{periodLabel(row, fmt)}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-caption font-normal break-words text-ink-muted">
                  <Badge tone={row.kind === "busy" ? "warning" : "neutral"} dot={false}>
                    {m.blockKind[row.kind]}
                  </Badge>
                  {[row.label, row.createdBy].filter(Boolean).join(" · ")}
                </span>
              </span>
              <IconButton
                size="sm"
                aria-label={t.removeOf(periodLabel(row, fmt))}
                onClick={() => {
                  remove.setError(null);
                  remove.setTarget(row);
                }}
                className="hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
          {t.empty}
        </p>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-line pt-4"
      >
        <span className="text-label text-ink">{t.add}</span>
        <FormErrorSummary errors={summary} onSelect={(name) => reveal({ name })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.startDate} name="startDate" error={errors.startDate}>
            {(c) => (
              <DatePicker
                {...c}
                value={startDate}
                min={today}
                onValueChange={(value) => {
                  setStartDate(value);
                  // Keep the range forward: an end before the new start follows it.
                  if (value && endDate < value) setEndDate(value);
                }}
              />
            )}
          </Field>
          <Field label={t.startTime} name="startTime" error={errors.startTime}>
            {(c) => <TimePicker {...c} value={startTime} onValueChange={setStartTime} step={5} />}
          </Field>
          <Field label={t.endDate} name="endDate" error={errors.endDate}>
            {(c) => (
              <DatePicker
                {...c}
                value={endDate}
                min={startDate || today}
                onValueChange={setEndDate}
              />
            )}
          </Field>
          <Field label={t.endTime} name="endTime" error={errors.endTime}>
            {(c) => <TimePicker {...c} value={endTime} onValueChange={setEndTime} step={5} />}
          </Field>
          <Field label={t.kind} name="kind" error={errors.kind}>
            {(c) => (
              <Select<BlockKind>
                {...c}
                value={kind}
                onValueChange={setKind}
                options={[
                  { value: "busy", label: m.blockKind.busy },
                  { value: "off", label: m.blockKind.off },
                ]}
              />
            )}
          </Field>
          <Field label={t.note} name="label" error={errors.label}>
            {(c) => (
              <TextInput
                {...c}
                maxLength={BLOCK_LABEL_MAX}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            )}
          </Field>
        </div>
        <FormError message={formError} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? t.submitting : t.submit}
          </Button>
        </div>
      </form>
      <DeleteDialog
        open={remove.target !== null}
        busy={remove.busy}
        error={remove.error}
        title={t.removeTitle}
        body={t.removeText}
        onCancel={() => remove.setTarget(null)}
        onConfirm={remove.confirm}
      />
    </Card>
  );
}
