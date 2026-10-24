import { getAppointmentDay } from "@/data/appointments";
import { addDays } from "@/lib/format";

import type { SearchParams } from "../shared/url-state";
import { AppointmentsView } from "./appointments-view";
import { dayHref, parseDay } from "./query";

export async function AppointmentsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const day = parseDay(await searchParams);
  const data = await getAppointmentDay(day);

  return (
    <AppointmentsView
      key={day}
      day={day}
      specialists={data.specialists}
      appointments={data.appointments}
      prevHref={dayHref(addDays(day, -1))}
      nextHref={dayHref(addDays(day, 1))}
    />
  );
}
