import Link from "next/link";
import { Suspense } from "react";

import { isApiError } from "@/data/api/errors";
import { requireSpecialist } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { requestNow } from "@/data/now";
import { getMySchedule } from "@/data/specialist";
import { myScheduleCopy } from "@/features/admin/my-schedule/copy";
import { Schedule } from "@/features/admin/my-schedule/schedule";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { addDays, toLocalIsoDate } from "@/lib/format";
import { copyFor } from "@/lib/i18n/admin-locale";

export function generateMetadata() {
  return pageMetadata("my-appointments");
}

function dateOrToday(value: unknown, today: string): string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return today;
  const instant = new Date(value + "T00:00:00Z");
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value
    ? value
    : today;
}

/**
 * The specialist's home: their own visits by day or week, with the conflicts and their working
 * hours (`specialist/calendar/`, `availability/`, `conflicts/`).
 */
async function MyAppointmentsContent({ searchParams }: PageProps<"/admin/my-appointments">) {
  const { token } = await requireSpecialist();
  const [query, now, t] = await Promise.all([searchParams, requestNow(), copyFor(myScheduleCopy)]);
  const today = toLocalIsoDate(now);
  const date = dateOrToday(query.date, today);
  const week = query.view === "week";
  const result = await getMySchedule(token, date, week ? addDays(date, 6) : date)
    .then((data) => ({ data }))
    .catch((error: unknown) => {
      if (!isApiError(error)) throw error;
      return { error };
    });
  return "data" in result ? (
    <Schedule data={result.data} date={date} today={today} week={week} now={now.getTime()} />
  ) : (
    <>
      <h1 className="m-0 font-serif text-display">{t.title}</h1>
      <p role="status">{result.error.status === 403 ? t.paused : t.unavailable}</p>
      {result.error.status !== 403 && <Link href={SPECIALIST_HOME}>{t.retry}</Link>}
    </>
  );
}

export default function MyAppointmentsPage(props: PageProps<"/admin/my-appointments">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyAppointmentsContent {...props} />
    </Suspense>
  );
}
