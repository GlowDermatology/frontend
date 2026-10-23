import type { Metadata } from "next";

import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Bannerlar" };

export default function Page() {
  return (
    <AdminShell section="banners">
      <SectionPlaceholder
        title="Bannerlar"
        icon="image"
        purpose="Ilova bosh sahifasidagi aksiya bannerlari va ularning ko‘rsatilish muddati shu yerda boshqariladi."
      />
    </AdminShell>
  );
}
