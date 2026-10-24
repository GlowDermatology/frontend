import { AdminNotFound } from "@/features/admin/shared/admin-not-found";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export default function CustomerNotFound() {
  return (
    <AdminShell section="customers">
      <AdminNotFound
        title="Mijoz topilmadi"
        description="Bunday mijoz yo‘q yoki havola noto‘g‘ri."
        backHref="/admin/customers"
        backLabel="Mijozlar"
      />
    </AdminShell>
  );
}
