import { cookies } from "next/headers";

import { getMe } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
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
export async function SidebarUser() {
  const [me, copy] = await Promise.all([getMe(), copyFor(shellCopy)]);
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
      />
      <noscript>
        <LogoutButton csrf={csrf} label={t.logout} />
      </noscript>
    </div>
  );
}

export function SidebarUserFallback() {
  return (
    <div className="flex min-h-11 items-center gap-2.5 px-1" aria-hidden="true">
      <Skeleton className="size-9 rounded-full" />
      <span className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-24 rounded-sm" />
        <Skeleton className="h-3 w-16 rounded-sm" />
      </span>
      <Skeleton className="mr-1.5 size-4 rounded-sm" />
    </div>
  );
}
