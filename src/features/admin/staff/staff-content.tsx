import { requireStaff } from "@/data/auth";
import { getStaffAccount } from "@/data/settings";
import { listStaffAccounts } from "@/data/staff";
import { formatNumber } from "@/lib/format";

import { PageHeader } from "../shared/page-header";
import type { SearchParams } from "../shared/url-state";
import { parseStaffQuery } from "./query";
import { StaffView } from "./staff-view";

/**
 * Data boundary of `/admin/staff` (gap FND-4, contract §2.16): managers
 * only. The sidebar hides the item for everyone else; a direct visit by a
 * staff member who is not a manager explains why there is nothing to see
 * instead of reading the list (whose manager columns would be empty).
 */
export async function StaffContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const [account, params] = await Promise.all([getStaffAccount(), searchParams]);
  if (!account?.isManager) {
    return (
      <>
        <PageHeader title="Xodimlar" />
        <section
          aria-label="Ruxsat yo‘q"
          className="flex flex-col items-center gap-2 rounded-lg bg-surface-raised px-6 py-16 text-center shadow-sm"
        >
          <p className="m-0 text-subheading text-ink">Ruxsat yo‘q</p>
          <p className="m-0 max-w-[460px] text-body-sm text-ink-muted">
            Xodimlarni faqat menejerlar boshqaradi. Kirish kerak bo‘lsa, menejerga murojaat qiling.
          </p>
        </section>
      </>
    );
  }
  const query = parseStaffQuery(params);
  const page = await listStaffAccounts(query);
  return (
    <StaffView
      page={page}
      query={query}
      selfId={account.id}
      eyebrow={`${formatNumber(page.total)} ta ${query.status === "active" ? "faol" : "nofaol"} xodim`}
    />
  );
}
