/**
 * Cashback policy mutations used by the settings screen.
 *
 * Demo mode: validates and returns the new version after a short delay;
 * nothing is persisted. With the API this becomes a Server Action posting to
 * `POST /api/v1/admin/cashback/policy-versions/`. Versions are append-only:
 * ledger entries keep the version they were calculated with.
 */
import { analyzeTiers, type CashbackPolicy, type PolicyVersion } from "@/domain/cashback";
import { formatDayMonthShort, formatMillions, tashkentParts } from "@/lib/format";

import type { ActionResult } from "./types";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const range = (from: number, to: number | null) =>
  to === null
    ? `${formatMillions(from)} dan`
    : `${formatMillions(from).replace(" mln", "")}–${formatMillions(to)}`;

function summarize(before: CashbackPolicy, after: CashbackPolicy): string {
  const known = new Set(before.tiers.map((t) => t.id));
  const added = after.tiers.filter((t) => !known.has(t.id));
  if (added.length > 0) {
    return added.map((t) => `${range(t.from, t.to)}: ${t.percent}% qo‘shildi`).join("; ");
  }
  if (after.tiers.length < before.tiers.length) return "Daraja olib tashlandi";
  if (JSON.stringify(after.tiers) !== JSON.stringify(before.tiers)) return "Darajalar yangilandi";
  return "Hisoblash qoidalari yangilandi";
}

export async function saveCashbackPolicy(
  active: CashbackPolicy,
  draft: CashbackPolicy,
): Promise<ActionResult<{ policy: CashbackPolicy; version: PolicyVersion }>> {
  await delay();
  if (draft.tiers.length === 0) return { ok: false, error: "Kamida bitta daraja kerak." };
  if (analyzeTiers(draft.tiers).overlaps.length > 0) {
    return { ok: false, error: "Darajalar ustma-ust tushmoqda." };
  }
  if (draft.tiers.some((t) => !(t.percent > 0 && t.percent <= 100))) {
    return { ok: false, error: "Foiz 0 dan katta va 100 dan oshmasligi kerak." };
  }
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
