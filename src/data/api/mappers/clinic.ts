import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  HoursOverride,
  I18n,
  ServiceListQuery,
  SpecialistListQuery,
} from "@/domain/clinic";

import type {
  BlockFormValues,
  LocationFormValues,
  OfferedServicesValues,
  OverrideFormValues,
  ServiceFormValues,
  SpecialistFormValues,
  WorkingWeekValues,
} from "../../clinic.schema";
import { blockEnd, blockStart } from "../../clinic.schema";
import type {
  ApiBlockedPeriod,
  ApiBlockWrite,
  ApiClinicLocation,
  ApiClinicService,
  ApiClinicSpecialist,
  ApiHoursOverride,
  ApiLocationPatch,
  ApiOfferedServicesWrite,
  ApiOverrideWrite,
  ApiServicePatch,
  ApiServiceWrite,
  ApiSpecialistPatch,
  ApiSpecialistWrite,
  ApiWorkingWeekWrite,
} from "../types";
import { actorName, idString } from "./common";

/** Specialists, services, schedules and the clinic (contract §2.17) ↔ the FE domain. */

const LANGUAGES = ["uz", "ru", "en"] as const;

type ApiI18n = { uz?: string | null; ru?: string | null; en?: string | null } | null | undefined;
const i18n = (value: ApiI18n): I18n => ({
  uz: value?.uz ?? "",
  ru: value?.ru ?? "",
  en: value?.en ?? "",
});

/** "09:00:00" (a `time` field) → "09:00". */
const hhmm = (value: string): string => value.slice(0, 5);
const hhmmOrNull = (value: string | null | undefined): string | null =>
  value ? hhmm(value) : null;

