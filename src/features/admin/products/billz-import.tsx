"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { importFromBillz, pollJob } from "@/data/products.actions";
import { billzImportSummary, isJobDone, type Job } from "@/domain/job";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { createImportController } from "./import-controller";

/**
 * "Billz’dan import" (contract §2.3): starts the import job, polls
 * `GET jobs/{id}/` every 1.5 s through the `pollJob` action and, once the
 * job is `succeeded` or `failed`, refreshes the route so the stats, the
 * "yangi" banner and the list reflect the import. The job state and the
 * result counts are shown next to the button.
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

export const JOB_RETRYING_MESSAGE = "Aloqa uzildi, qayta urinilmoqda…";

export function jobStatusText(job: Job): string {
  switch (job.state) {
    case "queued":
      return "Import navbatda…";
    case "running":
      return job.progress
        ? `Import qilinmoqda: ${job.progress.done} / ${job.progress.total}`
        : "Import qilinmoqda…";
    case "succeeded":
      return job.result
        ? `Import yakunlandi: ${billzImportSummary(job.result)}`
        : "Import yakunlandi";
    case "failed":
      return `Import xatosi: ${job.error?.message ?? "Kutilmagan xato."}`;
  }
}

export function BillzImport({ className }: { className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const [starting, setStarting] = useState(false);
  const [view, setView] = useState<JobView>({ job: null, error: null, retrying: false });
  const [, startTransition] = useTransition();
  // Created once; every callback it holds is stable (state setters, the
  // router, the toast function, `startTransition`).
  const [controller] = useState(() =>
    createImportController({
      fetchJob: (id) => runAction((csrf) => pollJob(id, csrf)),
      onUpdate: (job) => {
        setView({ job, error: null, retrying: false });
        if (!isJobDone(job.state)) return;
        startTransition(() => router.refresh());
        if (job.state === "succeeded") {
          toast({
            title: "Billz import yakunlandi",
            description: job.result ? billzImportSummary(job.result) : undefined,
          });
        } else {
          toast({
            tone: "info",
            title: "Amal bajarilmadi",
            description: job.error?.message ?? "Kutilmagan xato.",
          });
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
        toast({ tone: "info", title: "Amal bajarilmadi", description: message });
      },
    }),
  );

  useEffect(() => {
    controller.attach();
    return () => controller.detach();
  }, [controller]);

  const start = async () => {
    setStarting(true);
    setView({ job: null, error: null, retrying: false });
    const result = idempotency.settle(
      await runAction((csrf) => importFromBillz(idempotency.key, csrf)),
    );
    setStarting(false);
    if (!result.ok) {
      setView({ job: null, error: result.error, retrying: false });
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      return;
    }
    controller.start(result.data);
  };

  const busy = starting || (view.job !== null && !isJobDone(view.job.state));
  const status =
    view.error ??
    (view.retrying ? JOB_RETRYING_MESSAGE : view.job ? jobStatusText(view.job) : null);
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
      <Button variant="secondary" onClick={start} disabled={busy} aria-busy={busy}>
        <Icon name="refresh" size={18} className={cn(busy && "animate-spin")} />
        {busy ? "Import qilinmoqda…" : "Billz’dan import"}
      </Button>
    </span>
  );
}
