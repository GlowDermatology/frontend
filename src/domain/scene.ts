import type { Crop, ProductBox, RenditionShape } from "./crop";
import type { JobState } from "./job";

/**
 * Product scenes (admin contract §2.20, backend f39170f): a new background around a saved product
 * photo — a studio template (colours) or an AI scene — or the AI's proposed 4:5 and square crops
 * of the photo (`fit`). The product itself is never redrawn. A job runs on the worker (queued →
 * running → succeeded / failed) and its candidate waits for staff to accept or discard it.
 */

export type SceneKind = "studio" | "ai_scene" | "fit";
export type SceneTemplateKind = Exclude<SceneKind, "fit">;
export type SceneOutcome = "pending" | "accepted" | "discarded" | "expired";

/** `GET scenes/status/`; a failed read is `SCENES_OFF` (every scene action hidden). */
export interface SceneStatus {
  enabled: boolean;
  /** AI templates may be used (studio ones need only `enabled`). */
  aiEnabled: boolean;
  /** Share of the product (%) a hand may hide for an AI scene to fill. */
  maxOccludedPct: number;
}

export const SCENES_OFF: SceneStatus = { enabled: false, aiEnabled: false, maxOccludedPct: 0 };

export interface SceneTemplate {
  id: string;
  key: string;
  kind: SceneTemplateKind;
  /** In the admin language (else Uzbek). */
  name: string;
  /** A studio template's colours (`#rrggbb`) for its swatch; AI templates have none. */
  colours: string[];
}

/** What a succeeded job proposes (`SceneJob.result`). */
export interface SceneCandidate {
  /** The new 4:5 image; `null` for `fit` (the source itself is cropped). */
  url: string | null;
  /** The candidate with the parts drawn inside the product washed pink; `null` when none. */
  overlayUrl: string | null;
  productBox: ProductBox | null;
  /** Proposed shapes: of the candidate (scenes) or of the source photo (`fit`). */
  crops: Record<RenditionShape, Crop | null>;
  /** Share (%) of the product the model drew; above 0 staff must confirm they checked it. */
  generatedInsidePct: number;
  occludedPct: number;
}

export interface SceneJob {
  id: string;
  productId: string | null;
  sourceImageId: string | null;
  kind: SceneKind;
  template: { key: string; name: string } | null;
  state: JobState;
  outcome: SceneOutcome;
  result: SceneCandidate | null;
  /** The failure, its message already in the admin language (the server's `Accept-Language`). */
  error: { code: string; message: string } | null;
  /** Codes: `hand_removed`, `product_partly_generated`, `product_floating`, `low_resolution`, … */
  warnings: string[];
  acceptedImageId: string | null;
  createdAt: string;
  finishedAt: string | null;
  expiresAt: string | null;
}

/** What starting a job asks for. */
export interface SceneRequest {
  kind: SceneKind;
  /** Required unless `fit`. */
  templateId?: string;
}

export function isSceneJobActive(job: Pick<SceneJob, "state">): boolean {
  return job.state === "queued" || job.state === "running";
}

/** Succeeded, not reviewed yet and with a candidate: accept or discard. */
export function isSceneReviewable(job: Pick<SceneJob, "state" | "outcome" | "result">): boolean {
  return job.state === "succeeded" && job.outcome === "pending" && job.result !== null;
}

/** Part of the product was drawn by the model: accepting needs `acknowledge_generated`. */
export function needsAcknowledge(job: Pick<SceneJob, "result">): boolean {
  return (job.result?.generatedInsidePct ?? 0) > 0;
}

/**
 * Where a dialog stands with its job: `idle` (pick a template), `running`, `review` (a candidate),
 * `failed` (with the server's message), `expired` (the candidate is gone), `closed` (accepted or
 * discarded elsewhere).
 */
export type SceneView = "idle" | "running" | "review" | "failed" | "expired" | "closed";

export function sceneView(job: SceneJob | null, starting = false): SceneView {
  if (starting) return "running";
  if (!job) return "idle";
  if (isSceneJobActive(job)) return "running";
  if (job.state === "failed") return "failed";
  if (job.outcome === "expired") return "expired";
  if (isSceneReviewable(job)) return "review";
  if (job.state === "succeeded" && job.outcome === "pending") return "expired"; // no candidate left
  return "closed";
}

/** What the failure screen suggests for a failure code. */
export type SceneFailureHint = "retake" | "ai_template" | null;

export function sceneFailureHint(code: string | undefined): SceneFailureHint {
  if (
    code === "scene_product_cut_off" ||
    code === "scene_hand_covers_product" ||
    // The AI scene provider (Bria) paints only the background: a finger's bite cannot be filled.
    code === "scene_occlusion_not_fillable"
  )
    return "retake";
  if (code === "scene_occlusion_needs_ai") return "ai_template";
  return null;
}

/**
 * Whether a job answers this request: a start answers 200 with the image's job already running,
 * which may be of another kind or template (a `fit` that gets a studio job must not load its
 * crops, which describe the candidate, not the source).
 */
export function jobMatches(
  job: Pick<SceneJob, "kind" | "template">,
  request: SceneRequest,
  templates: ReadonlyArray<SceneTemplate>,
): boolean {
  if (job.kind !== request.kind) return false;
  if (request.kind === "fit") return true;
  const key = templates.find((template) => template.id === request.templateId)?.key;
  return key === undefined || job.template?.key === key;
}

/**
 * Whether a job is of the request's family: a scene (studio or AI) for a scene request, a `fit`
 * for a fit. The start answers 200 with the photo's queued or running job whatever its kind: a
 * job of the other family must not be tracked by the dialog that asked (a scene dialog would
 * accept a fit, a fit dialog would wait on a scene).
 */
export function sameSceneFamily(job: Pick<SceneJob, "kind">, request: SceneRequest): boolean {
  return (job.kind === "fit") === (request.kind === "fit");
}

/** The known warning codes (others are shown with a generic note). */
export const SCENE_WARNINGS = [
  "hand_removed",
  "product_partly_generated",
  "product_floating",
  "low_resolution",
  "straightened",
] as const;
export type SceneWarning = (typeof SCENE_WARNINGS)[number];

export function isKnownSceneWarning(code: string): code is SceneWarning {
  return (SCENE_WARNINGS as ReadonlyArray<string>).includes(code);
}
