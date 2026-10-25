import { requireStaff } from "@/data/auth";
import { getBanners } from "@/data/banners";
import { getCategories } from "@/data/categories";
import { requestNow } from "@/data/now";

import { BannersView } from "./banners-view";

/** Data boundary of /admin/banners: the ordered list, the categories (link labels) and the server's now. */
export async function BannersContent() {
  await requireStaff();
  const [banners, categories, now] = await Promise.all([
    getBanners(),
    getCategories(),
    requestNow(),
  ]);
  return (
    <BannersView
      banners={banners}
      categories={categories}
      now={now.toISOString()}
      exportHref="/admin/banners/export"
    />
  );
}
