import type { CashbackPolicy } from "@/domain/cashback";
import { formatDayMonthShort, formatMillions, tashkentParts } from "@/lib/format";

import type { SavedPolicy } from "../cashback.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { getCashbackSettings } from "./cashback.queries";

/**
 * Mock implementation of `src/data/cashback.actions.ts`: the active policy
 * comes from the fixtures and the draft from the action, which has already
 * re-validated it (zod + `analyzeTiers`). Versions are append-only; nothing
 * is persisted.
 */

const NBSP = "\u00a0";

/** "20–30 mln" / "50 mln dan" (`formatMillions` emits an NBSP before "mln"). */
const range = (from: number, to: number | null) =>
  to === null
    ? `${formatMillions(from)} dan`
    : `${formatMillions(from).replace(`${NBSP}mln`, "")}–${formatMillions(to)}`;

const tierKey = (t: { from: number; to: number | null; percent: number }) =>
  `${t.from}:${t.to ?? "∞"}:${t.percent}`;

/** Diff by `(from, to, percent)`, not by tier id (contract §7.11). */
export function summarize(before: CashbackPolicy, after: CashbackPolicy): string {
  const known = new Set(before.tiers.map(tierKey));
  const added = after.tiers.filter((t) => !known.has(tierKey(t)));
  if (added.length > 0 && after.tiers.length > before.tiers.length) {
    return added.map((t) => `${range(t.from, t.to)}: ${t.percent}% qo‘shildi`).join("; ");
  }
  if (after.tiers.length < before.tiers.length) return "Daraja olib tashlandi";
  if (added.length > 0) return "Darajalar yangilandi";
  return "Hisoblash qoidalari yangilandi";
}

export async function saveCashbackPolicy(
  draft: CashbackPolicy,
): Promise<ActionResult<SavedPolicy>> {
  await delay(600);
  const { policy: active } = await getCashbackSettings();
  const version = active.version + 1;
  const p = tashkentParts(draft.effectiveFrom);
  return {
    ok: true,
    data: {
      policy: { ...draft, version },
      version: {
        version,
        summary: summarize(active, draft),
        author: "Administrator",
        period: `${formatDayMonthShort(draft.effectiveFrom)} ${p.year} dan`,
        active: false,
        scheduled: true,
      },
    },
  };
}
