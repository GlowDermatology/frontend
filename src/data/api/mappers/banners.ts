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
      url: api.link.url ?? null,
    },
    isActive: api.is_active,
    startsAt: api.starts_at,
    endsAt: api.ends_at,
    position: api.position,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

type BannerLinkValues = BannerFormValues["link"];

/** The link as the API stores it: the target of the other kind is always null. */
function normalLink(link: BannerLinkValues): BannerLinkValues {
  return {
    kind: link.kind,
    productId: link.kind === "product" ? link.productId : null,
    category: link.kind === "category" ? link.category : null,
    url: link.kind === "url" ? link.url : null,
  };
}

function sameLink(a: BannerLinkValues, b: BannerLinkValues): boolean {
  const left = normalLink(a);
  const right = normalLink(b);
  return (
    left.kind === right.kind &&
    left.productId === right.productId &&
    left.category === right.category &&
    left.url === right.url
  );
}

/** Two optional aware datetimes are the same instant (offset spelling aside). */
function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Date.parse(a) === Date.parse(b);
}

const TITLE_LANGUAGES = ["uz", "ru", "en"] as const;

/**
 * What an update changes against the banner the dialog loaded (`baseline`):
 * the changed title languages, the link (sent whole, only when it changed —
 * the server re-checks a sent `link.product_id` against the active products,
 * so resending an unchanged link to a since-hidden product would block every
 * edit of that banner), and the changed flags and window ends. `null`
 * baseline (a create) → everything.
 */
export interface BannerChanges {
  title: Partial<BannerFormValues["title"]>;
  link: BannerLinkValues | null;
  isActive: boolean | null;
  startsAt: { value: string | null } | null;
  endsAt: { value: string | null } | null;
}

export function bannerChanges(
  baseline: BannerFormValues | null,
  values: BannerFormValues,
): BannerChanges {
  const title: Partial<BannerFormValues["title"]> = {};
  for (const language of TITLE_LANGUAGES) {
    if (!baseline || values.title[language] !== baseline.title[language]) {
      title[language] = values.title[language];
    }
  }
  return {
    title,
    link: !baseline || !sameLink(baseline.link, values.link) ? normalLink(values.link) : null,
    isActive: !baseline || baseline.isActive !== values.isActive ? values.isActive : null,
    startsAt:
      !baseline || !sameInstant(baseline.startsAt, values.startsAt)
        ? { value: values.startsAt }
        : null,
    endsAt:
      !baseline || !sameInstant(baseline.endsAt, values.endsAt) ? { value: values.endsAt } : null,
  };
}

/**
 * Multipart body of `POST banners/` (no baseline: every field) and of a
 * `PATCH banners/{id}/` that carries a new image (only the changed fields
 * next to `image`): nested keys as dotted form fields, `""` for a `null`
 * nullable value, booleans as `true`/`false` (contract §2.5).
 */
export function bannerFormData(
  values: BannerFormValues,
  image?: File | null,
  baseline: BannerFormValues | null = null,
): FormData {
  const changes = bannerChanges(baseline, values);
  const form = new FormData();
  if (image) form.set("image", image, image.name);
  for (const language of TITLE_LANGUAGES) {
    const value = changes.title[language];
    if (value !== undefined) form.set(`title.${language}`, value);
  }
  if (changes.link) {
    form.set("link.kind", changes.link.kind);
    form.set("link.product_id", changes.link.productId ?? "");
    form.set("link.category", changes.link.category ?? "");
    form.set("link.url", changes.link.url ?? "");
  }
  if (changes.isActive !== null) form.set("is_active", changes.isActive ? "true" : "false");
  if (changes.startsAt) form.set("starts_at", changes.startsAt.value ?? "");
  if (changes.endsAt) form.set("ends_at", changes.endsAt.value ?? "");
  return form;
}

/**
 * JSON body of a `PATCH banners/{id}/` without a new image: only what
 * differs from `baseline` (everything when it is `null`). May be empty.
 */
export function bannerPatchBody(
  baseline: BannerFormValues | null,
  values: BannerFormValues,
): ApiBannerPatch {
  const changes = bannerChanges(baseline, values);
  const body: ApiBannerPatch = {};
  if (Object.keys(changes.title).length > 0) body.title = changes.title;
  if (changes.link) {
    body.link = {
      kind: changes.link.kind,
      product_id: changes.link.productId ? Number(changes.link.productId) : null,
      category: changes.link.category,
      url: changes.link.url,
    };
  }
  if (changes.isActive !== null) body.is_active = changes.isActive;
  if (changes.startsAt) body.starts_at = changes.startsAt.value;
  if (changes.endsAt) body.ends_at = changes.endsAt.value;
  return body;
}
