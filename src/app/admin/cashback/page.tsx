import { PageHeader } from "@/features/admin/shared/page-header";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export default function Page() {
  return (
    <AdminShell section="cashback">
      <PageHeader title="Cashback sozlamalari" />
    </AdminShell>
  );
}
