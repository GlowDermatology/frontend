import type { Metadata } from "next";

import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Kategoriyalar" };

export default function Page() {
  return (
    <AdminShell section="categories">
      <SectionPlaceholder
        title="Kategoriyalar"
        icon="tag"
        purpose="Mahsulot kategoriyalari, ularning tartibi va ilovadagi ko‘rinishi shu yerda boshqariladi."
      />
    </AdminShell>
  );
}
