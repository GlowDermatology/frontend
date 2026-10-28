"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { acceptTerms } from "@/data/shop/account.actions";
import { bookAppointment, freeSlots } from "@/data/shop/commerce.actions";
import type { ShopSlots } from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import { cn } from "@/lib/cn";
import {
  addDays,
  formatDayMonthShortLocale,
  formatDuration,
  formatLongDate,
  formatWeekdayShort,
  startOfLocalDay,
} from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { useSignedInHint } from "../account/session-context";
import { failureText, useShopAction } from "../account/use-shop-action";
import { bookingCopy } from "../copy/booking";
import { commonCopy } from "../copy/common";
import { shopHref, shopPath } from "../routing/routes";
import { hasSignedInHint, runShopAction } from "../shared/action-client";

/**
 * Booking (contract §2.11): specialist → service → date → free time →
 * confirm. The selection lives in the URL (`?specialist=&service=&date=
 * &time=`), so the links of the specialist and service pages land on the
 * right step and sign-in returns to it. Free times come from the public
 * slots endpoint; confirming needs a session and a phone (the gate), and a
 * lost race (`slot_taken`) reloads the day's times.
 */

export interface BookingSpecialist {
  id: number;
  name: string;
  roleLabel: string;
  photo: string | null;
  experienceYears: number | null;
  location: { name: string; address: string; phone: string | null };
  services: ReadonlyArray<{ id: number; name: string; durationMin: number; price: number }>;
}

interface Selection {
  specialist: number | null;
  service: number | null;
  date: string | null;
  time: string | null;
}

const HORIZON_DAYS = 30;

export function selectionQuery(selection: Selection) {
  return {
    specialist: selection.specialist ?? undefined,
    service: selection.service ?? undefined,
    date: selection.date ?? undefined,
    time: selection.time ?? undefined,
  };
}

