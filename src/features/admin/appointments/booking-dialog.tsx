"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { FormPhoneInput, FormSelect } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import type { SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AppointmentDay, DayAppointment } from "@/data/appointments";
import { appointmentSchemas } from "@/data/appointments.schema";
import type { Workspace } from "@/data/auth/next-param";
import {
  CUSTOMER_NAME_MAX,
  NOTE_MAX,
  slotOptions,
  specialistSchedule,
  tashkentMinutes,
  type BookingMeta,
  type SlotOption,
} from "@/domain/appointment";
import { cn } from "@/lib/cn";
import { toLocalIsoDate } from "@/lib/format";
import { useRhfReveal } from "@/lib/forms/rhf";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";
import { normalizePhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import type { IdempotencyKey } from "../shared/idempotency";
import type { BoardActions } from "./board-actions";
import { appointmentsCopy, type AppointmentsCopy } from "./copy";
import { customerName, roleText } from "./labels";

/**
 * Booking dialogs (contract §2.9 T10): «Qabul qo‘shish» creates a confirmed visit for a customer
 * found by phone — or, when the server says nobody has that phone, for a new customer created
 * with the name the dialog then asks for; «Vaqtni o‘zgartirish» / «Ko‘chirish» moves a visit to
 * a new start and, for staff, optionally to another specialist and one of their services. On a
 * specialist's own board there is no specialist choice and no staff note, and a move to the
 * other clinic they work at that day needs the customer's agreement. The time list is the 5-minute
 * grid inside the chosen specialist's working hours of the chosen day (from the board's day, or
 * that day's schedule fetched when another date is picked); starts that collide with a break or
 * a held visit are marked taken but stay selectable, because the backend is the authority and
 * answers the field error itself (`slot_unavailable`, `outside_working_hours`, `in_past`, a 409
 * race → on the time field). A failed submit — in the form or from the server — lists the
 * fields, toasts and reveals the first one.
 */

type Mode = { kind: "create" } | { kind: "reschedule"; appointment: DayAppointment };

interface BookingDialogProps {
  /** A specialist books and moves only their own visits. */
  workspace: Workspace;
  actions: BoardActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  meta: BookingMeta;
  /** The board's anchor day: the first date offered for a new visit. */
  date: string;
  /** That day's schedule when the board holds it (else it is loaded like any other day). */
  day: AppointmentDay | null;
  /** The board's specialist filter, preselected for a new visit. */
  defaultSpecialistId?: string;
  /** Server "now" (ISO): today's date and the earliest start. */
  now: string;
  /** Owned by the board so it survives re-opens until a success (contract §1.7). */
  idempotency: IdempotencyKey;
  onSaved: (appointment: DayAppointment) => void;
}

interface FormValues {
  specialistId: string;
  serviceId: string;
  phone: string;
  /** A walk-in's name, asked for once the server reports the phone unknown. */
  name: string;
  locationId?: string;
  date: string;
  time: string;
  note: string;
  /** A specialist's move to another clinic: the customer agreed. */
  customerAgreed: boolean;
}

/** The fields a dialog renders, so a server error on any other one becomes the form message. */
export function renderedFields(
  workspace: Workspace,
  kind: Mode["kind"],
  options: { changedSpecialist: boolean; clinicMove: boolean },
): Array<keyof FormValues> {
  const staff = workspace === "admin";
  if (kind === "reschedule") {
    return [
      ...(staff ? (["specialistId"] as const) : []),
      ...(staff && options.changedSpecialist ? (["serviceId"] as const) : []),
      "date",
      "locationId",
      "time",
      ...(!staff && options.clinicMove ? (["customerAgreed"] as const) : []),
    ];
  }
  return [
    ...(staff ? (["specialistId"] as const) : []),
    "serviceId",
    "phone",
    "name",
    "date",
    "locationId",
    "time",
    ...(staff ? (["note"] as const) : []),
  ];
}

type ScheduleState = "loading" | "pickDate" | "failed" | "dayOff" | "full" | null;

/** Why no time can be chosen, from the loaded schedule and the slots it leaves. */
export function scheduleState(
  loaded: AppointmentDay | "failed" | undefined,
  dateValid: boolean,
  hasHours: boolean | null,
  slotCount: number,
): ScheduleState {
  if (!dateValid) return "pickDate";
  if (loaded === undefined) return "loading";
  if (loaded === "failed") return "failed";
  if (hasHours === false) return "dayOff";
  return slotCount === 0 ? "full" : null;
}

/** The time list: every slot (a taken one says so on its second line), plus a kept value. */
export function timeOptions(
  t: AppointmentsCopy["booking"],
  slots: ReadonlyArray<SlotOption>,
  current: string,
): SelectOption[] {
  const options: SelectOption[] = slots.map((slot) => ({
    value: slot.time,
    label: slot.time,
    ...(slot.taken ? { description: t.taken } : {}),
  }));
  if (current && !slots.some((slot) => slot.time === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

export function BookingDialog({
  workspace,
  actions,
  open,
  onOpenChange,
  mode,
  meta,
  date: anchor,
  day,
  defaultSpecialistId,
  now,
  idempotency,
  onSaved,
}: BookingDialogProps) {
  // React Hook Form re-registers fields during render (see CategoryDialog).
  "use no memo";
  const copy = useCopy(appointmentsCopy);
  const t = copy.booking;
  const fmt = useFormat();
  const schemas = useLocalized(appointmentSchemas);
  const today = toLocalIsoDate(now);
  const editing = mode.kind === "reschedule" ? mode.appointment : null;
  const staff = workspace === "admin";
  const firstSpecialist =
    meta.specialists.find((s) => s.id === defaultSpecialistId) ?? meta.specialists[0];
  const defaults: FormValues = editing
    ? {
        specialistId: editing.specialistId,
        serviceId: editing.serviceId,
        phone: editing.customer.phone,
        name: "",
        date: toLocalIsoDate(editing.start),
        time: fmt.time(editing.start),
        note: "",
        customerAgreed: false,
      }
    : {
        specialistId: firstSpecialist?.id ?? "",
        serviceId: firstSpecialist?.services[0]?.id ?? "",
        phone: "",
        name: "",
        date: anchor < today ? today : anchor,
        time: "",
        note: "",
        customerAgreed: false,
      };
  // The server said no customer has the phone: the name field shows and becomes required.
  const [walkIn, setWalkIn] = useState(false);
  const resolver = useMemo(
    () =>
      zodResolver(
        editing
          ? schemas.reschedule.omit({ locationId: true }).extend({
              serviceId: z.string(),
              phone: z.string(),
              name: z.string(),
              note: z.string(),
              customerAgreed: z.boolean(),
            })
          : schemas.create.omit({ locationId: true }).extend({
              name: walkIn ? schemas.walkInName : z.string(),
              customerAgreed: z.boolean(),
            }),
      ),
    [editing, schemas, walkIn],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver, defaultValues: defaults, shouldFocusError: false });
  const errorsUi = useRhfReveal<FormValues>({
    formRef,
    labels: {
      specialistId: t.specialist,
      serviceId: t.service,
      phone: t.phone,
      name: t.name,
      locationId: t.clinic,
      date: t.date,
      time: t.time,
      note: t.note,
      customerAgreed: t.agreed,
    },
    errors,
  });
  const [specialistId, serviceId, date, time] = useWatch({
    control,
    name: ["specialistId", "serviceId", "date", "time"],
  });
  const inFlight = useRef(false);
  const dateValid = schemas.date.safeParse(date).success;

  // Schedules of other days than the board's, fetched once per date; a date without an entry
  // yet is loading.
  const [days, setDays] = useState<Record<string, AppointmentDay | "failed">>({});
  const requested = useRef(new Set<string>());
  const held = day && date === day.date ? day : undefined;
  const loaded = held ?? days[date];
  useEffect(() => {
    if (!open || held || requested.current.has(date) || !dateValid) return;
    requested.current.add(date);
    void runAction((csrf) => actions.loadDay(date, csrf)).then((result) =>
      setDays((current) => ({ ...current, [date]: result.ok ? result.data : "failed" })),
    );
  }, [open, date, held, dateValid, actions]);

  // Specialists who can take this visit: every bookable one (a move to another specialist picks
  // one of their services, since every service belongs to one specialist), plus the visit's own.
  const specialists = editing
    ? meta.specialists.filter((s) => s.id === editing.specialistId || s.services.length > 0)
    : meta.specialists;
  const specialist = meta.specialists.find((s) => s.id === specialistId);
  const services = specialist?.services ?? [];
  const changedSpecialist = editing !== null && specialistId !== editing.specialistId;
  const service = services.find(
    (s) => s.id === (editing && !changedSpecialist ? editing.serviceId : serviceId),
  );
  // A move keeps the snapshot unless the specialist changes (re-snapshot).
  const durationMin =
    editing && !changedSpecialist ? editing.durationMin : (service?.durationMin ?? 0);

  const schedule =
    loaded && typeof loaded === "object" ? specialistSchedule(loaded, specialistId) : null;
  const location =
    loaded && typeof loaded === "object"
      ? loaded.specialists.find((entry) => entry.id === specialistId)?.location
      : null;
  const slots = schedule
    ? slotOptions(schedule, durationMin, {
        step: meta.slotStepMin,
        notBefore: date === today ? tashkentMinutes(now) + 1 : 0,
        excludeId: editing?.id,
      })
    : [];
  const state = scheduleState(
    loaded,
    dateValid,
    schedule ? Boolean(schedule.workingHours) : null,
    slots.length,
  );

  // A specialist's move to the other clinic they work at that day (the backend asks for the
  // customer's agreement).
  const clinicMove =
    !staff && editing !== null && !!location && location.id !== editing.location.id;

  // Keep the chosen service valid for the chosen specialist: a move back to the visit's own
  // specialist keeps its service; another specialist offers the same-named service or their first.
  useEffect(() => {
    if (!specialist) return;
    if (editing && specialist.id === editing.specialistId) {
      if (getValues("serviceId") !== editing.serviceId) setValue("serviceId", editing.serviceId);
      return;
    }
    if (specialist.services.some((s) => s.id === getValues("serviceId"))) return;
    const sameName = editing && specialist.services.find((s) => s.name === editing.service);
    setValue("serviceId", (sameName || specialist.services[0])?.id ?? "");
  }, [editing, specialist, getValues, setValue]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(async (values) => {
      if (inFlight.current || !location) return;
      if (clinicMove && !values.customerAgreed) {
        const error = { type: "required", message: t.agreedRequired };
        setError("customerAgreed", error);
        errorsUi.onInvalid({ customerAgreed: error });
        return;
      }
      inFlight.current = true;
      setFormError(null);
      const name = values.name.trim();
      const result = idempotency.settle(
        await runAction((csrf) =>
          editing
            ? actions.reschedule(
                editing.id,
                {
                  specialistId: values.specialistId,
                  locationId: location.id,
                  date: values.date,
                  time: values.time,
                  ...(changedSpecialist ? { serviceId: values.serviceId } : {}),
                  ...(staff ? {} : { customerAgreed: values.customerAgreed }),
                },
                editing.specialistId,
                idempotency.key,
                csrf,
              )
            : actions.create(
                {
                  specialistId: values.specialistId,
                  locationId: location.id,
                  serviceId: values.serviceId,
                  phone: normalizePhone(values.phone),
                  date: values.date,
                  time: values.time,
                  // The staff note is not offered on a specialist's board (they cannot read it).
                  note: staff ? values.note : "",
                  ...(name ? { name } : {}),
                },
                idempotency.key,
                csrf,
              ),
        ),
      );
      inFlight.current = false;
      if (!result.ok) {
        // Anything aimed at a field the dialog does not show (a move's phone or note, the
        // specialist on a specialist's own board) becomes the form-level message.
        const { fieldErrors, formError: message } = partitionFieldErrors(
          result,
          renderedFields(workspace, mode.kind, { changedSpecialist, clinicMove }),
        );
        const serverErrors: FieldErrors<FormValues> = {};
        for (const [path, text] of Object.entries(fieldErrors)) {
          setError(path as Path<FormValues>, { type: "server", message: text });
          serverErrors[path as keyof FormValues] = { type: "server", message: text };
        }
        // An unknown phone: show the name field, which the reveal then focuses.
        if (fieldErrors.name) setWalkIn(true);
        setFormError(message);
        if (Object.keys(serverErrors).length > 0) errorsUi.onInvalid(serverErrors);
        return;
      }
      errorsUi.clear();
      onSaved(result.data);
      onOpenChange(false);
    }, errorsUi.onInvalid)(event);

  const specialistOptions: SelectOption[] = specialists.map((s) => ({
    value: s.id,
    label: s.name,
    ...(s.role ? { description: roleText(copy, s.role) } : {}),
  }));
  const serviceOptions: SelectOption[] = services.map((s) => ({
    value: s.id,
    label: s.name,
    description: `${fmt.duration(s.durationMin)} · ${fmt.som(s.price)}`,
  }));
  const timeHint =
    state !== null
      ? t.noSlots[state]
      : schedule?.workingHours
        ? t.workingHours(
            schedule.workingHours.start,
            schedule.workingHours.end,
            fmt.duration(durationMin),
          )
        : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
      title={editing ? t.titleMove : t.titleCreate}
      description={
        editing
          ? `${customerName(copy, editing.customer.name)} · ${editing.service}`
          : t.descriptionCreate
      }
      className="max-w-[560px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={errorsUi.summary} onSelect={errorsUi.select} />
        <div className={cn("grid gap-4", staff && "sm:grid-cols-2")}>
          {staff && (
            <Field name="specialistId" label={t.specialist} error={errors.specialistId?.message}>
              {(c) => (
                <FormSelect
                  {...c}
                  control={control}
                  name="specialistId"
                  options={specialistOptions}
                  placeholder={t.specialist}
                />
              )}
            </Field>
          )}
          {changedSpecialist ? (
            <Field name="serviceId" label={t.targetService} error={errors.serviceId?.message}>
              {(c) => (
                <FormSelect
                  {...c}
                  control={control}
                  name="serviceId"
                  options={serviceOptions}
                  placeholder={t.service}
                />
              )}
            </Field>
          ) : editing ? (
            <div className="flex flex-col gap-2">
              <span className="text-label text-ink">{t.service}</span>
              <span className="flex min-h-11 items-center rounded-md bg-surface px-3.5 text-body-sm text-ink">
                {editing.service} · {fmt.duration(durationMin)}
              </span>
            </div>
          ) : (
            <Field name="serviceId" label={t.service} error={errors.serviceId?.message}>
              {(c) => (
                <FormSelect
                  {...c}
                  control={control}
                  name="serviceId"
                  options={serviceOptions}
                  placeholder={t.service}
                />
              )}
            </Field>
          )}
        </div>

        {!editing && (
          <Field name="phone" label={t.phone} error={errors.phone?.message} hint={t.phoneHint}>
            {(c) => <FormPhoneInput {...c} control={control} name="phone" />}
          </Field>
        )}

        {!editing && walkIn && (
          <Field name="name" label={t.name} error={errors.name?.message} hint={t.nameHint}>
            {(c) => (
              <TextInput
                {...c}
                {...register("name")}
                autoComplete="off"
                maxLength={CUSTOMER_NAME_MAX}
              />
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="date" label={t.date} error={errors.date?.message}>
            {(c) => (
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    {...c}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onValueChange={(value) => {
                      if (value !== field.value) setValue("time", "");
                      field.onChange(value);
                    }}
                    min={today}
                    today={today}
                  />
                )}
              />
            )}
          </Field>
          <Field name="time" label={t.time} error={errors.time?.message} hint={timeHint}>
            {(c) => (
              <FormSelect
                {...c}
                control={control}
                name="time"
                options={timeOptions(t, slots, time)}
                placeholder={t.chooseTime}
                disabledReason={slots.length === 0 && !time && state !== null && t.noSlots[state]}
              />
            )}
          </Field>
        </div>

        <Field
          name="locationId"
          label={t.clinic}
          error={errors.locationId?.message}
          hint={location?.address}
        >
          {(control) => (
            <TextInput
              {...control}
              readOnly
              value={location?.name ?? (state ? t.noSlots[state] : t.noClinic)}
            />
          )}
        </Field>

        {!editing && staff && (
          <Field name="note" label={t.note} error={errors.note?.message} hint={t.noteHint}>
            {(c) => <TextArea {...c} {...register("note")} rows={2} maxLength={NOTE_MAX} />}
          </Field>
        )}

        {clinicMove && location && (
          <div
            className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3"
            data-field="customerAgreed"
            data-invalid={errors.customerAgreed ? "true" : undefined}
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-label text-ink">{t.agreed}</span>
              <span className="text-caption font-normal text-ink-muted">
                {t.agreedHint(location.name)}
              </span>
              {errors.customerAgreed && (
                <span role="alert" className="text-body-sm font-semibold text-danger">
                  {errors.customerAgreed.message}
                </span>
              )}
            </span>
            <Controller
              control={control}
              name="customerAgreed"
              render={({ field }) => (
                <Switch
                  ref={field.ref}
                  name={field.name}
                  checked={field.value}
                  onBlur={field.onBlur}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) clearErrors("customerAgreed");
                  }}
                  aria-label={t.agreed}
                />
              )}
            />
          </div>
        )}

        {changedSpecialist && service && (
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <Icon name="info" size={16} className="mt-px shrink-0" />
            {t.respecialist(fmt.duration(service.durationMin), fmt.som(service.price))}
          </p>
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
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabledReason={isSubmitting && t.savingWait}
            onClick={() => onOpenChange(false)}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            busy={isSubmitting}
            disabledReason={!location && (state ? t.noSlots[state] : t.noClinic)}
          >
            <Icon name="check" size={18} />
            {isSubmitting ? t.saving : editing ? t.submitMove : t.submitCreate}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
