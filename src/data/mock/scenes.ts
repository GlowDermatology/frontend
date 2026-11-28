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
import {
  CUSTOM_SCENE_KEY,
  type SceneCandidate,
  type SceneJob,
  type SceneKind,
  type SceneOutcome,
  type SceneRequest,
  type SceneStatus,
  type SceneTemplate,
} from "@/domain/scene";
import { refresh } from "next/cache";
import { copyFor, getAdminLocale } from "@/lib/i18n/admin-locale";

import { referenceNow } from "../config";
import { discardBannerImage, getBannerImageJob, isMockBannerJob } from "./banner-images";
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
 * be acknowledged). A `fit` proposes crops a little closer than the automatic framing. A typed
 * scene (`customPrompt`) succeeds, unless it mentions a person (`girl`, `qiz`, `девушк`), which
 * fails like the backend's `scene_custom_refused`; saving it as a template adds a card for this
 * server's lifetime. The AI templates show the scene picture as their preview, the studio ones
 * their colours.
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

/** The demo's pictures of a scene alone (no product): AI templates' references. */
export const MOCK_REFERENCE_URLS = ["/mock/scene-reference-1.webp", "/mock/scene-reference-2.webp"];
const SEEDED_TEXT: Partial<Record<TemplateKey, string>> = {
  bathroom: "A white marble shelf against a warm beige wall, a sprig of eucalyptus, soft daylight.",
  spa: "Smooth grey spa stones on white marble, a warm beige wall, calm side light.",
};

/**
 * The demo's template library (this server's lifetime): the seeded five plus what staff created or
 * saved; edits (names, text, reference, hidden) are kept by id. A reference «upload» keeps no bytes:
 * it shows the demo's reference picture.
 */
const saved: SceneTemplate[] = [];
const savedByJob = new Map<string, string>();
const edits = new Map<string, Partial<SceneTemplate> & { hidden?: boolean }>();

async function seeded(): Promise<SceneTemplate[]> {
  const names = sceneDataCopy[await getAdminLocale()].templates;
  const all = {
    uz: sceneDataCopy.uz.templates,
    ru: sceneDataCopy.ru.templates,
    en: sceneDataCopy.en.templates,
  };
  return TEMPLATES.map((template, index) => {
    const ai = template.kind === "ai_scene";
    const reference = ai ? MOCK_REFERENCE_URLS[index % 2]! : null;
    return {
      ...template,
      name: names[template.key],
      colours: [...template.colours],
      previewUrl: reference,
      names: { uz: all.uz[template.key], ru: all.ru[template.key], en: all.en[template.key] },
      text: SEEDED_TEXT[template.key] ?? "",
      referenceUrl: reference,
      referenceSource: ai ? ("generated" as const) : ("" as const),
      savedByStaff: false,
    };
  });
}

async function library(): Promise<Array<SceneTemplate & { hidden?: boolean }>> {
  const locale = await getAdminLocale();
  return [...(await seeded()), ...saved].map((template) => {
    const edit = edits.get(template.id);
    if (!edit) return template;
    const names = edit.names ?? template.names;
    return { ...template, ...edit, name: names[locale] || names.uz };
  });
}

function withoutHidden(template: SceneTemplate & { hidden?: boolean }): SceneTemplate {
  const copy = { ...template };
  delete copy.hidden;
  return copy;
}

export async function getSceneTemplates(): Promise<SceneTemplate[]> {
  return (await library()).filter((template) => !template.hidden).map(withoutHidden);
}

const PEOPLE = /girl|woman|man\b|qiz|ayol|девушк|женщин|мужчин/i;

const PREFIX = "mock-scene-";

