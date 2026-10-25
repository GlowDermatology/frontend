import { verifyStaff } from "@/data/auth";
import { getCatalogStats } from "@/data/products";
import { cn } from "@/lib/cn";

import { Skeleton } from "../shared/skeleton";

/**
 * Sidebar Billz block (contract §5.2): "Billz ulangan" / "Billz ulanmagan"
 * from `products/stats/`, with the last sync relative to the server's now.
 * Async and rendered inside `<Suspense>` so the shell stays prerendered;
 * without a session (login bounce in flight, 404 shell) it shows a neutral
 * line instead of redirecting from the sidebar.
 */
export async function BillzStatus() {
  const session = await verifyStaff();
  if (!session.ok) return <BillzStatusFallback label="Billz holati noma’lum" />;
  const stats = await getCatalogStats();
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3">
      <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", stats.billzConnected ? "bg-success" : "bg-danger")}
        />
        {stats.billzConnected ? "Billz ulangan" : "Billz ulanmagan"}
      </span>
      <span className="text-caption font-normal text-ink-muted">
        Sinxronlangan: {stats.lastSyncLabel}
      </span>
    </div>
  );
}

export function BillzStatusFallback({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3" aria-hidden={!label}>
      {label ? (
        <span className="flex items-center gap-2 text-body-sm font-semibold text-ink-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-ink-muted" />
          {label}
        </span>
      ) : (
        <>
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <Skeleton className="h-3 w-36 rounded-sm" />
        </>
      )}
    </div>
  );
}
