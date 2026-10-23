import { cn } from "@/lib/cn";

/** Neutral placeholder block shown while a data boundary streams in. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-line/60", className)} />
  );
}

/** Generic page-body placeholder: header row, a band of cards and a table. */
export function PageSkeleton({ label = "Yuklanmoqda…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
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
  );
}
