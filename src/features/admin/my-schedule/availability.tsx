"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SpecialistAvailability } from "@/data/specialist";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { formatTime, toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import {
  ClinicSelect,
  Field,
  inputClass,
  MutationMessage,
  tashkentDateTime,
  text,
  useScheduleMutation,
} from "./controls";
import { specialistsCopy } from "../specialists/copy";
import { myScheduleCopy } from "./copy";

type Clinics = SpecialistAvailability["clinics"];
type Override = SpecialistAvailability["overrides"][number];
type Block = SpecialistAvailability["blocks"][number];

function Clock({
  name,
  label,
  initial,
  required,
}: {
  name: string;
  label: string;
  initial?: string | null;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        type="time"
        step={300}
        name={name}
        defaultValue={initial ?? ""}
        required={required}
      />
    </Field>
  );
}

function WeekRow({
  hours,
  weekday,
  name,
  clinics,
}: {
  hours?: SpecialistAvailability["working_hours"][number];
  weekday: number;
  name: string;
  clinics: Clinics;
}) {
  const t = useCopy(myScheduleCopy);
  const [working, setWorking] = useState(hours !== undefined);
  return (
    <fieldset className="grid min-w-0 gap-3 rounded-md border border-line p-3">
      <legend className="px-1 text-label">{name}</legend>
      <label className="flex items-center gap-2 text-body-sm">
        <input
          type="checkbox"
          name={"working-" + weekday}
          checked={working}
          onChange={(event) => setWorking(event.target.checked)}
        />
        {working ? t.working : t.dayOff}
      </label>
      {working && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex min-w-0 flex-col gap-1 text-caption font-semibold text-ink-muted">
              {t.clinic}
              <select
                className={inputClass}
                name={"clinic-" + weekday}
                defaultValue={hours?.location_id}
                required
              >
                {hours && !clinics.some((clinic) => clinic.id === hours.location_id) && (
                  <option value="" />
                )}
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Clock
            name={"start-" + weekday}
            initial={hours?.start ?? "09:00"}
            label={t.from}
            required
          />
          <Clock name={"end-" + weekday} initial={hours?.end ?? "18:00"} label={t.to} required />
          <Clock name={"break-start-" + weekday} initial={hours?.break_start} label={t.breakFrom} />
          <Clock name={"break-end-" + weekday} initial={hours?.break_end} label={t.breakTo} />
        </div>
      )}
    </fieldset>
  );
}

function WeeklyHours({ data }: { data: SpecialistAvailability }) {
  const t = useCopy(myScheduleCopy);
  const names = useCopy(clinicDataCopy).weekday;
  const mutation = useScheduleMutation();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const days = names.flatMap((_, weekday) =>
          form.has("working-" + weekday)
            ? [
                {
                  weekday,
                  location_id: Number(text(form, "clinic-" + weekday)),
                  start: text(form, "start-" + weekday),
                  end: text(form, "end-" + weekday),
                  break_start: text(form, "break-start-" + weekday) || null,
                  break_end: text(form, "break-end-" + weekday) || null,
                },
              ]
            : [],
        );
        mutation.submit({ kind: "weekly", body: { days } });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {names.map((name, weekday) => (
          <WeekRow
            key={weekday}
            weekday={weekday}
            name={name}
            clinics={data.clinics}
            hours={data.working_hours.find((hours) => hours.weekday === weekday)}
          />
        ))}
      </div>
      <MutationMessage message={mutation.message} />
      <Button className="justify-self-start" type="submit" busy={mutation.pending}>
        {t.save}
      </Button>
    </form>
  );
}

function OverrideForm({
  row,
  today,
  clinics,
  close,
}: {
  row?: Override;
  today: string;
  clinics: Clinics;
  close?: () => void;
}) {
  const t = useCopy(myScheduleCopy);
  const mutation = useScheduleMutation();
  const [dayOff, setDayOff] = useState(row?.day_off ?? true);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        mutation.submit(
          {
            kind: "overrides",
            id: row ? String(row.id) : undefined,
            body: {
              date: text(form, "date"),
              start: dayOff ? null : text(form, "start"),
              end: dayOff ? null : text(form, "end"),
              location_id: dayOff ? null : Number(text(form, "clinic")),
              note: text(form, "note"),
            },
          },
          close,
        );
      }}
    >
      <Field label={t.date}>
        <input
          type="date"
          className={inputClass}
          name="date"
          required
          min={today}
          defaultValue={row?.date ?? today}
        />
      </Field>
      <label className="flex items-center gap-2 text-body-sm">
        <input
          type="checkbox"
          checked={dayOff}
          onChange={(event) => setDayOff(event.target.checked)}
        />
        {t.dayOff}
      </label>
      {!dayOff && (
        <div className="grid gap-2 sm:grid-cols-3">
          <ClinicSelect
            clinics={clinics}
            defaultValue={String(row?.location_id ?? clinics[0]?.id ?? "")}
          />
          <Clock name="start" initial={row?.start ?? "09:00"} label={t.from} required />
          <Clock name="end" initial={row?.end ?? "18:00"} label={t.to} required />
        </div>
      )}
      <Field label={t.label}>
        <input name="note" className={inputClass} maxLength={120} defaultValue={row?.note} />
      </Field>
      <MutationMessage message={mutation.message} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" busy={mutation.pending}>
          {row ? t.save : t.add}
        </Button>
        {close && (
          <Button variant="outline" onClick={close}>
            {t.close}
          </Button>
        )}
      </div>
    </form>
  );
}

