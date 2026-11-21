import { cookies } from "next/headers";

import { getMe } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { getNotificationActivity } from "@/data/notifications";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

import { Skeleton } from "../shared/skeleton";
import { shellCopy } from "./copy";
import { staffInitials } from "./initials";
import { LogoutButton } from "./logout-button";
import { UserMenu } from "./user-menu";

/**
 * Signed-in staff member (`GET auth/me/`) as the profile menu's trigger (`UserMenu`: settings,
 * language, theme, sign-out). Without JavaScript the menu cannot open, so the plain logout form
 * (`LogoutButton`) is kept beside it in `<noscript>`. Async and rendered inside `<Suspense>` so
 * the shell stays prerendered.
 */
export async function HeaderProfile() {
  const [me, copy, activity] = await Promise.all([
    getMe(),
    copyFor(shellCopy),
    getNotificationActivity(),
  ]);
  const t = copy.user;
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  const name = me?.display_name || "—";

  return (
    <div className="flex items-center gap-1">
      <UserMenu
        name={name}
        email={me?.email ?? t.noSession}
        initials={staffInitials(name)}
        csrf={csrf}
        notificationActivity={activity}
        staffId={me ? String(me.id) : undefined}
      />
      <noscript>
        <LogoutButton csrf={csrf} label={t.logout} />
      </noscript>
    </div>
  );
}

export function HeaderProfileFallback() {
  return <Skeleton className="size-11 shrink-0 rounded-full" />;
}
