import type { AppointmentClinic, BookingMeta, Specialist } from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

import type {
  AppointmentDay,
  AppointmentRange,
  DayAppointment,
  PendingAppointments,
} from "../../appointments";
import type {
  ApiAppointmentClinic,
  ApiAppointmentItem,
  ApiAppointmentRange,
  ApiAppointmentsMeta,
  ApiDaySchedule,
  ApiPendingSummary,
  ApiSpecialistDay,
} from "../types";
import { toActionResult, type ActionFailure, type FieldRemap } from "./errors";
import { idString, customerContact } from "./common";

/**
 * Appointments (contract §2.9) → the FE domain types, display rules of §5.6:
 * role labels, `working_hours: null` drawn as one "Ish kuni emas" block over
 * the default day, block labels, `requested_via` labels and the deleted
 * customer's name (§7.16).
 */

const ROLE_LABEL = { dermatologist: "Dermatolog", cosmetologist: "Kosmetolog" } as const;
const VIA_LABEL = { app: "ilova", admin: "administrator" } as const;

export const DEFAULT_HOURS = { start: "09:00", end: "18:00" } as const;
/** A domain token the board shows in the admin language (`labels.ts customerName`). */
// i18n-ignore
export const DELETED_CUSTOMER_NAME = "O‘chirilgan mijoz";

/**
 * The Uzbek labels this mapper gives a block the API sends without one, and
 * the whole-day block of a day off. The admin board shows them in the admin
 * language (`appointmentsCopy.blocks`); a label the API did send is content
 * and stays as it is.
 */
export const FALLBACK_BLOCK_LABEL = {
  busy: "Band qilingan",
  off: "Ish vaqti emas",
  dayOff: "Ish kuni emas",
} as const;

export function roleLabel(role: string): Specialist["role"] {
  return role === "cosmetologist" ? ROLE_LABEL.cosmetologist : ROLE_LABEL.dermatologist;
}

function mapAppointmentClinic(api: ApiAppointmentClinic): AppointmentClinic {
  return { ...api, id: idString(api.id) };
}

export function mapSpecialistDay(api: ApiSpecialistDay): Specialist {
  if (api.working_hours === null) {
    return {
      id: idString(api.id),
      name: api.name,
      role: roleLabel(api.role),
      location: null,
      workingHours: { ...DEFAULT_HOURS },
      blocks: [{ ...DEFAULT_HOURS, kind: "off", label: FALLBACK_BLOCK_LABEL.dayOff }],
      working: false,
      ...(api.is_active === false ? { isActive: false } : {}),
    };
  }
  return {
    id: idString(api.id),
    name: api.name,
    role: roleLabel(api.role),
    location: api.location ? mapAppointmentClinic(api.location) : null,
    workingHours: { start: api.working_hours.start, end: api.working_hours.end },
    blocks: api.blocks.map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      label: block.label ?? FALLBACK_BLOCK_LABEL[block.kind === "busy" ? "busy" : "off"],
    })),
    working: true,
    ...(api.is_active === false ? { isActive: false } : {}),
  };
}

export function mapDayAppointment(api: ApiAppointmentItem): DayAppointment {
  return {
    id: idString(api.id),
    specialistId: idString(api.specialist_id),
    location: mapAppointmentClinic(api.location),
    customer: {
      id: idString(api.customer.id),
      name: api.customer.name || DELETED_CUSTOMER_NAME,
      phone: customerContact(api.customer.phone, api.customer.email),
    },
    serviceId: idString(api.service_id),
    service: api.service_name,
    serviceShort: api.service_short_name || api.service_name,
    durationMin: api.duration_min,
    start: api.start,
    end: api.end,
    price: api.price,
    status: api.status,
    requestedAt: api.requested_at,
    requestedVia: VIA_LABEL[api.requested_via] ?? VIA_LABEL.app,
  };
}

export function mapAppointmentDay(api: ApiDaySchedule): AppointmentDay {
  return {
    date: api.date,
    specialists: api.specialists.map(mapSpecialistDay),
    appointments: api.appointments.map(mapDayAppointment),
  };
}

