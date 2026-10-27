import {
  deactivationConflictMessage,
  type BlockedPeriod,
  type ClinicLocation,
  type ClinicService,
  type ClinicSpecialist,
  type HoursOverride,
} from "@/domain/clinic";
import { addDays, toLocalIsoDate } from "@/lib/format";
import { SPECIALIST_SLUG_MAX, slugifyName } from "@/domain/seo";

import { blockEnd, blockStart } from "../clinic.schema";
import type {
  BlockFormValues,
  LocationFormValues,
  OfferedServicesValues,
  OverrideFormValues,
  ServiceFormValues,
  SpecialistFormValues,
  WorkingWeekValues,
} from "../clinic.schema";
import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import {
  MOCK_BLOCKS,
  MOCK_LOCATION,
  MOCK_OVERRIDES,
  MOCK_SERVICES,
  MOCK_SPECIALISTS,
} from "./clinic";
import { delay } from "./delay";

/**
 * Mock implementation of `src/data/clinic.actions.ts` (contract §2.17): the
 * backend's answers and refusals computed from the fixtures, nothing kept.
 * The demo's "today" is the reference day (2026-10-24, Tashkent).
 */

const INVALID = "Maydonlarni tekshiring.";
const notFound = { ok: false as const, error: "Mutaxassis topilmadi.", code: "not_found" };
const fields = (fieldErrors: Record<string, string>) => ({
  ok: false as const,
  error: INVALID,
  code: "validation_error",
  fieldErrors,
});

const byId = (id: string) => MOCK_SPECIALISTS.find((s) => s.id === id) ?? null;
const now = () => referenceNow().toISOString();
const today = () => toLocalIsoDate(referenceNow());

/** The API's `unique` message for a specialist slug (contract §2.17). */
export const SPECIALIST_SLUG_TAKEN_MESSAGE = "Bu manzil (slug) boshqa mutaxassisda bor.";

const slugTaken = (slug: string, id: string | null) =>
  slug !== "" && MOCK_SPECIALISTS.some((s) => s.slug === slug && s.id !== id);

function profile(before: ClinicSpecialist, values: SpecialistFormValues): ClinicSpecialist {
  return {
    ...before,
    name: values.name,
    role: values.role,
    qualifications: { ...values.qualifications },
    bio: { ...values.bio },
    experienceYears: values.experienceYears,
    slotStepMin: values.slotStepMin,
    staffUser: values.staffUserId
      ? { id: values.staffUserId, name: before.staffUser?.name ?? `Xodim #${values.staffUserId}` }
      : null,
    isActive: values.isActive,
    slug:
      values.slug || before.slug || slugifyName(values.name, SPECIALIST_SLUG_MAX) || "mutaxassis",
    updatedAt: now(),
  };
}

export async function createSpecialist(
  values: SpecialistFormValues,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const blank: ClinicSpecialist = {
    id: `draft-${crypto.randomUUID()}`,
    name: "",
    role: values.role,
    qualifications: { uz: "", ru: "", en: "" },
    bio: { uz: "", ru: "", en: "" },
    experienceYears: null,
    photoUrl: null,
    locationId: MOCK_LOCATION.id,
    staffUser: null,
    slotStepMin: 30,
    position: MOCK_SPECIALISTS.length,
    isActive: false,
    services: [],
    workingHours: [],
    upcomingAppointments: 0,
    slug: "",
    createdAt: now(),
    updatedAt: now(),
  };
  if (slugTaken(values.slug, null)) return fields({ slug: SPECIALIST_SLUG_TAKEN_MESSAGE });
  return { ok: true, data: profile(blank, values) };
}

