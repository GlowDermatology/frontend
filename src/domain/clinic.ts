import { isFilled, recommendedToAsk, textChanged } from "@/lib/forms/recommended-rules";
import type { Locale } from "@/lib/i18n/locales";

import { clinicDataCopy } from "./copy/clinic";
import type { ContentLanguage } from "./product";

/**
 * Specialists, services, schedules and the clinic (contract §2.17, gaps
 * FND-1 / FND-7). Times are Tashkent wall-clock `HH:MM`; durations and
 * schedule edges sit on a 5-minute grid. Booked appointments never change
 * when any of this does: only new bookings follow the new rules.
 */

export type I18n = Record<ContentLanguage, string>;

export function clinicText(text: I18n, locale: Locale): string {
  return text[locale] || text.uz || text.ru || text.en;
}

export const SPECIALIST_ROLES = ["dermatologist", "cosmetologist"] as const;
export type SpecialistRole = (typeof SPECIALIST_ROLES)[number];
/** Uzbek names (kept for older callers); `clinicDataCopy[locale].role` in the admin language. */
export const SPECIALIST_ROLE_LABEL: Record<SpecialistRole, string> = clinicDataCopy.uz.role;

export const SERVICE_CATEGORIES = ["dermatology", "cosmetology"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = clinicDataCopy.uz.category;

/** `ordering` of `specialists/` and `services/` (DirectoryOrdering). */
export const DIRECTORY_ORDERINGS = [
  "position",
  "name",
  "-name",
  "created_at",
  "-created_at",
] as const;
export type DirectoryOrdering = (typeof DIRECTORY_ORDERINGS)[number];
export const DIRECTORY_ORDERING_LABEL: Record<DirectoryOrdering, string> =
  clinicDataCopy.uz.ordering;

export const SLOT_STEPS = [10, 15, 20, 30, 60] as const;
export type SlotStep = (typeof SLOT_STEPS)[number];

/** 0 = Monday … 6 = Sunday; the short names of the export (`Du, Se, …`). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABEL: ReadonlyArray<string> = clinicDataCopy.uz.weekday;
export const WEEKDAY_SHORT: ReadonlyArray<string> = clinicDataCopy.uz.weekdayShort;

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
  locationId: string;
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
  locationIds: string[];
  /** The linked staff account (informational); `null` when none. */
  staffUser: { id: string; name: string; role?: "admin" | "specialist" | null } | null;
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
  locationId: string | null;
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
export const BLOCK_KIND_LABEL: Record<BlockKind, string> = clinicDataCopy.uz.blockKind;

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
  directions: I18n;
  isActive: boolean;
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
export const LOCATION_DIRECTIONS_MAX = 500;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const TIME_FORMAT_MESSAGE = clinicDataCopy.uz.timeFormat;
export const GRID_MESSAGE = clinicDataCopy.uz.grid;
export const END_AFTER_START_MESSAGE = clinicDataCopy.uz.endAfterStart;
export const DURATION_GRID_MESSAGE = clinicDataCopy.uz.durationGrid;

/** Minutes after midnight of `HH:MM`. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function onGrid(time: string): boolean {
  return minutesOf(time) % 5 === 0;
}

/** "09:00–18:00" or "Dam olish"; the break appended. */
export function workingDayLabel(day: WorkingDay | undefined, locale: Locale = "uz"): string {
  const m = clinicDataCopy[locale];
  if (!day) return m.dayOff;
  const base = `${day.start}–${day.end}`;
  return day.breakStart && day.breakEnd ? m.withBreak(base, day.breakStart, day.breakEnd) : base;
}

/** The working weekdays as the export writes them ("Du, Se, Ch"). */
export function workingDaysShort(days: ReadonlyArray<WorkingDay>, locale: Locale = "uz"): string {
  const names = clinicDataCopy[locale].weekdayShort;
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((day) => names[day.weekday] ?? "")
    .join(", ");
}

/** The 409 on a deactivation with appointments ahead (§2.17); `force` confirms it. */
export function deactivationConflictMessage(count: number, locale: Locale = "uz"): string {
  return clinicDataCopy[locale].deactivationConflict(count);
}

export const NO_CLINIC_MESSAGE = clinicDataCopy.uz.noClinic;

/* --- Recommended (not required) fields: the forms ask "save anyway?" when they are empty --- */

/** A service without a Russian / English name or an Uzbek description is hard to find in the app. */
export function serviceRecommendedMissing(values: {
  name: I18n;
  description: I18n;
}): Array<"name.ru" | "name.en" | "description.uz"> {
  const missing: Array<"name.ru" | "name.en" | "description.uz"> = [];
  if (!values.name.ru.trim()) missing.push("name.ru");
  if (!values.name.en.trim()) missing.push("name.en");
  if (!values.description.uz.trim()) missing.push("description.uz");
  return missing;
}

/** Customers choose a specialist by the qualifications, the short bio and (on the card) the photo. */
export function specialistRecommendedMissing(
  values: { qualifications: I18n; bio: I18n },
  hasPhoto?: boolean,
): Array<"qualifications.uz" | "bio.uz" | "photo"> {
  const missing: Array<"qualifications.uz" | "bio.uz" | "photo"> = [];
  if (hasPhoto === false) missing.push("photo");
  if (!values.qualifications.uz.trim()) missing.push("qualifications.uz");
  if (!values.bio.uz.trim()) missing.push("bio.uz");
  return missing;
}

/** The clinic card: without an address or a phone customers cannot find or call the clinic. */
export function locationRecommendedMissing(values: {
  address: I18n;
  phone: string;
}): Array<"address.uz" | "phone"> {
  const missing: Array<"address.uz" | "phone"> = [];
  if (!values.address.uz.trim()) missing.push("address.uz");
  if (!values.phone.trim()) missing.push("phone");
  return missing;
}

/**
 * The empty service fields worth asking about on this save (`recommendedToAsk`): an inactive
 * service never asks; a new one, or the save that activates it, asks about every empty field;
 * else only a field just emptied, or the empty names when the Uzbek name changed.
 */
export function serviceRecommendedToAsk(
  values: { name: I18n; description: I18n; isActive: boolean },
  saved: { name: I18n; description: I18n; isActive: boolean } | null,
): Array<"name.ru" | "name.en" | "description.uz"> {
  return recommendedToAsk(serviceRecommendedMissing(values), {
    isNew: saved === null,
    active: values.isActive,
    wasActive: saved?.isActive,
    filledBefore: (field) =>
      isFilled(
        field === "name.ru"
          ? saved?.name.ru
          : field === "name.en"
            ? saved?.name.en
            : saved?.description.uz,
      ),
    sourceChanged: (field) =>
      field !== "description.uz" && textChanged(saved?.name.uz, values.name.uz),
  });
}

/**
 * The empty profile fields worth asking about on this save: an inactive specialist never asks;
 * the save that activates one asks about every empty field (the photo included); else only a
 * text just emptied. `hasPhoto` as for `specialistRecommendedMissing`.
 */
export function specialistRecommendedToAsk(
  values: { qualifications: I18n; bio: I18n; isActive: boolean },
  saved: { qualifications: I18n; bio: I18n; isActive: boolean },
  hasPhoto?: boolean,
): Array<"qualifications.uz" | "bio.uz" | "photo"> {
  return recommendedToAsk(specialistRecommendedMissing(values, hasPhoto), {
    isNew: false,
    active: values.isActive,
    wasActive: saved.isActive,
    filledBefore: (field) =>
      field === "qualifications.uz"
        ? isFilled(saved.qualifications.uz)
        : field === "bio.uz" && isFilled(saved.bio.uz),
  });
}

/**
 * The empty clinic-card fields worth asking about on this save: every empty one while nothing is
 * saved yet, else only a field just emptied. `saved` = the stored card (`null` = none yet).
 */
export function locationRecommendedToAsk(
  values: { address: I18n; phone: string },
  saved: { address: I18n; phone: string | null } | null,
): Array<"address.uz" | "phone"> {
  return recommendedToAsk(locationRecommendedMissing(values), {
    isNew: saved === null,
    filledBefore: (field) => isFilled(field === "phone" ? saved?.phone : saved?.address.uz),
  });
}
