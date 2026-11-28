"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { MAX_IMAGES } from "@/data/products.schema";
import type { Crop } from "@/domain/crop";
import type { ProductImage, ProductImageMedia } from "@/domain/product";
import {
  CUSTOM_PROMPT_MAX,
  CUSTOM_PROMPT_MIN,
  CUSTOM_SCENE_KEY,
  isKnownSceneWarning,
  jobMatches,
  needsAcknowledge,
  normalizeCustomPrompt,
  requestOfJob,
  sceneFailureHint,
  TEMPLATE_NAME_MAX,
  type SceneRequest,
  type SceneStatus,
  type SceneTemplate,
  type SceneTemplateKind,
} from "@/domain/scene";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { NewTemplateCard, TemplateCard } from "../../scene-templates/template-card";
import { TemplateEditor } from "../../scene-templates/template-editor";
import { scenesCopy } from "./copy";
import { useSceneJob } from "./use-scene-job";

interface SceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  image: ProductImage;
  media: ProductImageMedia | undefined;
  label: string;
  status: SceneStatus;
  templates: ReadonlyArray<SceneTemplate>;
  /** Photos in the form now (pending uploads included): at `MAX_IMAGES` nothing can be added. */
  imageCount: number;
  placeholder?: ReactNode;
  /** The accepted scene (a new gallery photo): the editor adds it (`adoptNewImage`). */
  onAccepted: (image: ProductImage, makeMain: boolean) => void;
}

/** The part of a 4:5 picture a crop keeps, drawn by CSS (the frame has the crop's shape). */
function CroppedPicture({ src, crop, ratio }: { src: string; crop: Crop; ratio: number }) {
  const [x, y, w, h] = crop;
  return (
    <span
      className="relative block w-full overflow-hidden rounded-md bg-image-well"
      style={{ aspectRatio: String(ratio) }}
    >
      <span
        className="absolute"
        style={{
          width: `${100 / w}%`,
          height: `${100 / h}%`,
          left: `${(-x / w) * 100}%`,
          top: `${(-y / h) * 100}%`,
        }}
      >
        <Image src={src} alt="" fill sizes="400px" className="object-fill media-dim" />
      </span>
    </span>
  );
}

/**
 * «Sahna yaratish»: pick a studio or AI template, generate (a background job, 5–60 s; the dialog
 * can be closed and the job is resumed from sessionStorage), review the candidate in 4:5 and as
 * its square crop (before / after), confirm the parts the AI drew (pink overlay) when there are
 * any, then add it to the gallery (optionally as the main photo), ask for another version or
 * cancel. Failed and expired jobs offer a retry; the server's failure message is shown as is, with
 * a hint for the codes that need a new photo or an AI template. Stays mounted per photo, so the
 * job outlives a close.
 */
