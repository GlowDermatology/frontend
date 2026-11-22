import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import type { AppointmentRangeDay, DayAppointment } from "@/data/appointments";
import { mapDayAppointment, roleLabel } from "@/data/api/mappers/appointments";
import { BOOKING_META, SPECIALISTS } from "@/data/mock/appointments";
import { visitActions } from "@/domain/appointment";
import { getAppointmentRange } from "@/data/mock/appointments.queries";
import { createFormatter } from "@/lib/format";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { BoardHeader, addBlockerOf, periodLabel } from "./board-header";
import { renderedFields, scheduleState, timeOptions } from "./booking-dialog";
import { appointmentsCopy } from "./copy";
import { blockText, roleText } from "./labels";
import { monthCells } from "./layout";
import { MonthGrid, monthCellLabel } from "./month-grid";
import { WeekGrid, weekdayName } from "./week-grid";

/**
 * The board's islands in a server render (DESIGN §B): the header's controls and the add button's
 * reason, the week grid's columns, lanes and «+N», the month grid's cells and spoken summaries,
 * and the booking dialog's pure helpers.
 */

const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;
const render = (node: ReturnType<typeof createElement>, locale: Locale = "uz") =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));

const TODAY = "2026-10-26";
const uz = appointmentsCopy.uz;

const headerProps = {
  board: { view: "week" as const, date: "2026-10-28", specialist: "" },
  today: TODAY,
  pendingCount: 3,
  pendingNextAt: "2026-10-26T09:00:00+05:00",
  workspace: "admin" as const,
  specialists: SPECIALISTS.map((s) => ({ id: s.id, name: s.name, role: s.role })),
  addBlocker: null,
  onAdd: () => undefined,
  navigating: false,
  navigate: () => undefined,
};

describe("BoardHeader", () => {
  it("links the neighbouring periods and keeps «Bugun» explained when it has nothing to do", () => {
    const html = render(createElement(BoardHeader, headerProps));
    expect(html).toContain('href="/admin/appointments?view=week&amp;date=2026-10-21"');
    expect(html).toContain('href="/admin/appointments?view=week&amp;date=2026-11-04"');
    expect(html).toContain(`aria-label="${uz.header.prev.week}"`);
    // The shown week holds today: «Bugun» is a disabled-reason button, not a link.
    expect(html).toContain(uz.header.showsToday);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain(uz.header.allSpecialists);
    expect(html).toContain(uz.pending(3));
  });

  it("explains the add button and links the specialists page when nobody can be booked", () => {
    const html = render(
      createElement(BoardHeader, { ...headerProps, addBlocker: "specialists" as const }),
    );
    expect(html).toContain(uz.header.addDisabled);
    expect(html).toContain('href="/admin/specialists"');
    expect(html).toMatch(/aria-disabled="true"[^>]*>(?:(?!<\/button>).)*Qabul qo‘shish/);
  });

  it("drops the specialist filter on a specialist's own board and links the page that fixes «add»", () => {
    const own = { ...headerProps, workspace: "specialist" as const, specialists: [] };
    const html = render(
      createElement(BoardHeader, { ...own, board: { ...own.board, specialist: "s-2" } }),
    );
    expect(html).not.toContain(uz.header.allSpecialists);
    expect(html).toContain('href="/admin/my-appointments?view=week&amp;date=2026-10-21"');
    expect(html).not.toContain("specialist=s-2");
    const profile = render(createElement(BoardHeader, { ...own, addBlocker: "profile" as const }));
    expect(profile).toContain(uz.header.addDisabledProfile);
    expect(profile).toContain('href="/admin/my-profile"');
    const services = render(
      createElement(BoardHeader, { ...own, addBlocker: "services" as const }),
    );
    expect(services).toContain('href="/admin/my-services"');
  });

  it("says why nothing can be booked per workspace", () => {
    const none = { ...BOOKING_META, specialists: [] };
    const idle = {
      ...BOOKING_META,
      specialists: [{ ...BOOKING_META.specialists[0]!, services: [] }],
    };
    expect(addBlockerOf("admin", BOOKING_META)).toBeNull();
    expect(addBlockerOf("admin", none)).toBe("specialists");
    expect(addBlockerOf("specialist", none)).toBe("profile");
    expect(addBlockerOf("specialist", idle)).toBe("services");
    expect(addBlockerOf("specialist", BOOKING_META)).toBeNull();
  });

  it("names the period per view and language", () => {
    const fmt = createFormatter("uz");
    expect(periodLabel(fmt, "day", TODAY)).toBe(fmt.weekdayDayMonth(`${TODAY}T12:00:00+05:00`));
    expect(periodLabel(fmt, "week", "2026-10-28")).toBe("26-okt – 1-noy");
    expect(periodLabel(createFormatter("en"), "month", TODAY)).toBe("October 2026");
    const ruHeader = render(createElement(BoardHeader, headerProps), "ru");
    expect(ruHeader).toContain(appointmentsCopy.ru.header.views.month);
  });
});

