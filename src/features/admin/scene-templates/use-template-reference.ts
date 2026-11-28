"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { pollSceneJob } from "@/data/scenes.actions";
import { makeTemplateReference } from "@/data/scene-templates.actions";
import type { SceneJob } from "@/domain/scene";

import { createImportController, type ImportController } from "../products/import-controller";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

/**
 * «Tavsifdan yaratish» of the template editor: starts the job making a template's reference from
 * its text, polls it (the shared job poller), and refreshes the route when it is done so every card
 * shows the new picture. `onDone` gets the outcome (the toast is the caller's).
 */
export function useTemplateReference(onDone: (ok: boolean, message?: string) => void) {
  const router = useRouter();
  const key = useIdempotencyKey();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const controller = useRef<ImportController<SceneJob> | null>(null);

  useEffect(() => {
    controller.current ??= createImportController<SceneJob>({
      fetchJob: (id) => runAction((csrf) => pollSceneJob(id, csrf)),
      onUpdate: (job) => {
        if (job.state === "succeeded") {
          setRunning(false);
          router.refresh();
          done.current(true);
        } else if (job.state === "failed") {
          setRunning(false);
          setError(job.error?.message ?? null);
          done.current(false, job.error?.message);
        }
      },
      onRetry: () => undefined,
      onError: (message) => {
        setRunning(false);
        setError(message);
        done.current(false, message);
      },
    });
    const current = controller.current;
    current.attach();
    return () => current.detach();
  }, [router]);

  async function start(templateId: string) {
    if (running) return;
    setError(null);
    setRunning(true);
    const result = key.settle(
      await runAction((csrf) => makeTemplateReference(templateId, key.key, csrf)),
    );
    if (!result.ok) {
      setRunning(false);
      setError(result.error);
      return;
    }
    controller.current?.start(result.data);
  }

  return { running, error, start };
}
