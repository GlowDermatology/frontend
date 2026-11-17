import {
  looksLikePhone,
  readLookupItem,
  type CustomerLookupItem,
  type CustomerLookupResult,
} from "@/domain/customer-lookup";
import { parseMemberEntry, SEGMENT_MEMBERS_MAX, splitMemberList } from "@/domain/segment";
import { caretAfterDigits, formatNationalPhone, maskPhone } from "@/lib/phone";

import type { GroupsCopy } from "./copy";

/**
 * Pure logic of the add-members dialog (DESIGN §C): the search field's phone mask, the lookup
 * answer, the entries sent to `addSegmentMembers` (picked customer ids first, then the pasted
 * lines) and where each error lands. Kept apart from the component for the node tests.
 */

/* --- Search field --- */

/**
 * What the search field shows for `raw`: a phone-like text is masked as the phone input does
 * (national "90 123 45 67", or "+998 90 123 45 67" when typed with the "+"), with the caret kept
 * after the same digit; any other text is left alone. `prefix` says whether the field should
 * show the fixed "+998" adornment (a national number without the "+").
 */
export function maskSearchInput(
  raw: string,
  caret: number = raw.length,
): { text: string; caret: number; prefix: boolean } {
  if (!looksLikePhone(raw)) return { text: raw, caret, prefix: false };
  const plus = raw.trimStart().startsWith("+");
  const text = plus ? maskPhone(raw) || raw.trim() : formatNationalPhone(raw);
  if (!text) return { text: raw, caret, prefix: false };
  const atEnd = caret >= raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
  const next = atEnd ? text.length : Math.min(text.length, caretAfterDigits(text, digitsBefore));
  return { text, caret: next, prefix: !plus };
}

/** The route's JSON answer, read defensively (unknown rows are dropped). */
export function readLookupResult(value: unknown): CustomerLookupResult | null {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items)) return null;
  return {
    term: typeof body.term === "string" ? body.term : "",
    kind: body.kind === "phone" ? "phone" : "name",
    items: body.items.flatMap((row) => {
      const item = readLookupItem(row);
      return item ? [item] : [];
    }),
  };
}

/** Why a result cannot be picked (`null` = it can). */
export function unavailableReason(item: CustomerLookupItem, t: GroupsCopy["add"]): string | null {
  if (item.member) return t.alreadyMember;
  if (item.status === "deleted") return t.deletedReason;
  return null;
}

/** "Malika Karimova" → "MK"; one word → its first two letters; nothing → "". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return Array.from(words[0]!).slice(0, 2).join("").toUpperCase();
  return `${Array.from(words[0]!)[0] ?? ""}${Array.from(words.at(-1)!)[0] ?? ""}`.toUpperCase();
}

/* --- Picks --- */

/** Picks the customer, or drops them when already picked (the list toggles). */
export function togglePick(
  picks: ReadonlyArray<CustomerLookupItem>,
  item: CustomerLookupItem,
): CustomerLookupItem[] {
  return picks.some((pick) => pick.id === item.id)
    ? picks.filter((pick) => pick.id !== item.id)
    : [...picks, item];
}

/* --- Bulk paste --- */

/** One pasted entry with its line number (1-based, as the admin sees it). */
export interface BulkLine {
  line: number;
  entry: string;
}

/** The pasted list as entries (split on new lines, commas and semicolons; blanks dropped). */
export function bulkLines(text: string): BulkLine[] {
  return splitMemberList(text).map((entry, index) => ({ line: index + 1, entry }));
}

export interface BulkProblem extends BulkLine {
  message: string;
}

/** Entries that are not a customer id or a whole phone (the Server Action's own rule). */
export function bulkProblems(
  lines: ReadonlyArray<BulkLine>,
  t: { rowIncomplete: string; rowInvalid: string; rowTooLong: string },
): BulkProblem[] {
  return lines.flatMap((line) => {
    if (line.entry.length > 64) return [{ ...line, message: t.rowTooLong }];
    const kind = parseMemberEntry(line.entry).kind;
    if (kind === "incomplete") return [{ ...line, message: t.rowIncomplete }];
    if (kind === "invalid") return [{ ...line, message: t.rowInvalid }];
    return [];
  });
}

/* --- Submit --- */

/** The rows sent to `addSegmentMembers`: picked customer ids first, then the pasted entries. */
export function memberEntries(
  picks: ReadonlyArray<CustomerLookupItem>,
  lines: ReadonlyArray<BulkLine>,
): string[] {
  return [...picks.map((pick) => pick.id), ...lines.map((line) => line.entry)];
}

/** How many customers the submit names, and whether that is over the limit. */
export function entryCount(
  picks: ReadonlyArray<CustomerLookupItem>,
  lines: ReadonlyArray<BulkLine>,
  max: number = SEGMENT_MEMBERS_MAX,
): { count: number; over: boolean } {
  const count = picks.length + lines.length;
  return { count, over: count > max };
}

export interface MemberErrors {
  /** By picked customer id. */
  picks: Record<string, string>;
  bulk: BulkProblem[];
  /** List-level message (`members`, or the action's own message). */
  form: string | null;
}

export const NO_MEMBER_ERRORS: MemberErrors = { picks: {}, bulk: [], form: null };

/**
 * The action's `entries.{row}` errors back on what named the row: rows below `picks.length` are
 * picked customers, the rest are pasted lines; `members` is the list-level message.
 */
export function placeMemberErrors(
  fieldErrors: Readonly<Record<string, string>>,
  picks: ReadonlyArray<CustomerLookupItem>,
  lines: ReadonlyArray<BulkLine>,
): Omit<MemberErrors, "form"> & { members: string | null; placed: string[] } {
  const result = {
    picks: {} as Record<string, string>,
    bulk: [] as BulkProblem[],
    members: null as string | null,
    placed: [] as string[],
  };
  for (const [key, message] of Object.entries(fieldErrors)) {
    const match = /^entries\.(\d+)$/.exec(key);
    if (match) {
      const row = Number(match[1]);
      const pick = picks[row];
      const line = pick ? undefined : lines[row - picks.length];
      if (pick) result.picks[pick.id] = message;
      else if (line) result.bulk.push({ ...line, message });
      else continue;
      result.placed.push(key);
    } else if (key === "members") {
      result.members = message;
      result.placed.push(key);
    }
  }
  result.bulk.sort((a, b) => a.line - b.line);
  return result;
}

/** Field name of a picked customer's chip (`data-field`, error summary links). */
export const pickField = (id: string) => `pick-${id}`;
export const BULK_FIELD = "bulk";
export const SEARCH_FIELD = "customer-search";

/** The error summary rows, in the dialog's order: picks, the pasted list, the list message. */
export function memberErrorSummary(
  errors: MemberErrors,
  picks: ReadonlyArray<CustomerLookupItem>,
  t: GroupsCopy["add"],
): Array<{ name: string; label: string; message: string }> {
  const rows: Array<{ name: string; label: string; message: string }> = [];
  for (const pick of picks) {
    const message = errors.picks[pick.id];
    if (message)
      rows.push({ name: pickField(pick.id), label: pick.name || t.deletedCustomer, message });
  }
  if (errors.bulk.length > 0) {
    const first = errors.bulk[0]!;
    rows.push({
      name: BULK_FIELD,
      label: errors.bulk.length === 1 ? t.bulkLine(first.line, first.entry) : t.fieldBulk,
      message: errors.bulk.length === 1 ? first.message : t.bulkErrors(errors.bulk.length),
    });
  }
  if (errors.form) rows.push({ name: SEARCH_FIELD, label: t.fieldPicks, message: errors.form });
  return rows;
}
