import { formatPercent } from "@/domain/cashback";
import { customerDataCopy } from "@/domain/copy/customers";
import { DELETED_CUSTOMER_LABEL } from "@/domain/customer";
import { createFormatter, tashkentParts, type AdminFormatter } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { customersCopy, type CustomersCopy } from "./copy";

/** `percent` of a customer row ("1.00" → "1 %", "1.50" → "1,5 %", contract §5 `PCT`); `null` → "—". */
export function percentLabel(percent: string | null, locale: Locale = "uz"): string {
  if (percent === null) return "—";
  return locale === "en"
    ? `${formatPercent(percent, locale)}%`
    : `${formatPercent(percent, locale)} %`;
}

/** "12-mar 2025" · "12 мар 2025" · "12 Mar 2025": the registration day of a customer row. */
export const registeredLabel = (
  iso: string,
  fmt: Pick<AdminFormatter, "dayMonthShort"> = createFormatter("uz"),
) => `${fmt.dayMonthShort(iso)} ${tashkentParts(iso).year}`;

/**
 * Note under the balance metric. The balance is the server's value (§5.3, no
 * longer the ledger sum), so the note only explains the hold: what is held and
 * what can be spent, or that nothing is held.
 */
export function balanceNote(
  held: number,
  available: number,
  t: CustomersCopy = customersCopy.uz,
  fmt: Pick<AdminFormatter, "som"> = createFormatter("uz"),
): string {
  return held !== 0 ? t.card.held(fmt.som(held), fmt.som(available)) : t.card.noHold;
}

/** "Chrome (Windows) · Tashkent, Tashkent, UZ" — a session in confirmations and toasts. */
export function sessionLabel(session: { device: string; location: string }): string {
  const location = session.location.trim();
  return location && location !== "—" ? `${session.device} · ${location}` : session.device;
}

/** A customer's name, the mapper's deleted-customer token worded in the admin language. */
export function customerDisplayName(name: string, locale: Locale): string {
  return name === DELETED_CUSTOMER_LABEL ? customerDataCopy[locale].deleted : name;
}
