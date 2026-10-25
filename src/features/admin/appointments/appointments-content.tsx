import { requireStaff } from "@/data/auth";
import { defaultAppointmentDay, getAppointmentDay } from "@/data/appointments";
import { addDays } from "@/lib/format";

import type { SearchParams } from "../shared/url-state";
import { AppointmentsView } from "./appointments-view";
import { dayHref, parseDay } from "./query";

export async function AppointmentsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const [params, today] = await Promise.all([searchParams, defaultAppointmentDay()]);
  const day = parseDay(params, today);
  const data = await getAppointmentDay(day);

  return (
    <AppointmentsView
      key={day}
      day={day}
      specialists={data.specialists}
      appointments={data.appointments}
      prevHref={dayHref(addDays(day, -1), today)}
      nextHref={dayHref(addDays(day, 1), today)}
    />
  );
}
