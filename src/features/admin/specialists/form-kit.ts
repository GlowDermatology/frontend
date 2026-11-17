import type { z } from "zod";

import type { FormErrorItem } from "@/lib/forms/rhf";
import type { AdminFormatter } from "@/lib/format";

/**
 * Small pure helpers shared by the specialists, services, customers, cashback and payments
 * screens: the page range under a list, and the error list of a `safeParse` form (field path →
 * first message) with its summary rows.
 */

/** "21–40 / 1 248" in the admin language's number format ("0 / 0" when empty). */
export function pageRangeText(
  fmt: Pick<AdminFormatter, "number">,
  page: number,
  pageSize: number,
  total: number,
): string {
  if (total <= 0) return `${fmt.number(0)} / ${fmt.number(0)}`;
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to = Math.min(total, page * pageSize);
  return `${fmt.number(from)}–${fmt.number(to)} / ${fmt.number(total)}`;
}

/** The first message per field path of a failed `safeParse` ("services.0.price" → message). */
export function issuesToErrors(error: Pick<z.ZodError, "issues">): Record<string, string> {
  const next: Record<string, string> = {};
  for (const issue of error.issues) next[issue.path.join(".")] ??= issue.message;
  return next;
}

/**
 * The summary rows of `errors`, in the order of `order` (the form's field order; unknown paths
 * follow in their own order), each named by `label` (a path without a label keeps the path).
 */
export function errorItems(
  errors: Readonly<Record<string, string>>,
  label: (name: string) => string | undefined,
  order: ReadonlyArray<string> = [],
): FormErrorItem[] {
  const rank = new Map(order.map((name, index) => [name, index]));
  return Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([name, message], index) => ({
      item: { name, message, label: label(name) ?? name },
      rank: rank.get(name) ?? order.length + index,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}
