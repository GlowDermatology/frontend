import "server-only";

import {
  CUSTOMER_LOOKUP_LIMIT,
  lookupTerm,
  type CustomerLookupItem,
  type CustomerLookupResult,
} from "@/domain/customer-lookup";

import { apiFetch } from "./api/client";
import { isApiError } from "./api/errors";
import type { ApiCustomerListItem, ApiPaginatedCustomers } from "./api/types";
import { verifyStaff } from "./auth";
import { listCustomers as mockListCustomers } from "./mock/customers.queries";
import { MOCK_MEMBERS } from "./mock/segments";
import { dataSource } from "./source";

/**
 * Customer lookup for the add-members picker (DESIGN §C), read by the route handler
 * `/admin/customers/lookup`: `GET customers/?search=&page_size=20`, plus — with a group — the
 * same search inside the group (`segment=`), so the picker can mark who is already a member.
 * `customers/` accepts only `page_size` 20 or 50 (contract §1.5), so both lists ask for 20 and
 * the picker shows the first eight (`CUSTOMER_LOOKUP_LIMIT`). The second list is a subset of the
 * first in the same order, so every member among the first eight is also among its first eight.
 * Uncached (each keystroke is a fresh question).
 */

/** The smallest page `GET customers/` accepts (contract §1.5: 20 | 50). */
export const CUSTOMER_LOOKUP_PAGE_SIZE = 20;

export type CustomerLookupOutcome =
  { ok: true; result: CustomerLookupResult } | { ok: false; status: 401 | 502 };

const mapItem = (row: ApiCustomerListItem): CustomerLookupItem => ({
  id: String(row.id),
  name: row.name,
  phone: row.phone,
  email: row.email,
  status: row.status,
});

export async function lookupCustomers(
  raw: string,
  segmentId: string | null,
  signal?: AbortSignal,
): Promise<CustomerLookupOutcome> {
  const session = await verifyStaff();
  if (!session.ok) return { ok: false, status: 401 };
  const searched = lookupTerm(raw);
  if (!searched) return { ok: true, result: { term: "", kind: "name", items: [] } };
  const { term, kind } = searched;

  if ((await dataSource()) !== "api" || session.mode !== "api") {
    const query = { q: term, sort: "registered_desc", page: 1, pageSize: 20 } as const;
    const page = await mockListCustomers(query);
    const members = segmentId
      ? new Set(MOCK_MEMBERS[segmentId]?.members.map((member) => member.id) ?? [])
      : null;
    const items = page.items.slice(0, CUSTOMER_LOOKUP_LIMIT).map((row) => ({
      id: row.id,
      name: row.name,
      // The mock rows spell a missing phone as the e-mail; the API keeps them apart.
      phone: row.phone.startsWith("+") ? row.phone : null,
      email: row.phone.includes("@") ? row.phone : null,
      status: row.status,
      ...(members && { member: members.has(row.id) }),
    }));
    return { ok: true, result: { term, kind, items } };
  }

  const read = (segment?: string) =>
    apiFetch<ApiPaginatedCustomers>("/api/v1/admin/customers/", {
      token: session.token,
      query: { search: term, page_size: CUSTOMER_LOOKUP_PAGE_SIZE, segment },
      ...(signal && { signal }),
    });
  const groupId = segmentId && /^\d{1,12}$/.test(segmentId) ? segmentId : null;
  try {
    const [all, inGroup] = await Promise.all([
      read(),
      groupId ? read(groupId) : Promise.resolve(null),
    ]);
    const members = inGroup ? new Set(inGroup.data.results.map((row) => String(row.id))) : null;
    const items = all.data.results.slice(0, CUSTOMER_LOOKUP_LIMIT).map((row) => ({
      ...mapItem(row),
      ...(segmentId && { member: members?.has(String(row.id)) ?? false }),
    }));
    return { ok: true, result: { term, kind, items } };
  } catch (error) {
    if (isApiError(error) && error.status === 401) return { ok: false, status: 401 };
    if (isApiError(error)) return { ok: false, status: 502 };
    throw error;
  }
}
