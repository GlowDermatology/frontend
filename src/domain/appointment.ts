export type AppointmentStatus = "requested" | "confirmed" | "rejected" | "attended" | "cancelled";

export interface Specialist {
  id: string;
  name: string;
  role: "Dermatolog" | "Kosmetolog";
  /** Working hours for the shown day as "HH:MM" (Tashkent time). */
  workingHours: { start: string; end: string };
  /** Blocks without a booking, e.g. a break. */
  blocks: Array<{ start: string; end: string; label: string; kind: "busy" | "off" }>;
  /**
   * `false` when the specialist does not work on the shown day (contract
   * §5.6: the API sends `working_hours: null`; the board then draws the whole
   * default day as one "Ish kuni emas" block). Absent = working.
   */
  working?: boolean;
  /**
   * `false` for a specialist deactivated with `force` who still has
   * appointments that day (contract §2.9, FND-1): the column stays, marked
   * «Nofaol», and its appointments stay actionable. Absent = active.
   */
  isActive?: boolean;
}

export interface Appointment {
  id: string;
  specialistId: string;
  customer: { id: string; name: string; phone: string };
  /** The booked service (its duration and price are snapshotted on the visit). */
  serviceId: string;
  service: string;
  durationMin: number;
  start: string;
  end: string;
  /** Price at the moment of booking, so‘m. */
  price: number;
  status: AppointmentStatus;
  requestedAt: string;
  requestedVia: "ilova" | "administrator";
}

/** Allowed status actions per status (contract §2.9 confirm / reject / attend). */
export function appointmentActions(
  status: AppointmentStatus,
): Array<"confirm" | "reject" | "attend"> {
  switch (status) {
    case "requested":
      return ["confirm", "reject"];
    case "confirmed":
      return ["attend"];
    case "rejected":
    case "attended":
    case "cancelled":
      return [];
  }
}

/** Reschedule and cancel are allowed while the visit is `requested` or `confirmed` (§2.9). */
export function canChangeAppointment(status: AppointmentStatus): boolean {
  return status === "requested" || status === "confirmed";
}

/** Statuses that hold the specialist's time (the overlap check of §2.9). */
export function holdsSlot(status: AppointmentStatus): boolean {
  return status === "requested" || status === "confirmed";
}

/* --- Admin booking (contract §2.9 `appointments/meta/` and the T10 endpoints) --- */

export interface BookingService {
  id: string;
  name: string;
  shortName: string;
  durationMin: number;
  /** What a booking with this specialist snapshots, so‘m. */
  price: number;
}

export interface BookingSpecialist {
  id: string;
  name: string;
  role: Specialist["role"];
  services: BookingService[];
}

export interface BookingMeta {
  specialists: BookingSpecialist[];
  /** Minutes between bookable starts (5). */
  slotStepMin: number;
}

/** The working hours, blocks and held slots of one specialist on one day. */
export interface SpecialistSchedule {
  /** `null` = not working that day. */
  workingHours: { start: string; end: string } | null;
  blocks: ReadonlyArray<{ start: string; end: string }>;
  /** Held appointments (requested / confirmed) as minutes since midnight. */
  busy: ReadonlyArray<{ id: string; from: number; to: number }>;
}

export const NOTE_MAX = 300;
export const CANCEL_REASON_MAX = 300;
export const SLOT_STEP_MIN = 5;

