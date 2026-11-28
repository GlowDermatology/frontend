"use server";

import { z } from "zod";

import type { Banner } from "@/domain/banner";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchemas,
  sessionToken,
} from "./action-guard";
import {
  apiCreateBanner,
  apiDeleteBanner,
  apiGetBanner,
  apiPatchBanner,
  apiReorderBanners,
} from "./api/catalog";
import { bannerFormData, bannerPatchBody, mapBanner, toActionResult } from "./api/mappers";
import { apiUseBannerImage } from "./api/scenes";
import { bannerSchemas, bannerValuesFromFormData, type BannerFormValues } from "./banners.schema";
import * as mock from "./mock/banners.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Banner mutations (contract §2.5). `saveBanner` takes the dialog's
 * `FormData` (fields plus an optional `image` part): a create is always
 * multipart, an update is multipart when a new image was picked and a JSON
 * `PATCH` otherwise, and carries only what differs from `baseline` (the
 * banner as the dialog loaded it): an unchanged link to a since-hidden
 * product is never resent, so the banner can still be edited or switched
 * off. `deleteBanner` and `reorderBanners` (`PUT banners/order/` with the
 * exact id set) complete the section.
 *
 * `imageJobId` (instead of an `image` part) saves the banner with a finished AI banner image
 * (§2.20.8, `POST scenes/jobs/{id}/banner/`): the fields and the picture in one transaction.
 */

const bannerIdSchema = z.string().trim().min(1).max(64);
const apiIdSchema = z.string().regex(/^\d{1,18}$/);
/** A demo job id carries its request (base64url): longer than an API id. */
const jobIdSchema = z.string().trim().min(1).max(600);

export async function saveBanner(
  id: string | null,
  formData: FormData,
  baseline: BannerFormValues | null,
  key: string,
  csrf: string,
  imageJobId: string | null = null,
): Promise<ActionResult<Banner>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const locale = await getAdminLocale();
  const m = catalogDataCopy[locale];
  const schemas = bannerSchemas[locale];
  const parsedId = z.union([bannerIdSchema, z.null()]).safeParse(id);
  if (!parsedId.success) return { ok: false, error: m.bannerNotFound, code: "not_found" };
  const parsedKey = z.object({ key: idempotencyKeySchemas[locale] }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error, m.checkFields);
  const parsed = schemas.form.safeParse(bannerValuesFromFormData(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const parsedBaseline = schemas.baseline.nullable().safeParse(baseline);
  if (!parsedBaseline.success) return fieldErrorsFrom(parsedBaseline.error, m.checkFields);
  const picked = formData.get("image");
  const parsedImage = schemas.image.safeParse(
    picked instanceof File && picked.size > 0 ? picked : undefined,
  );
  if (!parsedImage.success) {
    return {
      ok: false,
      error: m.checkImage,
      fieldErrors: { image: parsedImage.error.issues[0]?.message ?? m.checkImage },
    };
  }
  const values: BannerFormValues = parsed.data;
  const image = parsedImage.data ?? null;
  const parsedJob = z.union([jobIdSchema, z.null()]).safeParse(imageJobId);
  if (!parsedJob.success || (parsedJob.data !== null && image)) {
    return { ok: false, error: m.checkImage, fieldErrors: { image: m.checkImage } };
  }
  const generated = parsedJob.data;
  if (parsedId.data === null && !image && !generated) {
    return { ok: false, error: m.checkImage, fieldErrors: { image: m.bannerImageRequired } };
  }
  if (generated) {
    return saveWithGenerated(parsedId.data, generated, values, parsedBaseline.data, {
      session: guard.session,
      key: parsedKey.data.key,
      notFound: m.bannerNotFound,
    });
  }

  if ((await dataSource()) === "api") {
    return apiMutation("saveBanner", async () => {
      const token = sessionToken(guard.session);
      try {
        if (parsedId.data === null) {
          const { data } = await apiCreateBanner(
            token,
            bannerFormData(values, image),
            parsedKey.data.key,
          );
          return { ok: true, data: mapBanner(data) };
        }
        if (!apiIdSchema.safeParse(parsedId.data).success) {
          return { ok: false, error: m.bannerNotFound, code: "not_found" };
        }
        const before = parsedBaseline.data;
        if (image) {
          const { data } = await apiPatchBanner(
            token,
            parsedId.data,
            { formData: bannerFormData(values, image, before) },
            parsedKey.data.key,
          );
          return { ok: true, data: mapBanner(data) };
        }
        const body = bannerPatchBody(before, values);
        if (Object.keys(body).length === 0) {
          return { ok: true, data: mapBanner((await apiGetBanner(token, parsedId.data)).data) };
        }
        const { data } = await apiPatchBanner(
          token,
          parsedId.data,
          { json: body },
          parsedKey.data.key,
        );
        return { ok: true, data: mapBanner(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return parsedId.data === null
    ? mock.createBanner(values, image!)
    : mock.updateBanner(parsedId.data, values, image, parsedBaseline.data);
}

/** A banner saved with a finished AI banner image (new: every field; existing: what changed). */
async function saveWithGenerated(
  id: string | null,
  jobId: string,
  values: BannerFormValues,
  baseline: BannerFormValues | null,
  context: { session: Parameters<typeof sessionToken>[0]; key: string; notFound: string },
): Promise<ActionResult<Banner>> {
  if ((await dataSource()) !== "api")
    return mock.saveBannerWithImageJob(id, jobId, values, baseline);
  if (
    (id !== null && !apiIdSchema.safeParse(id).success) ||
    !apiIdSchema.safeParse(jobId).success
  ) {
    return { ok: false, error: context.notFound, code: "not_found" };
  }
  return apiMutation("saveBanner", async () => {
    try {
      const { data } = await apiUseBannerImage(
        sessionToken(context.session),
        jobId,
        {
          banner_id: id === null ? null : Number(id),
          banner: bannerPatchBody(id === null ? null : baseline, values),
        },
        context.key,
      );
      return { ok: true, data: mapBanner(data.banner) };
    } catch (error) {
      return toActionResult(error, { job_id: "image" });
    }
  });
}

export async function deleteBanner(
  id: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = catalogDataCopy[await getAdminLocale()];
  const parsedId = bannerIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: m.bannerNotFound, code: "not_found" };
  if ((await dataSource()) === "api") {
    return apiMutation("deleteBanner", async () => {
      if (!apiIdSchema.safeParse(parsedId.data).success) {
        return { ok: false, error: m.bannerNotFound, code: "not_found" };
      }
      try {
        await apiDeleteBanner(sessionToken(guard.session), parsedId.data);
        return { ok: true, data: { id: parsedId.data } };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.deleteBanner(parsedId.data);
}

/** The complete new order (every current banner id exactly once). */
export async function reorderBanners(ids: string[], csrf: string): Promise<ActionResult<Banner[]>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = catalogDataCopy[await getAdminLocale()];
  const parsed = z
    .array(bannerIdSchema)
    .max(200)
    .refine((list) => new Set(list).size === list.length, { error: m.bannersRepeated })
    .safeParse(ids);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkOrder);
  if ((await dataSource()) === "api") {
    return apiMutation("reorderBanners", async () => {
      const numeric = parsed.data.map((id) => Number(id));
      if (numeric.some((id) => !Number.isInteger(id))) {
        return { ok: false, error: m.checkOrder, code: "mismatch" };
      }
      try {
        const { data } = await apiReorderBanners(sessionToken(guard.session), numeric);
        return {
          ok: true,
          data: data.results.map(mapBanner).sort((a, b) => a.position - b.position),
        };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.reorderBanners(parsed.data);
}
