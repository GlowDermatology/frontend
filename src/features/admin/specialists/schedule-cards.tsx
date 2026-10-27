"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createBlock, createOverride, deleteScheduleEntry } from "@/data/clinic.actions";
import { blockFormSchema, overrideFormSchema } from "@/data/clinic.schema";
import {
  BLOCK_KIND_LABEL,
  BLOCK_LABEL_MAX,
  OVERRIDE_NOTE_MAX,
  type BlockedPeriod,
  type BlockKind,
  type HoursOverride,
} from "@/domain/clinic";
import {
  addDays,
  formatDateLong,
  formatDateTimeShort,
  formatTime,
  toLocalIsoDate,
} from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

const inputClass =
  "h-10 w-full min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface-raised px-2.5 text-body-sm text-ink tabular-nums aria-invalid:border-danger";

function Labelled({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-caption font-semibold text-ink-muted">{label}</span>
      {children}
      {error && (
        <span className="flex items-start gap-1.5 text-body-sm font-semibold text-ink">
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          {error}
        </span>
      )}
    </label>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink">
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {message}
    </p>
  );
}

/** Delete with a confirmation (the entry is removed for good; it can be added again). */
function useDeleteEntry<T extends { id: string }>(
  specialistId: string,
  kind: "override" | "block",
  onDeleted: (id: string) => void,
) {
  const toast = useToast();
  const [target, setTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const result = await runAction((csrf) =>
      deleteScheduleEntry(specialistId, kind, target.id, csrf),
    );
    setBusy(false);
    if (!result.ok && result.code !== "not_found") return setError(result.error);
    onDeleted(target.id);
    setTarget(null);
    toast({ title: kind === "override" ? "Alohida kun o‘chirildi" : "Band vaqt o‘chirildi" });
  };
  return { target, setTarget, busy, error, setError, confirm };
}

function DeleteDialog({
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
        <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
          Bekor qilish
        </AlertDialogCancel>
        <Button variant="destructive" onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy ? "O‘chirilmoqda…" : "O‘chirish"}
        </Button>
      </div>
    </AlertDialog>
  );
}

/**
 * Alohida kunlar (contract §2.17 date overrides): one date's own hours or a
 * day off, from today up to a year ahead; they win over the weekly hours.
 */
