"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
import {
  AffixInput,
  Field,
  Select,
  TextArea,
  TextInput,
  textareaClass,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveProduct } from "@/data/products.actions";
import { productFormSchema, type ProductFormValues } from "@/data/products.schema";
import {
  CATEGORY_IDS,
  CONTENT_LANGUAGES,
  isTextComplete,
  productDisplayName,
  type ContentLanguage,
  type Product,
} from "@/domain/product";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatNumber } from "@/lib/format";

import { ImageManager } from "./image-manager";
import { CATEGORY_LABEL, PRODUCT_STATUS_META } from "./labels";
import { LanguageTabs } from "./language-tabs";

const LANGUAGE_NAME: Record<ContentLanguage, string> = {
  uz: "O‘zbekcha",
  ru: "Ruscha",
  en: "Inglizcha",
};

const EMPTY_TEXTS = { name: "", description: "", ingredients: "", usage: "" };

function toFormValues(product: Product | null): ProductFormValues {
  if (!product) {
    return {
      texts: { uz: { ...EMPTY_TEXTS }, ru: { ...EMPTY_TEXTS }, en: { ...EMPTY_TEXTS } },
      price: Number.NaN,
      category: "",
      billzId: "",
      promo: false,
      status: "hidden",
      images: [],
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
    images: product.images,
  });
}

function missingTextsNote(missing: ContentLanguage[]): string {
  if (missing.includes("uz")) {
    return "O‘zbekcha matn to‘liq emas. Bu asosiy til — ilovada bo‘sh maydonlar ko‘rsatilmaydi.";
  }
  return `${missing.map((l) => LANGUAGE_NAME[l]).join(", ")} matn to‘liq emas. To‘ldirilmaguncha ilovada o‘zbekcha matn ko‘rsatiladi.`;
}

interface ProductEditorProps {
  /** `null` creates a new product. */
  product: Product | null;
  /** "2 daqiqa oldin" — when stock was last read from Billz. */
  lastSyncLabel: string;
}

