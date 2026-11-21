import { getMe, requireStaff } from "@/data/auth";
import { resetStaffMfa } from "@/data/mfa.actions";
import { getStaffAccount } from "@/data/settings";
import { listStaffAccounts } from "@/data/staff";
import { requestNow } from "@/data/now";
import { Icon } from "@/components/ui/icon";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { PageHeader } from "../shared/page-header";
import type { SearchParams } from "../shared/url-state";
import { staffCopy } from "./copy";
import { parseStaffQuery } from "./query";
import { StaffView } from "./staff-view";

/**
 * Data boundary of `/admin/staff` (gap FND-4, contract §2.16, DESIGN §E): managers only. The
 * sidebar hides the item for everyone else; a direct visit by a staff member who is not a
 * manager explains why there is nothing to see instead of reading the list (whose manager
 * columns would be empty). `capabilities.staff_email_invite` decides whether the e-mailed link
 * options are offered; `capabilities.specialist_provisioning` whether a Specialist can be invited
 * (and an account changed to Specialist).
 */
export async function StaffContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const [account, me, params, t, fmt] = await Promise.all([
    getStaffAccount(),
    getMe(),
    searchParams,
    copyFor(staffCopy),
    getFormat(),
  ]);
  if (!account?.isManager) {
    return (
      <>
        <PageHeader title={t.title} />
        <section
          aria-labelledby="staff-no-access"
          className="flex flex-col items-center gap-2 rounded-lg bg-surface-raised px-6 py-16 text-center shadow-sm"
        >
          <span
            aria-hidden="true"
            className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
          >
            <Icon name="lock" size={22} />
          </span>
          <h2 id="staff-no-access" className="m-0 text-subheading text-ink">
            {t.noAccess.title}
          </h2>
          <p className="m-0 max-w-[460px] text-body-sm text-ink-muted">{t.noAccess.lead}</p>
        </section>
      </>
    );
  }
  const query = parseStaffQuery(params);
  const [page, now] = await Promise.all([listStaffAccounts(query), requestNow()]);
  return (
    <StaffView
      page={page}
      query={query}
      selfId={account.id}
      emailInvite={me?.capabilities.staff_email_invite ?? false}
      specialistProvisioning={me?.capabilities.specialist_provisioning === true}
      nowMs={now.getTime()}
      eyebrow={t.eyebrow(page.total, fmt.number(page.total), query.status === "active")}
      resetMfa={resetStaffMfa}
    />
  );
}
