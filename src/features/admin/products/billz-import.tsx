"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { importFromBillz, pollJob } from "@/data/products.actions";
import {
  BILLZ_AUTH_FAILED,
  BILLZ_LISTING_INCOMPLETE,
  isJobDone,
  type BillzImportResult,
  type Job,
} from "@/domain/job";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { productsCopy, type ProductsCopy } from "./copy";
import { createImportController, type ImportController } from "./import-controller";

/**
 * "Billz’dan import" (contract §2.3): starts the import job, polls
 * `GET jobs/{id}/` every 1.5 s through the `pollJob` action and, once the
 * job is `succeeded` or `failed`, refreshes the route so the stats, the
 * "yangi" banner and the list reflect the import. The job state and the
 * result counts are shown next to the button, in the admin language.
 *
 * A transport blip while polling is retried by the poller (shown as
 * "qayta urinilmoqda"). When the poller gives up, the control is released
 * (the job keeps running on the server; the backend is single-flight, so a
 * re-click returns the same running job) and the route is refreshed so the
 * stats catch up with whatever the job did meanwhile.
 *
 * Leaving the route hides it (Next keeps it mounted in an Activity): the
 * poller stops with the effect cleanup and resumes when the route is shown
 * again, so a job left queued or running is never stuck on screen.
 */

interface JobView {
  job: Job | null;
  error: string | null;
  /** Set while the poller is backing off after a transport failure. */
  retrying: boolean;
}

type ImportTexts = ProductsCopy["import"];

/** "3 ta yangi · 245 ta yangilandi · 0 ta o‘zgarmadi" (+ "· 2 ta yashirildi" after a full run). */
export function importSummary(t: ImportTexts, fmt: AdminFormatter, result: BillzImportResult) {
  return [
    t.summary.created(fmt.number(result.created)),
    t.summary.updated(fmt.number(result.updated)),
    t.summary.unchanged(fmt.number(result.unchanged)),
    ...(result.hidden === undefined ? [] : [t.summary.hidden(fmt.number(result.hidden))]),
  ].join(" · ");
}

/** Why a job failed: the known Billz codes in the admin language, else the server's message. */
export function jobErrorText(t: ImportTexts, job: Job): string {
  if (job.error?.code === BILLZ_LISTING_INCOMPLETE) return t.listingIncomplete;
  if (job.error?.code === BILLZ_AUTH_FAILED) return t.authFailed;
  return job.error?.message || t.unexpected;
}

export function jobStatusText(t: ImportTexts, fmt: AdminFormatter, job: Job): string {
  switch (job.state) {
    case "queued":
      return t.queued;
    case "running":
      return job.progress
        ? t.progress(fmt.number(job.progress.done), fmt.number(job.progress.total))
        : t.running;
    case "succeeded":
      return job.result ? t.doneWith(importSummary(t, fmt, job.result)) : t.done;
    case "failed":
      return t.failed(jobErrorText(t, job));
  }
}

/**
 * `search` is the list's current search: the demo's Billz listing arrives
 * incomplete when it ends in `9999` (demo mode only; the API ignores it).
 */
export function BillzImport({ className, search }: { className?: string; search?: string }) {
  const t = useCopy(productsCopy).import;
  const fmt = useFormat();
  const router = useRouter();
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const [starting, setStarting] = useState(false);
  const [view, setView] = useState<JobView>({ job: null, error: null, retrying: false });
  const [, startTransition] = useTransition();
  // The texts the controller's callbacks word their toasts with: the latest render's, so a
  // language switch in the middle of an import words its final toast in the new language.
  const latest = useRef({ t, fmt });
  useEffect(() => {
    latest.current = { t, fmt };
  }, [t, fmt]);
  // Created by the first mount effect (so the callbacks may read `latest`), then kept: Next
  // keeps a hidden route mounted, and its state, the tracked job included, must survive.
  // Every other callback it holds is stable (state setters, the router, the toast function,
  // `startTransition`).
  const controllerRef = useRef<ImportController | null>(null);
  useEffect(() => {
    controllerRef.current ??= createImportController({
      fetchJob: (id) => runAction((csrf) => pollJob(id, csrf)),
      timeoutMessage: () => latest.current.t.timeout,
      onUpdate: (job) => {
        setView({ job, error: null, retrying: false });
        if (!isJobDone(job.state)) return;
        const { t, fmt } = latest.current;
        startTransition(() => router.refresh());
        if (job.state === "succeeded") {
          toast({
            tone: "success",
            title: t.toastDone,
            description: job.result ? importSummary(t, fmt, job.result) : undefined,
          });
        } else {
          toast({ tone: "danger", title: t.toastFailed, description: jobErrorText(t, job) });
        }
      },
      onRetry: () => {
        setView((current) => ({ ...current, error: null, retrying: true }));
      },
      onError: (message) => {
        // Release the control: the job's fate is unknown from here, and the
        // admin must be able to re-click (single-flight on the server) or see
        // the refreshed stats instead of a spinner that never ends.
        setView({ job: null, error: message, retrying: false });
        startTransition(() => router.refresh());
        toast({ tone: "warning", title: latest.current.t.toastFailed, description: message });
      },
    });
    const controller = controllerRef.current;
    controller.attach();
    return () => controller.detach();
  }, [router, toast]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setView({ job: null, error: null, retrying: false });
    const result = idempotency.settle(
      await runAction((csrf) => importFromBillz(idempotency.key, csrf, search)),
    );
    setStarting(false);
    if (!result.ok) {
      setView({ job: null, error: result.error, retrying: false });
      toast({ tone: "danger", title: t.toastStartFailed, description: result.error });
      return;
    }
    controllerRef.current?.start(result.data);
  };

  const busy = starting || (view.job !== null && !isJobDone(view.job.state));
  const status =
    view.error ?? (view.retrying ? t.retrying : view.job ? jobStatusText(t, fmt, view.job) : null);
  const tone = view.error || view.job?.state === "failed" ? "danger" : "muted";

  return (
    <span className={cn("flex flex-wrap items-center gap-2", className)}>
      {status && (
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "max-w-[360px] text-caption font-normal text-ink-muted tabular-nums",
            // The deeper red keeps AA contrast for a long failure message.
            tone === "danger" && "text-danger-strong",
          )}
        >
          {status}
        </span>
      )}
      <Button variant="secondary" onClick={start} busy={busy}>
        <Icon
          name="refresh"
          size={18}
          className={cn(busy && "animate-spin motion-reduce:animate-none")}
        />
        {busy ? t.running : t.button}
      </Button>
    </span>
  );
}
