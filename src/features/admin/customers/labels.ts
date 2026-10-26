import { formatPercent } from "@/domain/cashback";
import { formatDayMonthShort, tashkentParts } from "@/lib/format";

/** `percent` of a customer row ("1.00" → "1 %", "1.50" → "1,5 %", contract §5 `PCT`); `null` → "—". */
export function percentLabel(percent: string | null): string {
  return percent === null ? "—" : `${formatPercent(percent)} %`;
}

/** "12-mar 2025": the registration day of a customer row. */
export const registeredLabel = (iso: string) =>
  `${formatDayMonthShort(iso)} ${tashkentParts(iso).year}`;
