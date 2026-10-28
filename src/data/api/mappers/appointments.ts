import type { BookingMeta, Specialist } from "@/domain/appointment";

import type { AppointmentDay, DayAppointment, PendingAppointments } from "../../appointments";
import type {
  ApiAppointmentItem,
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
export const DELETED_CUSTOMER_NAME = "O‘chirilgan mijoz";

export function roleLabel(role: string): Specialist["role"] {
  return role === "cosmetologist" ? ROLE_LABEL.cosmetologist : ROLE_LABEL.dermatologist;
}

export function mapSpecialistDay(api: ApiSpecialistDay): Specialist {
  if (api.working_hours === null) {
    return {
      id: idString(api.id),
      name: api.name,
      role: roleLabel(api.role),
      workingHours: { ...DEFAULT_HOURS },
      blocks: [{ ...DEFAULT_HOURS, kind: "off", label: "Ish kuni emas" }],
      working: false,
      ...(api.is_active === false ? { isActive: false } : {}),
    };
  }
  return {
    id: idString(api.id),
    name: api.name,
    role: roleLabel(api.role),
    workingHours: { start: api.working_hours.start, end: api.working_hours.end },
    blocks: api.blocks.map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      label: block.label ?? (block.kind === "busy" ? "Band qilingan" : "Ish vaqti emas"),
    })),
    working: true,
    ...(api.is_active === false ? { isActive: false } : {}),
  };
}

export function mapDayAppointment(api: ApiAppointmentItem): DayAppointment {
  return {
    id: idString(api.id),
    specialistId: idString(api.specialist_id),
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
