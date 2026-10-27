import { cookies } from "next/headers";

import { Avatar } from "@/components/ui/avatar";
import { getMe } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { serverEnv } from "@/lib/env.server";

import { Skeleton } from "../shared/skeleton";
import { staffInitials } from "./initials";
import { LogoutButton } from "./logout-button";

/**
 * Signed-in staff member (`GET auth/me/`) and the logout control. Async and
 * rendered inside `<Suspense>` so the shell stays prerendered.
 */
export async function SidebarUser() {
  const me = await getMe();
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  const name = me?.display_name || "—";

  return (
    <div className="flex items-center gap-2.5 px-1">
      <Avatar name={name} initials={staffInitials(name)} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-bold text-ink">{name}</span>
        <span className="truncate text-caption font-normal text-ink-muted">
          {me?.email ?? "Sessiya topilmadi"}
        </span>
      </span>
      <LogoutButton csrf={csrf} />
    </div>
  );
}

export function SidebarUserFallback() {
  return (
    <div className="flex items-center gap-2.5 px-1" aria-hidden="true">
      <Skeleton className="size-9 rounded-full" />
      <span className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-24 rounded-sm" />
        <Skeleton className="h-3 w-16 rounded-sm" />
      </span>
      <Skeleton className="size-11 rounded-md" />
    </div>
  );
}
