"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  createAppointment,
  loadAppointmentDay,
  rescheduleAppointment,
} from "@/data/appointments.actions";
import type { AppointmentDay, DayAppointment } from "@/data/appointments";
import {
  bookingDateSchema,
  bookingTimeSchema,
  createAppointmentSchema,
} from "@/data/appointments.schema";
import {
  NOTE_MAX,
  slotOptions,
  specialistSchedule,
  tashkentMinutes,
  type BookingMeta,
} from "@/domain/appointment";
import { formatSom, formatTime, toLocalIsoDate } from "@/lib/format";
import { maskPhone, normalizePhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import type { IdempotencyKey } from "../shared/idempotency";

/**
 * Admin booking dialogs (contract §2.9 T10): "Qabul qo‘shish" creates a
 * confirmed visit for a customer found by phone; "Vaqtni o‘zgartirish" /
 * "Ko‘chirish" moves a visit to a new start and optionally to another
 * specialist who offers the same service. The time list is the 5-minute grid
 * inside the chosen specialist's working hours of the chosen day (from the
 * board's day, or that day's schedule fetched when another date is picked);
 * starts that collide with a break or a held visit are marked "band" but stay
 * selectable, because the backend is the authority and answers the field
 * error itself (`slot_unavailable`, `outside_working_hours`, `in_past`, a
 * 409 race → "Bu vaqt band." on the time field).
 */

type Mode = { kind: "create" } | { kind: "reschedule"; appointment: DayAppointment };

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  meta: BookingMeta;
  /** The day the board shows, and its loaded schedule. */
  day: AppointmentDay;
  /** Server "now" (ISO): today's date and the earliest start. */
  now: string;
  /** Owned by the board so it survives re-opens until a success (contract §1.7). */
  idempotency: IdempotencyKey;
  onSaved: (appointment: DayAppointment) => void;
}

const formSchema = z.object({
  specialistId: z.string().min(1, "Mutaxassisni tanlang."),
  serviceId: z.string(),
  phone: z.string(),
  date: bookingDateSchema,
  time: bookingTimeSchema,
  note: z.string().max(NOTE_MAX, `${NOTE_MAX} belgidan oshmasin.`),
});
type FormValues = z.infer<typeof formSchema>;

