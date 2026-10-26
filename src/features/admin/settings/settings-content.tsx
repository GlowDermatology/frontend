import { requireStaff } from "@/data/auth";
import { OAUTH_PROVIDER_LABEL } from "@/data/auth/oauth";
import { oauthConfig, requestNotice } from "@/data/auth/oauth-env";
import { getSettings, getStaffAccount } from "@/data/settings";

import { PageHeader } from "../shared/page-header";
import { AccountCard, type SocialNotice } from "./account-card";
import { SettingsForm } from "./settings-form";

/**
 * Data boundary of /admin/settings: the settings singleton, the staff
 * account, the enabled social sign-in providers and the signed `?oauth=`
 * outcome of a link flow (verified here, so a crafted URL cannot make the
 * card display arbitrary text).
 */
export async function SettingsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/settings">["searchParams"];
}) {
  await requireStaff();
  const [settings, account, query] = await Promise.all([
    getSettings(),
    getStaffAccount(),
    searchParams,
  ]);
  const opened = await requestNotice(query.oauth);
  const notice: SocialNotice | null = opened
    ? {
        kind: opened.kind,
        provider: OAUTH_PROVIDER_LABEL[opened.provider],
        message: opened.message,
      }
    : null;
  const providers = oauthConfig().providers.map((id) => ({ id, label: OAUTH_PROVIDER_LABEL[id] }));
  return (
    <>
      <PageHeader eyebrow="Do‘kon va hisob" title="Sozlamalar" />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <SettingsForm settings={settings} />
        </div>
        <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
          <AccountCard account={account} providers={providers} notice={notice} />
        </div>
      </div>
    </>
  );
}
