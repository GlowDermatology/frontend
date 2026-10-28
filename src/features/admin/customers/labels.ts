import { formatPercent } from "@/domain/cashback";
import { formatDayMonthShort, formatSom, tashkentParts } from "@/lib/format";

/** `percent` of a customer row ("1.00" → "1 %", "1.50" → "1,5 %", contract §5 `PCT`); `null` → "—". */
export function percentLabel(percent: string | null): string {
  return percent === null ? "—" : `${formatPercent(percent)} %`;
}

/** "12-mar 2025": the registration day of a customer row. */
export const registeredLabel = (iso: string) =>
  `${formatDayMonthShort(iso)} ${tashkentParts(iso).year}`;

/**
 * Note under the balance metric. The balance is the server's value (§5.3, no
 * longer the ledger sum), so the note only explains the hold: what is held and
 * what can be spent, or that nothing is held.
 */
export function balanceNote(held: number, available: number): string {
  return held !== 0
    ? `Band: ${formatSom(held)} · ishlatish mumkin: ${formatSom(available)}`
    : "Band qilingan summa yo‘q";
}

/** "Chrome (Windows) · Tashkent, Tashkent, UZ" — a session in confirmations and toasts. */
export function sessionLabel(session: { device: string; location: string }): string {
  const location = session.location.trim();
  return location && location !== "—" ? `${session.device} · ${location}` : session.device;
}
