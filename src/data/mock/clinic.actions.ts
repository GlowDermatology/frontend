import {
  type BlockedPeriod,
  type ClinicLocation,
  type ClinicSpecialist,
  type HoursOverride,
  type SpecialistService,
} from "@/domain/clinic";
import { addDays, toLocalIsoDate } from "@/lib/format";
import { SPECIALIST_SLUG_MAX, slugifyName } from "@/domain/seo";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { copyFor } from "@/lib/i18n/admin-locale";

import { blockEnd, blockStart } from "../clinic.schema";
import type {
  BlockFormValues,
  LocationFormValues,
  OverrideFormValues,
  SpecialistFormValues,
  SpecialistServiceFormValues,
  WorkingWeekValues,
} from "../clinic.schema";
import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { MOCK_BLOCKS, MOCK_CLINICS, MOCK_OVERRIDES, MOCK_SPECIALISTS } from "./clinic";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/clinic.actions.ts` (contract §2.17): the
 * backend's answers and refusals computed from the fixtures, nothing kept.
 * The demo's "today" is the reference day (2026-10-24, Tashkent).
 */

/** The backend's messages in the admin language (the API answers in `Accept-Language`). */
const messages = () => copyFor(clinicDataCopy);
const specialistMissing = async () => ({
  ok: false as const,
  error: (await messages()).specialistNotFound,
  code: "not_found",
});
const fields = async (fieldErrors: Record<string, string>) => ({
  ok: false as const,
  error: (await messages()).checkFields,
  code: "validation_error",
  fieldErrors,
});

const byId = (id: string) => MOCK_SPECIALISTS.find((s) => s.id === id) ?? null;
const now = () => referenceNow().toISOString();
const today = () => toLocalIsoDate(referenceNow());

/** The API's `unique` message for a specialist slug (contract §2.17), in Uzbek. */
export const SPECIALIST_SLUG_TAKEN_MESSAGE = clinicDataCopy.uz.slugTaken;

const slugTaken = (slug: string, id: string | null) =>
  slug !== "" && MOCK_SPECIALISTS.some((s) => s.slug === slug && s.id !== id);

function profile(before: ClinicSpecialist, values: SpecialistFormValues): ClinicSpecialist {
  return {
    ...before,
    name: values.name,
    qualifications: { ...values.qualifications },
    bio: { ...values.bio },
    experienceYears: values.experienceYears,
    slotStepMin: values.slotStepMin,
    role: values.role,
    locationId: values.locationId || null,
    locationIds: [...values.locationIds],
    isActive: values.isActive,
    slug:
      values.slug || before.slug || slugifyName(values.name, SPECIALIST_SLUG_MAX) || "mutaxassis",
    updatedAt: now(),
  };
}

export async function updateSpecialist(
  id: string,
  values: SpecialistFormValues,
  force: boolean,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return specialistMissing();
  if (slugTaken(values.slug, id)) return fields({ slug: (await messages()).slugTaken });
  if (!before.isActive && values.isActive && before.publishBlockers.length > 0) {
    return { ok: false, error: (await messages()).checkFields, code: "conflict" };
  }
  if (before.isActive && !values.isActive && before.upcomingAppointments > 0 && !force) {
    return {
      ok: false,
      error: (await messages()).deactivationConflict(before.upcomingAppointments),
      code: "conflict",
    };
  }
  return { ok: true, data: profile(before, values) };
}

/** The upload keeps no bytes: the answer's `photoUrl` is `""` and the page keeps its preview. */
export async function setSpecialistPhoto(
  id: string,
  photo: File | null,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return specialistMissing();
  return { ok: true, data: { ...before, photoUrl: photo ? "" : null, updatedAt: now() } };
}

export async function saveWorkingHours(
  id: string,
  values: WorkingWeekValues,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return specialistMissing();
  return {
    ok: true,
    data: {
      ...before,
      workingHours: [...values.days].sort((a, b) => a.weekday - b.weekday),
      updatedAt: now(),
    },
  };
}

export async function createOverride(
  id: string,
  values: OverrideFormValues,
): Promise<ActionResult<HoursOverride>> {
  await delay(300);
  if (!byId(id)) return specialistMissing();
  const m = await messages();
  if (values.date < today()) return fields({ date: m.pastDate });
  if (values.date > addDays(today(), 365)) return fields({ date: m.yearAhead });
  if ((MOCK_OVERRIDES[id] ?? []).some((o) => o.date === values.date)) {
    return fields({ date: m.overrideExists });
  }
  return {
    ok: true,
    data: {
      id: `draft-${crypto.randomUUID()}`,
      date: values.date,
      locationId: values.dayOff ? null : values.locationId,
      start: values.dayOff ? null : values.start,
      end: values.dayOff ? null : values.end,
      dayOff: values.dayOff,
      note: values.note,
      createdBy: "Administrator",
      createdAt: now(),
    },
  };
}

export async function createBlock(
  id: string,
  values: BlockFormValues,
): Promise<ActionResult<BlockedPeriod>> {
  await delay(300);
  if (!byId(id)) return specialistMissing();
  const start = Date.parse(blockStart(values));
  const end = Date.parse(blockEnd(values));
  const m = await messages();
  if (end <= referenceNow().getTime()) return fields({ endTime: m.blockEnded });
  if (end - start > 366 * 86_400_000) return fields({ endTime: m.blockTooLong });
  const overlaps = (MOCK_BLOCKS[id] ?? []).some(
    (b) => Date.parse(b.start) < end && Date.parse(b.end) > start,
  );
  if (overlaps) return fields({ startTime: m.blockOverlap });
  return {
    ok: true,
    data: {
      id: `draft-${crypto.randomUUID()}`,
      start: blockStart(values),
      end: blockEnd(values),
      kind: values.kind,
      label: values.label || null,
      createdBy: "Administrator",
      createdAt: now(),
    },
  };
}

/** Deleting an override or a block: 404 for one the specialist does not have. */
export async function deleteScheduleEntry(
  id: string,
  kind: "override" | "block",
  entryId: string,
): Promise<ActionResult<{ id: string }>> {
  await delay(250);
  if (!byId(id)) return specialistMissing();
  const rows = kind === "override" ? MOCK_OVERRIDES[id] : MOCK_BLOCKS[id];
  if (!entryId.startsWith("draft-") && !(rows ?? []).some((row) => row.id === entryId)) {
    return { ok: false, error: (await messages()).notFound, code: "not_found" };
  }
  return { ok: true, data: { id: entryId } };
}

/** The specialist with `services` as their list; the "service" blocker follows the active ones. */
function withServices(before: ClinicSpecialist, services: SpecialistService[]): ClinicSpecialist {
  const bookable = services.some((service) => service.isActive);
  const blockers = before.publishBlockers.filter((blocker) => blocker !== "service");
  return {
    ...before,
    services,
    publishBlockers: bookable ? blockers : [...blockers, "service"],
    updatedAt: now(),
  };
}

function serviceFrom(
  specialist: ClinicSpecialist,
  before: SpecialistService | null,
  values: SpecialistServiceFormValues,
): SpecialistService {
  return {
    id: before?.id ?? `draft-${crypto.randomUUID()}`,
    specialistId: specialist.id,
    name: { ...values.name },
    shortName: {
      ...values.shortName,
      uz: values.shortName.uz || values.name.uz.slice(0, 40),
    },
    description: { ...values.description },
    category: values.category,
    price: values.price,
    durationMin: values.durationMin,
    position: before?.position ?? specialist.services.length,
    isActive: values.isActive,
    createdAt: before?.createdAt ?? now(),
    updatedAt: now(),
  };
}

const serviceMissing = async () => ({
  ok: false as const,
  error: (await messages()).serviceNotFound,
  code: "not_found",
});

/** A new service (`serviceId` null) or an edit of one of the specialist's own services. */
export async function saveSpecialistService(
  id: string,
  serviceId: string | null,
  values: SpecialistServiceFormValues,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const specialist = byId(id);
  if (!specialist) return specialistMissing();
  const before =
    serviceId === null ? null : (specialist.services.find((s) => s.id === serviceId) ?? null);
  if (serviceId !== null && !before) return serviceMissing();
  const name = values.name.uz.trim().toLocaleLowerCase("uz");
  const duplicate = specialist.services.some(
    (s) => s.id !== serviceId && s.name.uz.trim().toLocaleLowerCase("uz") === name,
  );
  if (duplicate) return fields({ "name.uz": (await messages()).serviceTwice });
  const saved = serviceFrom(specialist, before, values);
  const services = before
    ? specialist.services.map((s) => (s.id === before.id ? saved : s))
    : [...specialist.services, saved];
  return { ok: true, data: withServices(specialist, services) };
}

export async function setSpecialistServiceActive(
  id: string,
  serviceId: string,
  isActive: boolean,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(250);
  const specialist = byId(id);
  if (!specialist) return specialistMissing();
  if (!specialist.services.some((s) => s.id === serviceId)) return serviceMissing();
  const services = specialist.services.map((s) =>
    s.id === serviceId ? { ...s, isActive, updatedAt: now() } : s,
  );
  return { ok: true, data: withServices(specialist, services) };
}

/** The demo's seeded services have appointments (409, deactivate instead); a new one goes. */
export async function deleteSpecialistService(
  id: string,
  serviceId: string,
): Promise<ActionResult<{ id: string }>> {
  await delay(250);
  const specialist = byId(id);
  if (!specialist) return specialistMissing();
  if (serviceId.startsWith("draft-")) return { ok: true, data: { id: serviceId } };
  if (!specialist.services.some((s) => s.id === serviceId)) return serviceMissing();
  return { ok: false, error: (await messages()).serviceBooked, code: "conflict" };
}

export async function saveClinic(
  id: string | null,
  values: LocationFormValues,
): Promise<ActionResult<ClinicLocation>> {
  await delay(400);
  if (id && !id.startsWith("draft-") && !MOCK_CLINICS.some((clinic) => clinic.id === id)) {
    return { ok: false, error: (await messages()).notFound, code: "not_found" };
  }
  if (
    !values.isActive &&
    MOCK_SPECIALISTS.some((doctor) => doctor.isActive && doctor.locationIds.includes(id ?? ""))
  ) {
    return fields({ isActive: (await messages()).clinicInUse });
  }
  return {
    ok: true,
    data: {
      id: id ?? `draft-${crypto.randomUUID()}`,
      name: { ...values.name },
      address: { ...values.address },
      directions: { ...values.directions },
      isActive: values.isActive,
      phone: values.phone || null,
      latitude: values.latitude,
      longitude: values.longitude,
      updatedAt: now(),
    },
  };
}
