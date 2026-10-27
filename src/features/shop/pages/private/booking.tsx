import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getAppointments, type AppointmentScope } from "@/data/shop/account";
import { getSettings, getSpecialists } from "@/data/shop/catalog";
import { storefrontEnabled } from "@/data/shop/mode";
import { privateRead } from "@/data/shop/private";
import type { AppointmentStatus } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import { formatDuration, formatLongDate, formatTime, toLocalIsoDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { AccountShell, BodySkeleton, Pager, privateMetadata } from "../../account/account-shell";
import { AppointmentCancel } from "../../booking/appointment-cancel";
import { BookingFlow, type BookingSpecialist } from "../../booking/booking-flow";
import { Container, PageHeading } from "../../components/layout-primitives";
import { getShopDictionary } from "../../content";
import { bookingCopy } from "../../copy/booking";
import { shopHref, shopPath } from "../../routing/routes";
import { settle } from "../settle";
import { first, pageNumber, privateGate, type LocaleInput, type SearchParams } from "./shared";

/** `/qabulga-yozilish` · `/{ru,en}/book` and `/qabullarim` · `/{ru,en}/appointments`. */

export async function bookingMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "booking" }, bookingCopy[locale].booking.title);
}

export async function appointmentsMetadata(localeInput: LocaleInput): Promise<Metadata> {
  const locale = await localeInput;
  return privateMetadata(locale, { kind: "appointments" }, bookingCopy[locale].appointments.title);
}

function positive(value: string | undefined): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function BookingBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  if (!(await storefrontEnabled())) notFound();
  const params = await searchParams;
  const [specialists, settings] = await Promise.all([
    getSpecialists(locale),
    settle(getSettings(locale), null, "settings"),
  ]);
  const options: BookingSpecialist[] = specialists
    .filter((item) => item.services.length > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      roleLabel: item.roleLabel,
      photo: item.photo,
      experienceYears: item.experienceYears,
      location: {
        name: item.location.name,
        address: item.location.address,
        phone: item.location.phone,
      },
      services: item.services.map((service) => ({
        id: service.id,
        name: service.shortName || service.name,
        durationMin: service.durationMin,
        price: service.price,
      })),
    }));
  const today = toLocalIsoDate(new Date());
  const date = first(params.date);
  const time = first(params.time);
  return (
    <BookingFlow
      locale={locale}
      specialists={options}
      today={today}
      termsVersion={settings?.termsVersion ?? null}
      termsHref={shopPath(locale, { kind: "terms" })}
      initial={{
        specialist: positive(first(params.specialist)),
        service: positive(first(params.service)),
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today ? date : null,
        time: time && /^\d{2}:\d{2}$/.test(time) ? time : null,
      }}
    />
  );
}

