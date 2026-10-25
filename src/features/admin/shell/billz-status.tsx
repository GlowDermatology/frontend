import { isApiError } from "@/data/api/errors";
import { verifyStaff } from "@/data/auth";
import { type CatalogStats, getCatalogStats } from "@/data/products";
import { cn } from "@/lib/cn";

import { Skeleton } from "../shared/skeleton";

/**
 * Sidebar Billz block (contract §5.2): "Billz ulangan" / "Billz ulanmagan"
 * from `products/stats/`, with the last sync relative to the server's now.
 * Async and rendered inside `<Suspense>` so the shell stays prerendered;
 * without a session (login bounce in flight, 404 shell) it shows a neutral
 * line instead of redirecting from the sidebar. The block is decorative and
 * sits on every admin page, so an API failure (Django down, timeout, 5xx,
 * 429) degrades to the same neutral line instead of escaping to the segment
 * error boundary and taking the whole shell with it.
 */
export async function BillzStatus() {
  const session = await verifyStaff();
  if (!session.ok) return <BillzStatusFallback label={BILLZ_STATUS_UNKNOWN} />;
  const stats = await loadStats();
  if (!stats) return <BillzStatusFallback label={BILLZ_STATUS_UNKNOWN} />;
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

export const BILLZ_STATUS_UNKNOWN = "Billz holati noma’lum";

/** `getCatalogStats()`, or `null` when the API answered with an error or did not answer. */
export async function loadStats(): Promise<CatalogStats | null> {
  try {
    return await getCatalogStats();
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
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
