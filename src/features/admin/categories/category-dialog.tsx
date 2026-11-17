"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Controller, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createCategory, updateCategory } from "@/data/categories.actions";
import {
  categoryMediaFormData,
  categorySchemas,
  EMPTY_CATEGORY,
  type CategoryFormValues,
} from "@/data/categories.schema";
import { imageFileProblem, IMAGE_TYPES } from "@/data/products.schema";
import {
  categoryRecommendedToAsk,
  suggestSlug,
  type Category,
  type CategoryRecommendedField,
} from "@/domain/category";
import { CONTENT_LANGUAGES, type ContentLanguage } from "@/domain/product";
import { localizeSeoStatus } from "@/domain/seo";
import { cn } from "@/lib/cn";
import { flattenFieldErrors, useRhfReveal } from "@/lib/forms/rhf";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useLocalized } from "@/lib/i18n/admin-hooks";

import { afterDialogsClose, languageToShow } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import type { IdempotencyKey } from "../shared/idempotency";
import { SeoEditor, SeoStatusPanel } from "../shared/seo-fields";
import { categoryFallback, publicUrlLabel, type PageFallback } from "../shared/seo-preview";
import { categoriesCopy, type CategoriesCopy } from "./copy";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a category; otherwise its slug is immutable. */
  category: Category | null;
  /**
   * Owned by the list view so it survives re-opens (contract §1.7): the
   * dialog itself is mounted fresh for every opening (`key`), which is what
   * resets the form.
   */
  idempotency: IdempotencyKey;
  /** `previewUrl` is the local object URL of a newly picked image (demo mode keeps it). */
  onSaved: (category: Category, mode: "create" | "edit", previewUrl: string | null) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

function toValues(category: Category | null): CategoryFormValues {
  if (!category) return structuredClone(EMPTY_CATEGORY);
  return {
    slug: category.slug,
    name: { ...category.name },
    isActive: category.isActive,
    seo: structuredClone(category.seo),
  };
}

type DialogTexts = CategoriesCopy["dialog"];

/** The summary's label of a form path (`name.ru` → «Nomi (ruscha)», `seo.en.title` → …). */
export function categoryFieldLabel(t: DialogTexts, name: string): string | undefined {
  const [head, language, leaf] = name.split(".");
  if (head === "seo" && language) {
    const languageName = t.languageName[language as ContentLanguage];
    if (!languageName) return undefined;
    return leaf === "description" ? t.seoDescription(languageName) : t.seoTitle(languageName);
  }
  const labels: Record<string, string> = {
    "name.uz": t.nameUz,
    "name.ru": t.nameRu,
    "name.en": t.nameEn,
    slug: t.slug,
    image: t.image,
    isActive: t.active,
  };
  return labels[name];
}