export function OverridesCard({
  specialistId,
  overrides,
  today,
}: {
  specialistId: string;
  overrides: ReadonlyArray<HoursOverride>;
  today: string;
}) {
  const toast = useToast();
  const [source, setSource] = useState(overrides);
  const [rows, setRows] = useState<ReadonlyArray<HoursOverride>>(overrides);
  if (overrides !== source) {
    setSource(overrides);
    setRows(overrides);
  }
  const [date, setDate] = useState(today);
  const [dayOff, setDayOff] = useState(true);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("16:00");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const remove = useDeleteEntry<HoursOverride>(specialistId, "override", (id) =>
    setRows((current) => current.filter((row) => row.id !== id)),
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = overrideFormSchema.safeParse({ date, dayOff, start, end, note });
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => createOverride(specialistId, local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      setErrors(next);
      setFormError(Object.keys(next).length > 0 ? null : result.error);
      return;
    }
    setRows((current) => [...current, result.data].sort((a, b) => a.date.localeCompare(b.date)));
    setNote("");
    toast({
      title: "Alohida kun qo‘shildi",
      description: formatDateLong(`${result.data.date}T12:00:00+05:00`),
    });
  };

  return (
    <Card aria-labelledby="overrides-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="overrides-title" className="text-heading">
          Alohida kunlar
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Bir kunlik boshqa ish vaqti yoki dam olish kuni; haftalik jadvaldan ustun turadi.
        </p>
      </div>
      {rows.length > 0 ? (
        <ul aria-label="Alohida kunlar" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
            >
              <span className="flex flex-col">
                <span className="font-semibold text-ink tabular-nums">
                  {formatDateLong(`${row.date}T12:00:00+05:00`)} ·{" "}
                  {row.dayOff ? "Dam olish" : `${row.start}–${row.end}`}
                </span>
                {(row.note || row.createdBy) && (
                  <span className="text-caption font-normal text-ink-muted">
                    {[row.note, row.createdBy].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`${formatDateLong(`${row.date}T12:00:00+05:00`)} — o‘chirish`}
                onClick={() => {
                  remove.setError(null);
                  remove.setTarget(row);
                }}
                className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
          Kelgusi alohida kunlar yo‘q.
        </p>
      )}
      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-line pt-4"
      >
        <span className="text-label text-ink">Kun qo‘shish</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled label="Sana" error={errors.date}>
            <input
              type="date"
              min={today}
              max={addDays(today, 365)}
              value={date}
              aria-invalid={errors.date ? true : undefined}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </Labelled>
          <div className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 sm:mt-5">
            <span className="text-body-sm text-ink">Dam olish kuni</span>
            <Switch checked={dayOff} onCheckedChange={setDayOff} aria-label="Dam olish kuni" />
          </div>
          {!dayOff && (
            <>
              <Labelled label="Boshlanishi" error={errors.start}>
                <input
                  type="time"
                  step={300}
                  value={start}
                  aria-invalid={errors.start ? true : undefined}
                  onChange={(event) => setStart(event.target.value)}
                  className={inputClass}
                />
              </Labelled>
              <Labelled label="Tugashi" error={errors.end}>
                <input
                  type="time"
                  step={300}
                  value={end}
                  aria-invalid={errors.end ? true : undefined}
                  onChange={(event) => setEnd(event.target.value)}
                  className={inputClass}
                />
              </Labelled>
            </>
          )}
          <Labelled label="Izoh (ixtiyoriy)" error={errors.note} className="sm:col-span-2">
            <input
              type="text"
              maxLength={OVERRIDE_NOTE_MAX}
              value={note}
              aria-invalid={errors.note ? true : undefined}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
            />
          </Labelled>
        </div>
        <FormError message={formError} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? "Qo‘shilmoqda…" : "Kunni qo‘shish"}
          </Button>
        </div>
      </form>
      <DeleteDialog
        open={remove.target !== null}
        busy={remove.busy}
        error={remove.error}
        title="Alohida kunni o‘chirasizmi?"
        body="Bu sana yana haftalik ish vaqti bo‘yicha ishlaydi. Mavjud qabullar o‘zgarmaydi."
        onCancel={() => remove.setTarget(null)}
        onConfirm={remove.confirm}
      />
    </Card>
  );
}

/** "26-okt, 16:00 – 16:30" or across days "26-okt, 16:00 – 27-okt, 10:00". */
function periodLabel(block: BlockedPeriod): string {
  const sameDay = toLocalIsoDate(block.start) === toLocalIsoDate(block.end);
  return `${formatDateTimeShort(block.start)} – ${sameDay ? formatTime(block.end) : formatDateTimeShort(block.end)}`;
}

/**
 * Band vaqtlar (contract §2.17 blocked periods): an absolute busy or off
 * range (a meeting, a leave) in Tashkent time on a 5-minute grid; it removes
 * the free slots. Appointments inside it are kept (they become conflicts).
 */
export function BlocksCard({
  specialistId,
  blocks,
  today,
}: {
  specialistId: string;
  blocks: ReadonlyArray<BlockedPeriod>;
  today: string;
}) {
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
  const idempotency = useIdempotencyKey();
  const remove = useDeleteEntry<BlockedPeriod>(specialistId, "block", (id) =>
    setRows((current) => current.filter((row) => row.id !== id)),
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = blockFormSchema.safeParse({
      startDate,
      startTime,
      endDate,
      endTime,
      kind,
      label,
    });
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => createBlock(specialistId, local.data, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const next = result.fieldErrors ?? {};
      setErrors(next);
      setFormError(Object.keys(next).length > 0 ? null : result.error);
      return;
    }
    setRows((current) => [...current, result.data].sort((a, b) => a.start.localeCompare(b.start)));
    setLabel("");
    toast({ title: "Band vaqt qo‘shildi", description: periodLabel(result.data) });
  };

  return (
    <Card aria-labelledby="blocks-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="blocks-title" className="text-heading">
          Band vaqtlar
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Uchrashuv, ta’til va boshqalar: bu oraliqda yozilib bo‘lmaydi. Toshkent vaqti.
        </p>
      </div>
      {rows.length > 0 ? (
        <ul aria-label="Band vaqtlar" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3.5 py-2.5"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-ink tabular-nums">{periodLabel(row)}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-caption font-normal text-ink-muted">
                  <Badge tone={row.kind === "busy" ? "warning" : "neutral"} dot={false}>
                    {BLOCK_KIND_LABEL[row.kind]}
                  </Badge>
                  {[row.label, row.createdBy].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button
                type="button"
                aria-label={`${periodLabel(row)} — o‘chirish`}
                onClick={() => {
                  remove.setError(null);
                  remove.setTarget(row);
                }}
                className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-md bg-surface px-3.5 py-3 text-body-sm text-ink-muted">
          Kelgusi band vaqtlar yo‘q.
        </p>
      )}
      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-line pt-4"
      >
        <span className="text-label text-ink">Band vaqt qo‘shish</span>
        <div className="grid grid-cols-2 gap-3">
          <Labelled label="Boshlanish sanasi" error={errors.startDate}>
            <input
              type="date"
              min={today}
              value={startDate}
              aria-invalid={errors.startDate ? true : undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                if (endDate < event.target.value) setEndDate(event.target.value);
              }}
              className={inputClass}
            />
          </Labelled>
          <Labelled label="Boshlanish vaqti" error={errors.startTime}>
            <input
              type="time"
              step={300}
              value={startTime}
              aria-invalid={errors.startTime ? true : undefined}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputClass}
            />
          </Labelled>
          <Labelled label="Tugash sanasi" error={errors.endDate}>
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              aria-invalid={errors.endDate ? true : undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className={inputClass}
            />
          </Labelled>
          <Labelled label="Tugash vaqti" error={errors.endTime}>
            <input
              type="time"
              step={300}
              value={endTime}
              aria-invalid={errors.endTime ? true : undefined}
              onChange={(event) => setEndTime(event.target.value)}
              className={inputClass}
            />
          </Labelled>
          <Labelled label="Turi" error={errors.kind}>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as BlockKind)}
              className={inputClass}
            >
              <option value="busy">{BLOCK_KIND_LABEL.busy}</option>
              <option value="off">{BLOCK_KIND_LABEL.off}</option>
            </select>
          </Labelled>
          <Labelled label="Izoh (ixtiyoriy)" error={errors.label}>
            <input
              type="text"
              maxLength={BLOCK_LABEL_MAX}
              value={label}
              aria-invalid={errors.label ? true : undefined}
              onChange={(event) => setLabel(event.target.value)}
              className={inputClass}
            />
          </Labelled>
        </div>
        <FormError message={formError} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={busy} aria-busy={busy}>
            <Icon name="plus" size={18} />
            {busy ? "Qo‘shilmoqda…" : "Band vaqtni qo‘shish"}
          </Button>
        </div>
      </form>
      <DeleteDialog
        open={remove.target !== null}
        busy={remove.busy}
        error={remove.error}
        title="Band vaqtni o‘chirasizmi?"
        body="Bu oraliq yana yozilish uchun ochiladi (ish vaqti ichida bo‘lsa)."
        onCancel={() => remove.setTarget(null)}
        onConfirm={remove.confirm}
      />
    </Card>
  );
}
