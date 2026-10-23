import type { Metadata } from "next";

import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "To‘lovlar" };

export default function Page() {
  return (
    <AdminShell section="payments">
      <SectionPlaceholder
        title="To‘lovlar"
        icon="card"
        purpose="Click va Payme tranzaksiyalari, qaytarishlar va to‘lov xatolari shu yerda ko‘rinadi."
      />
    </AdminShell>
  );
}
