"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type Path,
} from "react-hook-form";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { AffixInput, Field, TextArea, TextInput, textareaClass } from "@/components/ui/field";
import { FormSelect } from "@/components/ui/form-controls";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  deleteProductImage,
  reorderProductImages,
  saveProduct,
  updateProductImageAlt,
  uploadProductImage,
} from "@/data/products.actions";
import { productFormSchemas, type ProductFormValues } from "@/data/products.schema";
import { buildDraft, formPathOf, keyOf, type AssistantStatus } from "@/domain/assistant";
import type { Category } from "@/domain/category";
import type { SceneStatus, SceneTemplate } from "@/domain/scene";
import {
  CONTENT_LANGUAGES,
  emptyAlt,
  type ProductImage,
  emptyTexts,
  isTextComplete,
  lastChangeActor,
  lastChangeText,
  productDisplayName,
  productRecommendedToAsk,
  type ContentLanguage,
  type Product,
  type ProductTextField,
} from "@/domain/product";
import { emptySeo, localizeSeoStatus, PRODUCT_SLUG_MAX, slugifyName } from "@/domain/seo";
import { cn } from "@/lib/cn";
import { flattenFieldErrors, useRhfReveal } from "@/lib/forms/rhf";
import { useRecommendedConfirm } from "@/lib/forms/recommended";
import { scrollBehavior } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { SeoEditor, SeoStatusPanel, SlugField } from "../shared/seo-fields";
import { productFallback, type PageFallback } from "../shared/seo-preview";
import {
  AiFieldButton,
  aiFieldClass,
  AiFieldNote,
  AssistantBannerView,
  AssistantMenu,
} from "./assistant/assistant";
import { assistantCopy } from "./assistant/copy";
import { markedLanguages } from "./assistant/review";
import { useProductAssistant } from "./assistant/use-product-assistant";
import { adoptImage, adoptNewImage, formEntry, formImage, mediaById } from "./adopt-image";
import { afterDialogsClose, altLanguageToShow, languageToShow } from "./form-reveal";
import { productsCopy, type ProductsCopy } from "./copy";
import { ImageManager } from "./image-manager";
import { LanguageTabs } from "./language-tabs";
import {
  addServerImage,
  clearPendingImages,
  createPendingImages,
  persistProduct,
  type PersistActions,
} from "./persist-product";

function toFormValues(product: Product | null): ProductFormValues {
  if (!product) {
    return {
      texts: { uz: emptyTexts(), ru: emptyTexts(), en: emptyTexts() },
      price: Number.NaN,
      category: "",
      billzId: "",
      promo: false,
      status: "hidden",
      images: [],
      slug: "",
      seo: emptySeo(),
    };
  }
  // Copies: the form mutates its values in place, and they must not alias the
  // saved product (or React Hook Form's baseline used for `isDirty`).
  return structuredClone({
    texts: product.texts,
    price: product.price,
    category: product.category ?? "",
    billzId: product.billzId,
    promo: product.promo,
    status: product.status,
    // Every photo carries all three alt texts, so each input is controlled from the start. The
    // server-owned `media` (sizes, screen shapes) stays on the baseline only (`adopt-image.ts`).
    images: product.images.map((image) => ({
      ...formImage(image),
      alt: { ...emptyAlt(), ...image.alt },
    })),
    slug: product.slug,
    seo: product.seo,
  });
}

type Editor = ProductsCopy["editor"];

/** The warning above the text fields while a language is incomplete. */
export function missingTextsNote(t: Editor, missing: ReadonlyArray<ContentLanguage>): string {
  if (missing.includes("uz")) return t.missingUz;
  return t.missingOther(missing.map((l) => t.languageName[l]).join(", "));
}

const TEXT_LABEL = {
  name: "name",
  shortDescription: "shortDescription",
  description: "description",
  ingredients: "ingredients",
  usage: "usage",
} as const;

/**
 * The summary's label of a form path in the admin language: `texts.ru.name` → «Nomi ·
 * Ruscha», `seo.en.title` → «SEO sarlavha (Inglizcha)», `price` → «Narx».
 */
