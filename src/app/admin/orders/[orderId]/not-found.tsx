import { AdminNotFound } from "@/features/admin/shared/admin-not-found";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export default function OrderNotFound() {
  return (
    <AdminShell section="orders">
      <AdminNotFound
        title="Buyurtma topilmadi"
        description="Bunday raqamli buyurtma yo‘q. Raqamni tekshiring yoki ro‘yxatdan qidiring."
        backHref="/admin/orders"
        backLabel="Buyurtmalar ro‘yxati"
      />
    </AdminShell>
  );
}
