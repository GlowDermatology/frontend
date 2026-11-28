"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormDateTimePicker, FormSelect } from "@/components/ui/form-controls";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveBanner } from "@/data/banners.actions";
import { bannerFormDataFromValues, type BannerFormValues } from "@/data/banners.schema";
import { imageFileProblem, IMAGE_TYPES } from "@/data/products.schema";
import {
  BANNER_LINK_KINDS,
  bannerLinkKindLabel,
  bannerRecommendedToAsk,
  type Banner,
  type BannerLinkKind,
  type BannerRecommendedField,
} from "@/domain/banner";
import type { Category } from "@/domain/category";
import type { SceneTemplate } from "@/domain/scene";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { cn } from "@/lib/cn";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { useRhfReveal } from "@/lib/forms/rhf";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";
import { isHttpsUrl, LINK_URL_MAX } from "@/lib/link-url";

import { afterDialogsClose } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import type { IdempotencyKey } from "../shared/idempotency";
import { BannerImageDialog } from "./banner-image-dialog";
import { bannersCopy, type BannersCopy } from "./copy";
import { ProductPicker } from "./product-picker";
import { useBannerImageJob } from "./use-banner-image-job";

/** «AI bilan yaratish» of the image card: available (scenes and AI scenes on) and its templates. */
export interface BannerScenes {
  enabled: boolean;
  templates: ReadonlyArray<SceneTemplate>;
}

/**
 * The dialog's own form shape, one schema per admin language: the link targets as plain strings
 * (`""` = none) and the window as the date-time pickers' `YYYY-MM-DDTHH:MM` values (Tashkent);
 * `toValues` turns it into the `BannerFormValues` the Server Action validates.
 */
export const bannerDialogSchemas = localized(catalogDataCopy, (m) =>
  z
    .object({
      title: z.object({
        uz: z.string().trim().min(1, m.bannerTitleUzRequired).max(80, m.maxChars(80)),
        ru: z.string().trim().max(80, m.maxChars(80)),
        en: z.string().trim().max(80, m.maxChars(80)),
      }),
      kind: z.enum(BANNER_LINK_KINDS),
      productId: z.string(),
      category: z.string(),
      url: z.string().trim().max(LINK_URL_MAX, m.maxChars(LINK_URL_MAX)),
      isActive: z.boolean(),
      startsAt: z.string(),
      endsAt: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.kind === "product" && !values.productId) {
        ctx.addIssue({ code: "custom", path: ["productId"], message: m.chooseProduct });
      }
      if (values.kind === "category" && !values.category) {
        ctx.addIssue({ code: "custom", path: ["category"], message: m.chooseCategory });
      }
      if (values.kind === "url") {
        if (!values.url) {
          ctx.addIssue({ code: "custom", path: ["url"], message: m.enterUrl });
        } else if (!isHttpsUrl(values.url)) {
          ctx.addIssue({ code: "custom", path: ["url"], message: m.urlHttps });
        }
      }
      const starts = values.startsAt ? fromLocalInput(values.startsAt) : null;
      const ends = values.endsAt ? fromLocalInput(values.endsAt) : null;
      if (values.startsAt && !starts) {
        ctx.addIssue({ code: "custom", path: ["startsAt"], message: m.dateTimeIncomplete });
      }
      if (values.endsAt && !ends) {
        ctx.addIssue({ code: "custom", path: ["endsAt"], message: m.dateTimeIncomplete });
      }
      if (starts && ends && Date.parse(ends) <= Date.parse(starts)) {
        ctx.addIssue({ code: "custom", path: ["endsAt"], message: m.endAfterStart });
      }
    }),
);

type FormValues = z.infer<LocalizedOf<typeof bannerDialogSchemas>>;

function fromBanner(banner: Banner | null): FormValues {
  return {
    title: { uz: banner?.title.uz ?? "", ru: banner?.title.ru ?? "", en: banner?.title.en ?? "" },
    kind: banner?.link.kind ?? "none",
    productId: banner?.link.productId ?? "",
    category: banner?.link.category ?? "",
    url: banner?.link.url ?? "",
    isActive: banner?.isActive ?? true,
    startsAt: toLocalInput(banner?.startsAt ?? null),
    endsAt: toLocalInput(banner?.endsAt ?? null),
  };
}

export function toValues(values: FormValues): BannerFormValues {
  return {
    title: values.title,
    link: {
      kind: values.kind,
      productId: values.kind === "product" ? values.productId || null : null,
      category: values.kind === "category" ? values.category || null : null,
      url: values.kind === "url" ? values.url.trim() || null : null,
    },
    isActive: values.isActive,
    startsAt: fromLocalInput(values.startsAt),
    endsAt: fromLocalInput(values.endsAt),
  };
}

