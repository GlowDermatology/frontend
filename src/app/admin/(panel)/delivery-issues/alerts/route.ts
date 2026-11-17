import { getIssueAlerts } from "@/data/delivery-issues";
import { deliveryIssueCopy } from "@/domain/copy/delivery-issues";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * The shell's 30 s poll (Yandex Delivery plan §4): `{open, urgent[]}` —
 * the open delivery issue count and the open urgent issues (ids and codes
 * only). A GET route handler rather than a Server Action, so the poll never
 * queues behind (or ahead of) the admin's own actions; the proxy renews a
 * lapsing session on the way like for any admin GET. 401 without a session
 * (the poll stops), 502 when the API failed (the poll backs off). The error
 * messages are in the admin language.
 */
export async function GET() {
  const result = await getIssueAlerts();
  const headers = { "Cache-Control": "no-store" };
  if (result.ok) return Response.json(result.alerts, { headers });
  const m = await copyFor(deliveryIssueCopy);
  return Response.json(
    result.status === 401
      ? { code: "not_authenticated", message: m.notAuthenticated, errors: [] }
      : { code: "bad_gateway", message: m.badGateway, errors: [] },
    { status: result.status, headers },
  );
}