/**
 * `appointments/range/` → the week and month boards. With `detail=full` the
 * specialists' schedules and the appointments become one `AppointmentDay` per
 * date (the day board's shape, so the week grid and the booking dialog reuse
 * it); a specialist without a schedule entry for a date is drawn as not
 * working that day.
 */
export function mapAppointmentRange(api: ApiAppointmentRange): AppointmentRange {
  const schedules =
    api.schedules === null
      ? null
      : api.days.map(({ date }): AppointmentDay => {
          const specialists = api.specialists.map((specialist) => {
            const schedule = api.schedules?.find(
              (s) => s.specialist_id === specialist.id && s.date === date,
            );
            return mapSpecialistDay({
              ...specialist,
              location: schedule?.location ?? null,
              working_hours: schedule?.working_hours ?? null,
              blocks: schedule?.blocks ?? [],
            });
          });
          return {
            date,
            specialists,
            appointments: (api.appointments ?? [])
              .filter((item) => toLocalIsoDate(item.start) === date)
              .map(mapDayAppointment),
          };
        });
  return {
    from: api.from,
    to: api.to,
    specialists: api.specialists.map((specialist) => ({
      id: idString(specialist.id),
      name: specialist.name,
      role: roleLabel(specialist.role),
      isActive: specialist.is_active,
    })),
    days: api.days.map((day) => ({
      date: day.date,
      counts: {
        requested: day.counts.requested,
        confirmed: day.counts.confirmed,
        attended: day.counts.attended,
        rejected: day.counts.rejected,
        cancelled: day.counts.cancelled,
      },
      total: day.total,
      working: day.working,
      hours: day.hours ? { start: day.hours.start, end: day.hours.end } : null,
    })),
    schedules,
  };
}

export function mapPendingSummary(api: ApiPendingSummary): PendingAppointments {
  return { count: api.count, nextAt: api.next_at };
}

export function mapBookingMeta(api: ApiAppointmentsMeta): BookingMeta {
  return {
    slotStepMin: api.slot_step_min,
    specialists: api.specialists.map((specialist) => ({
      id: idString(specialist.id),
      name: specialist.name,
      role: roleLabel(specialist.role),
      services: specialist.services.map((service) => ({
        id: idString(service.id),
        name: service.name,
        shortName: service.short_name || service.name,
        durationMin: service.duration_min,
        price: service.price,
      })),
    })),
  };
}

/**
 * API field paths of the booking endpoints → the dialog's field names: the
 * dialogs split `start` into a date and a time field and show its errors
 * (`slot_unavailable`, `outside_working_hours`, `in_past`, `invalid`) on the
 * time; the customer is entered by phone, so `customer_id` errors land there.
 */
export const BOOKING_FIELD_REMAP: FieldRemap = {
  start: "time",
  specialist_id: "specialistId",
  location_id: "locationId",
  service_id: "serviceId",
  customer_id: "phone",
  phone: "phone",
  note: "note",
  reason: "reason",
};

/**
 * A move shows no service field (the service stays): `service_id`
 * `does_not_exist` ("Mutaxassis bu xizmatni ko‘rsatmaydi.") means the picked
 * specialist does not offer it, so it lands on the specialist.
 */
export const RESCHEDULE_FIELD_REMAP: FieldRemap = {
  ...BOOKING_FIELD_REMAP,
  service_id: "specialistId",
};

/**
 * API failure of a booking call → the dialog's fields (`remap`); the 409
 * `conflict` of a lost race is shown on the time like `slot_unavailable`.
 */
export function bookingFailure(
  error: unknown,
  remap: FieldRemap = BOOKING_FIELD_REMAP,
): ActionFailure {
  const failure = toActionResult(error, remap);
  if (failure.code === "conflict") {
    return { ...failure, fieldErrors: { ...failure.fieldErrors, time: failure.error } };
  }
  return failure;
}