export function productFieldLabel(t: Editor, name: string): string | undefined {
  const [head, language, leaf, altLanguage] = name.split(".");
  if (head === "images" && leaf === "alt" && /^\d+$/.test(language ?? "")) {
    const altLanguageName = t.languageName[altLanguage as ContentLanguage];
    if (altLanguageName) return `${t.altLabel(Number(language) + 1)} · ${altLanguageName}`;
  }
  const languageName = t.languageName[language as ContentLanguage];
  if (head === "texts" && languageName && leaf && leaf in TEXT_LABEL) {
    return `${t[TEXT_LABEL[leaf as keyof typeof TEXT_LABEL]]} · ${languageName}`;
  }
  if (head === "seo" && languageName) {
    return leaf === "description" ? t.seoDescription(languageName) : t.seoTitle(languageName);
  }
  const top: Record<string, string> = {
    price: t.price,
    category: t.category,
    billzId: t.billzId,
    images: t.images,
    slug: t.slug,
    status: t.status,
    promo: t.promo,
  };
  return top[name];
}

interface ProductEditorProps {
  /** `null` creates a new product. */
  product: Product | null;
  /** The AI assistant's availability (`assistant/status/`); absent or disabled hides it. */
  assistant?: AssistantStatus;
  /** Product scenes (`scenes/status/`, `scenes/templates/`); absent or off: manual cropping only. */
  scenes?: { status: SceneStatus; templates: ReadonlyArray<SceneTemplate> };
  /** Categories for the picker (`getCategories()`), ordered by position. */
  categories: ReadonlyArray<Category>;
  /** "2 daqiqa oldin" — when stock was last read from Billz (admin language). */
  lastSyncLabel: string;
  /**
   * After creating a product, go to its edit route (api mode: the id is
   * routable). In demo mode the draft id is not, so the editor stays in place.
   */
  redirectOnCreate?: boolean;
}

