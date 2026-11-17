import { requireStaff } from "@/data/auth";
import { OAUTH_PROVIDER_LABEL } from "@/data/auth/oauth";
import { oauthConfig, requestNotice } from "@/data/auth/oauth-env";
import { getMfaStatus } from "@/data/mfa";
import { getStaffAccount } from "@/data/settings";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

import { PageHeader } from "../shared/page-header";
import { AccountCard, type SocialNotice } from "./account-card";
import { settingsCopy } from "./copy";
import { LanguageCard } from "./language-card";
import { MfaCard } from "./mfa-card";
import { OpsConsoleCard } from "./ops-console-card";

/**
 * Data boundary of /admin/settings: the staff account, its admin panel MFA state (`auth/mfa/`,
 * DESIGN §E), the enabled social sign-in providers and the signed `?oauth=` outcome of a link flow
 * (verified here, so a crafted URL cannot make the card display arbitrary text). The store
 * settings, contacts and legal texts live in the ops console; the page only links there
 * (`GLOWDERMA_OPS_CONSOLE_URL`, read at request time). Left: the account (password, social
 * sign-in, other devices); right: two-step protection next to it, the language, the store.
 */
export async function SettingsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/settings">["searchParams"];
}) {
  await requireStaff();
  const [account, mfa, query, t] = await Promise.all([
    getStaffAccount(),
    getMfaStatus(),
    searchParams,
    copyFor(settingsCopy),
  ]);
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
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <AccountCard account={account} providers={providers} notice={notice} />
        </div>
        <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
          <MfaCard status={mfa} account={account?.email ?? null} />
          <LanguageCard />
          <OpsConsoleCard consoleUrl={serverEnv.opsConsoleUrl()} t={t.store} />
        </div>
      </div>
    </>
  );
}