/** Create / edit dialog of a category (contract §2.4). */
export function CategoryDialog({
  open,
  onOpenChange,
  category,
  idempotency,
  onSaved,
  onCloseAutoFocus,
}: CategoryDialogProps) {
  // React Hook Form re-registers fields during render; the compiler's
  // memoisation of `register(...)` calls would skip that (see ProductEditor).
  "use no memo";
  const copy = useCopy(categoriesCopy);
  const t = copy.dialog;
  const locale = useAdminLocale();
  const schemas = useLocalized(categorySchemas);
  const toast = useToast();
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolver = useMemo(() => zodResolver(schemas.form), [schemas]);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver,
    defaultValues: toValues(category),
    shouldFocusError: false,
  });
  const nameUz = useWatch({ control, name: "name.uz" });
  const names = useWatch({ control, name: "name" });
  const slugValue = useWatch({ control, name: "slug" });
  const [seoLang, setSeoLang] = useState<ContentLanguage>("uz");
  // Synchronous re-entry guard: React Hook Form's submit handler is re-entrant.
  const inFlight = useRef(false);
  const editing = category !== null;
  const { confirm, dialog: recommendedDialog } = useRecommendedConfirm();

  // The image (gap ADM-5.1) lives outside React Hook Form, like the banner's.
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const liveErrors: FieldErrors<CategoryFormValues> = imageError
    ? ({
        ...errors,
        image: { type: "manual", message: imageError },
      } as FieldErrors<CategoryFormValues>)
    : errors;
  const errorsUi = useRhfReveal<CategoryFormValues>({
    formRef,
    labels: (name) => categoryFieldLabel(t, name),
    errors: liveErrors,
  });
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
    const problem = imageFileProblem(picked, locale);
    if (problem) {
      setImageError(problem);
      return;
    }
    setImageError(null);
    clearPreview();
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setRemoveImage(false);
  };
  const currentImage = preview ?? (removeImage ? null : category?.imageUrl || null);
  const imageErrorId = imageError ? `${idBase}-image-error` : undefined;

  // Suggest the slug from the Uzbek name until the admin edits it by hand.
  useEffect(() => {
    if (editing || slugTouched) return;
    setValue("slug", suggestSlug(nameUz ?? ""));
  }, [nameUz, editing, slugTouched, setValue]);

  /** The SEO fields of other languages are not rendered: show the failing tab first. */
  const showFailingTab = (names: ReadonlyArray<string>) => {
    const language = languageToShow(names, "seo", seoLang);
    if (language && language !== seoLang) flushSync(() => setSeoLang(language));
  };

  const onInvalid = (fieldErrors: FieldErrors<CategoryFormValues>) => {
    const all = imageError
      ? ({ ...fieldErrors, image: { type: "manual", message: imageError } } as typeof fieldErrors)
      : fieldErrors;
    showFailingTab(flattenFieldErrors(all).map((error) => error.name));
    errorsUi.onInvalid(all);
  };

  const revealField = (name: string) => {
    showFailingTab([name]);
    errorsUi.select(name);
  };

  const recommendedLabel: Record<CategoryRecommendedField, string> = {
    "name.ru": copy.recommended.nameRu,
    "name.en": copy.recommended.nameEn,
  };

  const save = async (values: CategoryFormValues) => {
    setFormError(null);
    const media = categoryMediaFormData({
      image: file,
      remove: removeImage && !file && Boolean(category?.imageUrl),
    });
    const result = idempotency.settle(
      await runAction((csrf) =>
        category
          ? updateCategory(
              category.slug,
              { name: values.name, isActive: values.isActive, seo: values.seo },
              idempotency.key,
              csrf,
              media,
            )
          : createCategory(values, idempotency.key, csrf, media),
      ),
    );
    if (!result.ok) {
      const entries = Object.entries(result.fieldErrors ?? {});
      const serverErrors: Record<string, { type: string; message: string }> = {};
      for (const [path, message] of entries) {
        if (path === "image" || path === "removeImage") {
          setImageError(message);
          serverErrors.image = { type: "server", message };
        } else {
          setError(path as Path<CategoryFormValues>, { type: "server", message });
          serverErrors[path] = { type: "server", message };
        }
      }
      if (entries.length === 0) {
        setFormError(result.error);
        toast({ tone: "danger", title: copy.toast.notSaved, description: result.error });
      } else {
        showFailingTab(Object.keys(serverErrors));
        errorsUi.onInvalid(serverErrors as FieldErrors<CategoryFormValues>);
      }
      return;
    }
    errorsUi.clear();
    const previewUrl = preview;
    setPreview(null); // handed over to the list (demo mode); not revoked here
    setFile(null);
    onSaved(result.data, category ? "edit" : "create", previewUrl);
    onOpenChange(false);
  };

  // Built inside the event handler (not during render) so the ref reads are
  // event-time accesses.
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(async (values) => {
      if (inFlight.current) return;
      // The image is checked outside React Hook Form: a refused file blocks the save.
      if (imageError) {
        onInvalid({});
        return;
      }
      inFlight.current = true;
      try {
        // Asked only when it is news: a create, the save that activates the category, a name
        // just emptied or an Uzbek name changed while a translation stays empty.
        const missing = categoryRecommendedToAsk(values, category);
        if (missing.length > 0) {
          const choice = await confirm(
            missing.map((name) => ({ name, label: recommendedLabel[name] })),
            { remember: category ? { kind: "category", id: category.slug } : null },
          );
          if (choice === "fix") {
            await afterDialogsClose();
            revealField(missing[0]!);
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
    }, onInvalid)(event);

  const seoErrors = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [
      l,
      {
        title: errors.seo?.[l]?.title?.message,
        description: errors.seo?.[l]?.description?.message,
      },
    ]),
  );
  const seoFallback = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [
      l,
      categoryFallback(l, {
        name: names[l]?.trim() || names.uz?.trim() || "",
        productCount: category?.productCount ?? 0,
      }),
    ]),
  ) as Record<ContentLanguage, PageFallback>;

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
        <FormErrorSummary errors={errorsUi.summary} onSelect={revealField} />
        <Field label={t.nameUz} error={errors.name?.uz?.message} hint={t.nameUzHint}>
          {(c) => <TextInput {...c} {...register("name.uz")} autoComplete="off" maxLength={60} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.nameRu} error={errors.name?.ru?.message}>
            {(c) => (
              <TextInput
                {...c}
                {...register("name.ru")}
                lang="ru"
                autoComplete="off"
                maxLength={60}
              />
            )}
          </Field>
          <Field label={t.nameEn} error={errors.name?.en?.message}>
            {(c) => (
              <TextInput
                {...c}
                {...register("name.en")}
                lang="en"
                autoComplete="off"
                maxLength={60}
              />
            )}
          </Field>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink">{t.slug}</span>
            <span
              id={`${idBase}-slug`}
              className="flex min-h-11 items-center rounded-md bg-surface px-3.5 font-mono text-[14px] break-all text-ink-muted"
            >
              {category.slug}
            </span>
            <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
              <Icon name="lock" size={16} className="mt-px shrink-0" />
              {t.slugLocked}
            </p>
            <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
              <Icon name="link" size={16} className="mt-px shrink-0 text-gold-ink" />
              <span className="min-w-0 break-all">
                {t.siteAddress}{" "}
                <span className="font-mono text-ink">
                  {publicUrlLabel("category", category.slug)}
                </span>
              </span>
            </p>
            <input type="hidden" {...register("slug")} />
          </div>
        ) : (
          <Field label={t.slug} error={errors.slug?.message} hint={t.slugHint}>
            {(c) => (
              <TextInput
                {...c}
                {...register("slug", { onChange: () => setSlugTouched(true) })}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[14px]"
                placeholder={t.slugPlaceholder}
              />
            )}
          </Field>
        )}
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
                "relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface text-ink-muted",
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
                    sizes="96px"
                    className="object-cover"
                  />
                )
              ) : (
                <Icon name="image" size={24} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  aria-describedby={imageErrorId}
                  className={buttonStyles({ variant: "dashed", size: "sm" })}
                >
                  <Icon name="upload" size={16} className="text-gold-ink" />
                  {currentImage ? t.replaceImage : t.chooseImage}
                </button>
                {currentImage && (
                  <button
                    type="button"
                    onClick={() => {
                      clearPreview();
                      setImageError(null);
                      setRemoveImage(true);
                    }}
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    <Icon name="trash" size={16} />
                    {t.removeImage}
                  </button>
                )}
              </span>
              <span className="text-caption font-normal text-ink-muted">{t.imageHint}</span>
              {file && (
                <span className="truncate text-caption font-normal text-ink">{file.name}</span>
              )}
              {removeImage && !file && category?.imageUrl && (
                <span className="text-caption font-normal text-ink">{t.imageWillBeRemoved}</span>
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
        <section
          aria-labelledby={`${idBase}-seo`}
          className="flex flex-col gap-4 border-t border-line pt-4"
        >
          <h3 id={`${idBase}-seo`} className="m-0 text-[15px] leading-5 font-bold text-ink">
            {t.seo}
          </h3>
          <Controller
            control={control}
            name="seo"
            render={({ field }) => (
              <SeoEditor
                kind="category"
                idBase={idBase}
                value={field.value}
                onChange={field.onChange}
                language={seoLang}
                onLanguageChange={setSeoLang}
                errors={seoErrors}
                slug={slugValue?.trim() ?? ""}
                fallback={seoFallback}
              />
            )}
          />
          {category && (
            <SeoStatusPanel
              status={localizeSeoStatus(category.seoStatus, locale)}
              note={t.seoNote}
              className="rounded-md bg-surface p-4"
            />
          )}
        </section>
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
      </form>
    </Dialog>
  );
}
