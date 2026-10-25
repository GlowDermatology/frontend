import { requireStaff } from "@/data/auth";
import { getSettings, getStaffAccount } from "@/data/settings";

import { PageHeader } from "../shared/page-header";
import { AccountCard } from "./account-card";
import { SettingsForm } from "./settings-form";

/** Data boundary of /admin/settings: the settings singleton and the staff account. */
export async function SettingsContent() {
  await requireStaff();
  const [settings, account] = await Promise.all([getSettings(), getStaffAccount()]);
  return (
    <>
      <PageHeader eyebrow="Do‘kon va hisob" title="Sozlamalar" />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <SettingsForm settings={settings} />
        </div>
        <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
          <AccountCard account={account} />
        </div>
      </div>
    </>
  );
}
