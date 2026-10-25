"use server";

import { z } from "zod";

import type { Banner } from "@/domain/banner";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiCreateBanner, apiDeleteBanner, apiPatchBanner, apiReorderBanners } from "./api/catalog";
import { bannerFormData, bannerPatchBody, mapBanner, toActionResult } from "./api/mappers";
import {
  bannerFormSchema,
  bannerImageSchema,
  bannerValuesFromFormData,
  type BannerFormValues,
} from "./banners.schema";
import * as mock from "./mock/banners.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Banner mutations (contract §2.5). `saveBanner` takes the dialog's
 * `FormData` (fields plus an optional `image` part): a create is always
 * multipart, an update is multipart when a new image was picked and a JSON
 * `PATCH` otherwise. `deleteBanner` and `reorderBanners` (`PUT banners/order/`
 * with the exact id set) complete the section.
 */

const bannerIdSchema = z.string().trim().min(1).max(64);
const apiIdSchema = z.string().regex(/^\d{1,18}$/);

export async function saveBanner(
  id: string | null,
  formData: FormData,
  key: string,
  csrf: string,
): Promise<ActionResult<Banner>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = z.union([bannerIdSchema, z.null()]).safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Banner topilmadi.", code: "not_found" };
  const parsedKey = z.object({ key: idempotencyKeySchema }).safeParse({ key });
  if (!parsedKey.success) return fieldErrorsFrom(parsedKey.error);
  const parsed = bannerFormSchema.safeParse(bannerValuesFromFormData(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const picked = formData.get("image");
  const parsedImage = bannerImageSchema.safeParse(
    picked instanceof File && picked.size > 0 ? picked : undefined,
  );
  if (!parsedImage.success) {
    return {
      ok: false,
      error: "Rasmni tekshiring.",
      fieldErrors: { image: parsedImage.error.issues[0]?.message ?? "Rasmni tekshiring." },
    };
  }
  const values: BannerFormValues = parsed.data;
  const image = parsedImage.data ?? null;
  if (parsedId.data === null && !image) {
    return {
      ok: false,
      error: "Rasmni tekshiring.",
      fieldErrors: { image: "Banner rasmini tanlang." },
    };
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
          return { ok: false, error: "Banner topilmadi.", code: "not_found" };
        }
        const { data } = await apiPatchBanner(
          token,
          parsedId.data,
          image ? { formData: bannerFormData(values, image) } : { json: bannerPatchBody(values) },
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
    : mock.updateBanner(parsedId.data, values, image);
}

export async function deleteBanner(
  id: string,
  csrf: string,
): Promise<ActionResult<{ id: string }>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsedId = bannerIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Banner topilmadi.", code: "not_found" };
  if ((await dataSource()) === "api") {
    return apiMutation("deleteBanner", async () => {
      if (!apiIdSchema.safeParse(parsedId.data).success) {
        return { ok: false, error: "Banner topilmadi.", code: "not_found" };
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
  const parsed = z
    .array(bannerIdSchema)
    .max(200)
    .refine((list) => new Set(list).size === list.length, { error: "Bannerlar takrorlanmoqda." })
    .safeParse(ids);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Tartibni tekshiring.");
  if ((await dataSource()) === "api") {
    return apiMutation("reorderBanners", async () => {
      const numeric = parsed.data.map((id) => Number(id));
      if (numeric.some((id) => !Number.isInteger(id))) {
        return { ok: false, error: "Tartibni tekshiring.", code: "mismatch" };
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