export async function updateSpecialist(
  id: string,
  values: SpecialistFormValues,
  force: boolean,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return notFound;
  if (slugTaken(values.slug, id)) return fields({ slug: SPECIALIST_SLUG_TAKEN_MESSAGE });
  if (before.isActive && !values.isActive && before.upcomingAppointments > 0 && !force) {
    return {
      ok: false,
      error: deactivationConflictMessage(before.upcomingAppointments),
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
  if (!before) return notFound;
  return { ok: true, data: { ...before, photoUrl: photo ? "" : null, updatedAt: now() } };
}

export async function saveOfferedServices(
  id: string,
  values: OfferedServicesValues,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return notFound;
  const errors: Record<string, string> = {};
  const services = values.services.flatMap((row, index) => {
    const service = MOCK_SERVICES.find((s) => s.id === row.serviceId);
    if (!service) {
      errors[`services.${index}.serviceId`] = "Xizmat topilmadi.";
      return [];
    }
    return [
      {
        serviceId: service.id,
        name: service.name.uz,
        shortName: service.shortName.uz,
        category: service.category,
        price: row.price,
        durationMin: row.durationMin ?? service.defaultDurationMin,
        isActive: row.isActive,
        serviceIsActive: service.isActive,
      },
    ];
  });
  if (Object.keys(errors).length > 0) return fields(errors);
  const position = (serviceId: string) =>
    MOCK_SERVICES.find((s) => s.id === serviceId)?.position ?? 0;
  services.sort((a, b) => position(a.serviceId) - position(b.serviceId));
  return { ok: true, data: { ...before, services, updatedAt: now() } };
}

export async function saveWorkingHours(
  id: string,
  values: WorkingWeekValues,
): Promise<ActionResult<ClinicSpecialist>> {
  await delay(400);
  const before = byId(id);
  if (!before) return notFound;
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
  if (!byId(id)) return notFound;
  if (values.date < today()) return fields({ date: "O‘tgan sanani tanlab bo‘lmaydi." });
  if (values.date > addDays(today(), 365)) {
    return fields({ date: "Ko‘pi bilan bir yil oldinga kiritish mumkin." });
  }
  if ((MOCK_OVERRIDES[id] ?? []).some((o) => o.date === values.date)) {
    return fields({ date: "Bu sana uchun alohida jadval allaqachon bor." });
  }
  return {
    ok: true,
    data: {
      id: `draft-${crypto.randomUUID()}`,
      date: values.date,
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
  if (!byId(id)) return notFound;
  const start = Date.parse(blockStart(values));
  const end = Date.parse(blockEnd(values));
  if (end <= referenceNow().getTime())
    return fields({ endTime: "Tugagan vaqtni band qilib bo‘lmaydi." });
  if (end - start > 366 * 86_400_000) return fields({ endTime: "Ko‘pi bilan 366 kunlik davr." });
  const overlaps = (MOCK_BLOCKS[id] ?? []).some(
    (b) => Date.parse(b.start) < end && Date.parse(b.end) > start,
  );
  if (overlaps) return fields({ startTime: "Bu vaqt boshqa band vaqt bilan kesishadi." });
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
  if (!byId(id)) return notFound;
  const rows = kind === "override" ? MOCK_OVERRIDES[id] : MOCK_BLOCKS[id];
  if (!entryId.startsWith("draft-") && !(rows ?? []).some((row) => row.id === entryId)) {
    return { ok: false, error: "Topilmadi.", code: "not_found" };
  }
  return { ok: true, data: { id: entryId } };
}

function serviceFrom(before: ClinicService | null, values: ServiceFormValues): ClinicService {
  return {
    id: before?.id ?? `draft-${crypto.randomUUID()}`,
    name: { ...values.name },
    shortName: {
      ...values.shortName,
      uz: values.shortName.uz || values.name.uz.slice(0, 40),
    },
    description: { ...values.description },
    category: values.category,
    defaultDurationMin: values.defaultDurationMin,
    defaultPrice: values.defaultPrice,
    position: before?.position ?? MOCK_SERVICES.length,
    isActive: values.isActive,
    specialistCount: values.isActive ? (before?.specialistCount ?? 0) : 0,
    createdAt: before?.createdAt ?? now(),
    updatedAt: now(),
  };
}

export async function saveService(
  id: string | null,
  values: ServiceFormValues,
): Promise<ActionResult<ClinicService>> {
  await delay(400);
  if (id === null) return { ok: true, data: serviceFrom(null, values) };
  const before = MOCK_SERVICES.find((s) => s.id === id) ?? null;
  if (!before) return { ok: false, error: "Xizmat topilmadi.", code: "not_found" };
  return { ok: true, data: serviceFrom(before, values) };
}

export async function saveLocation(
  values: LocationFormValues,
): Promise<ActionResult<ClinicLocation>> {
  await delay(400);
  return {
    ok: true,
    data: {
      ...MOCK_LOCATION,
      name: { ...values.name },
      address: { ...values.address },
      phone: values.phone || null,
      latitude: values.latitude,
      longitude: values.longitude,
      updatedAt: now(),
    },
  };
}
