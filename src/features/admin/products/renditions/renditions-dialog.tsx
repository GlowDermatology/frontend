"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CropFrame } from "@/components/ui/crop-frame";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateProductImageRenditions } from "@/data/products.actions";
import { clampCrop, RENDITION_SHAPES, SHAPE_RATIO, type RenditionShape } from "@/domain/crop";
import type { ProductImage, ProductImageMedia } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../../shared/action-client";
import { useIdempotencyKey } from "../../shared/idempotency";
import { scenesCopy } from "../scenes/copy";
import { useSceneJob } from "../scenes/use-scene-job";
import { renditionsCopy } from "./copy";
import {
  chooseAuto,
  chooseManual,
  chooseRemove,
  initialShapes,
  mediaSize,
  moved,
  renditionChanges,
  type DialogShapes,
} from "./model";

interface RenditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  image: ProductImage;
  media: ProductImageMedia;
  /** The photo's name in the editor («Rasm 2»). */
  label: string;
  /** Drawn in the croppers when the photo has no URL (the demo's illustrations). */
  placeholder?: ReactNode;
  /** The server's answer: the editor adopts it into its baseline (`adoptImage`). */
  onSaved: (image: ProductImage) => void;
  /**
   * Offer «AI bilan moslash» (scenes switched on, admin contract §2.20): a `fit` job whose proposed
   * crops load into the croppers as the admin's own (adjust, then «Saqlash»), or are accepted as
   * they are. The job belongs to this dialog: a save through the renditions PUT or a cancel
   * discards it.
   */
  fitEnabled?: boolean;
}

/**
 * «Ekranlarga moslash»: two fixed-ratio croppers over the photo, a 4:5 portrait and a 1:1 square
 * (side by side, stacked on phones). Each starts from the stored crop, else from the backend's
 * automatic framing (on the product box when known). «Avtomatik» asks the server to frame it,
 * «Olib tashlash» removes a stored shape; «Saqlash» sends only the shapes that changed
 * (`renditionChanges`) and the server's per-shape refusals show under each cropper. Mount it
 * with a `key` per photo: its state starts fresh for each one.
 */
