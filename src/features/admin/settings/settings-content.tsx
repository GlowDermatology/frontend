import { requireStaff } from "@/data/auth";
import { OAUTH_PROVIDER_LABEL } from "@/data/auth/oauth";
import { oauthConfig, requestNotice } from "@/data/auth/oauth-env";
import { getStaffAccount } from "@/data/settings";
import { serverEnv } from "@/lib/env.server";

import { PageHeader } from "../shared/page-header";
import { AccountCard, type SocialNotice } from "./account-card";
import { OpsConsoleCard } from "./ops-console-card";

/**
 * Data boundary of /admin/settings: the staff account, the enabled social
 * sign-in providers and the signed `?oauth=` outcome of a link flow
 * (verified here, so a crafted URL cannot make the card display arbitrary
 * text). The store settings, contacts and legal texts live in the ops
 * console; the page only links there (`GLOWDERMA_OPS_CONSOLE_URL`, read at
 * request time).
 */
export async function SettingsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/settings">["searchParams"];
}) {
  await requireStaff();
  const [account, query] = await Promise.all([getStaffAccount(), searchParams]);
  const opened = await requestNotice(query.oauth);
  const notice: SocialNotice | null = opened
    ? {
        kind: opened.kind,
        provider: OAUTH_PROVIDER_LABEL[opened.provider],
        message: opened.message,
        issuedAt: opened.issuedAt,
      }
    : null;
  const providers = oauthConfig().providers.map((id) => ({ id, label: OAUTH_PROVIDER_LABEL[id] }));
  return (
    <>
      <PageHeader eyebrow="Hisob" title="Sozlamalar" />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <AccountCard account={account} providers={providers} notice={notice} />
        </div>
        <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
          <OpsConsoleCard consoleUrl={serverEnv.opsConsoleUrl()} />
        </div>
      </div>
    </>
  );
}