const createRules = formSchema.superRefine((values, ctx) => {
  const parsed = createAppointmentSchema.safeParse({
    ...values,
    phone: normalizePhone(values.phone),
  });
  if (parsed.success) return;
  for (const issue of parsed.error.issues) {
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
});

export function BookingDialog({
  open,
  onOpenChange,
  mode,
  meta,
  day,
  now,
  idempotency,
  onSaved,
}: BookingDialogProps) {
  // React Hook Form re-registers fields during render (see CategoryDialog).
  "use no memo";
  const today = toLocalIsoDate(now);
  const editing = mode.kind === "reschedule" ? mode.appointment : null;
  const firstSpecialist = meta.specialists[0];
  const defaults: FormValues = editing
    ? {
        specialistId: editing.specialistId,
        serviceId: editing.serviceId,
        phone: editing.customer.phone,
        date: toLocalIsoDate(editing.start),
        time: formatTime(editing.start),
        note: "",
      }
    : {
        specialistId: firstSpecialist?.id ?? "",
        serviceId: firstSpecialist?.services[0]?.id ?? "",
        phone: "",
        date: day.date < today ? today : day.date,
        time: "",
        note: "",
      };
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(editing ? formSchema : createRules),
    defaultValues: defaults,
  });
  const [specialistId, serviceId, date, time] = useWatch({
    control,
    name: ["specialistId", "serviceId", "date", "time"],
  });
  const inFlight = useRef(false);

  // Schedules of other days than the board's, fetched once per date; a date
  // without an entry yet is loading.
  const [days, setDays] = useState<Record<string, AppointmentDay | "failed">>({});
  const requested = useRef(new Set<string>());
  const loaded = date === day.date ? day : days[date];
  useEffect(() => {
    if (!open || date === day.date || requested.current.has(date)) return;
    if (!bookingDateSchema.safeParse(date).success) return;
    requested.current.add(date);
    void runAction((csrf) => loadAppointmentDay(date, csrf)).then((result) =>
      setDays((current) => ({ ...current, [date]: result.ok ? result.data : "failed" })),
    );
  }, [open, date, day.date]);

  // Specialists who can take this visit: everyone for a new booking, those
  // offering the visit's service for a move.
  const specialists = editing
    ? meta.specialists.filter((s) => s.services.some((v) => v.id === editing.serviceId))
    : meta.specialists;
  const specialist = meta.specialists.find((s) => s.id === specialistId);
  const services = specialist?.services ?? [];
  const service = services.find((s) => s.id === (editing ? editing.serviceId : serviceId));
  // A move keeps the snapshot unless the specialist changes (re-snapshot).
  const durationMin =
    editing && specialistId === editing.specialistId
      ? editing.durationMin
      : (service?.durationMin ?? 0);

  const schedule =
    loaded && typeof loaded === "object" ? specialistSchedule(loaded, specialistId) : null;
  const slots = schedule
    ? slotOptions(schedule, durationMin, {
        step: meta.slotStepMin,
        notBefore: date === today ? tashkentMinutes(now) + 1 : 0,
        excludeId: editing?.id,
      })
    : [];

  // Keep the chosen service valid for the chosen specialist.
  useEffect(() => {
    if (editing || !specialist) return;
    if (!specialist.services.some((s) => s.id === getValues("serviceId"))) {
      setValue("serviceId", specialist.services[0]?.id ?? "");
    }
  }, [editing, specialist, getValues, setValue]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(async (values) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setFormError(null);
      const result = idempotency.settle(
        await runAction((csrf) =>
          editing
            ? rescheduleAppointment(
                editing.id,
                { specialistId: values.specialistId, date: values.date, time: values.time },
                editing.specialistId,
                idempotency.key,
                csrf,
              )
            : createAppointment(
                {
                  specialistId: values.specialistId,
                  serviceId: values.serviceId,
                  phone: normalizePhone(values.phone),
                  date: values.date,
                  time: values.time,
                  note: values.note,
                },
                idempotency.key,
                csrf,
              ),
        ),
      );
      inFlight.current = false;
      if (!result.ok) {
        const entries = Object.entries(result.fieldErrors ?? {});
        for (const [path, message] of entries) setError(path as Path<FormValues>, { message });
        if (entries.length === 0) setFormError(result.error);
        return;
      }
      onSaved(result.data);
      onOpenChange(false);
    })(event);

  const scheduleState =
    loaded === undefined
      ? bookingDateSchema.safeParse(date).success
        ? "Jadval yuklanmoqda…"
        : "Sanani tanlang."
      : loaded === "failed"
        ? "Bu kunning jadvalini yuklab bo‘lmadi."
        : schedule && !schedule.workingHours
          ? "Mutaxassis bu kuni ishlamaydi."
          : slots.length === 0
            ? "Bu kunga bo‘sh vaqt qolmadi."
            : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
      title={editing ? "Qabul vaqtini o‘zgartirish" : "Yangi qabul"}
      description={
        editing
          ? `${editing.customer.name} · ${editing.service}`
          : "Qabul darhol tasdiqlangan holatda yoziladi; mijozga push yuborilmaydi."
      }
      className="max-w-[560px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mutaxassis" error={errors.specialistId?.message}>
            {(c) => (
              <Select {...c} {...register("specialistId")}>
                {specialists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {editing ? (
            <div className="flex flex-col gap-2">
              <span className="text-label text-ink">Xizmat</span>
              <span className="flex min-h-11 items-center rounded-md bg-surface px-3.5 text-body-sm text-ink">
                {editing.service} · {durationMin} daqiqa
              </span>
            </div>
          ) : (
            <Field label="Xizmat" error={errors.serviceId?.message}>
              {(c) => (
                <Select {...c} {...register("serviceId")}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMin} daqiqa · {formatSom(s.price)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>

        {!editing && (
          <Field
            label="Mijoz telefoni"
            error={errors.phone?.message}
            hint="Ilovada ro‘yxatdan o‘tgan mijoz raqami."
          >
            {(c) => (
              <TextInput
                {...c}
                {...register("phone", {
                  onChange: (event) =>
                    setValue("phone", maskPhone(event.target.value), { shouldDirty: true }),
                })}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+998 90 123 45 67"
                className="tabular-nums"
              />
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sana" error={errors.date?.message}>
            {(c) => (
              <TextInput
                {...c}
                {...register("date", {
                  onChange: () => setValue("time", ""),
                })}
                type="date"
                min={today}
                className="tabular-nums"
              />
            )}
          </Field>
          <Field
            label="Vaqt"
            error={errors.time?.message}
            hint={
              scheduleState ??
              (schedule?.workingHours
                ? `Ish vaqti ${schedule.workingHours.start}–${schedule.workingHours.end}, ${durationMin} daqiqa`
                : undefined)
            }
          >
            {(c) => (
              <Select {...c} {...register("time")} disabled={slots.length === 0}>
                <option value="">Vaqtni tanlang</option>
                {slots.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {slot.taken ? `${slot.time} · band` : slot.time}
                  </option>
                ))}
                {time && !slots.some((slot) => slot.time === time) && (
                  <option value={time}>{time}</option>
                )}
              </Select>
            )}
          </Field>
        </div>

        {!editing && (
          <Field
            label="Izoh (ixtiyoriy)"
            error={errors.note?.message}
            hint="Faqat xodimlar ko‘radi."
          >
            {(c) => <TextArea {...c} {...register("note")} rows={2} maxLength={NOTE_MAX} />}
          </Field>
        )}

        {editing && specialistId !== editing.specialistId && service && (
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <Icon name="info" size={16} className="mt-px shrink-0" />
            Mutaxassis almashsa narx va davomiylik uning narxidan olinadi: {
              service.durationMin
            }{" "}
            daqiqa · {formatSom(service.price)}.
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
          <DialogClose disabled={isSubmitting} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            <Icon name="check" size={18} />
            {isSubmitting ? "Saqlanmoqda…" : editing ? "Ko‘chirish" : "Qabulni yozish"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
