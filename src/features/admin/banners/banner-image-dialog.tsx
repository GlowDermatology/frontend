"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  BANNER_IMAGE_MAX_PRODUCTS,
  BANNER_TITLE_COMFORT,
  isProductPhotoProblem,
  type BannerImageMode,
  type BannerImageProduct,
  type BannerImageRequest,
} from "@/domain/banner-image";
import {
  CUSTOM_PROMPT_MAX,
  CUSTOM_PROMPT_MIN,
  CUSTOM_SCENE_KEY,
  normalizeCustomPrompt,
  type SceneTemplate,
} from "@/domain/scene";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { scenesCopy } from "../products/scenes/copy";
import { NewTemplateCard, TemplateCard } from "../scene-templates/template-card";
import { TemplateEditor } from "../scene-templates/template-editor";
import { AppBannerFrame, WebBannerFrame } from "./banner-frames";
import { bannersCopy } from "./copy";
import { ProductPicker } from "./product-picker";
import type { BannerImageJobHook } from "./use-banner-image-job";

/**
 * «AI bilan yaratish» of the banner dialog (admin contract §2.20.8): pick what goes in the
 * picture (1–3 products, or a scene alone) and the scene (an AI template or a typed one), wait,
 * then judge the result in the app's and the website's real frames with the banner's own title.
 * «Shu rasmni ishlatish» hands it to the banner dialog, which saves it with the banner.
 */

interface BannerImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: BannerImageJobHook;
  /** AI templates only (a banner is always an AI scene). */
  templates: ReadonlyArray<SceneTemplate>;
  /** The banner's Uzbek title as typed so far: drawn over the previews. */
  title: string;
  onUse: (picture: { jobId: string; url: string }) => void;
}