async function week(specialistId?: string) {
  const range = await getAppointmentRange({
    from: "2026-10-26",
    to: "2026-11-01",
    detail: "full",
    ...(specialistId ? { specialistId } : {}),
  });
  return { range, appointments: range.schedules!.flatMap((day) => day.appointments) };
}

const weekProps = {
  selectedId: null,
  onSelect: () => undefined,
  now: "2026-10-26T11:00:00+05:00",
  today: TODAY,
  specialist: "",
  workspace: "admin" as const,
};

describe("WeekGrid", () => {
  it("draws seven day columns linking to the day, each visit as a toggle button", async () => {
    const { range, appointments } = await week();
    const html = render(
      createElement(WeekGrid, {
        ...weekProps,
        days: range.days,
        schedules: range.schedules!,
        appointments,
      }),
    );
    expect(html.match(/aria-label="[^"]+ — kun jadvalini ochish"/g)).toHaveLength(7);
    expect(html).toContain('href="/admin/appointments?date=2026-10-27"');
    expect(html).toContain('aria-current="date"');
    const buttons = html.match(/data-appointment-id="/g)?.length ?? 0;
    const chips = [...html.matchAll(/>\+(\d+)</g)].reduce((n, m) => n + Number(m[1]), 0);
    expect(buttons + chips).toBe(appointments.length);
    // Sunday is closed: hatched and labelled.
    expect(html).toContain(uz.week.dayOff);
  });

  it("turns a cluster wider than three lanes into a «+N» link to the day", () => {
    const at = (id: string, start: string, end: string): DayAppointment =>
      ({
        id,
        specialistId: "s-1",
        location: { id: "1", name: "Glow Derma", address: "Toshkent, Chilonzor" },
        customer: { id: "c", name: `Mijoz ${id}`, phone: "+998901234567" },
        serviceId: "v",
        service: "Konsultatsiya",
        serviceShort: "Konsultatsiya",
        durationMin: 60,
        start: `2026-10-27T${start}:00+05:00`,
        end: `2026-10-27T${end}:00+05:00`,
        price: 1,
        status: "confirmed",
        requestedAt: "2026-10-20T10:00:00+05:00",
        requestedVia: "ilova",
      }) as DayAppointment;
    const days: AppointmentRangeDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${String(26 + i).padStart(2, "0")}`.replace("2026-10-32", "2026-11-01"),
      counts: { requested: 0, confirmed: 0, attended: 0, rejected: 0, cancelled: 0 },
      total: 0,
      working: true,
      hours: { start: "09:00", end: "18:00" },
    }));
    const visits = ["a", "b", "c", "d", "e"].map((id) => at(id, "10:00", "11:00"));
    const html = render(
      createElement(WeekGrid, { ...weekProps, days, schedules: [], appointments: visits }),
    );
    expect(html.match(/data-appointment-id="/g)).toHaveLength(2);
    expect(html).toContain(">+3<");
    expect(html).toContain(
      uz.week.more(3, createFormatter("uz").weekdayDayMonth("2026-10-27T12:00:00+05:00")),
    );
  });

  it("gives the weekday names Monday-first in the admin language", () => {
    expect(weekdayName(createFormatter("en"), "2026-10-26", false)).toBe("Monday");
    expect(weekdayName(createFormatter("ru"), "2026-11-01")).toMatch(/^Вс/);
  });
});

describe("MonthGrid", () => {
  it("renders the six-week page with a link and a full spoken summary per day", async () => {
    const range = await getAppointmentRange({ from: "2026-09-28", to: "2026-11-08" });
    const html = render(
      createElement(MonthGrid, {
        date: TODAY,
        days: range.days,
        today: TODAY,
        specialist: "s-1",
        workspace: "admin",
      }),
    );
    expect(html.match(/data-date="/g)).toHaveLength(42);
    expect(html).toContain('href="/admin/appointments?date=2026-10-27&amp;specialist=s-1"');
    expect(html.match(/aria-current="date"/g)).toHaveLength(1);
    expect(html.match(/<th scope="col"/g)).toHaveLength(7);
  });

  it("spells out the counts, a day off and today", async () => {
    const fmt = createFormatter("uz");
    const range = await getAppointmentRange({ from: "2026-09-28", to: "2026-11-08" });
    const cells = monthCells(TODAY, range.days, TODAY).flat();
    const today = cells.find((cell) => cell.iso === TODAY)!;
    const label = monthCellLabel(uz, fmt, today);
    expect(label).toContain(uz.month.visits(today.data!.total));
    expect(label).toContain(uz.month.today);
    const sunday = cells.find((cell) => cell.iso === "2026-11-01")!;
    expect(monthCellLabel(uz, fmt, sunday)).toContain(uz.month.dayOff);
    expect(monthCellLabel(uz, fmt, sunday)).toContain(uz.month.noVisits);
    expect(
      monthCellLabel(appointmentsCopy.en, createFormatter("en"), sunday).replace(/\s/g, " "),
    ).toBe("Sunday, 1 November, no appointments, day off");
  });
});

describe("booking dialog helpers", () => {
  it("keeps server errors on the fields each dialog renders", () => {
    const plain = { changedSpecialist: false, clinicMove: false };
    expect(renderedFields("admin", "create", plain)).toEqual([
      "specialistId",
      "serviceId",
      "phone",
      "name",
      "date",
      "locationId",
      "time",
      "note",
    ]);
    expect(renderedFields("specialist", "create", plain)).toEqual([
      "serviceId",
      "phone",
      "name",
      "date",
      "locationId",
      "time",
    ]);
    expect(renderedFields("admin", "reschedule", { ...plain, changedSpecialist: true })).toEqual([
      "specialistId",
      "serviceId",
      "date",
      "locationId",
      "time",
    ]);
    expect(renderedFields("specialist", "reschedule", { ...plain, clinicMove: true })).toEqual([
      "date",
      "locationId",
      "time",
      "customerAgreed",
    ]);
  });

  it("says why no time can be chosen", () => {
    expect(scheduleState(undefined, false, null, 0)).toBe("pickDate");
    expect(scheduleState(undefined, true, null, 0)).toBe("loading");
    expect(scheduleState("failed", true, null, 0)).toBe("failed");
    const day = { date: TODAY, specialists: [], appointments: [] };
    expect(scheduleState(day, true, false, 0)).toBe("dayOff");
    expect(scheduleState(day, true, true, 0)).toBe("full");
    expect(scheduleState(day, true, true, 4)).toBeNull();
  });

  it("lists the slots, marks taken ones on the second line and keeps a chosen time", () => {
    const options = timeOptions(
      uz.booking,
      [
        { time: "09:00", taken: false },
        { time: "09:05", taken: true },
      ] as never,
      "18:03",
    );
    expect(options).toEqual([
      { value: "09:00", label: "09:00" },
      { value: "09:05", label: "09:05", description: uz.booking.taken },
      { value: "18:03", label: "18:03" },
    ]);
  });

  it("shows the mapper's fallback block labels in the admin language", () => {
    expect(
      blockText(appointmentsCopy.en, {
        start: "13:00",
        end: "14:00",
        kind: "off",
        label: "Ish vaqti emas",
      }),
    ).toBe("Off hours");
    expect(
      blockText(appointmentsCopy.ru, {
        start: "13:00",
        end: "14:00",
        kind: "busy",
        label: "Kongress",
      }),
    ).toBe("Kongress");
  });
});

describe("visit actions per workspace", () => {
  const start = "2026-10-26T11:00:00+05:00";
  const before = Date.parse("2026-10-26T10:00:00+05:00");
  const after = Date.parse("2026-10-26T11:30:00+05:00");

  it("gives staff the status rules regardless of the clock", () => {
    expect([...visitActions({ status: "requested", start }, "admin", after)]).toEqual([
      "confirm",
      "reject",
      "reschedule",
      "cancel",
    ]);
    expect([...visitActions({ status: "attended", start }, "admin", before)]).toEqual([]);
  });

  it("narrows a specialist's allowed actions by the start time", () => {
    const visit = {
      status: "confirmed" as const,
      start,
      allowedActions: ["attend", "reschedule", "cancel"] as const,
    };
    expect([...visitActions(visit, "specialist", before)]).toEqual(["reschedule", "cancel"]);
    expect([...visitActions(visit, "specialist", after)]).toEqual(["attend"]);
    expect([...visitActions({ ...visit, allowedActions: [] }, "specialist", before)]).toEqual([]);
  });
});

describe("specialist board items", () => {
  it("maps an item without e-mail, with the customer note and the allowed actions", () => {
    const visit = mapDayAppointment({
      id: 5,
      specialist_id: 2,
      location: { id: 1, name: "Glow Derma", address: "Toshkent" },
      customer: { id: 9, name: "Laylo", phone: null },
      service_id: 3,
      service_name: "Konsultatsiya",
      service_short_name: "",
      duration_min: 30,
      start: "2026-10-26T11:00:00+05:00",
      end: "2026-10-26T11:30:00+05:00",
      price: 100_000,
      status: "requested",
      requested_at: "2026-10-20T10:00:00+05:00",
      requested_via: "app",
      customer_note: "Allergiyam bor",
      allowed_actions: ["confirm", "reject", "teleport"],
    } as never);
    expect(visit.customer.phone).toBe("—");
    expect(visit.customerNote).toBe("Allergiyam bor");
    expect(visit.allowedActions).toEqual(["confirm", "reject"]);
  });

  it("shows nothing for a draft profile's missing discipline", () => {
    expect(roleLabel("")).toBe("");
    expect(roleText(uz, "")).toBe("");
    expect(roleText(uz, "Kosmetolog")).toBe(uz.role.Kosmetolog);
  });
});
