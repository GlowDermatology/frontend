import { AdminNotFound } from "@/features/admin/shared/admin-not-found";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export default function SpecialistNotFound() {
  return (
    <AdminShell section="specialists">
      <AdminNotFound
        title="Mutaxassis topilmadi"
        description="Bunday mutaxassis yo‘q yoki havola noto‘g‘ri."
        backHref="/admin/specialists"
        backLabel="Mutaxassislar"
      />
    </AdminShell>
  );
}
