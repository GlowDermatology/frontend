import type { Route } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isApiError } from "@/data/api/errors";
import { copyFor } from "@/lib/i18n/admin-locale";

import { PageHeader } from "../shared/page-header";
import { workspaceCopy } from "./copy";

/** A workspace read's outcome: the data, or the HTTP status of the API's refusal. */
export type SpecialistRead<T> = { ok: true; data: T } | { ok: false; status: number };

/**
 * Runs the reads of one workspace page. An API refusal becomes `{ok: false, status}` (the page
 * then shows `WorkspaceUnavailable`); anything else is a programming error and rethrows into the
 * route's error boundary.
 */
export async function specialistRead<T>(read: () => Promise<T>): Promise<SpecialistRead<T>> {
  try {
    return { ok: true, data: await read() };
  } catch (error) {
    if (isApiError(error)) return { ok: false, status: error.status };
    throw error;
  }
}

/**
 * The body of a workspace page whose reads failed: 403 means the account is no longer a
 * specialist (changed to Staff while signed in), anything else a failure worth retrying.
 */
export async function WorkspaceUnavailable({
  title,
  status,
  retry,
}: {
  title: string;
  status: number;
  /** The page itself, reloaded by «Qayta urinish». */
  retry: Route;
}) {
  const t = (await copyFor(workspaceCopy)).unavailable;
  return (
    <>
      <PageHeader title={title} />
      <Card className="flex flex-col items-start gap-3">
        <p role="status" className="m-0 text-body-sm text-ink">
          {status === 403 ? t.paused : t.failed}
        </p>
        {status !== 403 && (
          <Link href={retry} className={buttonStyles({ variant: "outline", size: "sm" })}>
            {t.retry}
          </Link>
        )}
      </Card>
    </>
  );
}
