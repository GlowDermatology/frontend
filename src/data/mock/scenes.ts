import { catalogDataCopy } from "@/domain/copy/catalog";
import { sceneDataCopy } from "@/domain/copy/scenes";
import {
  autoCrop,
  clampCrop,
  SHAPE_RATIO,
  zoomCrop,
  type Crop,
  type ImageSize,
} from "@/domain/crop";
import type { ProductImage } from "@/domain/product";
import type {
  SceneCandidate,
  SceneJob,
  SceneKind,
  SceneOutcome,
  SceneRequest,
  SceneStatus,
  SceneTemplate,
} from "@/domain/scene";
import { copyFor, getAdminLocale } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import { MAX_IMAGES } from "../products.schema";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import {
  MOCK_IMAGE_SIZE,
  MOCK_SCENE_BOX,
  MOCK_SCENE_IMAGE_PREFIX,
  MOCK_SCENE_OVERLAY_URL,
  MOCK_SCENE_URL,
  mockImageOf,
} from "./products.actions";
import { getProduct } from "./products.queries";

/**
 * The demo's product scenes (admin contract §2.20), no image model: a started job is `queued`, the
 * first poll finds it `running`, the next one `succeeded` with the demo's scene picture
 * (`public/mock/scene-candidate.webp`). The job id carries the request (base64url JSON) and a
 * start counter, so every start is a new job; the poll count and the review outcome are kept in
 * memory by job id (a server restart forgets them). Template `marble` fails like the backend's
 * `scene_product_cut_off`; the AI template `spa` «draws» part of the product (an overlay that must
 * be acknowledged). A `fit` proposes crops a little closer than the automatic framing.
 */

export const MOCK_SCENE_STATUS: SceneStatus = {
  enabled: true,
  aiEnabled: true,
  maxOccludedPct: 15,
};

const TEMPLATES = [
  { id: "1", key: "white", kind: "studio", colours: ["#ffffff", "#f1ede7"] },
  { id: "2", key: "cream", kind: "studio", colours: ["#f6efe6", "#dcc6a8"] },
  { id: "3", key: "marble", kind: "studio", colours: ["#ece9e4", "#bdb5aa"] },
  { id: "4", key: "bathroom", kind: "ai_scene", colours: [] },
  { id: "5", key: "spa", kind: "ai_scene", colours: [] },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["key"];

export async function getSceneTemplates(): Promise<SceneTemplate[]> {
  const names = sceneDataCopy[await getAdminLocale()].templates;
  return TEMPLATES.map((template) => ({
    ...template,
    name: names[template.key],
    colours: [...template.colours],
  }));
}

const PREFIX = "mock-scene-";

interface Encoded {
  p: string;
  i: string;
  k: SceneKind;
  t: string | null;
  /** Tells starts apart: every start is a new job. */
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
    return typeof value?.p === "string" && typeof value?.i === "string" ? (value as Encoded) : null;
  } catch {
    return null;
  }
}

const sizeOf = (image: ProductImage): ImageSize =>
  image.media && image.media.width > 0 && image.media.height > 0 ? image.media : MOCK_IMAGE_SIZE;

/** The demo `fit`: the automatic framing, 15 % closer and nudged up (the «AI» saw the cap). */
function fitCrops(image: ProductImage): Record<"portrait" | "square", Crop> {
  const size = sizeOf(image);
  const box = image.media?.productBox ?? null;
  const out = {} as Record<"portrait" | "square", Crop>;
  for (const shape of ["portrait", "square"] as const) {
    const ratio = SHAPE_RATIO[shape];
    const auto = autoCrop(ratio, size, box);
    const closer = zoomCrop(ratio, auto, 1.15, size);
    out[shape] = clampCrop(ratio, [closer[0], closer[1] - 0.03, closer[2], closer[3]], size);
  }
  return out;
}

function candidate(request: Encoded, image: ProductImage): SceneCandidate {
  if (request.k === "fit") {
    return {
      url: null,
      overlayUrl: null,
      productBox: image.media?.productBox ?? null,
      crops: fitCrops(image),
      generatedInsidePct: 0,
      occludedPct: 0,
    };
  }
  const size = { width: 1600, height: 2000 };
  const drawn = request.t === "spa";
  return {
    url: MOCK_SCENE_URL,
    overlayUrl: drawn ? MOCK_SCENE_OVERLAY_URL : null,
    productBox: [...MOCK_SCENE_BOX],
    crops: {
      portrait: autoCrop(SHAPE_RATIO.portrait, size, MOCK_SCENE_BOX),
      square: autoCrop(SHAPE_RATIO.square, size, MOCK_SCENE_BOX),
    },
    generatedInsidePct: drawn ? 3.5 : 0,
    occludedPct: drawn ? 6 : 0,
  };
}

async function jobOf(id: string, request: Encoded, polled: number): Promise<SceneJob | null> {
  const image = await mockImageOf(request.p, request.i);
  if (!image) return null;
  const at = referenceNow().toISOString();
  const template = TEMPLATES.find((entry) => entry.key === request.t);
  const names = sceneDataCopy[await getAdminLocale()];
  const state =
    polled === 0
      ? "queued"
      : polled === 1
        ? "running"
        : request.t === "marble"
          ? "failed"
          : "succeeded";
  const done = state === "succeeded" || state === "failed";
  return {
    id,
    productId: request.p,
    sourceImageId: request.i,
    kind: request.k,
    template: template
      ? { key: template.key, name: names.templates[template.key as TemplateKey] }
      : null,
    state,
    outcome: outcomes.get(id) ?? "pending",
    result: state === "succeeded" && !outcomes.has(id) ? candidate(request, image) : null,
    error:
      state === "failed" ? { code: "scene_product_cut_off", message: names.productCutOff } : null,
    warnings:
      request.t === "spa" && state === "succeeded"
        ? ["hand_removed", "product_partly_generated"]
        : [],
    acceptedImageId: null,
    createdAt: at,
    finishedAt: done ? at : null,
    expiresAt: done ? at : null,
  };
}