export async function BookingPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = bookingCopy[locale].booking;
  return (
    <Container className="pb-[clamp(56px,7vw,112px)]">
      <PageHeading
        eyebrow={getShopDictionary(locale).footer.clinicHeading}
        title={copy.title}
        lead={copy.lead}
      >
        <Link
          href={shopPath(locale, { kind: "bookingPolicy" })}
          className="self-start text-label text-ink underline decoration-gold underline-offset-4"
        >
          {copy.policy}
        </Link>
      </PageHeading>
      <div className="max-w-[860px]">
        <Suspense fallback={<BodySkeleton />}>
          <BookingBody locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

/* --- my appointments ------------------------------------------------------ */

function appointmentTone(status: AppointmentStatus): Tone {
  if (status === "confirmed") return "success";
  if (status === "requested") return "warning";
  if (status === "attended") return "gold";
  return "muted";
}

async function AppointmentsBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const scope: AppointmentScope = first(params.scope) === "past" ? "past" : "upcoming";
  const page = pageNumber(params.page);
  const next = shopHref(
    locale,
    { kind: "appointments" },
    { scope: scope === "past" ? "past" : undefined, page: page > 1 ? page : undefined },
  );
  await privateGate(locale, next);
  const list = await privateRead(next, () => getAppointments(locale, scope, page));
  const copy = bookingCopy[locale];
  const t = copy.appointments;

  return (
    <>
      <nav aria-label={t.scopeLabel} className="flex flex-wrap gap-2">
        {(["upcoming", "past"] as const).map((value) => (
          <Link
            key={value}
            href={shopHref(
              locale,
              { kind: "appointments" },
              { scope: value === "past" ? "past" : undefined },
            )}
            aria-current={value === scope ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-4 text-label no-underline transition-colors",
              value === scope
                ? "border-ink bg-ink text-surface"
                : "border-line text-ink hover:bg-gold-soft",
            )}
          >
            {t.scopes[value]}
          </Link>
        ))}
      </nav>
      {list.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface-raised p-8">
          <p className="m-0 font-serif text-headline-sm font-semibold">{t.empty[scope]}</p>
          <Link
            href={shopPath(locale, { kind: "booking" })}
            className={buttonStyles({ size: "lg" })}
          >
            {t.book}
          </Link>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.items.map((item) => {
            const when = `${formatLongDate(item.start, locale)}, ${formatTime(item.start)}`;
            const open = item.status === "requested" || item.status === "confirmed";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-5 sm:flex-row sm:items-center"
              >
                <div className="flex w-20 shrink-0 flex-col items-center rounded-md bg-gold-soft py-2 text-center">
                  <span className="font-serif text-[30px] leading-8 font-semibold tabular-nums">
                    {formatTime(item.start)}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {formatDuration(item.durationMin, locale)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-image-well">
                    {item.specialist.photo ? (
                      <Image
                        src={item.specialist.photo}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-ink-muted">
                        <Icon name="user" size={22} />
                      </span>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-label">{item.service.name}</span>
                      <Badge tone={appointmentTone(item.status)}>{item.statusLabel}</Badge>
                    </div>
                    <span className="text-body-sm text-ink-muted">
                      {item.specialist.name} · {item.specialist.roleLabel}
                    </span>
                    <span className="text-body-sm text-ink">{when}</span>
                    {item.location.address ? (
                      <span className="text-caption text-ink-muted">{item.location.address}</span>
                    ) : null}
                    {item.cancelledBy === "admin" ? (
                      <span className="text-caption text-ink-muted">{t.cancelledByClinic}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <span className="text-label tabular-nums">{copy.money(item.price)}</span>
                  {item.canCancel ? (
                    <AppointmentCancel locale={locale} id={item.id} when={when} />
                  ) : open && scope === "upcoming" ? (
                    <span className="max-w-[240px] text-caption text-ink-muted sm:text-right">
                      {t.cancelPolicy}
                      {item.location.phone ? (
                        <>
                          {" "}
                          <a
                            href={`tel:${item.location.phone}`}
                            className="font-semibold text-ink underline"
                          >
                            {t.call}
                          </a>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pager
        locale={locale}
        page={list.page}
        pageCount={list.pageCount}
        hrefFor={(n) =>
          shopHref(
            locale,
            { kind: "appointments" },
            { scope: scope === "past" ? "past" : undefined, page: n > 1 ? n : undefined },
          )
        }
      />
    </>
  );
}

export async function AppointmentsPage({
  locale: localeInput,
  searchParams,
}: {
  locale: LocaleInput;
  searchParams: SearchParams;
}) {
  const locale = await localeInput;
  const copy = bookingCopy[locale].appointments;
  return (
    <AccountShell
      locale={locale}
      section="appointments"
      title={copy.title}
      lead={copy.lead}
      actions={
        <Link href={shopPath(locale, { kind: "booking" })} className={buttonStyles({ size: "md" })}>
          <Icon name="plus" size={18} />
          {copy.book}
        </Link>
      }
    >
      <Suspense fallback={<BodySkeleton />}>
        <AppointmentsBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </AccountShell>
  );
}
