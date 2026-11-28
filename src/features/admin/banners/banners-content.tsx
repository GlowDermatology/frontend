import { requireStaff } from "@/data/auth";
import { getBanners } from "@/data/banners";
import { getCategories } from "@/data/categories";
import { requestNow } from "@/data/now";
import { getSceneSetup } from "@/data/scenes";

import { BannersView } from "./banners-view";

/**
 * Data boundary of /admin/banners: the ordered list, the categories (link labels), the server's
 * now and the scenes' switches and AI templates (the dialog's «AI bilan yaratish»).
 */
export async function BannersContent() {
  await requireStaff();
  const [banners, categories, now, scenes] = await Promise.all([
    getBanners(),
    getCategories(),
    requestNow(),
    getSceneSetup(),
  ]);
  return (
    <BannersView
      banners={banners}
      categories={categories}
      now={now.toISOString()}
      exportHref="/admin/banners/export"
      scenes={{
        enabled: scenes.status.enabled && scenes.status.aiEnabled,
        templates: scenes.templates.filter((template) => template.kind === "ai_scene"),
      }}
    />
  );
}