interface Encoded {
  p: string;
  i: string;
  k: SceneKind;
  t: string | null;
  /** A typed scene (instead of a template). */
  c?: string;
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
  const savedTemplate = saved.find((entry) => entry.key === request.t);
  const names = sceneDataCopy[await getAdminLocale()];
  const refused = request.c !== undefined && PEOPLE.test(request.c);
  const state =
    polled === 0
      ? "queued"
      : polled === 1
        ? "running"
        : request.t === "marble" || refused
          ? "failed"
          : "succeeded";
  const done = state === "succeeded" || state === "failed";
  return {
    id,
    productId: request.p,
    sourceImageId: request.i,
    kind: request.k,
    template:
      request.c !== undefined
        ? {
            key: CUSTOM_SCENE_KEY,
            name: names.customName,
            customText: request.c,
            savedTemplateId: savedByJob.get(id) ?? null,
          }
        : template
          ? {
              key: template.key,
              name: names.templates[template.key as TemplateKey],
              customText: null,
              savedTemplateId: null,
            }
          : savedTemplate
            ? {
                key: savedTemplate.key,
                name: savedTemplate.name,
                customText: null,
                savedTemplateId: null,
              }
            : null,
    state,
    outcome: outcomes.get(id) ?? "pending",
    result: state === "succeeded" && !outcomes.has(id) ? candidate(request, image) : null,
    error:
      state !== "failed"
        ? null
        : refused
          ? { code: "scene_custom_refused", message: names.customRefused }
          : { code: "scene_product_cut_off", message: names.productCutOff },
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
  let template: { key: string; kind: SceneKind } | undefined;
  if (request.customPrompt !== undefined) {
    if (request.kind !== "ai_scene") {
      return {
        ok: false,
        error: m.customRequired,
        fieldErrors: { customPrompt: m.customRequired },
      };
    }
  } else if (request.kind !== "fit") {
    template = [...TEMPLATES, ...saved].find((entry) => entry.id === request.templateId);
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
    ...(request.customPrompt !== undefined ? { c: request.customPrompt } : {}),
  };
  const id = encode(encoded);
  polls.set(id, 0);
  const job = await jobOf(id, encoded, 0);
  return job ? { ok: true, data: job } : { ok: false, error: m.jobNotFound, code: "not_found" };
}

export async function getSceneJob(id: string): Promise<SceneJob | null> {
  await delay(200);
  if (isMockBannerJob(id)) return getBannerImageJob(id);
  if (isMockReferenceJob(id)) return getReferenceJob(id);
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
  if (isMockBannerJob(id)) return discardBannerImage(id);
  const m = await copyFor(sceneDataCopy);
  const found = await peek(id);
  if (!found) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (found.job.state !== "succeeded" || found.job.outcome !== "pending") {
    return { ok: false, error: m.notReviewable, code: "scene_job_not_ready" };
  }
  outcomes.set(id, "discarded");
  return { ok: true, data: { ...found.job, outcome: "discarded", result: null } };
}

/** «Shablon sifatida saqlash» in the demo: the typed scene becomes a card with the scene picture. */
export async function saveSceneTemplate(
  id: string,
  name: string,
): Promise<ActionResult<SceneTemplate>> {
  await delay(250);
  const m = await copyFor(sceneDataCopy);
  const found = await peek(id);
  if (!found) return { ok: false, error: m.jobNotFound, code: "not_found" };
  const { request, job } = found;
  if (request.c === undefined || job.state !== "succeeded") {
    return { ok: false, error: m.notCustom, code: "scene_not_custom" };
  }
  if (savedByJob.has(id))
    return { ok: false, error: m.templateExists, code: "scene_template_exists" };
  // like the backend: the card shows the scene alone (its reference is made from the words)
  const template: SceneTemplate = {
    id: `saved-${request.n}`,
    key: `${CUSTOM_SCENE_KEY}-${request.n}`,
    kind: "ai_scene",
    name,
    colours: [],
    previewUrl: MOCK_REFERENCE_URLS[request.n % 2]!,
    names: { uz: name, ru: name, en: name },
    text: request.c ?? "",
    referenceUrl: MOCK_REFERENCE_URLS[request.n % 2]!,
    referenceSource: "generated",
    savedByStaff: true,
  };
  saved.push(template);
  savedByJob.set(id, template.id);
  refresh(); // the editor's template list is server-loaded
  return { ok: true, data: template };
}

/* --- the template editor (§2.20.9) ------------------------------------------------------------ */

export interface MockTemplateEdit {
  name?: { uz: string; ru: string; en: string };
  text?: string;
  /** A picked file: the demo keeps no bytes and shows its reference picture. */
  reference?: boolean;
  removeReference?: boolean;
  enabled?: boolean;
}

let createdCount = 0;
const referenceJobs = new Map<string, { templateId: string; polls: number }>();

function refusedText(text: string): boolean {
  return PEOPLE.test(text);
}

export async function createSceneTemplate(
  edit: MockTemplateEdit,
): Promise<ActionResult<SceneTemplate>> {
  await delay(400);
  const m = await copyFor(sceneDataCopy);
  const text = edit.text ?? "";
  if (refusedText(text)) {
    return { ok: false, error: m.customRefused, fieldErrors: { text: m.customRefused } };
  }
  createdCount += 1;
  const name = edit.name ?? { uz: "", ru: "", en: "" };
  const reference = edit.reference ? MOCK_REFERENCE_URLS[createdCount % 2]! : null;
  const template: SceneTemplate = {
    id: `staff-${createdCount}`,
    key: `staff-${createdCount}`,
    kind: "ai_scene",
    name: name.uz,
    colours: [],
    previewUrl: reference,
    names: name,
    text,
    referenceUrl: reference,
    referenceSource: reference ? "upload" : "",
    savedByStaff: true,
  };
  saved.push(template);
  refresh();
  return { ok: true, data: template };
}

export async function updateSceneTemplate(
  id: string,
  edit: MockTemplateEdit,
): Promise<ActionResult<SceneTemplate>> {
  await delay(400);
  const m = await copyFor(sceneDataCopy);
  const current = (await library()).find((template) => template.id === id);
  if (!current) return { ok: false, error: m.jobNotFound, code: "not_found" };
  if (current.kind === "studio" && (edit.text !== undefined || edit.reference)) {
    return { ok: false, error: m.studioColours, fieldErrors: { text: m.studioColours } };
  }
  if (edit.text !== undefined && refusedText(edit.text)) {
    return { ok: false, error: m.customRefused, fieldErrors: { text: m.customRefused } };
  }
  const next: Partial<SceneTemplate> & { hidden?: boolean } = { ...edits.get(id) };
  if (edit.name) next.names = edit.name;
  if (edit.enabled !== undefined) next.hidden = !edit.enabled;
  if (edit.text !== undefined && edit.text !== current.text) {
    next.text = edit.text;
    if (current.referenceSource === "generated") {
      next.referenceUrl = null;
      next.previewUrl = null;
      next.referenceSource = "";
    }
  }
  if (edit.reference) {
    const picture = MOCK_REFERENCE_URLS[(Number(id.replace(/\D/g, "")) + 1) % 2]!;
    Object.assign(next, { referenceUrl: picture, previewUrl: picture, referenceSource: "upload" });
  } else if (edit.removeReference) {
    Object.assign(next, { referenceUrl: null, previewUrl: null, referenceSource: "" });
  }
  edits.set(id, next);
  refresh();
  const updated = (await library()).find((template) => template.id === id)!;
  return { ok: true, data: withoutHidden(updated) };
}

const REFERENCE_PREFIX = "mock-reference-";

/** «Rasmini yaratish»: a job that succeeds on the second poll and sets the demo's picture. */
export async function makeTemplateReference(id: string): Promise<ActionResult<SceneJob>> {
  await delay(200);
  const m = await copyFor(sceneDataCopy);
  const current = (await library()).find((template) => template.id === id);
  if (!current || current.kind !== "ai_scene") {
    return { ok: false, error: m.jobNotFound, code: "not_found" };
  }
  if (!current.text) {
    return { ok: false, error: m.templateNeedsText, code: "scene_template_needs_text" };
  }
  const jobId = `${REFERENCE_PREFIX}${id}-${Date.parse(referenceNow().toISOString()) + referenceJobs.size}`;
  referenceJobs.set(jobId, { templateId: id, polls: 0 });
  return { ok: true, data: referenceJob(jobId, "queued") };
}

export const isMockReferenceJob = (id: string) => id.startsWith(REFERENCE_PREFIX);

function referenceJob(id: string, state: SceneJob["state"]): SceneJob {
  return {
    id,
    productId: null,
    sourceImageId: null,
    kind: "studio",
    template: null,
    state,
    outcome: state === "succeeded" ? "accepted" : "pending",
    result: null,
    error: null,
    warnings: [],
    acceptedImageId: null,
    createdAt: referenceNow().toISOString(),
    finishedAt: state === "succeeded" ? referenceNow().toISOString() : null,
    expiresAt: null,
  };
}

export async function getReferenceJob(id: string): Promise<SceneJob | null> {
  const entry = referenceJobs.get(id);
  if (!entry) return null;
  entry.polls += 1;
  if (entry.polls < 2) return referenceJob(id, "running");
  if (entry.polls === 2) {
    const picture = MOCK_REFERENCE_URLS[entry.polls % 2]!;
    edits.set(entry.templateId, {
      ...edits.get(entry.templateId),
      referenceUrl: picture,
      previewUrl: picture,
      referenceSource: "generated",
    });
    refresh();
  }
  return referenceJob(id, "succeeded");
}
