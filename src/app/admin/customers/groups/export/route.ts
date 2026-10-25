import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { exportSegments } from "@/data/mock/segments.queries";

/** Customer groups export (contract §1.8 `guruhlar`). */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "segments",
    name: "guruhlar",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => ({
      header: ["ID", "Nomi", "A’zolar", "Push qurilmalar"],
      rows: (await exportSegments()).map((s) => [
        Number(s.id) || s.id,
        s.name,
        s.memberCount,
        s.size,
      ]),
    }),
  });
}