export function ProductEditor({ product, lastSyncLabel }: ProductEditorProps) {
  // React Hook Form re-registers fields during render after `reset()`; the
  // compiler's memoisation of `register(...)` calls would skip that.
  "use no memo";
  const router = useRouter();
  const toast = useToast();
  const idBase = useId();
  const [saved, setSaved] = useState<Product | null>(product);
  const [lang, setLang] = useState<ContentLanguage>("uz");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  });
  const images = useFieldArray({ control, name: "images", keyName: "key" });
  const texts = useWatch({ control, name: "texts" });
  const billzId = useWatch({ control, name: "billzId" });
  const promo = useWatch({ control, name: "promo" });

  // New baseline after a successful save. React Hook Form recommends resetting
  // after the submit cycle has finished rather than inside the submit handler.
  useEffect(() => {
    if (saved !== product && saved) reset(toFormValues(saved));
  }, [saved, product, reset]);

  const focusFirstError = (fieldErrors: FieldErrors<ProductFormValues>) => {
    const languageWithError = CONTENT_LANGUAGES.find((l) => fieldErrors.texts?.[l]);
    if (languageWithError) {
      const field = (["name", "description", "ingredients", "usage"] as const).find(
        (f) => fieldErrors.texts?.[languageWithError]?.[f],
      );
      // Render that language's fields first so the invalid one can take focus.
      flushSync(() => setLang(languageWithError));
      if (field) setFocus(`texts.${languageWithError}.${field}`);
      return;
    }
    const order: Array<Path<ProductFormValues>> = ["price", "category", "billzId"];
    const first = order.find((name) => fieldErrors[name as keyof ProductFormValues]);
    if (first) setFocus(first);
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveProduct(saved, values);
    if (!result.ok) {
      const entries = Object.entries(result.fieldErrors ?? {});
      for (const [path, message] of entries) {
        setError(path as Path<ProductFormValues>, { message });
      }
      if (entries.length === 0) {
        toast({ tone: "info", title: "Saqlanmadi", description: result.error });
      }
      return;
    }
    setSaved(result.data);
    toast({ title: "Mahsulot saqlandi", description: "O‘zgarishlar amallar jurnaliga yozildi" });
  }, focusFirstError);

  const complete = Object.fromEntries(
    CONTENT_LANGUAGES.map((l) => [l, isTextComplete(texts[l])]),
  ) as Record<ContentLanguage, boolean>;
  const missing = CONTENT_LANGUAGES.filter((l) => !complete[l]);
  const current = texts[lang];
  const emptyBorder = (value: string) => value.trim().length === 0 && "border-warning";

  const title = product ? productDisplayName(product) : "Yangi mahsulot";
  const billzState = !saved?.billzId
    ? "none"
    : saved.billzId === billzId.trim()
      ? "linked"
      : "changed";
  const textError = (field: keyof typeof EMPTY_TEXTS) => errors.texts?.[lang]?.[field]?.message;

  return (
    <>
      <Breadcrumbs items={[{ label: "Mahsulotlar", href: "/admin/products" }, { label: title }]} />

      <form noValidate onSubmit={onSubmit} className="contents">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
            {product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products"
              onClick={(event) => {
                if (!isDirty) return;
                event.preventDefault();
                setLeaveOpen(true);
              }}
              className={buttonStyles({ variant: "ghost" })}
            >
              Bekor qilish
            </Link>
            <Button type="submit" className="px-5" disabled={isSubmitting} aria-busy={isSubmitting}>
              <Icon name="check" size={18} />
              {isSubmitting ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
            <Card aria-labelledby={`${idBase}-texts`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle id={`${idBase}-texts`} className="text-heading">
                  Matnlar
                </CardTitle>
                <LanguageTabs
                  languages={CONTENT_LANGUAGES}
                  value={lang}
                  onChange={setLang}
                  complete={complete}
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
                    {missingTextsNote(missing)}
                  </p>
                )}
                <Field
                  label="Nomi"
                  error={textError("name")}
                  hint={
                    lang === "uz" && product?.isNewFromBillz
                      ? `Billz’dagi nom: ${product.billzName}`
                      : undefined
                  }
                >
                  {(c) => (
                    <TextInput {...c} {...register(`texts.${lang}.name`)} autoComplete="off" />
                  )}
                </Field>
                <Field label="Tavsif" error={textError("description")}>
                  {(c) => (
                    <TextArea
                      {...c}
                      {...register(`texts.${lang}.description`)}
                      rows={4}
                      placeholder="Mahsulot nima qiladi va kimga mos"
                      className={cn(emptyBorder(current.description))}
                    />
                  )}
                </Field>
                <Field label="Tarkibi" error={textError("ingredients")}>
                  {(c) => (
                    <textarea
                      {...c}
                      {...register(`texts.${lang}.ingredients`)}
                      rows={3}
                      className={cn(
                        textareaClass,
                        "text-[14px] leading-5",
                        emptyBorder(current.ingredients),
                      )}
                    />
                  )}
                </Field>
                <Field label="Qo‘llash tartibi" error={textError("usage")}>
                  {(c) => (
                    <TextArea
                      {...c}
                      {...register(`texts.${lang}.usage`)}
                      rows={3}
                      placeholder="Qanday va qachon ishlatiladi"
                      className={cn(emptyBorder(current.usage))}
                    />
                  )}
                </Field>
              </div>
            </Card>

            <Card aria-labelledby={`${idBase}-images`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle id={`${idBase}-images`} className="text-heading">
                  Rasmlar
                </CardTitle>
                <span className="text-caption font-normal text-ink-muted">
                  Birinchi rasm — asosiy. Tartibni sudrab o‘zgartiring.
                </span>
              </div>
              <ImageManager
                images={images.fields}
                onMove={images.move}
                onRemove={images.remove}
                onAdd={(added) => images.append(added)}
                error={errors.images?.message ?? errors.images?.root?.message}
              />
            </Card>
          </div>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <Card aria-labelledby={`${idBase}-price`} className="flex flex-col gap-3.5">
              <CardTitle id={`${idBase}-price`} className="text-heading">
                Narx va kategoriya
              </CardTitle>
              <Controller
                control={control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field label="Narx" error={fieldState.error?.message}>
                    {(c) => (
                      <AffixInput
                        {...c}
                        ref={field.ref}
                        name={field.name}
                        suffix="so‘m"
                        inputMode="numeric"
                        autoComplete="off"
                        value={Number.isFinite(field.value) ? formatNumber(field.value) : ""}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                          field.onChange(digits ? Number(digits) : Number.NaN);
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  </Field>
                )}
              />
              <Field label="Kategoriya" error={errors.category?.message}>
                {(c) => (
                  <Select {...c} {...register("category")}>
                    <option value="">Tanlanmagan</option>
                    {CATEGORY_IDS.map((id) => (
                      <option key={id} value={id}>
                        {CATEGORY_LABEL[id]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <p className="m-0 text-caption font-normal text-ink-muted">
                Narx o‘zgarishi jurnalga yoziladi va faqat yangi buyurtmalarga ta’sir qiladi.
              </p>
            </Card>

            <Card aria-labelledby={`${idBase}-billz`} className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle id={`${idBase}-billz`} className="text-heading">
                  Billz bog‘lanishi
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
                    ? "Bog‘langan"
                    : billzState === "changed"
                      ? "Saqlangach tekshiriladi"
                      : "Bog‘lanmagan"}
                </span>
              </div>
              <Field label="Billz ID yoki shtrix-kod" error={errors.billzId?.message}>
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
              <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-body-sm font-semibold text-ink-muted">
                    <Icon name="lock" size={14} />
                    Qoldiq
                  </span>
                  <span className="text-[20px] leading-[26px] font-extrabold text-ink tabular-nums">
                    {billzState === "linked" && saved ? `${saved.stock} dona` : "—"}
                  </span>
                </span>
                <span className="text-right text-caption font-normal text-ink-muted">
                  {billzState === "linked" ? (
                    <>
                      Faqat Billz’dan
                      <br />
                      {lastSyncLabel}
                    </>
                  ) : (
                    <>
                      Bog‘langach
                      <br />
                      Billz’dan olinadi
                    </>
                  )}
                </span>
              </div>
            </Card>

            <Card aria-labelledby={`${idBase}-promo`} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle id={`${idBase}-promo`} className="text-heading">
                  Aksiya
                </CardTitle>
                <Controller
                  control={control}
                  name="promo"
                  render={({ field }) => (
                    <Switch
                      ref={field.ref}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Aksiyadagi mahsulot"
                      aria-describedby={`${idBase}-promo-note`}
                    />
                  )}
                />
              </div>
              <p id={`${idBase}-promo-note`} className="m-0 flex gap-2 text-body-sm text-ink-muted">
                <Icon name="coins" size={18} className="shrink-0 text-gold-ink" />
                {promo
                  ? "Aksiyada. Bu mahsulot summasiga cashback hisoblanmaydi — mijoz ilovada buni ko‘radi."
                  : "Aksiyada emas. Xariddan mijozning joriy foizi bo‘yicha cashback hisoblanadi."}
              </p>
            </Card>

            <Card aria-labelledby={`${idBase}-status`} className="flex flex-col gap-3">
              <CardTitle id={`${idBase}-status`} className="text-heading">
                Holat
              </CardTitle>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <SegmentedControl
                    label="Holat"
                    layout="fill"
                    size="lg"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "active", label: PRODUCT_STATUS_META.active.label },
                      { value: "hidden", label: PRODUCT_STATUS_META.hidden.label },
                    ]}
                  />
                )}
              />
              {saved?.lastChange && (
                <p className="m-0 flex gap-2 text-caption font-normal text-ink-muted">
                  <Icon name="history" size={16} className="shrink-0" />
                  <span>
                    Oxirgi o‘zgarish: {saved.lastChange.by} ·{" "}
                    <time dateTime={saved.lastChange.at} className="tabular-nums">
                      {formatDateTimeShort(saved.lastChange.at)}
                    </time>{" "}
                    · {saved.lastChange.note}
                  </span>
                </p>
              )}
            </Card>
          </div>
        </div>
      </form>

      <AlertDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="O‘zgarishlar saqlanmagan"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Sahifadan chiqsangiz, kiritilgan o‘zgarishlar yo‘qoladi.
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel className={buttonStyles({ variant: "outline" })}>
            Tahrirlashda qolish
          </AlertDialogCancel>
          <Button variant="destructive" onClick={() => router.push("/admin/products")}>
            Chiqish
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