export function mapClinicSpecialist(api: ApiClinicSpecialist): ClinicSpecialist {
  return {
    id: idString(api.id),
    name: api.name,
    role: api.role,
    qualifications: i18n(api.qualifications),
    bio: i18n(api.bio),
    experienceYears: api.experience_years ?? null,
    photoUrl: api.photo_url ?? null,
    locationId: idString(api.location_id),
    staffUser: api.staff_user
      ? { id: idString(api.staff_user.id), name: api.staff_user.display_name }
      : null,
    slotStepMin: api.slot_step_min,
    slug: api.slug ?? "",
    position: api.position,
    isActive: api.is_active,
    services: api.services.map((offer) => ({
      serviceId: idString(offer.service_id),
      name: offer.name,
      shortName: offer.short_name,
      category: offer.category,
      price: offer.price,
      durationMin: offer.duration_min,
      isActive: offer.is_active,
      serviceIsActive: offer.service_is_active,
    })),
    workingHours: api.working_hours
      .map((day) => ({
        weekday: day.weekday,
        start: hhmm(day.start),
        end: hhmm(day.end),
        breakStart: hhmmOrNull(day.break_start),
        breakEnd: hhmmOrNull(day.break_end),
      }))
      .sort((a, b) => a.weekday - b.weekday),
    upcomingAppointments: api.upcoming_appointments,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapClinicService(api: ApiClinicService): ClinicService {
  return {
    id: idString(api.id),
    name: i18n(api.name),
    shortName: i18n(api.short_name),
    description: i18n(api.description),
    category: api.category,
    defaultDurationMin: api.default_duration_min,
    defaultPrice: api.default_price ?? null,
    position: api.position,
    isActive: api.is_active,
    specialistCount: api.specialist_count,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapOverride(api: ApiHoursOverride): HoursOverride {
  return {
    id: idString(api.id),
    date: api.date,
    start: hhmmOrNull(api.start),
    end: hhmmOrNull(api.end),
    dayOff: api.day_off,
    note: api.note ?? "",
    createdBy: actorName(api.created_by),
    createdAt: api.created_at,
  };
}

export function mapBlock(api: ApiBlockedPeriod): BlockedPeriod {
  return {
    id: idString(api.id),
    start: api.start,
    end: api.end,
    kind: api.kind,
    label: api.label ?? null,
    createdBy: actorName(api.created_by),
    createdAt: api.created_at,
  };
}

export function mapLocation(api: ApiClinicLocation): ClinicLocation {
  return {
    id: idString(api.id),
    name: i18n(api.name),
    address: i18n(api.address),
    phone: api.phone ?? null,
    latitude: api.latitude ?? null,
    longitude: api.longitude ?? null,
    updatedAt: api.updated_at,
  };
}

/* --- List parameters (the board's URL names → the API's) --- */

function statusParam(status: "active" | "inactive" | undefined): boolean | undefined {
  return status === undefined ? undefined : status === "active";
}

export function specialistListParams(query: Partial<SpecialistListQuery>) {
  return {
    search: query.q,
    is_active: statusParam(query.status),
    role: query.role,
    ordering: query.sort && query.sort !== "position" ? query.sort : undefined,
    page: query.page,
    page_size: query.pageSize,
  };
}

export function serviceListParams(query: Partial<ServiceListQuery>) {
  return {
    search: query.q,
    is_active: statusParam(query.status),
    category: query.category,
    ordering: query.sort && query.sort !== "position" ? query.sort : undefined,
    page: query.page,
    page_size: query.pageSize,
  };
}

/* --- Form values --- */

export function specialistFormValues(specialist: ClinicSpecialist): SpecialistFormValues {
  const step = [10, 15, 20, 30, 60].includes(specialist.slotStepMin) ? specialist.slotStepMin : 30;
  return {
    name: specialist.name,
    role: specialist.role,
    qualifications: { ...specialist.qualifications },
    bio: { ...specialist.bio },
    experienceYears: specialist.experienceYears,
    slotStepMin: step as SpecialistFormValues["slotStepMin"],
    staffUserId: specialist.staffUser?.id ?? "",
    isActive: specialist.isActive,
    slug: specialist.slug,
  };
}

export function serviceFormValues(service: ClinicService): ServiceFormValues {
  return {
    name: { ...service.name },
    shortName: { ...service.shortName },
    description: { ...service.description },
    category: service.category,
    defaultDurationMin: service.defaultDurationMin,
    defaultPrice: service.defaultPrice,
    isActive: service.isActive,
  };
}

export function locationFormValues(location: ClinicLocation | null): LocationFormValues {
  return {
    name: { ...(location?.name ?? { uz: "", ru: "", en: "" }) },
    address: { ...(location?.address ?? { uz: "", ru: "", en: "" }) },
    phone: location?.phone ?? "",
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  };
}

/* --- Write bodies --- */

const staffUserId = (value: string): number | null => (value ? Number(value) : null);

export function specialistCreateBody(values: SpecialistFormValues): ApiSpecialistWrite {
  const body: ApiSpecialistWrite = {
    name: values.name,
    role: values.role,
    qualifications: { ...values.qualifications },
    bio: { ...values.bio },
    experience_years: values.experienceYears,
    slot_step_min: values.slotStepMin,
    staff_user_id: staffUserId(values.staffUserId),
    is_active: values.isActive,
  };
  // An empty slug lets the server derive it from the name (B-W1).
  if (values.slug) body.slug = values.slug;
  return body;
}

function changedLeaves(before: I18n | null, after: I18n): Partial<I18n> | undefined {
  const leaves: Partial<I18n> = {};
  for (const language of LANGUAGES) {
    if (!before || before[language] !== after[language]) leaves[language] = after[language];
  }
  return Object.keys(leaves).length > 0 ? leaves : undefined;
}

/**
 * `PATCH specialists/{id}/`: only what differs from the loaded profile
 * (texts leaf by leaf); `force` confirms a deactivation with appointments
 * ahead (409 otherwise). May be empty.
 */
export function specialistPatchBody(
  baseline: SpecialistFormValues,
  values: SpecialistFormValues,
  force = false,
): ApiSpecialistPatch {
  const body: ApiSpecialistPatch = {};
  if (values.name !== baseline.name) body.name = values.name;
  if (values.role !== baseline.role) body.role = values.role;
  const qualifications = changedLeaves(baseline.qualifications, values.qualifications);
  if (qualifications) body.qualifications = qualifications;
  const bio = changedLeaves(baseline.bio, values.bio);
  if (bio) body.bio = bio;
  if (values.experienceYears !== baseline.experienceYears) {
    body.experience_years = values.experienceYears;
  }
  if (values.slotStepMin !== baseline.slotStepMin) body.slot_step_min = values.slotStepMin;
  if (values.staffUserId !== baseline.staffUserId) {
    body.staff_user_id = staffUserId(values.staffUserId);
  }
  // `""` keeps the stored slug (the server refuses an empty one).
  if (values.slug && values.slug !== baseline.slug) body.slug = values.slug;
  if (values.isActive !== baseline.isActive) {
    body.is_active = values.isActive;
    if (!values.isActive && force) body.force = true;
  }
  return body;
}

export function offeredServicesBody(values: OfferedServicesValues): ApiOfferedServicesWrite {
  return {
    services: values.services.map((row) => ({
      service_id: Number(row.serviceId),
      price: row.price,
      duration_min: row.durationMin,
      is_active: row.isActive,
    })),
  };
}

export function workingWeekBody(values: WorkingWeekValues): ApiWorkingWeekWrite {
  return {
    days: [...values.days]
      .sort((a, b) => a.weekday - b.weekday)
      .map((day) => ({
        weekday: day.weekday,
        start: day.start,
        end: day.end,
        break_start: day.breakStart,
        break_end: day.breakEnd,
      })),
  };
}

export function overrideBody(values: OverrideFormValues): ApiOverrideWrite {
  return values.dayOff
    ? { date: values.date, start: null, end: null, note: values.note }
    : { date: values.date, start: values.start, end: values.end, note: values.note };
}

export function blockBody(values: BlockFormValues): ApiBlockWrite {
  return {
    start: blockStart(values),
    end: blockEnd(values),
    kind: values.kind,
    label: values.label || null,
  };
}

export function serviceCreateBody(values: ServiceFormValues): ApiServiceWrite {
  const body: ApiServiceWrite = {
    name: { ...values.name },
    description: { ...values.description },
    category: values.category,
    default_duration_min: values.defaultDurationMin,
    default_price: values.defaultPrice,
    is_active: values.isActive,
  };
  // An empty short name is left to the server (the first 40 characters of name.uz).
  if (values.shortName.uz) body.short_name = { ...values.shortName };
  else if (values.shortName.ru || values.shortName.en) {
    body.short_name = {
      uz: values.name.uz.slice(0, 40),
      ru: values.shortName.ru,
      en: values.shortName.en,
    };
  }
  return body;
}

export function servicePatchBody(
  baseline: ServiceFormValues,
  values: ServiceFormValues,
): ApiServicePatch {
  const body: ApiServicePatch = {};
  const name = changedLeaves(baseline.name, values.name);
  if (name) body.name = name;
  const shortName = changedLeaves(baseline.shortName, values.shortName);
  if (shortName) body.short_name = shortName;
  const description = changedLeaves(baseline.description, values.description);
  if (description) body.description = description;
  if (values.category !== baseline.category) body.category = values.category;
  if (values.defaultDurationMin !== baseline.defaultDurationMin) {
    body.default_duration_min = values.defaultDurationMin;
  }
  if (values.defaultPrice !== baseline.defaultPrice) body.default_price = values.defaultPrice;
  if (values.isActive !== baseline.isActive) body.is_active = values.isActive;
  return body;
}

/** `PATCH location/`: the changed leaves (everything on the first PATCH, which creates the clinic). */
export function locationPatchBody(
  baseline: LocationFormValues | null,
  values: LocationFormValues,
): ApiLocationPatch {
  const body: ApiLocationPatch = {};
  const name = changedLeaves(baseline?.name ?? null, values.name);
  if (name) body.name = name;
  const address = changedLeaves(baseline?.address ?? null, values.address);
  if (address) body.address = address;
  if (!baseline || values.phone !== baseline.phone) body.phone = values.phone || null;
  if (
    !baseline ||
    values.latitude !== baseline.latitude ||
    values.longitude !== baseline.longitude
  ) {
    // A pair: sent (or cleared) together.
    body.latitude = values.latitude;
    body.longitude = values.longitude;
  }
  return body;
}
