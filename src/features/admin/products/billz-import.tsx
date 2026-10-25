"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { importFromBillz, pollJob } from "@/data/products.actions";
import { billzImportSummary, isJobDone, type Job } from "@/domain/job";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { createJobPoller, type JobPoller } from "./job-poller";

/**
 * "Billz’dan import" (contract §2.3): starts the import job, polls
 * `GET jobs/{id}/` every 1.5 s through the `pollJob` action and, once the
 * job is `succeeded` or `failed`, refreshes the route so the stats, the
 * "yangi" banner and the list reflect the import. The job state and the
 * result counts are shown next to the button.
 */

interface JobView {
  job: Job | null;
  error: string | null;
}

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
  const [view, setView] = useState<JobView>({ job: null, error: null });
  const [, startTransition] = useTransition();
  const poller = useRef<JobPoller | null>(null);

  useEffect(() => () => poller.current?.stop(), []);

  const start = async () => {
    setStarting(true);
    setView({ job: null, error: null });
    const result = idempotency.settle(
      await runAction((csrf) => importFromBillz(idempotency.key, csrf)),
    );
    setStarting(false);
    if (!result.ok) {
      setView({ job: null, error: result.error });
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      return;
    }
    poller.current?.stop();
    poller.current = createJobPoller({
      fetchJob: (id) => runAction((csrf) => pollJob(id, csrf)),
      onUpdate: (job) => {
        setView({ job, error: null });
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
      onError: (message) => {
        setView((current) => ({ job: current.job, error: message }));
        toast({ tone: "info", title: "Amal bajarilmadi", description: message });
      },
    });
    poller.current.start(result.data);
  };

  const busy = starting || (view.job !== null && !isJobDone(view.job.state));
  const status = view.error ?? (view.job ? jobStatusText(view.job) : null);
  const tone = view.error || view.job?.state === "failed" ? "danger" : "muted";

  return (
    <span className={cn("flex flex-wrap items-center gap-2", className)}>
      {status && (
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "max-w-[360px] text-caption font-normal text-ink-muted tabular-nums",
            tone === "danger" && "text-danger",
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
