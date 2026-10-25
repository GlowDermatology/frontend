import { NextResponse, type NextRequest } from "next/server";

import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportSegmentMembers } from "@/data/mock/segments.queries";

/** Members of one customer group (contract §1.8 `guruh-azolari`, customer columns). */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/admin/customers/groups/[segmentId]/export">,
) {
  const { segmentId } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(segmentId)) {
    return NextResponse.json(
      { code: "not_found", message: "Topilmadi.", errors: [] },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const params = Object.fromEntries(request.nextUrl.searchParams);
  return exportRoute({
    resource: `segments/${segmentId}/members`,
    name: "guruh-azolari",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => ({
      header: [
        "ID",
        "Ism",
        "Telefon",
        "Ro‘yxatdan o‘tgan",
        "Jami xaridlar (so‘m)",
        "Cashback foizi",
        "Balans (so‘m)",
        "Holat",
      ],
      rows: (await exportSegmentMembers(segmentId)).map((m) => [
        Number(m.id),
        m.name,
        m.phone,
        csvDateTime(m.registeredAt),
        m.lifetimeTotal,
        m.percent ?? "",
        m.balance,
        m.status === "active" ? "Faol" : "O‘chirilgan",
      ]),
    }),
  });
}
