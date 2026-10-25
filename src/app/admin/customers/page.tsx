import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SectionPlaceholder } from "@/features/admin/shared/section-placeholder";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Mijozlar" };

/**
 * The customer list is not designed yet (customer cards are reachable from
 * orders); the header links to the customer groups (Guruhlar).
 */
export default function CustomersPage() {
  return (
    <AdminShell section="customers">
      <SectionPlaceholder
        title="Mijozlar"
        icon="users"
        purpose="Mijozlar ro‘yxati va qidiruv shu yerda bo‘ladi. Hozircha mijoz kartasini buyurtma tafsilotlaridan ochish mumkin; bildirishnoma guruhlari tayyor."
        actions={
          <Link href="/admin/customers/groups" className={buttonStyles({ variant: "secondary" })}>
            <Icon name="users" size={18} />
            Guruhlar
          </Link>
        }
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/admin/customers/groups" className={buttonStyles()}>
            <Icon name="users" size={18} />
            Mijozlar guruhlari
          </Link>
          <Link href="/admin/customers/5" className={buttonStyles({ variant: "secondary" })}>
            Namuna: Malika Karimova kartasi
          </Link>
        </div>
      </SectionPlaceholder>
    </AdminShell>
  );
}
