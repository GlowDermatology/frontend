import type { Appointment, Specialist } from "@/domain/appointment";
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
  name: string;
  short: string;
  durationMin: number;
}

const CONSULTATION: Service = {
  name: "Dermatolog konsultatsiyasi",
  short: "Konsultatsiya",
  durationMin: 30,
};
const FOLLOW_UP: Service = { name: "Qayta ko‘rik", short: "Qayta ko‘rik", durationMin: 20 };
const COSMETOLOGY: ReadonlyArray<Service & { price: number }> = [
  {
    name: "Yuzni chuqur tozalash",
    short: "Yuzni chuqur tozalash",
    durationMin: 75,
    price: 320_000,
  },
  { name: "Kimyoviy pilling", short: "Kimyoviy pilling", durationMin: 60, price: 380_000 },
  {
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