/** Server field paths → the dialog's field names. */
const FIELD_ALIAS: Record<string, Path<FormValues> | "image"> = {
  "link.productId": "productId",
  "link.category": "category",
  "link.kind": "kind",
  "link.url": "url",
  image: "image",
};

/** The summary's label of a dialog field (`title.ru` → «Sarlavha (ruscha)»). */
export function bannerFieldLabel(t: BannersCopy["dialog"], name: string): string | undefined {
  const labels: Record<string, string> = {
    "title.uz": t.titleUz,
    "title.ru": t.titleRu,
    "title.en": t.titleEn,
    kind: t.linkKind,
    productId: t.product,
    category: t.category,
    url: t.url,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    image: t.image,
    isActive: t.active,
  };
  return labels[name];
}

/** `errors` plus the image's own error (it lives outside React Hook Form). */
function withImage<T extends FieldErrors<FormValues>>(errors: T, message: string | null): T {
  return message ? ({ ...errors, image: { type: "manual", message } } as T) : errors;
}

interface BannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a banner (image required). */
  banner: Banner | null;
  categories: ReadonlyArray<Category>;
  /** Owned by the list view so it survives re-opens; the dialog mounts fresh per opening (`key`). */
  idempotency: IdempotencyKey;
  /** `previewUrl` is the local object URL of a newly picked image (demo mode keeps it). */
  onSaved: (banner: Banner, mode: "create" | "edit", previewUrl: string | null) => void;
  onCloseAutoFocus?: (event: Event) => void;
  /** «AI bilan yaratish» (absent: no button). */
  scenes?: BannerScenes;
}