/** "09:30" → 570. */
export function minutesOfDay(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 570 → "09:30". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "2026-10-26" + "09:30" → "2026-10-26T09:30:00+05:00" (Tashkent has no DST). */
export function tashkentStart(date: string, time: string): string {
  return `${date}T${time}:00+05:00`;
}

export interface SlotOption {
  /** "HH:MM" */
  time: string;
  /** Overlaps a block, a break or a held visit of the loaded schedule. */
  taken: boolean;
}

/**
 * The start times the booking dialogs offer: every `step` minutes inside the
 * day's working hours where a visit of `durationMin` still ends by closing
 * time, from `notBefore` (minutes; today's current time) on. Starts that
 * collide with a block or another held visit are kept but flagged `taken`:
 * the loaded schedule may be stale, so the backend stays the authority and
 * answers `slot_unavailable` ("Bu vaqt band.") itself. `excludeId` leaves the
 * visit being rescheduled out of the overlap check.
 */
export function slotOptions(
  schedule: SpecialistSchedule,
  durationMin: number,
  options: { step?: number; notBefore?: number; excludeId?: string } = {},
): SlotOption[] {
  if (!schedule.workingHours || durationMin <= 0) return [];
  const step = options.step ?? SLOT_STEP_MIN;
  const open = minutesOfDay(schedule.workingHours.start);
  const close = minutesOfDay(schedule.workingHours.end);
  const first = Math.max(open, Math.ceil((options.notBefore ?? 0) / step) * step);
  const blocked = [
    ...schedule.blocks.map((b) => ({ from: minutesOfDay(b.start), to: minutesOfDay(b.end) })),
    ...schedule.busy.filter((b) => b.id !== options.excludeId),
  ];
  const result: SlotOption[] = [];
  for (let start = Math.ceil(first / step) * step; start + durationMin <= close; start += step) {
    const end = start + durationMin;
    result.push({
      time: formatMinutes(start),
      taken: blocked.some((b) => start < b.to && b.from < end),
    });
  }
  return result;
}

/**
 * Why a start is refused, checked like the backend does for an admin booking
 * (contract §2.9): grid, past, working hours, blocks, overlap. Used by the
 * mock actions so the demo answers the same field codes offline; `null` = ok.
 */
export function bookingProblem(
  schedule: SpecialistSchedule,
  startMinutes: number,
  durationMin: number,
  options: { step?: number; inPast?: boolean; excludeId?: string } = {},
): "invalid_step" | "in_past" | "outside_working_hours" | "slot_unavailable" | null {
  const step = options.step ?? SLOT_STEP_MIN;
  if (startMinutes % step !== 0) return "invalid_step";
  if (options.inPast) return "in_past";
  if (!schedule.workingHours) return "outside_working_hours";
  const open = minutesOfDay(schedule.workingHours.start);
  const close = minutesOfDay(schedule.workingHours.end);
  const end = startMinutes + durationMin;
  if (startMinutes < open || end > close) return "outside_working_hours";
  const overlaps = (from: number, to: number) => startMinutes < to && from < end;
  if (schedule.blocks.some((b) => overlaps(minutesOfDay(b.start), minutesOfDay(b.end)))) {
    return "slot_unavailable";
  }
  if (schedule.busy.some((b) => b.id !== options.excludeId && overlaps(b.from, b.to))) {
    return "slot_unavailable";
  }
  return null;
}

/** Minutes since Tashkent midnight of an ISO instant (UTC+5, no DST). */
export function tashkentMinutes(iso: string): number {
  const minutes = Math.floor(Date.parse(iso) / 60_000) + 5 * 60;
  return ((minutes % 1440) + 1440) % 1440;
}

/**
 * One specialist's schedule from a loaded day (the board's, or the one the
 * booking dialog fetched for another date): working hours (`null` when not
 * working), blocks and the visits that hold time.
 */
export function specialistSchedule(
  day: { specialists: ReadonlyArray<Specialist>; appointments: ReadonlyArray<Appointment> },
  specialistId: string,
): SpecialistSchedule {
  const specialist = day.specialists.find((s) => s.id === specialistId);
  if (!specialist || specialist.working === false) {
    return { workingHours: null, blocks: [], busy: [] };
  }
  return {
    workingHours: specialist.workingHours,
    blocks: specialist.blocks,
    busy: day.appointments
      .filter((a) => a.specialistId === specialistId && holdsSlot(a.status))
      .map((a) => ({ id: a.id, from: tashkentMinutes(a.start), to: tashkentMinutes(a.end) })),
  };
}
