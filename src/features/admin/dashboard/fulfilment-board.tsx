import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import type { FulfilmentCounters } from "@/domain/dashboard";
import { cn } from "@/lib/cn";
import { createFormatter, type AdminFormatter } from "@/lib/format";

import { dashboardCopy, type DashboardCopy } from "./copy";
import { fulfilmentTiles } from "./fulfilment-tiles";

const SURFACE = {
  neutral: "bg-surface-raised",
  warning: "bg-warning-soft",
  danger: "bg-danger-soft",
} as const;
const ICON = { neutral: "text-gold-ink", warning: "text-warning", danger: "text-danger" } as const;

/**
 * "Buyurtmalar holati": the order-state counters as the orders stand now
 * (not windowed by the period switch), each tile a link to the filtered
 * orders list (`fulfilmentTiles`).
 */
export function FulfilmentBoard({
  counters,
  t = dashboardCopy.uz.fulfilment,
  fmt = createFormatter("uz"),
}: {
  counters: FulfilmentCounters;
  /** `dashboardCopy[locale].fulfilment`. */
  t?: DashboardCopy["fulfilment"];
  fmt?: AdminFormatter;
}) {
  const tiles = fulfilmentTiles(counters, t.tiles);
  return (
    <section aria-labelledby="fulfilment-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fulfilment-title" className="m-0 text-[16px] leading-[22px] font-bold text-ink">
          {t.title}
        </h2>
        <span className="text-caption text-ink-muted">{t.note}</span>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3 p-0">
        {tiles.map((tile) => (
          <li key={tile.key} className="flex min-w-0">
            <Link
              href={tile.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg p-4 text-ink no-underline shadow-sm transition-shadow duration-150 hover:shadow-lg",
                SURFACE[tile.tone],
              )}
            >
              <span className="flex items-start gap-2 text-body-sm font-semibold text-ink-muted">
                <Icon
                  name={tile.icon}
                  size={16}
                  className={cn("mt-0.5 shrink-0", ICON[tile.tone])}
                />
                <span className="min-w-0 break-words">{tile.label}</span>
              </span>
              <span className="text-[24px] leading-[30px] font-extrabold tracking-[-0.01em] tabular-nums">
                {fmt.number(tile.value)}
              </span>
              <span className="text-caption text-ink-muted">{tile.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
