import type { Banner } from "@/domain/banner";

import type { BannerFormValues } from "../../banners.schema";
import type { ApiBanner, ApiBannerPatch } from "../types";
import { idString } from "./common";

/** `Banner` (contract §2.5) → the FE domain type. */
export function mapBanner(api: ApiBanner): Banner {
  return {
    id: idString(api.id),
    title: { uz: api.title.uz, ru: api.title.ru, en: api.title.en },
    imageUrl: api.image_url,
    link: {
      kind: api.link.kind ?? "none",
      productId: api.link.product_id == null ? null : idString(api.link.product_id),
      category: api.link.category ?? null,
    },
    isActive: api.is_active,
    startsAt: api.starts_at,
    endsAt: api.ends_at,
    position: api.position,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/**
 * Multipart body of `POST banners/` and of a `PATCH banners/{id}/` that
 * carries a new image: nested keys as dotted form fields, `""` for a `null`
 * nullable value, booleans as `true`/`false` (contract §2.5).
 */
export function bannerFormData(values: BannerFormValues, image?: File | null): FormData {
  const form = new FormData();
  if (image) form.set("image", image, image.name);
  form.set("title.uz", values.title.uz);
  form.set("title.ru", values.title.ru);
  form.set("title.en", values.title.en);
  form.set("link.kind", values.link.kind);
  form.set("link.product_id", values.link.kind === "product" ? (values.link.productId ?? "") : "");
  form.set("link.category", values.link.kind === "category" ? (values.link.category ?? "") : "");
  form.set("is_active", values.isActive ? "true" : "false");
  form.set("starts_at", values.startsAt ?? "");
  form.set("ends_at", values.endsAt ?? "");
  return form;
}

/** JSON body of a `PATCH banners/{id}/` without a new image. */
export function bannerPatchBody(values: BannerFormValues): ApiBannerPatch {
  return {
    title: { uz: values.title.uz, ru: values.title.ru, en: values.title.en },
    link: {
      kind: values.link.kind,
      product_id:
        values.link.kind === "product" && values.link.productId
          ? Number(values.link.productId)
          : null,
      category: values.link.kind === "category" ? values.link.category : null,
    },
    is_active: values.isActive,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
  };
}