export function BannerImageDialog({
  open,
  onOpenChange,
  job: generator,
  templates,
  title,
  onUse,
}: BannerImageDialogProps) {
  const t = useCopy(bannersCopy).generator;
  const scenesT = useCopy(scenesCopy);
  const idBase = useId();
  const [mode, setMode] = useState<BannerImageMode>("products");
  const [products, setProducts] = useState<BannerImageProduct[]>([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  /** A template's id, or `CUSTOM_SCENE_KEY` for the typed scene below. */
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [request, setRequest] = useState<BannerImageRequest | null>(null);
  /** The template editor: a template's id, or `null` for «Yangi shablon»; closed when `null`. */
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  const job = generator.job;
  const view = generator.view;
  const result = job?.result ?? null;

  /** Back to the settings: a job resumed after a reload brings its own products and mode. */
  const restore = () => {
    if (request || !job?.banner) return;
    setMode(job.banner.mode);
    setProducts(job.banner.products);
  };

  const custom = templateId === CUSTOM_SCENE_KEY;
  const customReady = normalizeCustomPrompt(customText).length >= CUSTOM_PROMPT_MIN;
  const scene: Pick<BannerImageRequest, "templateId" | "customPrompt"> | null = custom
    ? customReady
      ? { customPrompt: normalizeCustomPrompt(customText) }
      : null
    : templateId
      ? { templateId }
      : null;
  const productsReady = mode === "scene" || products.length > 0;
  const picked: BannerImageRequest | null =
    scene && productsReady
      ? { mode, productIds: mode === "products" ? products.map((p) => p.id) : [], ...scene }
      : null;
  const notReady = !productsReady
    ? t.pickProducts
    : !scene
      ? custom
        ? scenesT.custom.tooShort
        : scenesT.pickTemplate
      : null;

  const start = async (next: BannerImageRequest) => {
    setRequest(next);
    await generator.start(next);
  };

  /** What was asked: this dialog's request, or (a job resumed after a reload) the job's own. */
  const asked = (): BannerImageRequest | null => {
    if (request) return request;
    if (!job?.banner) return null;
    const base = {
      mode: job.banner.mode,
      productIds: job.banner.products.map((product) => product.id),
    };
    if (job.template?.key === CUSTOM_SCENE_KEY && job.template.customText) {
      return { ...base, customPrompt: job.template.customText };
    }
    const template = templates.find((entry) => entry.key === job.template?.key);
    return template ? { ...base, templateId: template.id } : null;
  };

  const again = async () => {
    const repeat = asked();
    await generator.discard();
    if (repeat) await start(repeat);
  };

  const cancel = async () => {
    if (view === "review") await generator.discard();
    onOpenChange(false);
  };

  const use = () => {
    if (!job || !result?.url) return;
    onUse({ jobId: job.id, url: result.url });
    generator.forget();
    onOpenChange(false);
  };

  const addProduct = (product: { id: string; name: string; billzId: string } | null) => {
    setPickerKey((key) => key + 1);
    if (!product) return;
    if (products.some((entry) => entry.id === product.id)) {
      setPickerMessage(t.alreadyAdded);
      return;
    }
    setPickerMessage(null);
    setProducts((list) =>
      [...list, { id: product.id, name: product.name || product.billzId }].slice(
        0,
        BANNER_IMAGE_MAX_PRODUCTS,
      ),
    );
  };

  const failedProduct = job?.banner?.failedProduct ?? null;
  const errorCode = job?.error?.code ?? generator.error?.code;
  const longTitle = title.trim().length > BANNER_TITLE_COMFORT;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!generator.busy) onOpenChange(next);
      }}
      title={t.title}
      description={t.lead}
      className="max-w-[820px]"
    >
      <div
        data-banner-image-view={view}
        data-banner-image-job={job?.id}
        className="flex flex-col gap-5"
      >
        {view === "idle" && (
          <>
            <section className="flex flex-col gap-2">
              <span className="text-label font-semibold text-ink">{t.mode}</span>
              <SegmentedControl<BannerImageMode>
                label={t.mode}
                layout="fill"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "products", label: t.modes.products },
                  { value: "scene", label: t.modes.scene },
                ]}
              />
              <p className="m-0 text-caption text-ink-muted" data-mode-lead="">
                {t.modeLead[mode]}
              </p>
            </section>

            {mode === "products" && (
              <section className="flex flex-col gap-2" data-banner-products="">
                <span className="flex flex-col gap-0.5">
                  <label
                    htmlFor={`${idBase}-product`}
                    className="text-label font-semibold text-ink"
                  >
                    {t.products}
                  </label>
                  <span className="text-caption text-ink-muted">
                    {t.productsHint(BANNER_IMAGE_MAX_PRODUCTS)}
                  </span>
                </span>
                {products.length > 0 && (
                  <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {products.map((product, index) => (
                      <li
                        key={product.id}
                        data-banner-product={product.id}
                        className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-caption font-semibold text-gold-ink tabular-nums">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
                          {product.name}
                        </span>
                        {index === 0 ? (
                          <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-caption font-semibold text-gold-ink">
                            {t.main}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t.makeMain(product.name)}
                            onClick={() =>
                              setProducts((list) => [
                                product,
                                ...list.filter((entry) => entry.id !== product.id),
                              ])
                            }
                          >
                            {t.makeMainShort}
                          </Button>
                        )}
                        <button
                          type="button"
                          aria-label={t.remove(product.name)}
                          title={t.remove(product.name)}
                          onClick={() =>
                            setProducts((list) => list.filter((entry) => entry.id !== product.id))
                          }
                          className="hover:bg-canvas flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-gold-ink"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {products.length < BANNER_IMAGE_MAX_PRODUCTS ? (
                  <ProductPicker
                    key={pickerKey}
                    id={`${idBase}-product`}
                    value={null}
                    onChange={addProduct}
                    error={pickerMessage ?? undefined}
                  />
                ) : (
                  <p className="m-0 text-caption text-ink-muted">
                    {t.productsFull(BANNER_IMAGE_MAX_PRODUCTS)}
                  </p>
                )}
                {pickerMessage && (
                  <p role="alert" className="m-0 text-body-sm text-ink">
                    {pickerMessage}
                  </p>
                )}
              </section>
            )}

            <section className="flex flex-col gap-2">
              <span id={`${idBase}-templates`} className="text-label font-semibold text-ink">
                {t.scene}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${idBase}-templates`}
                className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5"
              >
                {templates.length === 0 && (
                  <p className="m-0 text-body-sm text-ink-muted">{t.noTemplates}</p>
                )}
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    checked={template.id === templateId}
                    onSelect={() => setTemplateId(template.id)}
                    onEdit={() => setEditing({ id: template.id })}
                  />
                ))}
                <NewTemplateCard onClick={() => setEditing({ id: null })} />
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
                    {scenesT.custom.card}
                    <span className="text-caption font-normal text-ink-muted">
                      {scenesT.custom.cardLead}
                    </span>
                  </span>
                </button>
              </div>
              {custom && (
                <div className="flex flex-col gap-1.5" data-custom-scene="">
                  <label htmlFor={`${idBase}-custom`} className="text-label font-semibold text-ink">
                    {scenesT.custom.label}
                  </label>
                  <textarea
                    id={`${idBase}-custom`}
                    value={customText}
                    maxLength={CUSTOM_PROMPT_MAX}
                    rows={3}
                    autoFocus
                    onChange={(event) => setCustomText(event.target.value)}
                    placeholder={scenesT.custom.placeholder}
                    aria-describedby={`${idBase}-custom-help`}
                    className="min-h-[84px] w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
                  />
                  <p
                    id={`${idBase}-custom-help`}
                    className="m-0 flex justify-between gap-3 text-caption text-ink-muted"
                  >
                    <span>{scenesT.custom.help}</span>
                    <span className="shrink-0 tabular-nums">
                      {scenesT.custom.count(customText.length, CUSTOM_PROMPT_MAX)}
                    </span>
                  </p>
                </div>
              )}
            </section>

            {generator.error && (
              <p
                role="alert"
                className="m-0 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-ink"
              >
                {generator.error.fieldErrors?.productIds ??
                  generator.error.fieldErrors?.customPrompt ??
                  generator.error.fieldErrors?.templateId ??
                  generator.error.message}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <span className="mr-auto text-caption text-ink-muted">{t.duration}</span>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.discard}
              </Button>
              <Button
                type="button"
                disabledReason={notReady}
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
            <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
              <span
                aria-hidden="true"
                className="size-9 animate-spin rounded-full border-[3px] border-gold-ink border-t-transparent"
              />
              <p className="m-0 text-label font-semibold text-ink">{t.running}</p>
              <p className="m-0 max-w-[440px] text-body-sm text-ink-muted">
                {t.runningLead[job?.banner?.mode ?? request?.mode ?? mode]}
              </p>
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
            </div>
          </>
        )}

        {view === "review" && job && result?.url && (
          <>
            <p className="m-0 text-label font-semibold text-ink">{t.reviewTitle}</p>
            <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
              <figure className="m-0 flex min-w-0 flex-col gap-1.5" data-preview="app">
                <AppBannerFrame
                  src={result.url}
                  title={title.trim()}
                  placeholder={t.titlePlaceholder}
                />
                <figcaption className="text-caption text-ink-muted">
                  <span className="font-semibold text-ink">{t.inApp}</span> · 2,15:1 · {t.inAppNote}
                </figcaption>
              </figure>
              <figure className="m-0 flex min-w-0 flex-col gap-1.5" data-preview="web">
                <WebBannerFrame
                  src={result.url}
                  title={title.trim()}
                  placeholder={t.titlePlaceholder}
                />
                <figcaption className="text-caption text-ink-muted">
                  <span className="font-semibold text-ink">{t.onSite}</span> · 2:1 · {t.onSiteNote}
                </figcaption>
              </figure>
            </div>
            {longTitle && (
              <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink" data-long-title="">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
                {t.longTitle}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void cancel()}
                disabledReason={generator.busy ? t.discard : null}
              >
                {t.discard}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void again()}
                disabledReason={generator.busy ? t.discard : null}
              >
                <Icon name="refresh" size={16} />
                {t.again}
              </Button>
              <Button type="button" onClick={use}>
                <Icon name="check" size={18} />
                {t.use}
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
              {failedProduct && isProductPhotoProblem(errorCode) && (
                <p
                  className="m-0 text-body-sm font-semibold text-ink"
                  data-failed-product={failedProduct.id}
                >
                  {t.failedProduct(failedProduct.name)}
                </p>
              )}
              <p className="m-0 text-body-sm text-ink">
                {view === "failed"
                  ? job?.error?.message || generator.error?.message
                  : t.expiredLead}
              </p>
              {errorCode === "scene_custom_refused" && (
                <p className="m-0 text-body-sm text-ink">{t.rewrite}</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
              {failedProduct && isProductPhotoProblem(errorCode) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    restore();
                    setProducts((list) =>
                      (request || !job?.banner ? list : job.banner.products).filter(
                        (entry) => entry.id !== failedProduct.id,
                      ),
                    );
                    generator.reset();
                  }}
                >
                  {t.replaceProduct}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const typed = job?.template?.customText;
                    restore();
                    generator.reset();
                    if (errorCode === "scene_custom_refused") {
                      setTemplateId(CUSTOM_SCENE_KEY);
                      if (typed) setCustomText(typed);
                    }
                  }}
                >
                  {t.back}
                </Button>
              )}
              {asked() && errorCode !== "scene_custom_refused" && !failedProduct && (
                <Button
                  type="button"
                  onClick={() => {
                    const repeat = asked();
                    generator.reset();
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
          if (saved.kind === "ai_scene") setTemplateId(saved.id);
        }}
      />
    </Dialog>
  );
}
