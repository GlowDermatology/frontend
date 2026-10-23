export type AppointmentStatus = "requested" | "confirmed" | "rejected" | "attended";

export interface Specialist {
  id: string;
  name: string;
  role: "Dermatolog" | "Kosmetolog";
  /** Working hours for the shown day as "HH:MM" (Tashkent time). */
  workingHours: { start: string; end: string };
  /** Blocks without a booking, e.g. a break. */
  blocks: Array<{ start: string; end: string; label: string; kind: "busy" | "off" }>;
}

export interface Appointment {
  id: string;
  specialistId: string;
  customer: { id: string; name: string; phone: string };
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

/** Allowed admin actions per status. */
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
      return [];
  }
}
