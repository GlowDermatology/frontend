import type { Workspace } from "@/data/auth/next-param";

import { Skeleton } from "../shared/skeleton";
import { NAV_ITEMS, SPECIALIST_NAV_ITEMS } from "./nav-items";

/** Label widths of the placeholder nav rows (a calm, irregular rhythm instead of equal bars). */
const ROW_WIDTHS = ["w-24", "w-28", "w-32", "w-20", "w-28", "w-24", "w-[104px]", "w-28"];

/**
 * The static shell of every admin page (the `(panel)/layout.tsx` Suspense fallback): the same
 * frame as `AdminShell` — the 248px sidebar with the brand, the header row and a page body — in
 * skeleton blocks, so nothing shifts when the localized shell streams in. It is prerendered before
 * the admin language is known, so it holds no words (the brand is not translated); `aria-busy`
 * tells assistive technology the region is still loading.
 *
 * The specialist variant (`(specialist)/layout.tsx`) mirrors its reduced shell: the five nav rows,
 * a skeleton in place of the localized overline, no Billz block, no search and only the profile
 * button in the header.
 */
export function ShellSkeleton({ workspace = "admin" }: { workspace?: Workspace }) {
  const admin = workspace === "admin";
  const items = admin ? NAV_ITEMS : SPECIALIST_NAV_ITEMS;
  return (
    <div aria-busy="true" className="flex min-h-dvh bg-surface text-ink">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-hidden border-r border-line bg-surface-raised lg:block">
        <div className="flex h-full flex-col gap-5 px-3 py-5">
          <div className="flex items-baseline gap-2.5 px-3 pt-1">
            <span className="font-serif text-title text-ink">Glow Derma</span>
            {admin ? (
              <span className="text-overline text-ink-muted uppercase">Admin</span>
            ) : (
              <Skeleton className="h-3 w-20 self-center rounded-sm" />
            )}
          </div>
          <div aria-hidden="true" className="flex flex-col gap-0.5">
            {items.map((item, index) => (
              <div key={item.section} className="flex h-10 items-center gap-3 px-3">
                <Skeleton className="size-5 shrink-0 rounded-sm" />
                <Skeleton className={`h-3.5 rounded-sm ${ROW_WIDTHS[index % ROW_WIDTHS.length]}`} />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="mt-auto flex flex-col gap-3">
            {admin && <Skeleton className="h-[62px] rounded-md" />}
            <div className="flex items-center gap-2.5 px-1">
              <Skeleton className="size-9 rounded-full" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-3 w-16 rounded-sm" />
              </span>
              <Skeleton className="size-11 rounded-md" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6"
        >
          <Skeleton className="size-11 shrink-0 rounded-md lg:hidden" />
          {admin && <Skeleton className="h-11 max-w-[480px] min-w-0 flex-[1_1_280px] rounded-md" />}
          <span className="flex-1" />
          {admin && <Skeleton className="size-11 rounded-md" />}
          <Skeleton className="size-11 rounded-md" />
        </div>
        <div
          aria-hidden="true"
          className="flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-4 sm:p-6"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded-sm" />
              <Skeleton className="h-10 w-64 rounded-md" />
            </div>
            <Skeleton className="h-11 w-56 rounded-md" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[122px]" />
            ))}
          </div>
          <Skeleton className="h-[360px]" />
        </div>
      </div>
    </div>
  );
}
