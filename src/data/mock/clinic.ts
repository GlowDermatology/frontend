import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicSpecialist,
  DirectoryOrdering,
  HoursOverride,
  SpecialistListQuery,
  SpecialistService,
  WorkingDay,
} from "@/domain/clinic";
import { searchKey } from "@/lib/search";
import { SPECIALIST_SLUG_MAX, slugifyName } from "@/domain/seo";

import { paginate, type Page } from "../types";

/**
 * The demo clinic (contract §2.17), as `seed_demo` creates it: one
 * location, three specialists with their own services, working Monday to Saturday
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
  directions: { ...empty },
  isActive: true,
  latitude: null,
  longitude: null,
  updatedAt: SEEDED,
};

export const MOCK_CLINICS: ReadonlyArray<ClinicLocation> = [
  MOCK_LOCATION,
  {
    ...MOCK_LOCATION,
    id: "2",
    name: { uz: "Glow Derma Yunusobod", ru: "Glow Derma Юнусабад", en: "Glow Derma Yunusabad" },
    address: {
      uz: "Toshkent, Yunusobod tumani",
      ru: "Ташкент, Юнусабадский район",
      en: "Tashkent, Yunusabad District",
    },
    phone: null,
  },
];

/** One of a specialist's own services; `position` follows the order given. */
const service = (
  id: string,
  specialistId: string,
  position: number,
  uz: string,
  short: string,
  category: SpecialistService["category"],
  durationMin: number,
  price: number,
): SpecialistService => ({
  id,
  specialistId,
  name: { uz, ru: "", en: "" },
  shortName: { uz: short, ru: "", en: "" },
  description: { ...empty },
  category,
  price,
  durationMin,
  position,
  isActive: true,
  createdAt: SEEDED,
  updatedAt: SEEDED,
});

const week = (withBreak: boolean): WorkingDay[] =>
  [0, 1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    locationId: MOCK_LOCATION.id,
    start: "09:00",
    end: "18:00",
    breakStart: withBreak ? "13:00" : null,
    breakEnd: withBreak ? "14:00" : null,
  }));

const specialist = (
  id: string,
  name: string,
  role: ClinicSpecialist["role"],
  services: SpecialistService[],
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
  locationId: MOCK_LOCATION.id,
  locationIds: [MOCK_LOCATION.id],
  account: {
    id: `1${id}`,
    displayName: name,
    email: `${slugifyName(name, SPECIALIST_SLUG_MAX)}@glowderma.uz`,
    role: "specialist",
    isActive: true,
  },
  publishBlockers: [],
  slotStepMin: 30,
  position: Number(id) - 1,
  isActive: true,
  services,
  workingHours: week(withBreak),
  upcomingAppointments: upcoming,
  slug: slugifyName(name, SPECIALIST_SLUG_MAX),
  createdAt: SEEDED,
  updatedAt: SEEDED,
});

export const MOCK_SPECIALISTS: ReadonlyArray<ClinicSpecialist> = [
  specialist(
    "1",
    "Nodira Rahimova",
    "dermatologist",
    [
      service(
        "1",
        "1",
        0,
        "Dermatolog konsultatsiyasi",
        "Konsultatsiya",
        "dermatology",
        30,
        150_000,
      ),
      service("2", "1", 1, "Qayta ko‘rik", "Qayta ko‘rik", "dermatology", 20, 100_000),
    ],
    false,
    7,
  ),
  specialist(
    "2",
    "Jasur Aliyev",
    "dermatologist",
    [
      service(
        "3",
        "2",
        0,
        "Dermatolog konsultatsiyasi",
        "Konsultatsiya",
        "dermatology",
        30,
        120_000,
      ),
      service("4", "2", 1, "Qayta ko‘rik", "Qayta ko‘rik", "dermatology", 20, 90_000),
    ],
    true,
    10,
  ),
  specialist(
    "3",
    "Dilnoza Yusupova",
    "cosmetologist",
    [
      service(
        "5",
        "3",
        0,
        "Yuzni chuqur tozalash",
        "Yuzni chuqur tozalash",
        "cosmetology",
        75,
        320_000,
      ),
      service("6", "3", 1, "Kimyoviy pilling", "Kimyoviy pilling", "cosmetology", 60, 380_000),
      service(
        "7",
        "3",
        2,
        "Namlantiruvchi parvarish",
        "Namlantiruvchi parvarish",
        "cosmetology",
        60,
        260_000,
      ),
    ],
    false,
    9,
  ),
];

export const MOCK_OVERRIDES: Readonly<Record<string, ReadonlyArray<HoursOverride>>> = {
  "2": [
    {
      id: "1",
      date: "2026-10-31",
      locationId: null,
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
