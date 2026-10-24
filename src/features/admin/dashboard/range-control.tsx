"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { DashboardRange } from "@/domain/dashboard";

import { useNotConnected } from "../shell/not-connected";

const OPTIONS: ReadonlyArray<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
];

/** Period switch; the choice lives in `?range=` so a view can be shared or reloaded. */
export function RangeControl({ value }: { value: DashboardRange }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const notConnected = useNotConnected();

  const select = (next: DashboardRange) => {
    startTransition(() => {
      setOptimistic(next);
      router.replace(next === "today" ? "/admin" : `/admin?range=${next}`, { scroll: false });
    });
  };

  return (
    <div
      className="flex flex-wrap gap-1 rounded-md bg-gold-soft p-1"
      data-pending={pending || undefined}
    >
      <SegmentedControl
        label="Davr"
        options={OPTIONS}
        value={optimistic}
        onChange={select}
        className="bg-transparent p-0"
      />
      <button
        type="button"
        onClick={() => notConnected("Ixtiyoriy sana oralig‘ini tanlash dizaynda ko‘rsatilmagan.")}
        className="flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-label text-ink transition-colors duration-150 hover:bg-surface-raised/50"
      >
        <Icon name="calendar" size={18} />
        Tanlash
      </button>
    </div>
  );
}
