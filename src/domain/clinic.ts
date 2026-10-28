import type { ContentLanguage } from "./product";

/**
 * Specialists, services, schedules and the clinic (contract §2.17, gaps
 * FND-1 / FND-7). Times are Tashkent wall-clock `HH:MM`; durations and
 * schedule edges sit on a 5-minute grid. Booked appointments never change
 * when any of this does: only new bookings follow the new rules.
 */

export type I18n = Record<ContentLanguage, string>;

export const SPECIALIST_ROLES = ["dermatologist", "cosmetologist"] as const;
export type SpecialistRole = (typeof SPECIALIST_ROLES)[number];
export const SPECIALIST_ROLE_LABEL: Record<SpecialistRole, string> = {
  dermatologist: "Dermatolog",
  cosmetologist: "Kosmetolog",
};

export const SERVICE_CATEGORIES = ["dermatology", "cosmetology"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  dermatology: "Dermatologiya",
  cosmetology: "Kosmetologiya",
};

/** `ordering` of `specialists/` and `services/` (DirectoryOrdering). */
export const DIRECTORY_ORDERINGS = [
  "position",
  "name",
  "-name",
  "created_at",
  "-created_at",
] as const;
export type DirectoryOrdering = (typeof DIRECTORY_ORDERINGS)[number];
export const DIRECTORY_ORDERING_LABEL: Record<DirectoryOrdering, string> = {
  position: "Tartib bo‘yicha",
  name: "Nomi (A–Z)",
  "-name": "Nomi (Z–A)",
  created_at: "Avval qo‘shilgan",
  "-created_at": "Oxirgi qo‘shilgan",
};

export const SLOT_STEPS = [10, 15, 20, 30, 60] as const;
export type SlotStep = (typeof SLOT_STEPS)[number];

/** 0 = Monday … 6 = Sunday; the short names of the export (`Du, Se, …`). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABEL = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
] as const;
export const WEEKDAY_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;

export interface OfferedService {
  serviceId: string;
  name: string;
  shortName: string;
  category: ServiceCategory;
  /** so‘m; what a booking snapshots. */
  price: number;
  durationMin: number;
  /** The offer (a paused offer keeps its price). */
  isActive: boolean;
  /** The service itself; bookable only when both are true. */
  serviceIsActive: boolean;
}

export interface WorkingDay {
  weekday: number;
  start: string;
  end: string;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface ClinicSpecialist {
  id: string;
  name: string;
  role: SpecialistRole;
  qualifications: I18n;
  bio: I18n;
  experienceYears: number | null;
  photoUrl: string | null;
  locationId: string;
  /** The linked staff account (informational); `null` when none. */
  staffUser: { id: string; name: string } | null;
  slotStepMin: number;
  position: number;
  isActive: boolean;
  services: OfferedService[];
  workingHours: WorkingDay[];
  /** `requested` / `confirmed` appointments starting now or later. */
  upcomingAppointments: number;
  /** The website URL segment (`/mutaxassislar/{slug}`, B-W1). */
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicService {
  id: string;
  name: I18n;
  shortName: I18n;
  description: I18n;
  category: ServiceCategory;
  defaultDurationMin: number;
  defaultPrice: number | null;
  position: number;
  isActive: boolean;
  /** Active specialists offering it through an active offer. */
  specialistCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HoursOverride {
  id: string;
  date: string;
  /** Both `null` = a day off. */
  start: string | null;
  end: string | null;
  dayOff: boolean;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export type BlockKind = "busy" | "off";
export const BLOCK_KIND_LABEL: Record<BlockKind, string> = {
  busy: "Band",
  off: "Ish vaqti emas",
};

export interface BlockedPeriod {
  id: string;
  start: string;
  end: string;
  kind: BlockKind;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ClinicLocation {
  id: string;
  name: I18n;
  address: I18n;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export const DIRECTORY_PAGE_SIZES = [20, 50] as const;
export type DirectoryPageSize = (typeof DIRECTORY_PAGE_SIZES)[number];

export interface SpecialistListQuery {
  q?: string;
  status?: "active" | "inactive";
  role?: SpecialistRole;
  sort: DirectoryOrdering;
  page: number;
  pageSize: DirectoryPageSize;
}

export interface ServiceListQuery {
  q?: string;
  status?: "active" | "inactive";
  category?: ServiceCategory;
  sort: DirectoryOrdering;
  page: number;
  pageSize: DirectoryPageSize;
}

/* --- Rules shared by the forms and the Server Actions (contract §2.17) --- */

export const NAME_MIN = 2;
export const NAME_MAX = 150;
export const TEXT_MAX = 2000;
export const EXPERIENCE_MAX = 80;
export const PRICE_MAX = 100_000_000;
export const DURATION_MIN = 5;
export const DURATION_MAX = 480;
export const OVERRIDE_NOTE_MAX = 120;
export const BLOCK_LABEL_MAX = 80;
export const SERVICE_NAME_MAX = 120;
export const SERVICE_SHORT_MAX = 40;
export const LOCATION_ADDRESS_MAX = 300;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const TIME_FORMAT_MESSAGE = "Vaqtni SS:DD ko‘rinishida kiriting.";
export const GRID_MESSAGE = "Vaqt 5 daqiqalik qadamda bo‘lsin.";
export const END_AFTER_START_MESSAGE = "Tugash vaqti boshlanishidan keyin bo‘lsin.";
export const DURATION_GRID_MESSAGE = "Davomiylik 5 daqiqaga karrali bo‘lsin.";

/** Minutes after midnight of `HH:MM`. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function onGrid(time: string): boolean {
  return minutesOf(time) % 5 === 0;
}

/** "09:00–18:00" or "Dam olish"; the break appended. */
export function workingDayLabel(day: WorkingDay | undefined): string {
  if (!day) return "Dam olish";
  const base = `${day.start}–${day.end}`;
  return day.breakStart && day.breakEnd
    ? `${base} (tanaffus ${day.breakStart}–${day.breakEnd})`
    : base;
}

/** The working weekdays as the export writes them ("Du, Se, Ch"). */
export function workingDaysShort(days: ReadonlyArray<WorkingDay>): string {
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((day) => WEEKDAY_SHORT[day.weekday] ?? "")
    .join(", ");
}

/** The 409 on a deactivation with appointments ahead (§2.17); `force` confirms it. */
export function deactivationConflictMessage(count: number): string {
  return `Mutaxassisda ${count} ta kelgusi qabul bor (kutilayotgan yoki tasdiqlangan). Qabullar o‘zgarmaydi: avval ularni boshqa vaqtga yoki mutaxassisga ko‘chiring yoki bekor qiling, yoki baribir nofaol qiling.`;
}

export const NO_CLINIC_MESSAGE = "Avval klinika manzilini kiriting.";