export async function startSceneJob(
  productId: string,
  imageId: string,
  request: SceneRequest,
): Promise<ActionResult<SceneJob>> {
  await delay(300);
  const m = await copyFor(sceneDataCopy);
  const image = await mockImageOf(productId, imageId);
  if (!image) return { ok: false, error: m.jobNotFound, code: "not_found" };
  let template: (typeof TEMPLATES)[number] | undefined;
  if (request.kind !== "fit") {
    template = TEMPLATES.find((entry) => entry.id === request.templateId);
    if (!template || template.kind !== request.kind) {
      return {
        ok: false,
        error: m.templateRequired,
        fieldErrors: { templateId: m.templateRequired },
      };
    }
  }
  startCount += 1;
  const encoded: Encoded = {
    p: productId,
    i: imageId,
    k: request.kind,
    t: template?.key ?? null,
    n: startCount,
  };
  const id = encode(encoded);
  polls.set(id, 0);
  const job = await jobOf(id, encoded, 0);
  return job ? { ok: true, data: job } : { ok: false, error: m.jobNotFound, code: "not_found" };
}

export async function getSceneJob(id: string): Promise<SceneJob | null> {
  await delay(200);
  const request = decode(id);
  if (!request) return null;
  const polled = (polls.get(id) ?? 1) + 1;
  polls.set(id, polled);
  return jobOf(id, request, polled);
}

/** The job as it stands, without counting a poll. */
async function peek(id: string): Promise<{ request: Encoded; job: SceneJob } | null> {
  const request = decode(id);
  if (!request) return null;
  const job = await jobOf(id, request, polls.get(id) ?? 2);
  return job ? { request, job } : null;
}

export async function acceptSceneJob(
  id: string,
  options: { makeMain: boolean; acknowledgeGenerated: boolean },
): Promise<ActionResult<{ job: SceneJob; image: ProductImage }>> {
  await delay(400);
  const m = await copyFor(sceneDataCopy);
  const found = await peek(id);
  if (!found) return { ok: false, error: m.jobNotFound, code: "not_found" };
  const { request, job } = found;
  if (job.state !== "succeeded" || job.outcome !== "pending" || !job.result) {
    return { ok: false, error: m.notReviewable, code: "scene_job_not_ready" };
  }
  if (job.result.generatedInsidePct > 0 && !options.acknowledgeGenerated) {
    return {
      ok: false,
      error: m.acknowledge,
      fieldErrors: { acknowledgeGenerated: m.acknowledge },
    };
  }
  const source = (await mockImageOf(request.p, request.i))!;
  const at = referenceNow().toISOString();
  let image: ProductImage;
  if (job.kind === "fit") {
    const crops = job.result.crops;
    const rendition = (crop: Crop | null) =>
      crop
        ? {
            crop,
            mode: "auto" as const,
            url: source.src ?? null,
            mediumUrl: source.src ?? null,
            thumbnailUrl: source.src ?? null,
          }
        : null;
    image = {
      ...source,
      media: {
        ...(source.media ?? {
          ...MOCK_IMAGE_SIZE,
          url: null,
          mediumUrl: null,
          source: "upload",
          derivedFromId: null,
          productBox: null,
          renditions: { portrait: null, square: null },
        }),
        productBox: job.result.productBox,
        renditions: { portrait: rendition(crops.portrait), square: rendition(crops.square) },
      },
    };
  } else {
    const product = await getProduct(request.p);
    if ((product?.images.length ?? 0) >= MAX_IMAGES) {
      const tooMany = (await copyFor(catalogDataCopy)).tooManyImages(MAX_IMAGES);
      return { ok: false, error: tooMany, code: "validation_error" };
    }
    const crops = job.result.crops;
    const rendition = (crop: Crop | null) =>
      crop
        ? {
            crop,
            mode: "auto" as const,
            url: MOCK_SCENE_URL,
            mediumUrl: MOCK_SCENE_URL,
            thumbnailUrl: MOCK_SCENE_URL,
          }
        : null;
    image = {
      id: `${MOCK_SCENE_IMAGE_PREFIX}${request.n}`,
      label: "",
      src: MOCK_SCENE_URL,
      alt: { uz: "", ru: "", en: "" },
      media: {
        width: 1600,
        height: 2000,
        url: MOCK_SCENE_URL,
        mediumUrl: MOCK_SCENE_URL,
        source: job.kind === "ai_scene" ? "ai_scene" : "studio",
        derivedFromId: request.i,
        productBox: job.result.productBox,
        renditions: { portrait: rendition(crops.portrait), square: rendition(crops.square) },
      },
    };
    void options.makeMain; // the demo keeps no order: the editor places the image itself
  }
  outcomes.set(id, "accepted");
  return {
    ok: true,
    data: {
      job: { ...job, outcome: "accepted", result: null, acceptedImageId: image.id, finishedAt: at },
      image,
    },
  };
}

export async function discardSceneJob(id: string): Promise<ActionResult<SceneJob>> {
  await delay(150);
  const m = await copyFor(sceneDataCopy);
  const found = await peek(id);
  if (!found) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (found.job.state !== "succeeded" || found.job.outcome !== "pending") {
    return { ok: false, error: m.notReviewable, code: "scene_job_not_ready" };
  }
  outcomes.set(id, "discarded");
  return { ok: true, data: { ...found.job, outcome: "discarded", result: null } };
}
