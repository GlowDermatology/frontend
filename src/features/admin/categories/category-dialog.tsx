"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { createCategory, updateCategory } from "@/data/categories.actions";
import {
  categoryFormSchema,
  EMPTY_CATEGORY,
  type CategoryFormValues,
} from "@/data/categories.schema";
import { suggestSlug, type Category } from "@/domain/category";

import { runAction } from "../shared/action-client";
import type { IdempotencyKey } from "../shared/idempotency";

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
  onSaved: (category: Category, mode: "create" | "edit") => void;
  onCloseAutoFocus?: (event: Event) => void;
}

function toValues(category: Category | null): CategoryFormValues {
  if (!category) return structuredClone(EMPTY_CATEGORY);
  return { slug: category.slug, name: { ...category.name }, isActive: category.isActive };
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
  const idBase = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toValues(category),
  });
  const nameUz = useWatch({ control, name: "name.uz" });
  // Synchronous re-entry guard: `isSubmitting` disables the button only after
  // a re-render, and React Hook Form's submit handler is re-entrant.
  const inFlight = useRef(false);
  const editing = category !== null;

  // Suggest the slug from the Uzbek name until the admin edits it by hand.
  useEffect(() => {
    if (editing || slugTouched) return;
    setValue("slug", suggestSlug(nameUz ?? ""));
  }, [nameUz, editing, slugTouched, setValue]);

  // Built inside the event handler (not during render) so the ref reads are
  // event-time accesses.
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    handleSubmit(async (values) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setFormError(null);
      const result = idempotency.settle(
        await runAction((csrf) =>
          category
            ? updateCategory(
                category.slug,
                { name: values.name, isActive: values.isActive },
                idempotency.key,
                csrf,
              )
            : createCategory(values, idempotency.key, csrf),
        ),
      );
      inFlight.current = false;
      if (!result.ok) {
        const entries = Object.entries(result.fieldErrors ?? {});
        for (const [path, message] of entries)
          setError(path as Path<CategoryFormValues>, { message });
        if (entries.length === 0) setFormError(result.error);
        return;
      }
      onSaved(result.data, category ? "edit" : "create");
      onOpenChange(false);
    })(event);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
      onCloseAutoFocus={onCloseAutoFocus}
      title={editing ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
      className="max-w-[520px]"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Nomi (o‘zbekcha)"
          error={errors.name?.uz?.message}
          hint="Ilovada va eksportlarda shu nom ko‘rinadi."
        >
          {(c) => <TextInput {...c} {...register("name.uz")} autoComplete="off" maxLength={60} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nomi (ruscha)" error={errors.name?.ru?.message}>
            {(c) => <TextInput {...c} {...register("name.ru")} autoComplete="off" maxLength={60} />}
          </Field>
          <Field label="Nomi (inglizcha)" error={errors.name?.en?.message}>
            {(c) => <TextInput {...c} {...register("name.en")} autoComplete="off" maxLength={60} />}
          </Field>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink">Slug</span>
            <span
              id={`${idBase}-slug`}
              className="flex h-11 items-center rounded-md bg-surface px-3.5 font-mono text-[14px] text-ink-muted"
            >
              {category.slug}
            </span>
            <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
              <Icon name="lock" size={16} className="mt-px shrink-0" />
              Slug yaratilgach o‘zgartirilmaydi.
            </p>
            <input type="hidden" {...register("slug")} />
          </div>
        ) : (
          <Field
            label="Slug"
            error={errors.slug?.message}
            hint="Ilova va API manzillarida ishlatiladi: 2–40 ta kichik lotin harfi, raqam yoki defis. Keyin o‘zgartirib bo‘lmaydi."
          >
            {(c) => (
              <TextInput
                {...c}
                {...register("slug", { onChange: () => setSlugTouched(true) })}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[14px]"
                placeholder="masalan, serums"
              />
            )}
          </Field>
        )}
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-label text-ink">Faol</span>
            <span className="text-caption font-normal text-ink-muted">
              Faol bo‘lmagan kategoriya ilovada ko‘rinmaydi.
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
                aria-label="Kategoriya faol"
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
