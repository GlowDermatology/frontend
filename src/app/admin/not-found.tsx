import type { Metadata } from "next";

import { AdminNotFound } from "@/features/admin/shared/admin-not-found";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Sahifa topilmadi" };

export default function AdminNotFoundPage() {
  return (
    <AdminShell>
      <AdminNotFound
        title="Sahifa topilmadi"
        description="Bu manzil admin panelda mavjud emas yoki yozuv o‘chirilgan."
        backHref="/admin"
        backLabel="Dashboardga qaytish"
      />
    </AdminShell>
  );
}