function BlockForm({ row, today, close }: { row?: Block; today: string; close?: () => void }) {
  const t = useCopy(myScheduleCopy);
  const mutation = useScheduleMutation();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        mutation.submit(
          {
            kind: "blocks",
            id: row ? String(row.id) : undefined,
            body: {
              start: tashkentDateTime(text(form, "start")),
              end: tashkentDateTime(text(form, "end")),
              kind: text(form, "kind"),
              label: text(form, "label"),
            },
          },
          close,
        );
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t.from}>
          <input
            type="datetime-local"
            step={300}
            className={inputClass}
            name="start"
            required
            defaultValue={
              row ? toLocalIsoDate(row.start) + "T" + formatTime(row.start) : today + "T09:00"
            }
          />
        </Field>
        <Field label={t.to}>
          <input
            type="datetime-local"
            step={300}
            className={inputClass}
            name="end"
            required
            defaultValue={
              row ? toLocalIsoDate(row.end) + "T" + formatTime(row.end) : today + "T10:00"
            }
          />
        </Field>
        <Field label={t.availability}>
          <select name="kind" className={inputClass} defaultValue={row?.kind ?? "busy"}>
            <option value="busy">{t.busy}</option>
            <option value="off">{t.off}</option>
          </select>
        </Field>
        <Field label={t.label}>
          <input
            name="label"
            className={inputClass}
            maxLength={80}
            defaultValue={row?.label ?? ""}
          />
        </Field>
      </div>
      <MutationMessage message={mutation.message} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" busy={mutation.pending}>
          {row ? t.save : t.add}
        </Button>
        {close && (
          <Button variant="outline" onClick={close}>
            {t.close}
          </Button>
        )}
      </div>
    </form>
  );
}

function ScheduleEntry({
  id,
  section,
  description,
  children,
}: {
  id: number;
  section: "overrides" | "blocks";
  description: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const t = useCopy(myScheduleCopy);
  const [editing, setEditing] = useState(false);
  const mutation = useScheduleMutation();
  return (
    <li className="grid gap-3 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{description}</span>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? t.close : t.edit}
          </Button>
          <Button
            variant="outline"
            busy={mutation.pending}
            onClick={() => {
              if (window.confirm(t.remove + "? " + description))
                mutation.submit({ kind: "remove", section, id: String(id) });
            }}
          >
            {t.remove}
          </Button>
        </div>
      </div>
      {editing && children(() => setEditing(false))}
      <MutationMessage message={mutation.message} />
    </li>
  );
}

export function Availability({ data, today }: { data: SpecialistAvailability; today: string }) {
  const t = useCopy(myScheduleCopy);
  const hours = useCopy(specialistsCopy).hours;
  const fmt = useFormat();
  const date = (value: string) => fmt.dateLong(value + "T12:00:00+05:00");
  return (
    <Card className="grid gap-4">
      <CardTitle>{t.availability}</CardTitle>
      <details className="grid gap-3 rounded-md border border-line p-3">
        <summary className="cursor-pointer font-semibold">{hours.title}</summary>
        <div className="pt-3">
          <WeeklyHours key={JSON.stringify(data.working_hours)} data={data} />
        </div>
      </details>
      <details className="rounded-md border border-line p-3">
        <summary className="cursor-pointer font-semibold">{t.overrides}</summary>
        <ul className="grid list-none gap-2 p-0">
          {data.overrides.map((row) => (
            <ScheduleEntry
              key={row.id}
              id={row.id}
              section="overrides"
              description={
                date(row.date) +
                " · " +
                (row.day_off ? t.dayOff : row.start + "–" + row.end) +
                (row.note ? " · " + row.note : "")
              }
            >
              {(close) => (
                <OverrideForm row={row} today={today} clinics={data.clinics} close={close} />
              )}
            </ScheduleEntry>
          ))}
        </ul>
        <OverrideForm today={today} clinics={data.clinics} />
      </details>
      <details className="rounded-md border border-line p-3">
        <summary className="cursor-pointer font-semibold">{t.blocks}</summary>
        <ul className="grid list-none gap-2 p-0">
          {data.blocks.map((row) => (
            <ScheduleEntry
              key={row.id}
              id={row.id}
              section="blocks"
              description={
                fmt.dateTimeShort(row.start) +
                " – " +
                fmt.dateTimeShort(row.end) +
                " · " +
                (row.label || t[row.kind])
              }
            >
              {(close) => <BlockForm row={row} today={today} close={close} />}
            </ScheduleEntry>
          ))}
        </ul>
        <BlockForm today={today} />
      </details>
    </Card>
  );
}
