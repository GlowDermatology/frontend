"use client";

import { useEffect, useRef, useState } from "react";

import {
  acceptSceneJob,
  discardSceneJob,
  pollSceneJob,
  startSceneJob,
} from "@/data/scenes.actions";
import type { ActionResult } from "@/data/types";
import type { ProductImage } from "@/domain/product";
import {
  isSceneJobActive,
  isSceneReviewable,
  sceneView,
  type SceneJob,
  type SceneRequest,
  type SceneView,
} from "@/domain/scene";

import { runAction } from "../../shared/action-client";
import { useIdempotencyKey } from "../../shared/idempotency";
import { createImportController, type ImportController } from "../import-controller";

/**
 * One photo's scene job (admin contract §2.20) for a dialog: start, poll (the shared job poller,
 * paused while the route is hidden), resume after a reload by the job id kept in sessionStorage
 * per product and photo, accept and discard. A job ends being remembered when it is accepted,
 * discarded, failed or expired. Several hooks may exist for one photo (the scene dialog, the
 * renditions dialog's «AI bilan moslash»): each remembers its own `slot`.
 */

const STORE_PREFIX = "gd-scene-job";

/** The sessionStorage key of a photo's remembered job. */
export function sceneStoreKey(productId: string, imageId: string, slot: string): string {
  return `${STORE_PREFIX}:${slot}:${productId}:${imageId}`;
}

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberSceneJob(key: string, jobId: string, store = sessionStore()): void {
  try {
    store?.setItem(key, jobId);
  } catch {
    // Storage full or blocked: the job is simply not resumed after a reload.
  }
}

export function rememberedSceneJob(key: string, store = sessionStore()): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function forgetSceneJob(key: string, store = sessionStore()): void {
  try {
    store?.removeItem(key);
  } catch {
    // ignore
  }
}

/** Whether a job is still worth remembering (running, or a candidate waiting for review). */
export function keepsSceneJob(job: SceneJob): boolean {
  return isSceneJobActive(job) || isSceneReviewable(job);
}

/** A discard that found nothing to discard (already closed, expired, gone) still reached its goal. */
export function discardSettled(result: ActionResult<unknown>): boolean {
  return result.ok || result.code === "scene_job_not_ready" || result.code === "not_found";
}

export interface SceneJobHook {
  job: SceneJob | null;
  view: SceneView;
  /** The start request or a poll failed: the message (the server's, in the admin language). */
  error: { message: string; code?: string; fieldErrors?: Record<string, string> } | null;
  busy: boolean;
  start: (request: SceneRequest) => Promise<SceneJob | null>;
  accept: (options: {
    makeMain: boolean;
    acknowledgeGenerated: boolean;
  }) => Promise<ActionResult<{ job: SceneJob; image: ProductImage }>>;
  /** Discards a reviewable candidate (nothing to do otherwise) and forgets the job. */
  discard: () => Promise<void>;
  /** Forgets a failed, expired or closed job: back to picking a template. */
  reset: () => void;
}

interface Options {
  productId: string;
  imageId: string;
  /** Which dialog this is (`scene` / `fit`): its own remembered job. */
  slot: string;
  enabled: boolean;
}

export function useSceneJob({ productId, imageId, slot, enabled }: Options): SceneJobHook {
  const startKey = useIdempotencyKey();
  const reviewKey = useIdempotencyKey();
  const [job, setJob] = useState<SceneJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SceneJobHook["error"]>(null);
  const storeKey = sceneStoreKey(productId, imageId, slot);

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
    // A job started before a reload (or before the dialog was closed and remounted): resume it.
    const remembered = rememberedSceneJob(latest.current.storeKey);
    if (remembered && !controller.job) {
      void runAction((csrf) => pollSceneJob(remembered, csrf)).then((result) => {
        if (controller.job) return;
        if (result.ok && keepsSceneJob(result.data)) controller.start(result.data);
        else forgetSceneJob(latest.current.storeKey);
      });
    }
    return () => controller.detach();
  }, [enabled]);

  async function start(request: SceneRequest): Promise<SceneJob | null> {
    if (starting) return null;
    setStarting(true);
    setError(null);
    const result = startKey.settle(
      await runAction((csrf) => startSceneJob(productId, imageId, request, startKey.key, csrf)),
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

  async function accept(options: { makeMain: boolean; acknowledgeGenerated: boolean }) {
    if (!job) return { ok: false as const, error: "" };
    setBusy(true);
    try {
      const result = reviewKey.settle(
        await runAction((csrf) => acceptSceneJob(job.id, options, reviewKey.key, csrf)),
      );
      if (result.ok) {
        forgetSceneJob(storeKey);
        setJob(result.data.job);
      }
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    const current = job;
    forgetSceneJob(storeKey);
    if (current && isSceneReviewable(current)) {
      setBusy(true);
      const result = reviewKey.settle(
        await runAction((csrf) => discardSceneJob(current.id, reviewKey.key, csrf)),
      );
      setBusy(false);
      if (!discardSettled(result)) console.warn("[scenes] discard failed", result);
    }
    setJob(null);
  }

  return {
    job,
    view: sceneView(job, starting),
    error,
    busy: busy || starting,
    start,
    accept,
    discard,
    reset: () => {
      forgetSceneJob(storeKey);
      setJob(null);
      setError(null);
    },
  };
}
