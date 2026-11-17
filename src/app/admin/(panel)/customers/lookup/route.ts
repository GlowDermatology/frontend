import type { NextRequest } from "next/server";

import { lookupCustomers } from "@/data/customer-lookup";
import { LOOKUP_MAX_LENGTH, lookupSegmentId } from "@/domain/customer-lookup";
import { groupsCopy } from "@/features/admin/groups/copy";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * Customer lookup of the add-members picker (DESIGN §C): `?q=` (a name, or a phone in any
 * spelling — sent to the API as national digits) and optional `?segment=` (marks who is already
 * a member) → `{term, kind, items: [{id, name, phone, email, status, member?}]}`, at most eight.
 * A GET route handler rather than a Server Action, so a fast typist's requests can be aborted and
 * never queue behind the dialog's own save. Session-checked like `delivery-issues/alerts`: 401
 * without a session, 502 when the API failed; a term too short to search answers no items.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").slice(0, LOOKUP_MAX_LENGTH * 2);
  const outcome = await lookupCustomers(q, lookupSegmentId(params.get("segment")), request.signal);
  const headers = { "Cache-Control": "no-store" };
  if (outcome.ok) return Response.json(outcome.result, { headers });
  const t = (await copyFor(groupsCopy)).lookup;
  return Response.json(
    outcome.status === 401
      ? { code: "not_authenticated", message: t.unauthenticated, errors: [] }
      : { code: "bad_gateway", message: t.badGateway, errors: [] },
    { status: outcome.status, headers },
  );
}
