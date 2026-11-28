import { BANNER_WEB_CROP, type BannerImageRequest } from "@/domain/banner-image";
import { sceneDataCopy } from "@/domain/copy/scenes";
import type { SceneJob, SceneOutcome } from "@/domain/scene";
import { copyFor } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { PRODUCTS } from "./catalog";
import { delay } from "./delay";

/**
 * The demo's AI banner images (admin contract §2.20.8), no image model: a started job is
 * `queued`, the first poll finds it `running`, the next one `succeeded` with the demo's banner
 * picture (`public/mock/banner-candidate.webp`, 2.15:1). The job id carries the request
 * (base64url JSON), so every start is a new job; polls and outcomes are kept in memory by id. A
 * product named like «Kesilgan» (or the demo's product `3`) fails like the backend's
 * `banner_product_photo_unusable`, naming it; a typed scene that mentions a person fails like
 * `scene_custom_refused`.
 */

export const MOCK_BANNER_URL = "/mock/banner-candidate.webp";
export const MOCK_BANNER_FAILING_PRODUCT = "3";

const PREFIX = "mock-banner-";
const PEOPLE = /girl|woman|man\b|qiz|ayol|девушк|женщин|мужчин/i;

interface Encoded {
  m: BannerImageRequest["mode"];
  p: string[];
  t: string | null;
  c?: string;
  n: number;
}

let startCount = 0;
const polls = new Map<string, number>();
const outcomes = new Map<string, SceneOutcome>();

const encode = (value: Encoded) =>
  PREFIX + Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

function decode(id: string): Encoded | null {
  if (!id.startsWith(PREFIX)) return null;
  try {
    const value = JSON.parse(Buffer.from(id.slice(PREFIX.length), "base64url").toString("utf8"));
    return Array.isArray(value?.p) && typeof value?.m === "string" ? (value as Encoded) : null;
  } catch {
    return null;
  }
}

export const isMockBannerJob = (id: string) => id.startsWith(PREFIX);

const nameOf = (id: string) => {
  const product = PRODUCTS.find((entry) => entry.id === id);
  return product?.texts.uz.name || product?.billzName || `#${id}`;
};

async function jobOf(id: string, request: Encoded, polled: number): Promise<SceneJob> {
  const m = await copyFor(sceneDataCopy);
  const products = request.p.map((productId) => ({ id: productId, name: nameOf(productId) }));
  const failing = products.find((product) => product.id === MOCK_BANNER_FAILING_PRODUCT) ?? null;
  const refused = request.c !== undefined && PEOPLE.test(request.c);
  const state =
    polled <= 1 ? "queued" : polled === 2 ? "running" : failing || refused ? "failed" : "succeeded";
  const outcome = outcomes.get(id) ?? "pending";
  const now = referenceNow();
  return {
    id,
    productId: null,
    sourceImageId: null,
    kind: "ai_scene",
    template: request.c
      ? { key: "custom", name: m.customName, customText: request.c, savedTemplateId: null }
      : { key: "bathroom", name: m.templates.bathroom, customText: null, savedTemplateId: null },
    state,
    outcome: state === "succeeded" ? outcome : "pending",
    result:
      state === "succeeded" && outcome === "pending"
        ? {
            url: MOCK_BANNER_URL,
            overlayUrl: null,
            productBox: null,
            crops: { portrait: null, square: null },
            generatedInsidePct: 0,
            occludedPct: 0,
          }
        : null,
    error:
      state !== "failed"
        ? null
        : failing
          ? { code: "banner_product_photo_unusable", message: m.bannerPhotoUnusable }
          : { code: "scene_custom_refused", message: m.customRefused },
    warnings: [],
    acceptedImageId: null,
    banner: {
      mode: request.m,
      products,
      failedProduct: state === "failed" ? failing : null,
      webCrop: BANNER_WEB_CROP,
      acceptedBannerId: null,
    },
    createdAt: now.toISOString(),
    finishedAt: state === "succeeded" || state === "failed" ? now.toISOString() : null,
    expiresAt:
      state === "succeeded" ? new Date(now.getTime() + 72 * 3_600_000).toISOString() : null,
  };
}

export async function startBannerImage(
  request: BannerImageRequest,
): Promise<ActionResult<SceneJob>> {
  await delay(300);
  startCount += 1;
  const id = encode({
    m: request.mode,
    p: request.mode === "products" ? request.productIds : [],
    t: request.templateId ?? null,
    ...(request.customPrompt !== undefined ? { c: request.customPrompt } : {}),
    n: startCount,
  });
  polls.set(id, 1);
  return { ok: true, data: await jobOf(id, decode(id)!, 1) };
}

export async function getBannerImageJob(id: string): Promise<SceneJob | null> {
  const request = decode(id);
  if (!request) return null;
  const polled = (polls.get(id) ?? 1) + 1;
  polls.set(id, polled);
  return jobOf(id, request, polled);
}

/** The job as it stands, without counting a poll. */
async function peek(id: string): Promise<SceneJob | null> {
  const request = decode(id);
  return request ? jobOf(id, request, polls.get(id) ?? 3) : null;
}

export async function discardBannerImage(id: string): Promise<ActionResult<SceneJob>> {
  const m = await copyFor(sceneDataCopy);
  const job = await peek(id);
  if (!job) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (job.state !== "succeeded" || job.outcome !== "pending") {
    return { ok: false, error: m.notReviewable, code: "scene_job_not_ready" };
  }
  outcomes.set(id, "discarded");
  return { ok: true, data: { ...job, outcome: "discarded", result: null } };
}

/** Marks a finished banner image used; the picture's URL, or the failure. */
export async function consumeBannerImage(id: string): Promise<ActionResult<{ url: string }>> {
  const m = await copyFor(sceneDataCopy);
  const job = await peek(id);
  if (!job) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (job.state !== "succeeded" || job.outcome !== "pending" || !job.result?.url) {
    return { ok: false, error: m.notReviewable, code: "scene_job_not_ready" };
  }
  outcomes.set(id, "accepted");
  return { ok: true, data: { url: job.result.url } };
}
