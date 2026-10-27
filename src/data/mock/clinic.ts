import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  DirectoryOrdering,
  HoursOverride,
  OfferedService,
  ServiceListQuery,
  SpecialistListQuery,
  WorkingDay,
} from "@/domain/clinic";
import { searchKey } from "@/lib/search";

import { paginate, type Page } from "../types";

/**
 * The demo clinic (contract §2.17), as `seed_demo` creates it: one
 * location, five services, three specialists working Monday to Saturday
 * 09:00–18:00 (Jasur with a 13:00–14:00 break), plus one date override and
 * one blocked period so those lists have something to show.
 */

const t = (iso: string) => `${iso}+05:00`;
const SEEDED = t("2026-06-01T09:00:00");
const empty = { uz: "", ru: "", en: "" };

export const MOCK_LOCATION: ClinicLocation = {
  id: "1",
  name: { uz: "Glow Derma klinikasi", ru: "", en: "" },
  address: { uz: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12", ru: "", en: "" },
  phone: "+998712000000",
  latitude: null,
  longitude: null,
  updatedAt: SEEDED,
};

const service = (
  id: string,
  uz: string,
  short: string,
  category: ClinicService["category"],
  duration: number,
  specialistCount: number,
): ClinicService => ({
  id,
  name: { uz, ru: "", en: "" },
  shortName: { uz: short, ru: "", en: "" },
  description: { ...empty },
  category,
  defaultDurationMin: duration,
  defaultPrice: null,
  position: Number(id) - 1,
  isActive: true,
  specialistCount,
  createdAt: SEEDED,
  updatedAt: SEEDED,
});

export const MOCK_SERVICES: ReadonlyArray<ClinicService> = [
  service("1", "Dermatolog konsultatsiyasi", "Konsultatsiya", "dermatology", 30, 2),
  service("2", "Qayta ko‘rik", "Qayta ko‘rik", "dermatology", 20, 2),
  service("3", "Yuzni chuqur tozalash", "Yuzni chuqur tozalash", "cosmetology", 75, 1),
  service("4", "Kimyoviy pilling", "Kimyoviy pilling", "cosmetology", 60, 1),
  service("5", "Namlantiruvchi parvarish", "Namlantiruvchi parvarish", "cosmetology", 60, 1),
];

export function offerOf(serviceId: string, price: number, durationMin?: number): OfferedService {
  const found = MOCK_SERVICES.find((s) => s.id === serviceId)!;
  return {
    serviceId,
    name: found.name.uz,
    shortName: found.shortName.uz,
    category: found.category,
    price,
    durationMin: durationMin ?? found.defaultDurationMin,
    isActive: true,
    serviceIsActive: found.isActive,
  };
}

const week = (withBreak: boolean): WorkingDay[] =>
  [0, 1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    start: "09:00",
    end: "18:00",
    breakStart: withBreak ? "13:00" : null,
    breakEnd: withBreak ? "14:00" : null,
  }));

const specialist = (
  id: string,
  name: string,
  role: ClinicSpecialist["role"],
  services: OfferedService[],
  withBreak: boolean,
  upcoming: number,
): ClinicSpecialist => ({
  id,
  name,
  role,
  qualifications: { ...empty },
  bio: { ...empty },
  experienceYears: null,
  photoUrl: null,
  locationId: "1",
  staffUser: null,
  slotStepMin: 30,
  position: Number(id) - 1,
  isActive: true,
  services,
  workingHours: week(withBreak),
  upcomingAppointments: upcoming,
  createdAt: SEEDED,
  updatedAt: SEEDED,
});

export const MOCK_SPECIALISTS: ReadonlyArray<ClinicSpecialist> = [
  specialist(
    "1",
    "Nodira Rahimova",
    "dermatologist",
    [offerOf("1", 150_000), offerOf("2", 100_000)],
    false,
    7,
  ),
  specialist(
    "2",
    "Jasur Aliyev",
    "dermatologist",
    [offerOf("1", 120_000), offerOf("2", 90_000)],
    true,
    10,
  ),
  specialist(
    "3",
    "Dilnoza Yusupova",
    "cosmetologist",
    [offerOf("3", 320_000), offerOf("4", 380_000), offerOf("5", 260_000)],
    false,
    9,
  ),
];

export const MOCK_OVERRIDES: Readonly<Record<string, ReadonlyArray<HoursOverride>>> = {
  "2": [
    {
      id: "1",
      date: "2026-10-31",
      start: null,
      end: null,
      dayOff: true,
      note: "Ta’til",
      createdBy: "Administrator",
      createdAt: t("2026-10-20T10:00:00"),
    },
  ],
};

export const MOCK_BLOCKS: Readonly<Record<string, ReadonlyArray<BlockedPeriod>>> = {
  "1": [
    {
      id: "1",
      start: t("2026-10-26T16:00:00"),
      end: t("2026-10-26T16:30:00"),
      kind: "busy",
      label: "Band qilingan",
      createdBy: "Administrator",
      createdAt: t("2026-10-20T10:00:00"),
    },
  ],
};

function order<T extends { position: number; id: string; createdAt: string }>(
  rows: T[],
  sort: DirectoryOrdering,
  name: (row: T) => string,
): T[] {
  const byName = (a: T, b: T) => name(a).localeCompare(name(b), "uz");
  const sorted = [...rows];
  if (sort === "name") sorted.sort(byName);
  else if (sort === "-name") sorted.sort((a, b) => byName(b, a));
  else if (sort === "created_at")
    sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || Number(a.id) - Number(b.id));
  else if (sort === "-created_at")
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(b.id) - Number(a.id));
  else sorted.sort((a, b) => a.position - b.position || byName(a, b));
  return sorted;
}

export function filterSpecialists(query: Omit<SpecialistListQuery, "page" | "pageSize">) {
  const term = query.q ? searchKey(query.q) : "";
  return order(
    MOCK_SPECIALISTS.filter(
      (s) =>
        (!term || searchKey(s.name).includes(term)) &&
        (!query.status || s.isActive === (query.status === "active")) &&
        (!query.role || s.role === query.role),
    ),
    query.sort,
    (s) => s.name,
  );
}

export function listSpecialists(query: SpecialistListQuery): Page<ClinicSpecialist> {
  return paginate(filterSpecialists(query), query.page, query.pageSize);
}

export function filterServices(query: Omit<ServiceListQuery, "page" | "pageSize">) {
  const term = query.q ? searchKey(query.q) : "";
  return order(
    MOCK_SERVICES.filter(
      (s) =>
        (!term ||
          [s.name.uz, s.name.ru, s.name.en, s.shortName.uz, s.shortName.ru, s.shortName.en].some(
            (text) => searchKey(text).includes(term),
          )) &&
        (!query.status || s.isActive === (query.status === "active")) &&
        (!query.category || s.category === query.category),
    ),
    query.sort,
    (s) => s.name.uz,
  );
}

export function listServices(query: ServiceListQuery): Page<ClinicService> {
  return paginate(filterServices(query), query.page, query.pageSize);
}