export function RenditionsDialog({
  open,
  onOpenChange,
  productId,
  image,
  media,
  label,
  placeholder,
  onSaved,
  fitEnabled = false,
}: RenditionsDialogProps) {
  const t = useCopy(renditionsCopy);
  const s = useCopy(scenesCopy).fit;
  const fit = useSceneJob({ productId, imageId: image.id, slot: "fit", enabled: fitEnabled });
  const [loadedFit, setLoadedFit] = useState<string | null>(null);
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const idBase = useId();
  const size = mediaSize(media);
  const [shapes, setShapes] = useState<DialogShapes>(() => initialShapes(media));

  const [errors, setErrors] = useState<Partial<Record<RenditionShape, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The AI's crops (a `fit` job, never another kind's: those describe a candidate, not this photo)
  // are loaded once per job into the croppers as the admin's own crops.
  const fitJob = fit.job;
  const fitReady = fitJob?.kind === "fit" && fitJob.result !== null && fit.view === "review";
  if (fitReady && fitJob.id !== loadedFit) {
    setLoadedFit(fitJob.id);
    const crops = fitJob.result!.crops;
    setShapes((current) => {
      const next = { ...current };
      for (const shape of RENDITION_SHAPES) {
        const crop = crops[shape];
        if (crop && size)
          next[shape] = moved(current[shape], clampCrop(SHAPE_RATIO[shape], crop, size));
      }
      return next;
    });
  }

  const changes = renditionChanges(shapes, media);
  const changed = Object.keys(changes).length > 0;
  const src = media.mediumUrl ?? media.url ?? image.src ?? null;

  const update = (shape: RenditionShape, next: DialogShapes[RenditionShape]) => {
    setShapes((current) => ({ ...current, [shape]: next }));
    setErrors((current) => ({ ...current, [shape]: undefined }));
  };

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = idempotency.settle(
        await runAction((csrf) =>
          updateProductImageRenditions(productId, image.id, changes, idempotency.key, csrf),
        ),
      );
      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {};
        const perShape: Partial<Record<RenditionShape, string>> = {};
        for (const shape of RENDITION_SHAPES) {
          if (fieldErrors[shape]) perShape[shape] = fieldErrors[shape];
        }
        setErrors(perShape);
        if (Object.keys(perShape).length === 0) {
          setFormError(result.error);
          toast({ tone: "danger", title: t.failedToast, description: result.error });
        }
        return;
      }
      onSaved(result.data);
      // The AI's proposal (if any) was saved through the PUT: its job has nothing left to do.
      if (fitJob?.kind === "fit") void fit.discard();
      toast({ tone: "success", title: t.savedToast, description: t.savedLead });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (fitJob?.kind === "fit") void fit.discard();
    onOpenChange(false);
  };

  const acceptFit = async () => {
    const result = await fit.accept({ makeMain: false, acknowledgeGenerated: false });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    onSaved(result.data.image);
    toast({ tone: "success", title: t.savedToast, description: t.savedLead });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving || fit.busy) return;
        if (next) onOpenChange(true);
        else close();
      }}
      title={t.title}
      description={t.lead(label)}
      className="max-w-[760px]"
    >
      {fitEnabled && (
        <div
          data-fit-ai=""
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-gold-soft px-3 py-2.5"
        >
          {fit.view === "running" ? (
            <p
              role="status"
              className="m-0 flex items-center gap-2 text-body-sm font-semibold text-ink"
            >
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-gold-ink border-t-transparent"
              />
              {s.running}
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fit.start({ kind: "fit" })}
              disabledReason={saving ? t.saving : null}
            >
              <Icon name="sparkles" size={16} />
              {s.start}
            </Button>
          )}
          {fitReady && (
            <>
              <p role="status" className="m-0 min-w-0 flex-1 text-caption text-ink">
                {s.loaded}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={acceptFit} busy={fit.busy}>
                {s.acceptAsIs}
              </Button>
            </>
          )}
          {(fit.view === "failed" || fit.error) && (
            <p role="alert" className="m-0 w-full text-body-sm text-ink">
              {fitJob?.error?.message || fit.error?.message}
            </p>
          )}
        </div>
      )}
      {!size && (
        <p className="m-0 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2.5 text-body-sm text-ink">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-warning" />
          {t.unknownSize}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        {RENDITION_SHAPES.map((shape) => {
          const state = shapes[shape];
          const stored = media.renditions[shape];
          const copy = t.shapes[shape];
          const errorId = `${idBase}-${shape}-error`;
          const error = errors[shape];
          return (
            <section
              key={shape}
              aria-labelledby={`${idBase}-${shape}`}
              data-shape={shape}
              className="flex min-w-0 flex-col gap-2.5"
            >
              <h3 id={`${idBase}-${shape}`} className="m-0 text-label font-semibold text-ink">
                {copy.title}
              </h3>
              <p className="m-0 text-caption text-ink-muted">
                {stored ? t.stored[stored.mode] : t.stored.none}
              </p>
              {size ? (
                <CropFrame
                  ratio={SHAPE_RATIO[shape]}
                  size={size}
                  crop={state.crop}
                  onChange={(crop) => update(shape, moved(state, crop))}
                  src={src}
                  placeholder={placeholder}
                  label={copy.label}
                  hint={t.hint}
                  zoomLabel={t.zoom(copy.label)}
                  zoomText={t.zoomText}
                  disabled={state.intent === "remove" || saving}
                  describedBy={error ? errorId : undefined}
                  invalid={Boolean(error)}
                  className={cn(shape === "square" && "sm:max-w-none")}
                />
              ) : null}
              {state.intent === "auto" && (
                <p className="m-0 text-caption text-ink-muted">{t.autoNote}</p>
              )}
              {state.intent === "remove" && (
                <p className="m-0 text-caption text-ink-muted">{t.removeNote}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {state.intent === "crop" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => update(shape, chooseAuto(shape, media, state))}
                  >
                    <Icon name="sparkles" size={16} />
                    {t.auto}
                  </Button>
                ) : (
                  size && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => update(shape, chooseManual(state))}
                    >
                      {t.manual}
                    </Button>
                  )
                )}
                {stored && state.intent !== "remove" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update(shape, chooseRemove(state))}
                  >
                    <Icon name="trash" size={16} />
                    {t.remove}
                  </Button>
                )}
              </div>
              {error && (
                <p
                  id={errorId}
                  role="alert"
                  className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
                >
                  <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                  {error}
                </p>
              )}
            </section>
          );
        })}
      </div>
      {formError && (
        <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-ink">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={close}
          disabledReason={saving ? t.saving : null}
        >
          {t.cancel}
        </Button>
        <Button
          type="button"
          onClick={save}
          busy={saving}
          disabledReason={changed ? null : t.nothingChanged}
        >
          <Icon name="check" size={18} />
          {saving ? t.saving : t.save}
        </Button>
      </div>
    </Dialog>
  );
}
