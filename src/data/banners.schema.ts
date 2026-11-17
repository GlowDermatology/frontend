import { z } from "zod";

import { BANNER_LINK_KINDS, isValidBannerWindow } from "@/domain/banner";
import { CATEGORY_SLUG_PATTERN } from "@/domain/category";
import { catalogDataCopy, type CatalogDataCopy } from "@/domain/copy/catalog";
import { isHttpsUrl, LINK_URL_MAX } from "@/lib/link-url";
import { localized, type LocalizedOf } from "@/lib/i18n/localized";

import { imageFileSchemas } from "./products.schema";

/**
 * Validation for the banner dialog (contract §2.5), shared by the form and
 * the Server Action, one set per admin language (`bannerSchemas[locale]`,
 * messages from `catalogDataCopy`). Datetimes are aware ISO strings
 * (`+05:00`, produced by the dialog from its date-time pickers) or `null`.
 */

function fieldsSchema(m: CatalogDataCopy) {
  const optionalTitle = z.string().trim().max(80, m.maxChars(80));
  /** ISO 8601 with an explicit offset, or `null`. */
  const awareDateTime = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/, m.dateTimeIncomplete)
    .refine((value) => !Number.isNaN(Date.parse(value)), { error: m.dateInvalid })
    .nullable();
  return z.object({
    title: z.object({
      uz: z.string().trim().min(1, m.bannerTitleUzRequired).max(80, m.maxChars(80)),
      ru: optionalTitle,
      en: optionalTitle,
    }),
    link: z.object({
      kind: z.enum(BANNER_LINK_KINDS),
      productId: z
        .string()
        .trim()
        .regex(/^\d{1,18}$/, m.chooseProduct)
        .nullable(),
      category: z.string().trim().regex(CATEGORY_SLUG_PATTERN, m.chooseCategory).nullable(),
      url: z
        .string()
        .trim()
        .max(LINK_URL_MAX, m.maxChars(LINK_URL_MAX))
        .refine((value) => isHttpsUrl(value), { error: m.urlHttps })
        .nullable(),
    }),
    isActive: z.boolean(),
    startsAt: awareDateTime,
    endsAt: awareDateTime,
  });
}

export const bannerSchemas = localized(catalogDataCopy, (m, locale) => {
  const fields = fieldsSchema(m);
  return {
    /**
     * The banner the dialog loaded, which `saveBanner` diffs an update against
     * (shape checks only: it is server data).
     */
    baseline: fields,
    form: fields.superRefine((values, ctx) => {
      if (values.link.kind === "product" && !values.link.productId) {
        ctx.addIssue({ code: "custom", path: ["link", "productId"], message: m.chooseProduct });
      }
      if (values.link.kind === "category" && !values.link.category) {
        ctx.addIssue({ code: "custom", path: ["link", "category"], message: m.chooseCategory });
      }
      if (values.link.kind === "url" && !values.link.url) {
        ctx.addIssue({ code: "custom", path: ["link", "url"], message: m.enterUrl });
      }
      if (!isValidBannerWindow(values.startsAt, values.endsAt)) {
        ctx.addIssue({ code: "custom", path: ["endsAt"], message: m.endAfterStart });
      }
    }),
    /** The optional image part of the dialog's `FormData` (`File` or absent). */
    image: imageFileSchemas[locale].optional(),
  };
});

export type BannerFormValues = z.infer<LocalizedOf<typeof bannerSchemas>["form"]>;

export const EMPTY_BANNER: BannerFormValues = {
  title: { uz: "", ru: "", en: "" },
  link: { kind: "none", productId: null, category: null, url: null },
  isActive: true,
  startsAt: null,
  endsAt: null,
};

/** Form field names the dialog posts (dotted, mirroring the API's multipart names). */
export const BANNER_FORM_FIELDS = [
  "title.uz",
  "title.ru",
  "title.en",
  "link.kind",
  "link.productId",
  "link.category",
  "link.url",
  "isActive",
  "startsAt",
  "endsAt",
] as const;

/** The dialog's `FormData` → form values (`""` is `null` for the nullable keys). */
export function bannerValuesFromFormData(formData: FormData): unknown {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const nullable = (name: string) => text(name) || null;
  return {
    title: { uz: text("title.uz"), ru: text("title.ru"), en: text("title.en") },
    link: {
      kind: text("link.kind") || "none",
      productId: nullable("link.productId"),
      category: nullable("link.category"),
      url: nullable("link.url"),
    },
    isActive: text("isActive") === "true",
    startsAt: nullable("startsAt"),
    endsAt: nullable("endsAt"),
  };
}

/** Form values → the dialog's `FormData` (the client side of `bannerValuesFromFormData`). */
export function bannerFormDataFromValues(values: BannerFormValues, image: File | null): FormData {
  const form = new FormData();
  if (image) form.set("image", image, image.name);
  form.set("title.uz", values.title.uz);
  form.set("title.ru", values.title.ru);
  form.set("title.en", values.title.en);
  form.set("link.kind", values.link.kind);
  form.set("link.productId", values.link.productId ?? "");
  form.set("link.category", values.link.category ?? "");
  form.set("link.url", values.link.url ?? "");
  form.set("isActive", values.isActive ? "true" : "false");
  form.set("startsAt", values.startsAt ?? "");
  form.set("endsAt", values.endsAt ?? "");
  return form;
}
