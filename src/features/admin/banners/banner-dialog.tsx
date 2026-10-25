"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { z } from "zod";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { saveBanner } from "@/data/banners.actions";
import { bannerFormDataFromValues, type BannerFormValues } from "@/data/banners.schema";
import {
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_TYPE_MESSAGE,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/data/products.schema";
import {
  BANNER_LINK_KINDS,
  BANNER_LINK_LABEL,
  type Banner,
  type BannerLinkKind,
} from "@/domain/banner";
import type { Category } from "@/domain/category";
import { cn } from "@/lib/cn";

import { runAction } from "../shared/action-client";
import type { IdempotencyKey } from "../shared/idempotency";
import { fromLocalInput, toLocalInput } from "./datetime";
import { ProductPicker } from "./product-picker";

/**
 * The dialog's own form shape: the link targets as plain strings (`""` =
 * none) and the window as `datetime-local` values; `toValues` turns it into
 * the `BannerFormValues` the Server Action validates.
 */
const formSchema = z
  .object({
    title: z.object({
      uz: z
        .string()
        .trim()
        .min(1, "O‘zbekcha sarlavhani kiriting.")
        .max(80, "80 belgidan oshmasin."),
      ru: z.string().trim().max(80, "80 belgidan oshmasin."),
      en: z.string().trim().max(80, "80 belgidan oshmasin."),
    }),
    kind: z.enum(BANNER_LINK_KINDS),
    productId: z.string(),
    category: z.string(),
    isActive: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "product" && !values.productId) {
      ctx.addIssue({ code: "custom", path: ["productId"], message: "Mahsulotni tanlang." });
    }
    if (values.kind === "category" && !values.category) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Kategoriyani tanlang." });
    }
    const starts = values.startsAt ? fromLocalInput(values.startsAt) : null;
    const ends = values.endsAt ? fromLocalInput(values.endsAt) : null;
    if (values.startsAt && !starts) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Sana va vaqtni to‘liq kiriting.",
      });
    }
    if (values.endsAt && !ends) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Sana va vaqtni to‘liq kiriting.",
      });
    }
    if (starts && ends && Date.parse(ends) <= Date.parse(starts)) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Tugash vaqti boshlanish vaqtidan keyin bo‘lsin.",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

function fromBanner(banner: Banner | null): FormValues {
  return {
    title: { uz: banner?.title.uz ?? "", ru: banner?.title.ru ?? "", en: banner?.title.en ?? "" },
    kind: banner?.link.kind ?? "none",
    productId: banner?.link.productId ?? "",
    category: banner?.link.category ?? "",
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
  image: "image",
};

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
}

