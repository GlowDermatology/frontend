import { AdminNotFound } from "@/features/admin/shared/admin-not-found";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export default function ProductNotFound() {
  return (
    <AdminShell section="products">
      <AdminNotFound
        title="Mahsulot topilmadi"
        description="Bu mahsulot o‘chirilgan yoki havola noto‘g‘ri."
        backHref="/admin/products"
        backLabel="Mahsulotlar ro‘yxati"
      />
    </AdminShell>
  );
}
