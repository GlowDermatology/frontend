import {
  isCropTuple,
  isProductBox,
  RENDITION_SHAPES,
  type Crop,
  type RenditionShape,
} from "@/domain/crop";
import type {
  SceneCandidate,
  SceneJob,
  SceneKind,
  SceneOutcome,
  SceneStatus,
  SceneTemplate,
  SceneTemplateKind,
} from "@/domain/scene";
import {
  BANNER_WEB_CROP,
  type BannerImageProduct,
  type SceneBannerInfo,
} from "@/domain/banner-image";
import { JOB_STATES, type JobState } from "@/domain/job";

import type { ApiSceneJob, ApiSceneStatus, ApiSceneTemplate } from "../types";
import { idString } from "./common";

/**
 * The scene API (admin contract §2.20) → the domain's shapes. Defensive where the schema is
 * loose: `template` is untyped JSON, the percentages are decimal strings, ids may be null.
 */

const KINDS: ReadonlyArray<SceneKind> = ["studio", "ai_scene", "fit"];
const OUTCOMES: ReadonlyArray<SceneOutcome> = ["pending", "accepted", "discarded", "expired"];
const COLOUR = /^#[0-9a-f]{6}$/i;

/** A decimal string (`"12.50"`) or number as a finite number; anything else is 0. */
export function percent(value: unknown): number {
  const number = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(number) ? number : 0;
}

const optionalId = (value: unknown) =>
  typeof value === "number" || (typeof value === "string" && value !== "") ? idString(value) : null;

export function mapSceneStatus(api: ApiSceneStatus): SceneStatus {
  return {
    enabled: Boolean(api.enabled),
    aiEnabled: Boolean(api.enabled) && Boolean(api.ai_enabled),
    maxOccludedPct: percent(api.max_occluded_pct),
  };
}

export function mapSceneTemplate(api: ApiSceneTemplate): SceneTemplate | null {
  const kind = api.kind as SceneTemplateKind;
  if (kind !== "studio" && kind !== "ai_scene") return null;
  return {
    id: idString(api.id),
    key: String(api.key ?? ""),
    kind,
    name: String(api.name ?? "") || String(api.key ?? ""),
    colours: (api.colours ?? []).filter((colour) => COLOUR.test(colour)),
    previewUrl:
      typeof api.preview_url === "string" && api.preview_url.length > 0 ? api.preview_url : null,
  };
}

export function mapSceneTemplates(results: ReadonlyArray<ApiSceneTemplate>): SceneTemplate[] {
  return results.map(mapSceneTemplate).filter((template) => template !== null);
}

function mapCandidate(value: unknown): SceneCandidate | null {
  if (typeof value !== "object" || value === null) return null;
  const api = value as Record<string, unknown>;
  const crops = (typeof api.crops === "object" && api.crops !== null ? api.crops : {}) as Record<
    string,
    unknown
  >;
  const url = (input: unknown) => (typeof input === "string" && input.length > 0 ? input : null);
  return {
    url: url(api.url),
    overlayUrl: url(api.overlay_url),
    productBox: isProductBox(api.product_box) ? api.product_box : null,
    crops: Object.fromEntries(
      RENDITION_SHAPES.map((shape) => [shape, isCropTuple(crops[shape]) ? crops[shape] : null]),
    ) as Record<RenditionShape, Crop | null>,
    generatedInsidePct: percent(api.generated_inside_pct),
    occludedPct: percent(api.occluded_pct),
  };
}

function mapTemplateRef(value: unknown): SceneJob["template"] {
  if (typeof value !== "object" || value === null) return null;
  const api = value as Record<string, unknown>;
  const key = typeof api.key === "string" ? api.key : "";
  if (!key) return null;
  return {
    key,
    name: typeof api.name === "string" && api.name ? api.name : key,
    customText: typeof api.custom_text === "string" && api.custom_text ? api.custom_text : null,
    savedTemplateId: optionalId(api.saved_template_id),
  };
}

export function mapSceneJob(api: ApiSceneJob): SceneJob {
  const error = api.error as { code?: unknown; message?: unknown } | null | undefined;
  return {
    id: idString(api.id),
    productId: optionalId(api.product_id),
    sourceImageId: optionalId(api.source_image_id),
    // `preview` (the console's template pictures) never reaches the product editor
    kind: (KINDS as ReadonlyArray<string>).includes(api.kind) ? (api.kind as SceneKind) : "studio",
    template: mapTemplateRef(api.template),
    state: (JOB_STATES as ReadonlyArray<string>).includes(api.state)
      ? (api.state as JobState)
      : "failed",
    outcome: OUTCOMES.includes(api.outcome) ? api.outcome : "pending",
    result: mapCandidate(api.result),
    error: error
      ? { code: String(error.code ?? "server_error"), message: String(error.message ?? "") }
      : null,
    warnings: (api.warnings ?? []).filter((warning) => typeof warning === "string"),
    acceptedImageId: optionalId(api.accepted_image_id),
    banner: mapBannerInfo(api.banner),
    createdAt: api.created_at,
    finishedAt: api.finished_at ?? null,
    expiresAt: api.expires_at ?? null,
  };
}

function mapBannerProduct(value: unknown): BannerImageProduct | null {
  const item = value as { id?: unknown; name?: unknown } | null;
  if (!item || (typeof item.id !== "number" && typeof item.id !== "string")) return null;
  return { id: String(item.id), name: typeof item.name === "string" ? item.name : "" };
}

/** `SceneJob.banner` (kind `banner` only): its mode, products and the website's window. */
export function mapBannerInfo(value: ApiSceneJob["banner"] | undefined): SceneBannerInfo | null {
  if (!value) return null;
  return {
    mode: value.mode === "products" ? "products" : "scene",
    products: (value.products ?? [])
      .map(mapBannerProduct)
      .filter((item): item is BannerImageProduct => item !== null),
    failedProduct: mapBannerProduct(value.failed_product),
    webCrop: isCropTuple(value.web_crop) ? value.web_crop : BANNER_WEB_CROP,
    acceptedBannerId: optionalId(value.accepted_banner_id),
  };
}