export function SceneDialog({
  open,
  onOpenChange,
  productId,
  image,
  media,
  label,
  status,
  templates,
  imageCount,
  placeholder,
  onAccepted,
}: SceneDialogProps) {
  const t = useCopy(scenesCopy);
  const toast = useToast();
  const idBase = useId();
  const scene = useSceneJob({
    productId,
    imageId: image.id,
    slot: "scene",
    enabled: status.enabled,
  });
  const [kind, setKind] = useState<SceneTemplateKind>("studio");
  /** A template's id, or `CUSTOM_SCENE_KEY` for «O‘z sahnangiz» (the text below). */
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  /** The «Shablon sifatida saqlash» form: closed (`null`) or the name being typed. */
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [request, setRequest] = useState<SceneRequest | null>(null);
  const [compare, setCompare] = useState<"before" | "after">("after");
  const [acknowledged, setAcknowledged] = useState(false);
  const [makeMain, setMakeMain] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  /** The template editor: a template's id, or `null` for «Yangi shablon»; closed when `null`. */
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  const job = scene.job;
  const view = scene.view;
  const shown = templates.filter((template) => template.kind === kind);
  const source = media?.mediumUrl ?? media?.url ?? image.src ?? null;
  const full = imageCount >= MAX_IMAGES;

  const custom = kind === "ai_scene" && templateId === CUSTOM_SCENE_KEY;
  const customReady = normalizeCustomPrompt(customText).length >= CUSTOM_PROMPT_MIN;
  /** What «Yaratish» starts: the picked template, or the typed scene. */
  const picked: SceneRequest | null = custom
    ? customReady
      ? { kind: "ai_scene", customPrompt: normalizeCustomPrompt(customText) }
      : null
    : templateId
      ? { kind, templateId }
      : null;

  const start = async (next: SceneRequest) => {
    setRequest(next);
    setAcknowledged(false);
    setAcceptError(null);
    setTemplateName(null);
    setSaveError(null);
    setCompare("after");
    await scene.start(next);
  };

  const accept = async () => {
    if (!job) return;
    setAcceptError(null);
    const result = await scene.accept({ makeMain, acknowledgeGenerated: acknowledged });
    if (!result.ok) {
      setAcceptError(result.fieldErrors?.acknowledgeGenerated ?? result.error);
      return;
    }
    onAccepted(result.data.image, makeMain);
    toast({ tone: "success", title: t.acceptedToast, description: t.acceptedLead });
    onOpenChange(false);
    scene.reset();
    setTemplateId(null);
  };

  const saveTemplate = async () => {
    if (templateName === null) return;
    setSaveError(null);
    const result = await scene.saveTemplate(templateName);
    if (!result.ok) {
      setSaveError(result.fieldErrors?.name ?? result.error);
      return;
    }
    setTemplateName(null);
    toast({
      tone: "success",
      title: t.saveTemplate.saved(result.data.name),
      description: t.saveTemplate.savedLead,
    });
  };

  const again = async () => {
    const repeat = request ?? (job ? requestOfJob(job, templates) : null);
    await scene.discard();
    if (repeat) await start(repeat);
  };

  const cancel = async () => {
    if (view === "review") await scene.discard();
    onOpenChange(false);
  };

  const hint = sceneFailureHint(job?.error?.code ?? scene.error?.code);
  const result = job?.result ?? null;
  const ack = job ? needsAcknowledge(job) : false;
  const otherTemplate =
    view === "review" && job && request && !jobMatches(job, request, templates)
      ? job.template?.name
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!scene.busy) onOpenChange(next);
      }}
      title={t.title}
      description={t.lead(label)}
      className="max-w-[760px]"
    >
      <div data-scene-view={view} data-scene-job={job?.id} className="flex flex-col gap-4">
        {view === "idle" && (
          <>
            <SegmentedControl
              label={t.kinds.label}
              value={kind}
              onChange={(next) => {
                setKind(next);
                setTemplateId(null);
              }}
              options={[
                { value: "studio", label: t.kinds.studio },
                {
                  value: "ai_scene",
                  label: t.kinds.ai_scene,
                  disabledReason: status.aiEnabled ? null : t.aiOff,
                },
              ]}
            />
            {!status.aiEnabled && <p className="m-0 text-caption text-ink-muted">{t.aiOff}</p>}
            <div
              role="radiogroup"
              aria-labelledby={`${idBase}-templates`}
              className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5"
            >
              <span id={`${idBase}-templates`} className="sr-only">
                {t.templates}
              </span>
              {shown.length === 0 && (
                <p className="m-0 text-body-sm text-ink-muted">{t.noTemplates}</p>
              )}
              {shown.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  checked={template.id === templateId}
                  onSelect={() => setTemplateId(template.id)}
                  lead={template.kind === "ai_scene" ? t.aiTemplate : undefined}
                  onEdit={() => setEditing({ id: template.id })}
                />
              ))}
              {kind === "ai_scene" && <NewTemplateCard onClick={() => setEditing({ id: null })} />}
              {kind === "ai_scene" && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={custom}
                  data-template={CUSTOM_SCENE_KEY}
                  onClick={() => setTemplateId(CUSTOM_SCENE_KEY)}
                  className={cn(
                    "flex flex-col items-stretch gap-2 rounded-md border border-dashed p-2 text-left text-label text-ink transition-colors",
                    custom
                      ? "border-gold-ink bg-gold-soft ring-1 ring-gold-ink"
                      : "border-line hover:border-gold",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex aspect-[4/5] items-center justify-center rounded-sm border border-dashed border-line bg-surface"
                  >
                    <Icon name="pencil" size={22} className="text-gold-ink" />
                  </span>
                  <span className="flex flex-col">
                    {t.custom.card}
                    <span className="text-caption font-normal text-ink-muted">
                      {t.custom.cardLead}
                    </span>
                  </span>
                </button>
              )}
            </div>
            {custom && (
              <div className="flex flex-col gap-1.5" data-custom-scene="">
                <label htmlFor={`${idBase}-custom`} className="text-label font-semibold text-ink">
                  {t.custom.label}
                </label>
                <textarea
                  id={`${idBase}-custom`}
                  value={customText}
                  maxLength={CUSTOM_PROMPT_MAX}
                  rows={3}
                  autoFocus
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder={t.custom.placeholder}
                  aria-describedby={`${idBase}-custom-help`}
                  aria-invalid={Boolean(scene.error?.fieldErrors?.customPrompt) || undefined}
                  className="min-h-[84px] w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
                />
                <p
                  id={`${idBase}-custom-help`}
                  className="m-0 flex justify-between gap-3 text-caption text-ink-muted"
                >
                  <span>{t.custom.help}</span>
                  <span className="shrink-0 tabular-nums">
                    {t.custom.count(customText.length, CUSTOM_PROMPT_MAX)}
                  </span>
                </p>
              </div>
            )}
            {scene.error && (
              <p
                role="alert"
                className="m-0 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-ink"
              >
                {scene.error.fieldErrors?.customPrompt ??
                  scene.error.fieldErrors?.templateId ??
                  scene.error.message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button
                type="button"
                busy={scene.busy}
                disabledReason={picked ? null : custom ? t.custom.tooShort : t.pickTemplate}
                onClick={() => picked && void start(picked)}
              >
                <Icon name="sparkles" size={18} />
                {t.generate}
              </Button>
            </div>
          </>
        )}

        {view === "running" && (
          <>
            <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
              <span
                aria-hidden="true"
                className="size-9 animate-spin rounded-full border-[3px] border-gold-ink border-t-transparent"
              />
              <p className="m-0 text-label font-semibold text-ink">{t.running}</p>
              <p className="m-0 max-w-[420px] text-body-sm text-ink-muted">{t.runningLead}</p>
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
            </div>
          </>
        )}

        {view === "review" && job && result && (
          <>
            {otherTemplate && <p className="m-0 text-caption text-ink-muted">{otherTemplate}</p>}
            <SegmentedControl
              label={t.compare.label}
              value={compare}
              onChange={setCompare}
              options={[
                { value: "before", label: t.compare.before },
                { value: "after", label: t.compare.after },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
              <figure className="m-0 flex min-w-0 flex-col gap-1.5" data-preview="portrait">
                <span className="relative block aspect-product w-full overflow-hidden rounded-md bg-image-well">
                  {compare === "after" && result.url ? (
                    <Image
                      src={result.url}
                      alt={t.compare.after}
                      fill
                      sizes="400px"
                      className="object-cover media-dim"
                    />
                  ) : source ? (
                    <Image
                      src={source}
                      alt={t.compare.before}
                      fill
                      sizes="400px"
                      className="object-contain media-dim"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gold-soft">
                      {placeholder}
                    </span>
                  )}
                </span>
                <figcaption className="text-caption text-ink-muted">{t.portrait}</figcaption>
              </figure>
              <figure className="m-0 flex min-w-0 flex-col gap-1.5" data-preview="square">
                {result.url && result.crops.square ? (
                  <CroppedPicture src={result.url} crop={result.crops.square} ratio={1} />
                ) : (
                  <span className="block aspect-square w-full rounded-md bg-image-well" />
                )}
                <figcaption className="text-caption text-ink-muted">{t.square}</figcaption>
              </figure>
            </div>
            {job.template?.key === CUSTOM_SCENE_KEY && job.template.customText && (
              <div
                className="flex flex-col gap-2 rounded-md border border-line p-3"
                data-save-template=""
              >
                <p className="m-0 text-body-sm text-ink">
                  <span className="text-ink-muted">{t.custom.yourText}: </span>«
                  {job.template.customText}»
                </p>
                {job.template.savedTemplateId ? (
                  <p className="m-0 flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                    <Icon name="check" size={16} className="text-gold-ink" />
                    {t.saveTemplate.already}
                  </p>
                ) : templateName === null ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTemplateName(
                          (job.template?.customText ?? "").slice(0, TEMPLATE_NAME_MAX).trim(),
                        )
                      }
                    >
                      <Icon name="plus" size={16} />
                      {t.saveTemplate.open}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="m-0 text-caption text-ink-muted">{t.saveTemplate.lead}</p>
                    <label htmlFor={`${idBase}-template-name`} className="sr-only">
                      {t.saveTemplate.name}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={`${idBase}-template-name`}
                        value={templateName}
                        maxLength={TEMPLATE_NAME_MAX}
                        placeholder={t.saveTemplate.name}
                        onChange={(event) => setTemplateName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveTemplate();
                          }
                        }}
                        aria-invalid={saveError ? true : undefined}
                        className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
                      />
                      <Button
                        type="button"
                        size="sm"
                        busy={scene.busy}
                        disabledReason={templateName.trim() ? null : t.saveTemplate.name}
                        onClick={() => void saveTemplate()}
                      >
                        {scene.busy ? t.saveTemplate.saving : t.saveTemplate.save}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTemplateName(null);
                          setSaveError(null);
                        }}
                      >
                        {t.saveTemplate.cancel}
                      </Button>
                    </div>
                    {saveError && (
                      <p role="alert" className="m-0 text-body-sm text-ink">
                        {saveError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {job.warnings.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {[
                  ...new Set(
                    job.warnings.map((code) => (isKnownSceneWarning(code) ? code : "other")),
                  ),
                ].map((code) => (
                  <li key={code} className="flex items-start gap-1.5 text-body-sm text-ink">
                    <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
                    {t.warnings[code as keyof typeof t.warnings]}
                  </li>
                ))}
              </ul>
            )}
            {ack && (
              <div
                className="flex flex-col gap-2 rounded-md border border-line p-3"
                data-overlay=""
              >
                <p className="m-0 text-label font-semibold text-ink">{t.overlayTitle}</p>
                {result.overlayUrl && (
                  <span className="relative block aspect-product w-full max-w-[280px] overflow-hidden rounded-md bg-image-well">
                    <Image
                      src={result.overlayUrl}
                      alt={t.overlayTitle}
                      fill
                      sizes="280px"
                      className="object-cover"
                    />
                  </span>
                )}
                <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-gold-ink"
                  />
                  {t.acknowledge}
                </label>
              </div>
            )}
            <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
              <input
                type="checkbox"
                checked={makeMain}
                onChange={(event) => setMakeMain(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-gold-ink"
              />
              {t.makeMain}
            </label>
            {acceptError && (
              <p
                role="alert"
                className="m-0 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-ink"
              >
                {acceptError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void cancel()}
                disabledReason={scene.busy ? t.accepting : null}
              >
                {t.cancel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void again()}
                disabledReason={scene.busy ? t.accepting : null}
              >
                <Icon name="refresh" size={16} />
                {t.again}
              </Button>
              <Button
                type="button"
                busy={scene.busy}
                disabledReason={
                  full ? t.full(MAX_IMAGES) : ack && !acknowledged ? t.acknowledgeFirst : null
                }
                onClick={() => void accept()}
              >
                <Icon name="plus" size={18} />
                {scene.busy ? t.accepting : t.accept}
              </Button>
            </div>
          </>
        )}

        {(view === "failed" || view === "expired" || view === "closed") && (
          <>
            <div
              role="alert"
              className="flex flex-col gap-1.5 rounded-md bg-danger-soft px-3.5 py-3"
            >
              <p className="m-0 text-label font-semibold text-ink">
                {view === "failed" ? t.failedTitle : t.expiredTitle}
              </p>
              <p className="m-0 text-body-sm text-ink">
                {view === "failed"
                  ? job?.error?.message || scene.error?.message
                  : view === "expired"
                    ? t.expiredLead
                    : t.closedLead}
              </p>
              {hint && (
                <p className="m-0 text-body-sm text-ink">
                  {hint === "retake" ? t.hintRetake : hint === "rewrite" ? t.hintRewrite : t.hintAi}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const typed = job?.template?.customText;
                  scene.reset();
                  if (hint === "ai_template" && status.aiEnabled) setKind("ai_scene");
                  if (hint === "rewrite") {
                    // Back to the typed scene, the text kept to be changed.
                    setKind("ai_scene");
                    setTemplateId(CUSTOM_SCENE_KEY);
                    if (typed) setCustomText(typed);
                  }
                }}
              >
                {t.templates}
              </Button>
              {((view === "failed" && hint !== "ai_template" && hint !== "rewrite") ||
                view === "expired") &&
                (request ?? (job && requestOfJob(job, templates))) && (
                  <Button
                    type="button"
                    onClick={() => {
                      const repeat = request ?? (job ? requestOfJob(job, templates) : null);
                      scene.reset();
                      if (repeat) void start(repeat);
                    }}
                  >
                    <Icon name="refresh" size={16} />
                    {t.retry}
                  </Button>
                )}
            </div>
          </>
        )}
      </div>
      <TemplateEditor
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        template={editing?.id ? (templates.find((entry) => entry.id === editing.id) ?? null) : null}
        onSaved={(saved) => {
          if (saved.kind === kind) setTemplateId(saved.id);
        }}
      />
    </Dialog>
  );
}
