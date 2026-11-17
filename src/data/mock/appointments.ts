import type { Appointment, BookingMeta, BookingService, Specialist } from "@/domain/appointment";
import { addDays } from "@/lib/format";

import { CUSTOMERS, CUSTOMER_IDS, customerRef } from "./people";
import { createRandom } from "./random";

export const SPECIALISTS: ReadonlyArray<Specialist> = [
  {
    id: "s-1",
    name: "Nodira Rahimova",
    role: "Dermatolog",
    workingHours: { start: "09:00", end: "18:00" },
    blocks: [{ start: "16:00", end: "16:30", label: "Band qilingan", kind: "busy" }],
  },
  {
    id: "s-2",
    name: "Jasur Aliyev",
    role: "Dermatolog",
    workingHours: { start: "09:00", end: "18:00" },
    blocks: [{ start: "13:00", end: "14:00", label: "Ish vaqti emas", kind: "off" }],
  },
  {
    id: "s-3",
    name: "Dilnoza Yusupova",
    role: "Kosmetolog",
    workingHours: { start: "09:00", end: "18:00" },
    blocks: [],
  },
];

/** The day drawn on the appointments screen. */
export const DESIGN_DAY = "2026-10-26";

const at = (day: string, time: string) => `${day}T${time}:00+05:00`;

interface Service {
  /** The backend seed's service id (Konsultatsiya 1, Qayta ko‘rik 2, cosmetology 3–5). */
  id: string;
  name: string;
  short: string;
  durationMin: number;
}

const CONSULTATION: Service = {
  id: "1",
  name: "Dermatolog konsultatsiyasi",
  short: "Konsultatsiya",
  durationMin: 30,
};
const FOLLOW_UP: Service = {
  id: "2",
  name: "Qayta ko‘rik",
  short: "Qayta ko‘rik",
  durationMin: 20,
};
const COSMETOLOGY: ReadonlyArray<Service & { price: number }> = [
  {
    id: "3",
    name: "Yuzni chuqur tozalash",
    short: "Yuzni chuqur tozalash",
    durationMin: 75,
    price: 320_000,
  },
  { id: "4", name: "Kimyoviy pilling", short: "Kimyoviy pilling", durationMin: 60, price: 380_000 },
  {
    id: "5",
    name: "Namlantiruvchi parvarish",
    short: "Namlantiruvchi parvarish",
    durationMin: 60,
    price: 260_000,
  },
];

function make(
  id: string,
  specialistId: string,
  customerId: string,
  service: Service,
  day: string,
  start: string,
  price: number,
  status: Appointment["status"],
  requestedAt: string,
  requestedVia: Appointment["requestedVia"] = "ilova",
): Appointment & { serviceShort: string } {
  const [h, m] = start.split(":").map(Number) as [number, number];
  const endMinutes = h * 60 + m + service.durationMin;
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  const customer = customerRef(customerId);
  return {
    id,
    specialistId,
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    serviceId: service.id,
    service: service.name,
    serviceShort: service.short,
    durationMin: service.durationMin,
    start: at(day, start),
    end: at(day, end),
    price,
    status,
    requestedAt,
    requestedVia,
  };
}

export type MockAppointment = ReturnType<typeof make>;

const DESIGN_APPOINTMENTS: MockAppointment[] = [
  make(
    "a1",
    "s-1",
    CUSTOMER_IDS.kamola,
    CONSULTATION,
    DESIGN_DAY,
    "09:00",
    150_000,
    "requested",
    at("2026-10-24", "08:41"),
  ),
  make(
    "a2",
    "s-1",
    CUSTOMER_IDS.aziza,
    FOLLOW_UP,
    DESIGN_DAY,
    "11:00",
    100_000,
    "confirmed",
    at("2026-10-21", "19:12"),
  ),
  make(
    "a3",
    "s-1",
    CUSTOMER_IDS.sardor,
    CONSULTATION,
    DESIGN_DAY,
    "14:00",
    150_000,
    "confirmed",
    at("2026-10-22", "10:05"),
    "administrator",
  ),
  make(
    "a4",
    "s-2",
    CUSTOMER_IDS.bekzod,
    CONSULTATION,
    DESIGN_DAY,
    "09:30",
    120_000,
    "requested",
    at("2026-10-24", "07:58"),
  ),
  make(
    "a5",
    "s-2",
    CUSTOMER_IDS.nilufar,
    FOLLOW_UP,
    DESIGN_DAY,
    "15:00",
    90_000,
    "confirmed",
    at("2026-10-20", "12:40"),
  ),
  make(
    "a6",
    "s-3",
    CUSTOMER_IDS.gulnora,
    COSMETOLOGY[0]!,
    DESIGN_DAY,
    "10:00",
    320_000,
    "confirmed",
    at("2026-10-19", "16:22"),
  ),
  make(
    "a7",
    "s-3",
    CUSTOMER_IDS.sevara,
    COSMETOLOGY[1]!,
    DESIGN_DAY,
    "12:00",
    380_000,
    "requested",
    at("2026-10-23", "21:03"),
  ),
  make(
    "a8",
    "s-3",
    CUSTOMER_IDS.nozima,
    COSMETOLOGY[2]!,
    DESIGN_DAY,
    "15:30",
    260_000,
    "confirmed",
    at("2026-10-22", "09:47"),
  ),
];

