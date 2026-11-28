"use client";

import { useEffect, useRef, useState } from "react";

import { discardSceneJob, pollSceneJob, startBannerImage } from "@/data/scenes.actions";
import type { BannerImageRequest } from "@/domain/banner-image";
import { sceneView, type SceneJob, type SceneView } from "@/domain/scene";

import { createImportController, type ImportController } from "../products/import-controller";
import {
  discardSettled,
  forgetSceneJob,
  keepsSceneJob,
  rememberedSceneJob,
  rememberSceneJob,
} from "../products/scenes/use-scene-job";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

/**
 * One banner's AI image job (admin contract §2.20.8) for the generator dialog: start, poll (the
 * shared job poller, paused while the route is hidden), resume after a reload or a reopened dialog
 * by the job id kept in sessionStorage per banner (`new` for a banner being created), and discard.
 * Using the picture is the banner dialog's save (`saveBanner` with `imageJobId`).
 */

export function bannerImageStoreKey(bannerId: string | null): string {
  return `gd-banner-image:${bannerId ?? "new"}`;
}

export interface BannerImageJobHook {
  job: SceneJob | null;
  view: SceneView;
  error: { message: string; code?: string; fieldErrors?: Record<string, string> } | null;
  busy: boolean;
  start: (request: BannerImageRequest) => Promise<SceneJob | null>;
  /** Discards a finished picture (nothing to do otherwise) and forgets the job. */
  discard: () => Promise<void>;
  /** Forgets the job without discarding it (it was used, failed or expired). */
  forget: () => void;
  reset: () => void;
}

export function useBannerImageJob(bannerId: string | null, enabled: boolean): BannerImageJobHook {
  const startKey = useIdempotencyKey();
  const discardKey = useIdempotencyKey();
  const [job, setJob] = useState<SceneJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BannerImageJobHook["error"]>(null);
  const storeKey = bannerImageStoreKey(bannerId);
  const latest = useRef({ storeKey });
  useEffect(() => {
    latest.current = { storeKey };
  });

  const controllerRef = useRef<ImportController<SceneJob> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    controllerRef.current ??= createImportController<SceneJob>({
      fetchJob: (id) => runAction((csrf) => pollSceneJob(id, csrf)),
      onUpdate: (next) => {
        setJob(next);
        if (!keepsSceneJob(next)) forgetSceneJob(latest.current.storeKey);
      },
      onRetry: () => undefined,
      onError: (message) => {
        setJob(null);
        forgetSceneJob(latest.current.storeKey);
        setError({ message });
      },
    });
    const controller = controllerRef.current;
    controller.attach();
    const remembered = rememberedSceneJob(latest.current.storeKey);
    if (remembered && !controller.job) {
      void runAction((csrf) => pollSceneJob(remembered, csrf)).then((result) => {
        if (controller.job) return;
        if (result.ok && result.data.banner && keepsSceneJob(result.data)) {
          controller.start(result.data);
          setJob(result.data);
        } else {
          forgetSceneJob(latest.current.storeKey);
        }
      });
    }
    return () => controller.detach();
  }, [enabled]);

  async function start(request: BannerImageRequest): Promise<SceneJob | null> {
    if (starting) return null;
    setStarting(true);
    setError(null);
    const result = startKey.settle(
      await runAction((csrf) => startBannerImage(request, startKey.key, csrf)),
    );
    setStarting(false);
    if (!result.ok) {
      setError({ message: result.error, code: result.code, fieldErrors: result.fieldErrors });
      return null;
    }
    rememberSceneJob(storeKey, result.data.id);
    controllerRef.current?.start(result.data);
    setJob(result.data);
    return result.data;
  }

  async function discard(): Promise<void> {
    const current = job;
    forgetSceneJob(storeKey);
    if (!current || current.state !== "succeeded" || current.outcome !== "pending") {
      setJob(null);
      return;
    }
    setBusy(true);
    try {
      const result = discardKey.settle(
        await runAction((csrf) => discardSceneJob(current.id, discardKey.key, csrf)),
      );
      if (!discardSettled(result)) setError({ message: result.ok ? "" : result.error });
    } finally {
      setBusy(false);
      setJob(null);
    }
  }

  function forget() {
    forgetSceneJob(storeKey);
  }

  function reset() {
    forgetSceneJob(storeKey);
    setJob(null);
    setError(null);
  }

  return { job, view: sceneView(job, starting), error, busy, start, discard, forget, reset };
}