export function ProductEditor({
  product,
  assistant,
  scenes,
  categories,
  lastSyncLabel,
  redirectOnCreate,
}: ProductEditorProps) {
  // React Hook Form re-registers fields during render after `reset()`; the
  // compiler's memoisation of `register(...)` calls would skip that.
  "use no memo";
  const copy = useCopy(productsCopy);
  const t = copy.editor;
  const fmt = useFormat();
  const locale = useAdminLocale();
  const schema = useLocalized(productFormSchemas);
  const router = useRouter();
  const toast = useToast();
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  // The editor's baseline: what it loaded or last saved. A PATCH carries only
  // what differs from it, so another admin's change to a field this admin
  // did not touch is never written back.
  const [saved, setSaved] = useState<Product | null>(product);
  // The id to patch: set as soon as a create succeeds, even if a later step
  // of the orchestration failed, so a retry never creates a duplicate.
  const [targetId, setTargetId] = useState<string | null>(product?.id ?? null);
  // A stable mutable holder (not React state: nothing renders from it).
  const [pending] = useState(createPendingImages);
  const idempotency = useIdempotencyKey();
  // Synchronous re-entry guard: React Hook Form's submit handler is
  // re-entrant, and a double click must not start a second save.
  const inFlight = useRef(false);
  /** The save itself is running (not the "save anyway?" question before it). */
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<ContentLanguage>("uz");
  const [seoLang, setSeoLang] = useState<ContentLanguage>("uz");
  const [altLang, setAltLang] = useState<ContentLanguage>("uz");
  const [leaveOpen, setLeaveOpen] = useState(false);
  /** A refusal that belongs to the whole form (Billz unreachable): shown under the header. */
  const [formError, setFormError] = useState<string | null>(null);
  const { confirm, dialog: recommendedDialog } = useRecommendedConfirm();

  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver,
    defaultValues: toFormValues(product),
    shouldFocusError: false,
  });
  const errorsUi = useRhfReveal<ProductFormValues>({
    formRef,
    labels: (name) => productFieldLabel(t, name),
    errors,
  });
  const images = useFieldArray({ control, name: "images", keyName: "key" });
  const texts = useWatch({ control, name: "texts" });
  const billzId = useWatch({ control, name: "billzId" });
  const promo = useWatch({ control, name: "promo" });
  const slug = useWatch({ control, name: "slug" });
  const categorySlug = useWatch({ control, name: "category" });
  const price = useWatch({ control, name: "price" });

  // A fresh `product` from the server (a route refresh after a save, a
  // client navigation back) becomes the baseline only while the form holds
  // no unsaved edits; otherwise the admin's edits and their baseline stay.
  const [seenProduct, setSeenProduct] = useState(product);
  if (product !== seenProduct) {
    setSeenProduct(product);
    if (product && !isDirty && !isSubmitting) setSaved(product);
  }

  // Reset the form to a new baseline. React Hook Form recommends resetting
  // after the submit cycle has finished rather than inside the submit handler.
  const formBaseline = useRef(saved);
  useEffect(() => {
    if (!saved || saved === formBaseline.current) return;
    formBaseline.current = saved;
    reset(toFormValues(saved));
  }, [saved, reset]);

  /**
   * A photo the server changed outside the save (the renditions dialog): it joins the baseline
   * only. The reset guard is moved first, so the effect above does not reset the form: unsaved
   * texts, alt edits and pending uploads stay, and the form's values (hence `isDirty` and what
   * `persistProduct` compares) are untouched. See `adopt-image.ts`.
   */
  const adopt = (image: ProductImage) => {
    if (!saved) return;
    const next = adoptImage(saved, image);
    if (next === saved) return;
    formBaseline.current = next;
    setSaved(next);
  };
  const imageMedia = mediaById(saved?.images);

  /**
   * An accepted scene: a new photo the server already holds (first with `makeMain`). It joins the
   * baseline; a clean form is rebuilt from it by the ordinary reset, a dirty one keeps its edits
   * (the reset guard moves) and gets the photo in its list too. See `adopt-image.ts`.
   */
  const acceptScene = (image: ProductImage, makeMain: boolean) => {
    if (!saved) return;
    const next = adoptNewImage(saved, image, makeMain);
    if (next === saved) return;
    addServerImage(pending, image.id, makeMain);
    const known = images.fields.some((field) => field.id === image.id);
    if (!isDirty || known) {
      if (known) formBaseline.current = next;
      setSaved(next);
      return;
    }
    formBaseline.current = next;
    setSaved(next);
    if (makeMain) images.prepend(formEntry(image));
    else images.append(formEntry(image));
  };

  // The Billz message sits under the header: bring it into view when it appears.
  useEffect(() => {
    if (formError)
      formErrorRef.current?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, [formError]);

  /**
   * Fields of other languages are not rendered: show the language tabs that hold the failing
   * fields first (synchronously, so the reveal finds them in the DOM).
   */
  const showFailingTabs = (names: ReadonlyArray<string>) => {
    const textLanguage = languageToShow(names, "texts", lang);
    const seoLanguage = languageToShow(names, "seo", seoLang);
    const altLanguage = altLanguageToShow(names, altLang);
    flushSync(() => {
      if (textLanguage) setLang(textLanguage);
      if (seoLanguage) setSeoLang(seoLanguage);
      if (altLanguage) setAltLang(altLanguage);
    });
  };

  const onInvalid = (fieldErrors: FieldErrors<ProductFormValues>) => {
    showFailingTabs(flattenFieldErrors(fieldErrors).map((error) => error.name));
    errorsUi.onInvalid(fieldErrors);
  };

  /** A summary link or «To‘ldirish»: open the field's language tab, then reveal it. */
  const revealField = (name: string) => {
    showFailingTabs([name]);
    errorsUi.select(name);
  };

  const actions: PersistActions = {
    save: async (id, values, baseline) =>
      idempotency.settle(
        await runAction((csrf) => saveProduct(id, values, baseline, idempotency.key, csrf)),
      ),
    upload: (id, file) => {
      const formData = new FormData();
      formData.set("file", file, file.name);
      return runAction((csrf) => uploadProductImage(id, formData, csrf));
    },
    remove: (id, imageId) => runAction((csrf) => deleteProductImage(id, imageId, csrf)),
    reorder: (id, imageIds) => runAction((csrf) => reorderProductImages(id, imageIds, csrf)),
    updateAlt: (id, imageId, alt) =>
      runAction((csrf) => updateProductImageAlt(id, imageId, alt, csrf)),
  };

  /* --- AI assistant: writes into the form; the admin reviews in place and saves --- */
  const aiCopy = useCopy(assistantCopy);
  const savedImageIds = saved?.images.map((image) => image.id) ?? [];
  const ai = useProductAssistant({
    productId: saved?.id ?? null,
    status: assistant,
    savedImageIds,
    getValues,
    setValue,
  });
  const assistantLabel = (key: string) => {
    const path = formPathOf(key, getValues("images"));
    if (path?.startsWith("images.")) {
      const [, index, , language] = path.split(".");
      return aiCopy.altLabel(Number(index) + 1, t.languageName[language as ContentLanguage]);
    }
    // «SEO sarlavha · O‘zbekcha» (the editor's own label has brackets).
    const [head, language, leaf] = key.split(".");
    if (head === "seo" && (leaf === "title" || leaf === "description")) {
      return `${aiCopy.seoLabel[leaf]} · ${t.languageName[language as ContentLanguage]}`;
    }
    return (path && productFieldLabel(t, path)) || key;
  };

  const recommendedLabel = {
    images: copy.recommended.images,
    "texts.uz.description": copy.recommended.description,
  } as const;

  const submit = async (values: ProductFormValues) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // Recommended but not required (photos, the Uzbek description): asked only when it is
      // news — a create, the save that shows the product, a field just emptied.
      const missing = productRecommendedToAsk(values, saved);
      const savedId = saved?.id ?? targetId;
      if (missing.length > 0) {
        const choice = await confirm(
          missing.map((name) => ({ name, label: recommendedLabel[name] })),
          { remember: savedId ? { kind: "product", id: savedId } : null },
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
  };

  const save = async (values: ProductFormValues) => {
    setFormError(null);
    const { result, createdId } = await persistProduct({
      saved,
      targetId,
      values,
      pending,
      actions,
    });
    if (createdId) setTargetId(createdId);
    if (!result.ok) {
      const entries = Object.entries(result.fieldErrors ?? {});
      const serverErrors: Record<string, { type: string; message: string }> = {};
      for (const [path, message] of entries) {
        setError(path as Path<ProductFormValues>, { type: "server", message });
        serverErrors[path] = { type: "server", message };
      }
      if (result.code === "provider_unavailable") {
        // Billz did not answer (503): nothing was written and every value is
        // still in the form; the message stays on it until the next save.
        setFormError(result.error);
        toast({ tone: "warning", title: t.billzDownToast, description: result.error });
      } else if (entries.length > 0) {
        // The slug (`unique`) sits below the images: the reveal takes the admin to it.
        onInvalid(serverErrors as FieldErrors<ProductFormValues>);
      } else {
        toast({ tone: "danger", title: t.notSaved, description: result.error });
      }
      return;
    }
    clearPendingImages(pending);
    errorsUi.clear();
    ai.clear();
    setSaved(result.data);
    toast({ tone: "success", title: t.saved, description: t.savedLead });
    const newId = createdId ?? (saved === null ? result.data.id : null);
    if (newId && redirectOnCreate) router.replace(`/admin/products/${newId}` as Route);
  };

  // Built inside the event handler (not during render) so the ref reads in
  // `submit` are event-time accesses.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => handleSubmit(submit, onInvalid)(event);

  const complete = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [l, isTextComplete(texts[l])]),
  ) as Record<ContentLanguage, boolean>;
  const textInvalid = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [l, Boolean(errors.texts?.[l])]),
  ) as Record<ContentLanguage, boolean>;
  const missing = CONTENT_LANGUAGES.filter((l) => !complete[l]);
  const formAlt = useWatch({ control, name: "images" });
  const seoValues = useWatch({ control, name: "seo" });
  // The form's current values per assistant key: what the ✨ buttons and the menu decide by.
  const liveDraft = buildDraft({ texts, seo: seoValues, images: formAlt }, savedImageIds);
  const aiKeys = Object.keys(ai.changes);
  const textKey = (field: ProductTextField) => keyOf({ kind: "text", language: lang, field });
  const aiAside = (key: string, label: string) => (
    <AiFieldButton ai={ai} draft={liveDraft} aiKey={key} label={label} />
  );
  const aiNote = (key: string) => <AiFieldNote ai={ai} aiKey={key} />;
  const current = texts[lang];
  const emptyBorder = (value: string) => value.trim().length === 0 && "border-warning";

  const title = product ? productDisplayName(product) : t.newTitle;
  const billzState = !saved?.billzId
    ? "none"
    : saved.billzId === billzId.trim()
      ? "linked"
      : "changed";
  const textError = (field: ProductTextField) => errors.texts?.[lang]?.[field]?.message;
  const seoErrors = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [
      l,
      {
        title: errors.seo?.[l]?.title?.message,
        description: errors.seo?.[l]?.description?.message,
      },
    ]),
  );
  const slugSuggestion = slugifyName(texts.uz.name) || slugifyName(saved?.billzName ?? "") || "";
  // What the website shows when an SEO field is empty (`features/shop/seo/describe.ts`).
  const categoryName = categories.find((c) => c.slug === categorySlug)?.name;
  const seoFallback = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [
      l,
      productFallback(l, {
        name: texts[l].name.trim() || texts.uz.name.trim() || saved?.billzName || "",
        volume: saved?.volume ?? "",
        description: texts[l].description.trim() || texts.uz.description.trim(),
        categoryName: categoryName ? categoryName[l] || categoryName.uz : null,
        price,
      }),
    ]),
  ) as Record<ContentLanguage, PageFallback>;
  const categoryOptions: SelectOption[] = [
    { value: "", label: t.noCategory },
    ...categories.map((category) => ({
      value: category.slug,
      label: category.name.uz || category.slug,
      ...(category.isActive ? {} : { description: t.inactiveCategory }),
    })),
  ];
  const imagesError = errors.images?.message ?? errors.images?.root?.message;
  const altComplete = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [l, formAlt.every((image) => Boolean(image.alt?.[l]?.trim()))]),
  ) as Record<ContentLanguage, boolean>;
  const altInvalid = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [
      l,
      Array.isArray(errors.images) && errors.images.some((error) => Boolean(error?.alt?.[l])),
    ]),
  ) as Record<ContentLanguage, boolean>;

  return (
    <>
      <Breadcrumbs items={[{ label: t.breadcrumb, href: "/admin/products" }, { label: title }]} />

      <form ref={formRef} noValidate onSubmit={onSubmit} className="contents">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="m-0 min-w-0 font-serif text-display leading-10 tracking-normal break-words text-ink">
            {product ? t.editTitle : t.newTitle}
          </h1>
          <div className="flex flex-wrap gap-2">
            <AssistantMenu ai={ai} draft={liveDraft} />
            <Link
              href="/admin/products"
              onClick={(event) => {
                if (!isDirty) return;
                event.preventDefault();
                setLeaveOpen(true);
              }}
              className={buttonStyles({ variant: "ghost" })}
            >
              {t.cancel}
            </Link>
            <Button type="submit" className="px-5" busy={saving}>
              <Icon name="check" size={18} />
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>
        {formError && (
          <p
            ref={formErrorRef}
            role="alert"
            className="m-0 flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-triangle" size={18} className="shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <FormErrorSummary errors={errorsUi.summary} onSelect={revealField} />
        <AssistantBannerView ai={ai} labelOf={assistantLabel} />

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
            <Card
              aria-labelledby={`${idBase}-texts`}
              data-field="texts"
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle id={`${idBase}-texts`} className="text-heading">
                  {t.texts}
                </CardTitle>
                <LanguageTabs
                  languages={CONTENT_LANGUAGES}
                  value={lang}
                  onChange={setLang}
                  complete={complete}
                  invalid={textInvalid}
                  marked={markedLanguages(aiKeys, "text")}
                  markedLabel={aiCopy.tabMarked}
                  idBase={idBase}
                />
              </div>
              <div
                key={lang}
                role="tabpanel"
                id={`${idBase}-panel`}
                aria-labelledby={`${idBase}-tab-${lang}`}
                lang={lang}
                className="flex flex-col gap-4"
              >
                {missing.length > 0 && (
                  <p className="m-0 flex items-start gap-2.5 rounded-md bg-warning-soft px-3.5 py-3 text-body-sm text-ink">
                    <Icon name="alert-triangle" size={18} className="shrink-0 text-warning" />
                    {missingTextsNote(t, missing)}
                  </p>
                )}
                <Field
                  label={t.name}
                  aside={aiAside(textKey("name"), t.name)}
                  error={textError("name")}
                  hint={
                    lang === "uz" && product?.isNewFromBillz
                      ? t.billzName(product.billzName)
                      : undefined
                  }
                >
                  {(c) => (
                    <>
                      <TextInput
                        {...c}
                        {...register(`texts.${lang}.name`)}
                        autoComplete="off"
                        className={cn(aiFieldClass(ai, textKey("name")))}
                      />
                      {aiNote(textKey("name"))}
                    </>
                  )}
                </Field>
                <Field
                  label={t.shortDescription}
                  hint={t.shortDescriptionHint}
                  aside={aiAside(textKey("shortDescription"), t.shortDescription)}
                  error={textError("shortDescription")}
                >
                  {(c) => (
                    <>
                      <TextArea
                        {...c}
                        {...register(`texts.${lang}.shortDescription`)}
                        rows={2}
                        className={cn(aiFieldClass(ai, textKey("shortDescription")))}
                      />
                      {aiNote(textKey("shortDescription"))}
                    </>
                  )}
                </Field>
                <Field
                  label={t.description}
                  aside={aiAside(textKey("description"), t.description)}
                  error={textError("description")}
                >
                  {(c) => (
                    <>
                      <TextArea
                        {...c}
                        {...register(`texts.${lang}.description`)}
                        rows={4}
                        placeholder={t.descriptionPlaceholder}
                        className={cn(
                          emptyBorder(current.description),
                          aiFieldClass(ai, textKey("description")),
                        )}
                      />
                      {aiNote(textKey("description"))}
                    </>
                  )}
                </Field>
                <Field
                  label={t.ingredients}
                  aside={aiAside(textKey("ingredients"), t.ingredients)}
                  error={textError("ingredients")}
                >
                  {(c) => (
                    <>
                      <textarea
                        {...c}
                        {...register(`texts.${lang}.ingredients`)}
                        rows={3}
                        className={cn(
                          textareaClass,
                          "text-[14px] leading-5",
                          emptyBorder(current.ingredients),
                          aiFieldClass(ai, textKey("ingredients")),
                        )}
                      />
                      {aiNote(textKey("ingredients"))}
                    </>
                  )}
                </Field>
                <Field
                  label={t.usage}
                  aside={aiAside(textKey("usage"), t.usage)}
                  error={textError("usage")}
                >
                  {(c) => (
                    <>
                      <TextArea
                        {...c}
                        {...register(`texts.${lang}.usage`)}
                        rows={3}
                        placeholder={t.usagePlaceholder}
                        className={cn(
                          emptyBorder(current.usage),
                          aiFieldClass(ai, textKey("usage")),
                        )}
                      />
                      {aiNote(textKey("usage"))}
                    </>
                  )}
                </Field>
              </div>
            </Card>

            <Card aria-labelledby={`${idBase}-images`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle id={`${idBase}-images`} className="text-heading">
                  {t.images}
                </CardTitle>
                <span className="text-caption font-normal text-ink-muted">{t.imagesHint}</span>
              </div>
              <ImageManager
                images={images.fields}
                labelledBy={`${idBase}-images`}
                onMove={images.move}
                onRemove={(index) => {
                  const id = images.fields[index]?.id;
                  if (id) {
                    pending.files.delete(id);
                    pending.uploaded.delete(id);
                  }
                  images.remove(index);
                }}
                onAdd={(added, files) => {
                  for (const [id, file] of files) pending.files.set(id, file);
                  // Every photo carries all three alt texts (empty until staff write them), or the
                  // form's ru/en alt fields read "undefined" and block the save.
                  images.append(added.map(formEntry));
                }}
                error={imagesError}
                productId={saved?.id ?? null}
                media={imageMedia}
                onAdopt={adopt}
                scenes={scenes}
                onSceneAccepted={acceptScene}
                onSave={() => formRef.current?.requestSubmit()}
                saving={saving}
              />
              {images.fields.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-line pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span id={`${idBase}-alt`} className="text-label font-semibold text-ink">
                      {t.altTitle}
                    </span>
                    <LanguageTabs
                      languages={CONTENT_LANGUAGES}
                      value={altLang}
                      onChange={setAltLang}
                      complete={altComplete}
                      invalid={altInvalid}
                      marked={markedLanguages(aiKeys, "alt")}
                      markedLabel={aiCopy.tabMarked}
                      idBase={`${idBase}-alt`}
                    />
                  </div>
                  <p className="m-0 text-caption font-normal text-ink-muted">{t.altHint}</p>
                  <div
                    key={altLang}
                    role="tabpanel"
                    id={`${idBase}-alt-panel`}
                    aria-labelledby={`${idBase}-alt-tab-${altLang}`}
                    lang={altLang}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {images.fields.map((image, index) => {
                      const altKey = keyOf({ kind: "alt", language: altLang, imageId: image.id });
                      return (
                        <Field
                          key={image.key}
                          label={t.altLabel(index + 1)}
                          aside={aiAside(altKey, t.altLabel(index + 1))}
                          error={errors.images?.[index]?.alt?.[altLang]?.message}
                        >
                          {(c) => (
                            <>
                              <TextInput
                                {...c}
                                {...register(`images.${index}.alt.${altLang}`)}
                                autoComplete="off"
                                className={cn(aiFieldClass(ai, altKey))}
                              />
                              {aiNote(altKey)}
                            </>
                          )}
                        </Field>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            <Card aria-labelledby={`${idBase}-seo`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle id={`${idBase}-seo`} className="text-heading">
                  {t.seo}
                </CardTitle>
                <span className="text-caption font-normal text-ink-muted">{t.seoHint}</span>
              </div>
              <Controller
                control={control}
                name="slug"
                render={({ field, fieldState }) => (
                  <SlugField
                    kind="product"
                    name={field.name}
                    inputRef={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    max={PRODUCT_SLUG_MAX}
                    suggestion={slugSuggestion}
                    saved={saved?.slug || null}
                  />
                )}
              />
              <Controller
                control={control}
                name="seo"
                render={({ field }) => (
                  <SeoEditor
                    kind="product"
                    idBase={idBase}
                    value={field.value}
                    onChange={field.onChange}
                    language={seoLang}
                    onLanguageChange={setSeoLang}
                    errors={seoErrors}
                    slug={slug.trim() || saved?.slug || slugSuggestion}
                    fallback={seoFallback}
                    marked={markedLanguages(aiKeys, "seo")}
                    markedLabel={aiCopy.tabMarked}
                    fieldAddon={(language, leaf) => {
                      const key = `seo.${language}.${leaf}`;
                      return {
                        action: aiAside(key, assistantLabel(key)),
                        note: aiNote(key),
                        className: aiFieldClass(ai, key),
                      };
                    }}
                  />
                )}
              />
            </Card>
          </div>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <Card aria-labelledby={`${idBase}-price`} className="flex flex-col gap-3.5">
              <CardTitle id={`${idBase}-price`} className="text-heading">
                {t.priceCard}
              </CardTitle>
              <Controller
                control={control}
                name="price"
                render={({ field, fieldState }) => (
                  <div data-field="price">
                    <Field label={t.price} error={fieldState.error?.message}>
                      {(c) => (
                        <div data-reveal-box className="rounded-md">
                          <AffixInput
                            {...c}
                            ref={field.ref}
                            name={field.name}
                            suffix={t.currency}
                            inputMode="numeric"
                            autoComplete="off"
                            value={Number.isFinite(field.value) ? fmt.number(field.value) : ""}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                              field.onChange(digits ? Number(digits) : Number.NaN);
                            }}
                            onBlur={field.onBlur}
                          />
                        </div>
                      )}
                    </Field>
                  </div>
                )}
              />
              <div data-field="category">
                <Field label={t.category} error={errors.category?.message}>
                  {(c) => (
                    <FormSelect
                      {...c}
                      control={control}
                      name="category"
                      options={categoryOptions}
                      placeholder={t.noCategory}
                    />
                  )}
                </Field>
              </div>
              <p className="m-0 text-caption font-normal text-ink-muted">{t.priceNote}</p>
            </Card>

            <Card aria-labelledby={`${idBase}-billz`} className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle id={`${idBase}-billz`} className="text-heading">
                  {t.billzCard}
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      billzState === "linked"
                        ? "bg-success"
                        : billzState === "changed"
                          ? "bg-warning"
                          : "bg-ink-muted",
                    )}
                  />
                  {billzState === "linked"
                    ? t.billzLinked
                    : billzState === "changed"
                      ? t.billzChanged
                      : t.billzNone}
                </span>
              </div>
              <div data-field="billzId">
                <Field label={t.billzId} error={errors.billzId?.message}>
                  {(c) => (
                    <TextInput
                      {...c}
                      {...register("billzId")}
                      inputMode="numeric"
                      autoComplete="off"
                      className="tabular-nums"
                    />
                  )}
                </Field>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-body-sm font-semibold text-ink-muted">
                    <Icon name="lock" size={14} />
                    {t.stock}
                  </span>
                  <span className="text-[20px] leading-[26px] font-extrabold text-ink tabular-nums">
                    {billzState === "linked" && saved ? t.pieces(fmt.number(saved.stock)) : "—"}
                  </span>
                </span>
                <span className="text-right text-caption font-normal text-ink-muted">
                  {billzState === "linked" ? (
                    <>
                      {t.stockFromBillz}
                      <br />
                      {lastSyncLabel}
                    </>
                  ) : (
                    <>
                      {t.stockAfterLink}
                      <br />
                      {t.stockAfterLinkLine}
                    </>
                  )}
                </span>
              </div>
            </Card>

            <Card aria-labelledby={`${idBase}-promo`} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle id={`${idBase}-promo`} className="text-heading">
                  {t.promo}
                </CardTitle>
                <Controller
                  control={control}
                  name="promo"
                  render={({ field }) => (
                    <Switch
                      ref={field.ref}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t.promoSwitch}
                      aria-describedby={`${idBase}-promo-note`}
                    />
                  )}
                />
              </div>
              <p id={`${idBase}-promo-note`} className="m-0 flex gap-2 text-body-sm text-ink-muted">
                <Icon name="coins" size={18} className="shrink-0 text-gold-ink" />
                {promo ? t.promoOn : t.promoOff}
              </p>
            </Card>

            <Card aria-labelledby={`${idBase}-status`} className="flex flex-col gap-3">
              <CardTitle id={`${idBase}-status`} className="text-heading">
                {t.status}
              </CardTitle>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <SegmentedControl
                    label={t.status}
                    layout="fill"
                    size="lg"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "active", label: copy.status.active },
                      { value: "hidden", label: copy.status.hidden },
                    ]}
                  />
                )}
              />
              {saved?.lastChange && (
                <p className="m-0 flex gap-2 text-caption font-normal text-ink-muted">
                  <Icon name="history" size={16} className="shrink-0" />
                  <span className="min-w-0 break-words">
                    {t.lastChange(lastChangeActor(saved.lastChange, locale))} ·{" "}
                    <time dateTime={saved.lastChange.at} className="tabular-nums">
                      {fmt.dateTimeShort(saved.lastChange.at)}
                    </time>{" "}
                    · {lastChangeText(saved.lastChange, locale)}
                  </span>
                </p>
              )}
            </Card>

            <Card aria-labelledby={`${idBase}-seo-status`} className="flex flex-col gap-3">
              <SeoStatusPanel
                titleId={`${idBase}-seo-status`}
                status={saved?.seoStatus ? localizeSeoStatus(saved.seoStatus, locale) : null}
                note={isDirty ? t.seoRecheck : undefined}
              />
            </Card>
          </div>
        </div>
        {recommendedDialog}
      </form>

      <AlertDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t.leaveTitle}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{t.leaveLead}</p>}
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel className={buttonStyles({ variant: "outline" })}>
            {t.stay}
          </AlertDialogCancel>
          <Button variant="destructive" onClick={() => router.push("/admin/products")}>
            {t.leave}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
