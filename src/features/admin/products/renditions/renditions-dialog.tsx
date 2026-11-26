"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CropFrame } from "@/components/ui/crop-frame";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateProductImageRenditions } from "@/data/products.actions";
import { RENDITION_SHAPES, SHAPE_RATIO, type Crop, type RenditionShape } from "@/domain/crop";
import type { ProductImage, ProductImageMedia } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../../shared/action-client";
import { useIdempotencyKey } from "../../shared/idempotency";
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
   * Proposed crops to load into the croppers (e.g. from the AI's `fit` job); each becomes a
   * touched manual crop the admin can still adjust before saving.
   */
  proposal?: Partial<Record<RenditionShape, Crop>> | null;
  /** Extra actions above the shapes (the AI «fit» button). */
  actions?: ReactNode;
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
  proposal,
  actions,
}: RenditionsDialogProps) {
  const t = useCopy(renditionsCopy);
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const idBase = useId();
  const size = mediaSize(media);
  const [shapes, setShapes] = useState<DialogShapes>(() => initialShapes(media));
  const [seenProposal, setSeenProposal] = useState(proposal);
  const [errors, setErrors] = useState<Partial<Record<RenditionShape, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A new proposal (the AI's crops) is loaded into the croppers as the admin's own crops.
  if (proposal !== seenProposal) {
    setSeenProposal(proposal);
    if (proposal) {
      setShapes((current) => {
        const next = { ...current };
        for (const shape of RENDITION_SHAPES) {
          const crop = proposal[shape];
          if (crop) next[shape] = moved(current[shape], crop);
        }
        return next;
      });
    }
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
      toast({ tone: "success", title: t.savedToast, description: t.savedLead });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
      title={t.title}
      description={t.lead(label)}
      className="max-w-[760px]"
    >
      {actions}
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
          onClick={() => onOpenChange(false)}
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
