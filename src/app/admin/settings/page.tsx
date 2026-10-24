import type { Metadata } from "next";

import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Sozlamalar" };

export default function Page() {
  return (
    <AdminShell section="settings">
      <SectionPlaceholder
        title="Sozlamalar"
        icon="sliders"
        purpose="Do‘kon ma’lumotlari, xodimlar va integratsiyalar (Billz, BTS, Click, Payme, Eskiz) sozlamalari shu yerda bo‘ladi."
      />
    </AdminShell>
  );
}