export function BookingFlow({
  locale,
  specialists,
  initial,
  today,
  termsVersion,
  termsHref,
}: {
  locale: Locale;
  specialists: ReadonlyArray<BookingSpecialist>;
  initial: Selection;
  today: string;
  termsVersion: string | null;
  termsHref: string;
}) {
  const copy = bookingCopy[locale].booking;
  const money = bookingCopy[locale].money;
  const common = commonCopy[locale];
  const [selection, setSelection] = useState<Selection>(initial);
  const [slots, setSlots] = useState<ShopSlots | null>(null);
  const [slotsFor, setSlotsFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [booked, setBooked] = useState(false);
  const slotRunner = useShopAction(locale);
  const bookRunner = useShopAction(locale);
  const key = useIdempotencyKey();
  const signedIn = useSignedInHint();

  const specialist = specialists.find((item) => item.id === selection.specialist) ?? null;
  const service = specialist?.services.find((item) => item.id === selection.service) ?? null;
  const visibleSpecialists =
    selection.service && !selection.specialist
      ? specialists.filter((item) => item.services.some((s) => s.id === selection.service))
      : specialists;
  const slotKey =
    specialist && service && selection.date
      ? `${specialist.id}:${service.id}:${selection.date}`
      : null;

  const update = (patch: Partial<Selection>) => {
    const next = { ...selection, ...patch };
    setSelection(next);
    window.history.replaceState(
      null,
      "",
      shopHref(locale, { kind: "booking" }, selectionQuery(next)),
    );
  };

  const loadSlots = slotRunner.run;
  useEffect(() => {
    if (!slotKey || !specialist || !service || !selection.date) return;
    let cancelled = false;
    const date = selection.date;
    void loadSlots((csrf) => {
      void csrf;
      return freeSlots({ locale, specialistId: specialist.id, serviceId: service.id, date });
    }).then((result) => {
      if (cancelled) return;
      setSlots(result.ok ? result.data : null);
      setSlotsFor(slotKey);
    });
    return () => {
      cancelled = true;
    };
  }, [slotKey, specialist, service, selection.date, locale, loadSlots]);

  const days = Array.from({ length: HORIZON_DAYS }, (_, index) => addDays(today, index));
  const slot =
    slotsFor === slotKey
      ? (slots?.slots.find((item) => item.start === selection.time) ?? null)
      : null;
  const currentPath = shopHref(locale, { kind: "booking" }, selectionQuery(selection));

  const confirm = async () => {
    if (!specialist || !service || !slot) return;
    if (!hasSignedInHint()) {
      window.location.assign(shopHref(locale, { kind: "signIn" }, { next: currentPath }));
      return;
    }
    const result = key.settle(
      await bookRunner.run((csrf) =>
        bookAppointment({
          locale,
          specialistId: specialist.id,
          serviceId: service.id,
          start: slot.startAt,
          note,
          idempotencyKey: key.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      setBooked(true);
      return;
    }
    if (result.code === "phone_required") setGateOpen(true);
    else if (result.code === "terms_update_required") setConsent(true);
    else if (result.code === "slot_taken" || result.fieldErrors?.start) {
      update({ time: null });
      setSlotsFor(null);
    }
  };

  const accept = async () => {
    if (!termsVersion) return;
    const result = await runShopAction(locale, (csrf) =>
      acceptTerms({ locale, termsVersion, csrf }),
    );
    if (result.ok) {
      setConsent(false);
      await confirm();
    }
  };

  if (booked && specialist && service && slot) {
    return (
      <section
        role="status"
        className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface-raised px-6 py-14 text-center"
      >
        <span className="flex size-16 animate-pop-in items-center justify-center rounded-full bg-success-soft text-success">
          <Icon name="check" size={30} strokeWidth={2} />
        </span>
        <h2 className="m-0 font-serif text-headline-sm font-semibold">{copy.successTitle}</h2>
        <p className="m-0 text-lead text-ink">
          {specialist.name} · {service.name}
        </p>
        <p className="m-0 text-body text-ink-muted">
          {formatLongDate(slot.startAt, locale)}, {slot.start}
        </p>
        <p className="m-0 max-w-[460px] text-body text-ink-muted">{copy.successBody}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            href={shopPath(locale, { kind: "appointments" })}
            className={buttonStyles({ size: "lg" })}
          >
            {copy.toAppointments}
          </Link>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setBooked(false);
              update({ specialist: null, service: null, date: null, time: null });
            }}
          >
            {copy.bookAnother}
          </Button>
        </div>
      </section>
    );
  }

  const stepClass =
    "flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-[clamp(18px,2.4vw,28px)]";
  const heading = (number: number, title: string, done: string | null, onChange?: () => void) => (
    // One row in every state: the change button never wraps under a long
    // name, so done steps line up (polish).
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 flex min-w-0 flex-1 items-center gap-3 text-subheading">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-label",
            done ? "bg-gold text-on-gold" : "bg-gold-soft text-gold-ink",
          )}
        >
          {done ? <Icon name="check" size={16} strokeWidth={2.2} /> : number}
        </span>
        <span className="min-w-0 text-pretty">{done ?? title}</span>
      </h2>
      {done && onChange ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={onChange}>
          {copy.change}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Specialist */}
      <section className={stepClass} aria-label={copy.steps.specialist}>
        {heading(
          1,
          copy.chooseSpecialist,
          specialist ? `${specialist.name} · ${specialist.roleLabel}` : null,
          () => update({ specialist: null, service: selection.service, date: null, time: null }),
        )}
        {!specialist ? (
          visibleSpecialists.length === 0 ? (
            <p className="m-0 text-body text-ink-muted">{copy.noSpecialists}</p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {visibleSpecialists.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        specialist: item.id,
                        service: item.services.some((s) => s.id === selection.service)
                          ? selection.service
                          : null,
                        date: null,
                        time: null,
                      })
                    }
                    className="flex w-full items-center gap-4 rounded-md border border-line p-3 text-left transition-colors hover:border-gold-ink hover:bg-gold-soft/40"
                  >
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-full bg-image-well">
                      {item.photo ? (
                        <Image src={item.photo} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-ink-muted">
                          <Icon name="user" size={26} />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-serif text-[20px] leading-6 font-semibold">
                        {item.name}
                      </span>
                      <span className="text-body-sm text-ink-muted">
                        {item.roleLabel}
                        {item.experienceYears ? ` · ${copy.experience(item.experienceYears)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {/* 2. Service */}
      {specialist ? (
        <section className={stepClass} aria-label={copy.steps.service}>
          {heading(2, copy.chooseService, service ? service.name : null, () =>
            update({ service: null, date: null, time: null }),
          )}
          {!service ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {specialist.services.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      update({ service: item.id, date: selection.date ?? today, time: null })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-md border border-line p-4 text-left transition-colors hover:border-gold-ink hover:bg-gold-soft/40"
                  >
                    <span className="flex flex-col">
                      <span className="text-label">{item.name}</span>
                      <span className="text-body-sm text-ink-muted">
                        {formatDuration(item.durationMin, locale)}
                      </span>
                    </span>
                    <span className="text-label tabular-nums">{money(item.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* 3–4. Date and time */}
      {specialist && service ? (
        <section className={stepClass} aria-label={`${copy.steps.date}, ${copy.steps.time}`}>
          {heading(3, copy.chooseDate, null)}
          <div
            role="radiogroup"
            aria-label={copy.chooseDate}
            className="-mx-1 flex [scrollbar-width:thin] gap-2 overflow-x-auto px-1 pb-2"
          >
            {days.map((day) => {
              const active = selection.date === day;
              const instant = startOfLocalDay(day);
              return (
                <button
                  key={day}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ date: day, time: null })}
                  className={cn(
                    "flex w-16 shrink-0 flex-col items-center gap-1 rounded-md border py-2.5 transition-colors",
                    active ? "border-ink bg-ink text-surface" : "border-line hover:border-gold-ink",
                  )}
                >
                  <span
                    className={cn(
                      "text-caption uppercase",
                      active ? "text-surface" : "text-ink-muted",
                    )}
                  >
                    {day === today ? copy.today : formatWeekdayShort(instant, locale)}
                  </span>
                  <span className="text-label tabular-nums">
                    {formatDayMonthShortLocale(instant, locale)}
                  </span>
                </button>
              );
            })}
          </div>
          {selection.date ? (
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-label text-ink">{copy.chooseTime}</h3>
              {slotRunner.pending || slotsFor !== slotKey ? (
                <p className="m-0 text-body-sm text-ink-muted" role="status">
                  {copy.loadingSlots}
                </p>
              ) : !slots ? (
                slotRunner.error ? (
                  <FormAlert>{failureText(slotRunner.error, locale)}</FormAlert>
                ) : null
              ) : slots.slots.length === 0 ? (
                <p className="m-0 text-body text-ink-muted">
                  {slots.workingHours ? copy.noSlots : copy.notWorking}
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label={copy.slotsLabel(
                    formatLongDate(startOfLocalDay(selection.date), locale),
                  )}
                  className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2"
                >
                  {slots.slots.map((item) => (
                    <button
                      key={item.start}
                      type="button"
                      role="radio"
                      aria-checked={selection.time === item.start}
                      onClick={() => update({ time: item.start })}
                      className={cn(
                        "h-11 rounded-md border text-label tabular-nums transition-colors",
                        selection.time === item.start
                          ? "border-gold-ink bg-gold text-on-gold"
                          : "border-line hover:border-gold-ink",
                      )}
                    >
                      {item.start}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 5. Confirm */}
      {specialist && service && slot ? (
        <section className={cn(stepClass, "border-gold-ink")} aria-labelledby="booking-confirm">
          <h2 id="booking-confirm" className="m-0 font-serif text-[26px] leading-8 font-semibold">
            {copy.summaryTitle}
          </h2>
          <dl className="m-0 grid gap-3 text-body sm:grid-cols-2">
            <div className="flex flex-col">
              <dt className="text-body-sm text-ink-muted">{copy.steps.specialist}</dt>
              <dd className="m-0 font-semibold">{specialist.name}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-body-sm text-ink-muted">{copy.steps.service}</dt>
              <dd className="m-0 font-semibold">{service.name}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-body-sm text-ink-muted">{copy.steps.time}</dt>
              <dd className="m-0 font-semibold">
                {formatLongDate(slot.startAt, locale)}, {slot.start}–{slot.end}
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-body-sm text-ink-muted">{copy.price}</dt>
              <dd className="m-0 font-semibold tabular-nums">
                {money(slots?.price ?? service.price)} ·{" "}
                {formatDuration(slots?.durationMin ?? service.durationMin, locale)}
              </dd>
            </div>
            {specialist.location.address ? (
              <div className="flex flex-col sm:col-span-2">
                <dt className="text-body-sm text-ink-muted">{copy.where}</dt>
                <dd className="m-0">
                  {specialist.location.name} · {specialist.location.address}
                </dd>
              </div>
            ) : null}
          </dl>
          <Field label={copy.noteLabel}>
            {(control) => (
              <TextArea
                {...control}
                rows={2}
                maxLength={300}
                placeholder={copy.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </Field>
          {consent ? (
            <div role="alert" className="flex flex-col gap-3 rounded-md bg-gold-soft p-4">
              <p className="m-0 text-label">{common.consent.title}</p>
              <p className="m-0 text-body-sm text-ink">{common.consent.body}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={termsHref}
                  target="_blank"
                  rel="noopener"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  {common.consent.read}
                </a>
                <Button size="sm" onClick={() => void accept()}>
                  {common.consent.accept}
                </Button>
              </div>
            </div>
          ) : null}
          {bookRunner.error &&
          !["phone_required", "terms_update_required"].includes(bookRunner.error.code ?? "") ? (
            <FormAlert>
              {bookRunner.error.code === "slot_taken"
                ? copy.slotTaken
                : failureText(bookRunner.error, locale)}
            </FormAlert>
          ) : null}
          <Button
            size="xl"
            lift
            onClick={() => void confirm()}
            disabled={bookRunner.pending}
            aria-busy={bookRunner.pending || undefined}
          >
            {signedIn ? copy.confirm : copy.signInToConfirm}
          </Button>
        </section>
      ) : null}

      <PhoneGate
        locale={locale}
        open={gateOpen}
        onOpenChange={setGateOpen}
        next={currentPath}
        onAttached={() => void confirm()}
      />
    </div>
  );
}