export function BannerDialog({
  open,
  onOpenChange,
  banner,
  categories,
  idempotency,
  onSaved,
  onCloseAutoFocus,
  scenes,
}: BannerDialogProps) {
  // React Hook Form re-registers fields during render; the compiler's
  // memoisation of `register(...)` calls would skip that (see ProductEditor).
  "use no memo";
  const copy = useCopy(bannersCopy);
  const t = copy.dialog;
  const locale = useAdminLocale();
  const schema = useLocalized(bannerDialogSchemas);
  const m = catalogDataCopy[locale];
  const toast = useToast();
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  /** A finished AI banner image chosen in the generator: saved with the banner. */
  const [generated, setGenerated] = useState<{ jobId: string; url: string } | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const generator = useBannerImageJob(banner?.id ?? null, open && Boolean(scenes?.enabled));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver, defaultValues: fromBanner(banner), shouldFocusError: false });
  const errorsUi = useRhfReveal<FormValues>({
    formRef,
    labels: (name) => bannerFieldLabel(t, name),
    errors: withImage(errors, imageError),
  });
  const kind = useWatch({ control, name: "kind" });
  const editing = banner !== null;
  // Synchronous re-entry guard: React Hook Form's submit handler is re-entrant.
  const inFlight = useRef(false);
  const { confirm, dialog: recommendedDialog } = useRecommendedConfirm();

  const clearPreview = () => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFile(null);
  };

  // Revoke a preview that was never handed over to the list.
  useEffect(() => () => clearPreview(), []);

  const onFile = (picked: File | undefined) => {
    if (!picked) return;
    // Type, then 5 MiB, refused before the round trip (the Server Action body limit is 6 MB).
    const problem = imageFileProblem(picked, locale);
    if (problem) {
      setImageError(problem);
      return;
    }
    setImageError(null);
    clearPreview();
    setGenerated(null);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  /** The image's error for this submit (required on create), set on the card. */
  const imageProblem = (): string | null => {
    if (imageError) return imageError;
    if (editing || file || generated) return null;
    setImageError(m.bannerImageRequired);
    return m.bannerImageRequired;
  };

  const recommendedLabel: Record<BannerRecommendedField, string> = {
    "title.ru": copy.recommended.titleRu,
    "title.en": copy.recommended.titleEn,
  };

  const save = async (values: FormValues) => {
    setFormError(null);
    const formData = bannerFormDataFromValues(toValues(values), file);
    // The loaded banner, through the same form round trip as the values,
    // so the action sends only what the admin changed.
    const baseline = banner ? toValues(fromBanner(banner)) : null;
    const result = idempotency.settle(
      await runAction((csrf) =>
        saveBanner(
          banner?.id ?? null,
          formData,
          baseline,
          idempotency.key,
          csrf,
          generated?.jobId ?? null,
        ),
      ),
    );
    if (!result.ok) {
      const entries = Object.entries(result.fieldErrors ?? {});
      const serverErrors: Record<string, { type: string; message: string }> = {};
      for (const [path, message] of entries) {
        const target = FIELD_ALIAS[path] ?? (path as Path<FormValues>);
        if (target === "image") setImageError(message);
        else setError(target, { type: "server", message });
        serverErrors[target] = { type: "server", message };
      }
      if (entries.length === 0) {
        setFormError(result.error);
        toast({ tone: "danger", title: copy.toast.notSaved, description: result.error });
      } else {
        errorsUi.onInvalid(serverErrors as FieldErrors<FormValues>);
      }
      return;
    }
    errorsUi.clear();
    const previewUrl = preview;
    setPreview(null); // handed over to the list (demo mode); not revoked here
    setFile(null);
    setGenerated(null);
    onSaved(result.data, editing ? "edit" : "create", previewUrl);
    onOpenChange(false);
  };

  // Built inside the event handler (not during render) so the ref read
  // inside is an event-time access. The image lives outside React Hook Form,
  // so it is checked on both the valid and the invalid path: every error
  // shows at once, in one summary.
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(
      async (values) => {
        if (inFlight.current) return;
        const image = imageProblem();
        if (image) {
          errorsUi.onInvalid(withImage({}, image));
          return;
        }
        inFlight.current = true;
        try {
          // Asked only when it is news: a create, the save that activates the banner, a title
          // just emptied or an Uzbek title changed while a translation stays empty.
          const missing = bannerRecommendedToAsk(values, banner);
          if (missing.length > 0) {
            const choice = await confirm(
              missing.map((name) => ({ name, label: recommendedLabel[name] })),
              { remember: banner ? { kind: "banner", id: banner.id } : null },
            );
            if (choice === "fix") {
              await afterDialogsClose();
              errorsUi.select(missing[0]!);
              return;
            }
            // The question's dialog hands focus back as it closes: let it, so a field error
            // revealed after the save keeps the focus.
            await afterDialogsClose();
          }
          setSaving(true);
          await save(values);
        } finally {
          inFlight.current = false;
          setSaving(false);
        }
      },
      (fieldErrors) => errorsUi.onInvalid(withImage(fieldErrors, imageProblem())),
    )(event);

  const currentImage = generated?.url ?? preview ?? banner?.imageUrl ?? null;
  const titleUz = useWatch({ control, name: "title.uz" }) ?? "";
  const imageErrorId = imageError ? `${idBase}-image-error` : undefined;
  const categoryOptions: SelectOption[] = categories.map((category) => ({
    value: category.slug,
    label: category.name.uz || category.slug,
    ...(category.isActive ? {} : { description: t.inactiveCategory }),
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
      onCloseAutoFocus={onCloseAutoFocus}
      title={editing ? t.editTitle : t.createTitle}
      className="max-w-[640px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormErrorSummary errors={errorsUi.summary} onSelect={errorsUi.select} />
        <div
          data-field="image"
          data-invalid={imageError ? "true" : undefined}
          tabIndex={-1}
          role="group"
          aria-labelledby={`${idBase}-image-label`}
          aria-describedby={imageErrorId}
          className="-m-1.5 flex flex-col gap-2 rounded-md p-1.5 outline-none"
        >
          <span id={`${idBase}-image-label`} className="text-label text-ink">
            {t.image}
          </span>
          <div className="flex flex-wrap items-start gap-3">
            <span
              className={cn(
                "relative flex aspect-[2/1] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-md border border-line bg-surface text-ink-muted",
                imageError && "border-danger",
              )}
            >
              {currentImage ? (
                currentImage.startsWith("blob:") ? (
                  // Local preview (object URL); next/image cannot optimise blobs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage} alt={t.imageAlt} className="size-full object-cover" />
                ) : (
                  <Image
                    src={currentImage}
                    alt={t.imageAlt}
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                )
              ) : (
                <Icon name="image" size={28} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  aria-describedby={imageErrorId}
                  className={cn(buttonStyles({ variant: "dashed", size: "sm" }), "self-start")}
                >
                  <Icon name="upload" size={16} className="text-gold-ink" />
                  {currentImage ? t.replaceImage : t.chooseImage}
                </button>
                {scenes && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-banner-generate=""
                    disabledReason={scenes.enabled ? null : copy.generator.aiOff}
                    onClick={() => setGeneratorOpen(true)}
                  >
                    <Icon name="sparkles" size={16} className="text-gold-ink" />
                    {copy.generator.open}
                  </Button>
                )}
              </span>
              <span className="text-caption font-normal text-ink-muted">{t.imageHint}</span>
              {file && (
                <span className="truncate text-caption font-normal text-ink">{file.name}</span>
              )}
              {generated && (
                <span className="flex flex-col gap-1" data-banner-generated="">
                  <span className="flex items-center gap-1.5 text-caption font-semibold text-ink">
                    <Icon name="sparkles" size={14} className="text-gold-ink" />
                    {copy.generator.chosen}
                  </span>
                  <span className="text-caption font-normal text-ink-muted">
                    {copy.generator.chosenLead}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGenerated(null)}
                    className="self-start text-caption font-semibold text-ink underline decoration-gold-ink underline-offset-2 hover:decoration-ink"
                  >
                    {copy.generator.removeChosen}
                  </button>
                </span>
              )}
            </span>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(event) => {
                onFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {imageError && (
            <p
              id={imageErrorId}
              role="alert"
              className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {imageError}
            </p>
          )}
        </div>

        <Field label={t.titleUz} error={errors.title?.uz?.message}>
          {(c) => <TextInput {...c} {...register("title.uz")} autoComplete="off" maxLength={80} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.titleRu} error={errors.title?.ru?.message}>
            {(c) => (
              <TextInput
                {...c}
                {...register("title.ru")}
                lang="ru"
                autoComplete="off"
                maxLength={80}
              />
            )}
          </Field>
          <Field label={t.titleEn} error={errors.title?.en?.message}>
            {(c) => (
              <TextInput
                {...c}
                {...register("title.en")}
                lang="en"
                autoComplete="off"
                maxLength={80}
              />
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-2" data-field="kind">
          <span className="text-label text-ink">{t.link}</span>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <SegmentedControl<BannerLinkKind>
                label={t.linkKind}
                layout="fill"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                options={BANNER_LINK_KINDS.map((value) => ({
                  value,
                  label: bannerLinkKindLabel(value, locale),
                }))}
              />
            )}
          />
        </div>
        {kind === "product" && (
          <div className="flex flex-col gap-2" data-field="productId">
            <label htmlFor={`${idBase}-product`} className="text-label text-ink">
              {t.product}
            </label>
            <Controller
              control={control}
              name="productId"
              render={({ field, fieldState }) => (
                <>
                  <ProductPicker
                    id={`${idBase}-product`}
                    value={field.value || null}
                    onChange={(product) => {
                      field.onChange(product?.id ?? "");
                      setValue("category", "");
                    }}
                    error={fieldState.error?.message}
                    describedBy={fieldState.error ? `${idBase}-product-error` : undefined}
                  />
                  {fieldState.error && (
                    <p
                      id={`${idBase}-product-error`}
                      className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
                    >
                      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
        )}
        {kind === "category" && (
          <div data-field="category">
            <Field label={t.category} error={errors.category?.message}>
              {(c) => (
                <FormSelect
                  {...c}
                  control={control}
                  name="category"
                  options={categoryOptions}
                  placeholder={t.chooseCategory}
                />
              )}
            </Field>
          </div>
        )}

        {kind === "url" && (
          <Field label={t.url} error={errors.url?.message} hint={t.urlHint}>
            {(c) => (
              <TextInput
                {...c}
                {...register("url")}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                maxLength={LINK_URL_MAX}
                placeholder={t.urlPlaceholder}
              />
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div data-field="startsAt">
            <Field label={t.startsAt} error={errors.startsAt?.message} hint={t.startsAtHint}>
              {(c) => <FormDateTimePicker {...c} control={control} name="startsAt" />}
            </Field>
          </div>
          <div data-field="endsAt">
            <Field label={t.endsAt} error={errors.endsAt?.message} hint={t.endsAtHint}>
              {(c) => <FormDateTimePicker {...c} control={control} name="endsAt" />}
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-label text-ink">{t.active}</span>
            <span className="text-caption font-normal text-ink-muted">{t.activeHint}</span>
          </span>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label={t.activeSwitch}
              />
            )}
          />
        </div>

        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabledReason={saving && t.cancelBusy}>
              {t.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" busy={saving}>
            <Icon name="check" size={18} />
            {saving ? t.saving : t.save}
          </Button>
        </div>
        {recommendedDialog}
        {scenes?.enabled && (
          <BannerImageDialog
            open={generatorOpen}
            onOpenChange={setGeneratorOpen}
            job={generator}
            templates={scenes.templates}
            title={titleUz}
            onUse={(picture) => {
              clearPreview();
              setImageError(null);
              setGenerated(picture);
            }}
          />
        )}
      </form>
    </Dialog>
  );
}
