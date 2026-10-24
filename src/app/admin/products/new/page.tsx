import type { Metadata } from "next";

import { ProductEditor } from "@/features/admin/products/product-editor";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Yangi mahsulot" };

export default function NewProductPage() {
  return (
    <AdminShell section="products">
      <ProductEditor product={null} lastSyncLabel="" />
    </AdminShell>
  );
}
