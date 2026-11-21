import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isApiError } from "@/data/api/errors";
import { getMe, requireStaff } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { requestNow } from "@/data/now";
import { getMySchedule } from "@/data/specialist";
import { myScheduleCopy } from "@/features/admin/my-schedule/copy";
import { MyScheduleFrame } from "@/features/admin/my-schedule/frame";
import { Schedule } from "@/features/admin/my-schedule/schedule";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { addDays, toLocalIsoDate } from "@/lib/format";
import { copyFor } from "@/lib/i18n/admin-locale";

function dateOrToday(value: unknown, today: string): string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return today;
  const instant = new Date(value + "T00:00:00Z");
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value
    ? value
    : today;
}

async function MyScheduleContent({ searchParams }: PageProps<"/admin/my-schedule">) {
  const session = await requireStaff();
  const [me, query, now, t] = await Promise.all([
    getMe(),
    searchParams,
    requestNow(),
    copyFor(myScheduleCopy),
  ]);
  if (session.mode !== "api" || (me && me.role !== "specialist")) redirect("/admin");
  const today = toLocalIsoDate(now);
  const date = dateOrToday(query.date, today);
  const week = query.view === "week";
  const result = await getMySchedule(session.token, date, week ? addDays(date, 6) : date)
    .then((data) => ({ data }))
    .catch((error: unknown) => {
      if (!isApiError(error)) throw error;
      return { error };
    });
  return (
    <MyScheduleFrame>
      {"data" in result ? (
        <Schedule data={result.data} date={date} today={today} week={week} now={now.getTime()} />
      ) : (
        <>
          <h1 className="m-0 font-serif text-display">{t.title}</h1>
          <p role="status">{result.error.status === 403 ? t.paused : t.unavailable}</p>
          {result.error.status !== 403 && <Link href={SPECIALIST_HOME}>{t.retry}</Link>}
        </>
      )}
    </MyScheduleFrame>
  );
}

export default function MySchedulePage(props: PageProps<"/admin/my-schedule">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyScheduleContent {...props} />
    </Suspense>
  );
}