/** A few confirmed visits on the surrounding working days so day navigation has content. */
function surroundingDays(): MockAppointment[] {
  const random = createRandom(26);
  const result: MockAppointment[] = [];
  for (const offset of [-3, -2, -1, 1, 2, 3, 4]) {
    const day = addDays(DESIGN_DAY, offset);
    if (new Date(at(day, "12:00")).getUTCDay() === 0) continue; // closed on Sundays
    const past = offset < 0;
    ["s-1", "s-2", "s-3"].forEach((specialistId, column) => {
      const slots = random
        .shuffle(["09:00", "10:00", "11:30", "14:30", "16:00"])
        .slice(0, random.int(1, 3));
      slots.sort().forEach((start, index) => {
        const cosmetic = column === 2 ? random.pick(COSMETOLOGY) : null;
        const service = cosmetic ?? (random.chance(0.6) ? CONSULTATION : FOLLOW_UP);
        const price = cosmetic ? cosmetic.price : service === CONSULTATION ? 150_000 : 100_000;
        result.push(
          make(
            `g-${day}-${column}-${index}`,
            specialistId,
            random.pick(CUSTOMERS.slice(12)).id,
            service,
            day,
            start,
            price,
            past ? "attended" : "confirmed",
            at(addDays(day, -3), "18:20"),
          ),
        );
      });
    });
  }
  return result;
}

export const APPOINTMENTS: ReadonlyArray<MockAppointment> = [
  ...DESIGN_APPOINTMENTS,
  ...surroundingDays(),
];

/** The days the hand-made fixture week covers (`DESIGN_DAY` − 3 … + 4). */
export const FIXTURE_FROM = addDays(DESIGN_DAY, -3);
export const FIXTURE_TO = addDays(DESIGN_DAY, 4);

/** The demo clinic is closed on Sundays (no specialist works). */
export function isClosedDay(day: string): boolean {
  return new Date(at(day, "12:00")).getUTCDay() === 0;
}

/** Prefix of the synthetic visits' ids: `x-YYYY-MM-DD-<column>-<index>`. */
const SYNTHETIC = "x-";

/**
 * Visits of a day outside the fixture week, so the week and month boards have
 * content wherever they are paged to. Seeded by the date: the same day always
 * holds the same visits (and the same ids), on every build. Days before the
 * design day are history (mostly «Keldi», a few cancelled or rejected), later
 * ones are confirmed with the odd cancellation; none is a request, so the
 * pending summary keeps counting the fixture's requests only.
 */
export function syntheticDay(day: string): MockAppointment[] {
  if (isClosedDay(day)) return [];
  const random = createRandom(Number(day.replaceAll("-", "")));
  const past = day < DESIGN_DAY;
  const result: MockAppointment[] = [];
  ["s-1", "s-2", "s-3"].forEach((specialistId, column) => {
    const slots = random
      .shuffle(["09:00", "09:30", "10:30", "11:30", "13:00", "14:30", "15:30", "16:30"])
      .slice(0, random.int(0, 4));
    slots.sort().forEach((start, index) => {
      const cosmetic = column === 2 ? random.pick(COSMETOLOGY) : null;
      const service = cosmetic ?? (random.chance(0.6) ? CONSULTATION : FOLLOW_UP);
      const price = cosmetic ? cosmetic.price : service === CONSULTATION ? 150_000 : 100_000;
      const roll = random.next();
      const status: Appointment["status"] = past
        ? roll < 0.1
          ? "cancelled"
          : roll < 0.16
            ? "rejected"
            : "attended"
        : roll < 0.12
          ? "cancelled"
          : "confirmed";
      result.push(
        make(
          `${SYNTHETIC}${day}-${column}-${index}`,
          specialistId,
          random.pick(CUSTOMERS.slice(12)).id,
          service,
          day,
          start,
          price,
          status,
          at(addDays(day, -2), "17:45"),
        ),
      );
    });
  });
  return result;
}

/** Every mock visit starting on `day` (Tashkent): the fixture's inside its week, else synthetic. */
export function appointmentsOn(day: string): MockAppointment[] {
  if (day >= FIXTURE_FROM && day <= FIXTURE_TO) {
    return APPOINTMENTS.filter((a) => a.start.startsWith(day));
  }
  return syntheticDay(day);
}

/** A mock visit by id: the fixture's, or a synthetic one rebuilt from the day in its id. */
export function findAppointment(id: string): MockAppointment | undefined {
  const fixture = APPOINTMENTS.find((a) => a.id === id);
  if (fixture || !id.startsWith(SYNTHETIC)) return fixture;
  const day = id.slice(SYNTHETIC.length, SYNTHETIC.length + 10);
  return syntheticDay(day).find((a) => a.id === id);
}

const booking = (service: Service, price: number): BookingService => ({
  id: service.id,
  name: service.name,
  shortName: service.short,
  durationMin: service.durationMin,
  price,
});

/**
 * What the admin booking dialog offers (contract §2.9 `appointments/meta/`),
 * mirroring the backend seed: each specialist's services with the price a
 * booking with that specialist snapshots.
 */
export const BOOKING_META: BookingMeta = {
  specialists: [
    {
      id: "s-1",
      name: "Nodira Rahimova",
      role: "Dermatolog",
      services: [booking(CONSULTATION, 150_000), booking(FOLLOW_UP, 100_000)],
    },
    {
      id: "s-2",
      name: "Jasur Aliyev",
      role: "Dermatolog",
      services: [booking(CONSULTATION, 120_000), booking(FOLLOW_UP, 90_000)],
    },
    {
      id: "s-3",
      name: "Dilnoza Yusupova",
      role: "Kosmetolog",
      services: COSMETOLOGY.map((service) => booking(service, service.price)),
    },
  ],
  slotStepMin: 5,
};