export function BannerDialog({
  open,
  onOpenChange,
  banner,
  categories,
  idempotency,
  onSaved,
  onCloseAutoFocus,
}: BannerDialogProps) {
  // React Hook Form re-registers fields during render; the compiler's
  // memoisation of `register(...)` calls would skip that (see ProductEditor).
  "use no memo";
  const idBase = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const imageButton = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: fromBanner(banner) });
  const kind = useWatch({ control, name: "kind" });
  const editing = banner !== null;
  // Synchronous re-entry guard: `isSubmitting` disables the button only after
  // a re-render, and React Hook Form's submit handler is re-entrant.
  const inFlight = useRef(false);

  const clearPreview = () => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFile(null);
  };

  // Revoke a preview that was never handed over to the list.
  useEffect(() => () => clearPreview(), []);

  const focusImageButton = () => imageButton.current?.focus();

  const onFile = (picked: File | undefined) => {
    if (!picked) return;
    if (!(IMAGE_TYPES as ReadonlyArray<string>).includes(picked.type)) {
      setImageError(IMAGE_TYPE_MESSAGE);
      return;
    }
    // 5 MiB, refused before the round trip (the Server Action body limit is 6 MB).
    if (picked.size > MAX_IMAGE_BYTES) {
      setImageError(IMAGE_TOO_LARGE_MESSAGE);
      return;
    }
    setImageError(null);
    clearPreview();
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const requireImage = () => {
    if (editing || file) return true;
    setImageError("Banner rasmini tanlang.");
    return false;
  };

  // Built inside the event handler (not during render) so the ref read
  // inside is an event-time access. The image lives outside React Hook Form,
  // so it is checked on both the valid and the invalid path: every error
  // shows at once.
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(
      async (values) => {
        setFormError(null);
        if (!requireImage()) {
          focusImageButton();
          return;
        }
        if (inFlight.current) return;
        inFlight.current = true;
        const formData = bannerFormDataFromValues(toValues(values), file);
        // The loaded banner, through the same form round trip as the values,
        // so the action sends only what the admin changed.
        const baseline = banner ? toValues(fromBanner(banner)) : null;
        const result = idempotency.settle(
          await runAction((csrf) =>
            saveBanner(banner?.id ?? null, formData, baseline, idempotency.key, csrf),
          ),
        );
        inFlight.current = false;
        if (!result.ok) {
          const entries = Object.entries(result.fieldErrors ?? {});
          for (const [path, message] of entries) {
            const target = FIELD_ALIAS[path] ?? (path as Path<FormValues>);
            if (target === "image") setImageError(message);
            else setError(target, { message });
          }
          if (entries.length === 0) setFormError(result.error);
          return;
        }
        const previewUrl = preview;
        setPreview(null); // handed over to the list (demo mode); not revoked here
        setFile(null);
        onSaved(result.data, editing ? "edit" : "create", previewUrl);
        onOpenChange(false);
      },
      () => {
        requireImage();
      },
    )(event);

  const currentImage = preview ?? banner?.imageUrl ?? null;
  const imageErrorId = imageError ? `${idBase}-image-error` : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
      onCloseAutoFocus={onCloseAutoFocus}
      title={editing ? "Bannerni tahrirlash" : "Yangi banner"}
      className="max-w-[640px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-label text-ink">Rasm</span>
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
                  <img src={currentImage} alt="Banner rasmi" className="size-full object-cover" />
                ) : (
                  <Image
                    src={currentImage}
                    alt="Banner rasmi"
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                )
              ) : (
                <Icon name="image" size={28} />
              )}
            </span>
            <span className="flex flex-col gap-2">
              <button
                type="button"
                ref={imageButton}
                onClick={() => fileInput.current?.click()}
                aria-describedby={imageErrorId}
                className={buttonStyles({ variant: "dashed", size: "sm" })}
              >
                <Icon name="upload" size={16} className="text-gold-ink" />
                {currentImage ? "Rasmni almashtirish" : "Rasm tanlash"}
              </button>
              <span className="text-caption font-normal text-ink-muted">
                JPG, PNG, WebP · 5 MB gacha · 2:1 tavsiya etiladi
              </span>
              {file && <span className="text-caption font-normal text-ink">{file.name}</span>}
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

        <Field label="Sarlavha (o‘zbekcha)" error={errors.title?.uz?.message}>
          {(c) => <TextInput {...c} {...register("title.uz")} autoComplete="off" maxLength={80} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sarlavha (ruscha)" error={errors.title?.ru?.message}>
            {(c) => (
              <TextInput {...c} {...register("title.ru")} autoComplete="off" maxLength={80} />
            )}
          </Field>
          <Field label="Sarlavha (inglizcha)" error={errors.title?.en?.message}>
            {(c) => (
              <TextInput {...c} {...register("title.en")} autoComplete="off" maxLength={80} />
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-ink">Havola</span>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <SegmentedControl<BannerLinkKind>
                label="Havola turi"
                layout="fill"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                options={BANNER_LINK_KINDS.map((value) => ({
                  value,
                  label: BANNER_LINK_LABEL[value],
                }))}
              />
            )}
          />
        </div>
        {kind === "product" && (
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink">Mahsulot (faol)</span>
            <Controller
              control={control}
              name="productId"
              render={({ field, fieldState }) => (
                <>
                  <ProductPicker
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
          <Field label="Kategoriya" error={errors.category?.message}>
            {(c) => (
              <Select {...c} {...register("category")}>
                <option value="">Tanlang</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name.uz}
                    {category.isActive ? "" : " (faol emas)"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Boshlanishi" error={errors.startsAt?.message} hint="Bo‘sh — darhol.">
            {(c) => <TextInput {...c} {...register("startsAt")} type="datetime-local" step={60} />}
          </Field>
          <Field label="Tugashi" error={errors.endsAt?.message} hint="Bo‘sh — muddatsiz.">
            {(c) => <TextInput {...c} {...register("endsAt")} type="datetime-local" step={60} />}
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-label text-ink">Faol</span>
            <span className="text-caption font-normal text-ink-muted">
              Faol bo‘lmagan banner ilovada ko‘rinmaydi, muddatidan qat’i nazar.
            </span>
          </span>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Banner faol"
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
          <DialogClose disabled={isSubmitting} className={buttonStyles({ variant: "outline" })}>
            Bekor qilish
          </DialogClose>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            <Icon name="check" size={18} />
            {isSubmitting ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
