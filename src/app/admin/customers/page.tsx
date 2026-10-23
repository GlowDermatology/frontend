import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Mijozlar" };

/** The customer list is not designed yet; customer cards are reachable from orders. */
export default function CustomersPage() {
  return (
    <AdminShell section="customers">
      <SectionPlaceholder
        title="Mijozlar"
        icon="users"
        purpose="Mijozlar ro‘yxati, qidiruv va guruhlar shu yerda bo‘ladi. Hozircha mijoz kartasini buyurtma tafsilotlaridan ochish mumkin."
      >
        <Link href="/admin/customers/5" className={buttonStyles({ variant: "secondary" })}>
          Namuna: Malika Karimova kartasi
        </Link>
      </SectionPlaceholder>
    </AdminShell>
  );
}
