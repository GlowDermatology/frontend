import type { Route } from "next";

import { listAuditLog } from "@/data/audit";
import { getMe, requireStaff } from "@/data/auth";
import { formatNumber } from "@/lib/format";
import { Icon } from "@/components/ui/icon";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { AuditTable } from "./audit-table";
import { AuditToolbar, type ActorOption } from "./audit-toolbar";
import { auditHref, auditQuery, parseAuditFilters } from "./query";

/** Data boundary of /admin/audit-log (filters, ordering and page in the URL). */
export async function AuditContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const filters = parseAuditFilters(await searchParams);
  const [page, me] = await Promise.all([listAuditLog(filters), getMe()]);

  const actors = new Map<string, string>();
  if (me && me.id > 0) actors.set(String(me.id), `${me.display_name} (siz)`);
  for (const entry of page.items) {
    if (entry.actorId && entry.actor && !actors.has(entry.actorId)) {
      actors.set(entry.actorId, entry.actor);
    }
  }
  const actorOptions: ActorOption[] = [...actors].map(([id, name]) => ({ id, name }));
  const exportQuery = auditQuery({ ...filters, page: 1 });

  return (
    <>
      <PageHeader
        eyebrow={`${formatNumber(page.total)} ta yozuv`}
        title="Harakatlar jurnali"
        actions={<ExportMenu href={`/admin/audit-log/export${exportQuery}`} />}
      />
      <ListTransition className="group">
        <section
          aria-label="Harakatlar jurnali"
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <AuditToolbar key={filters.objectId ?? ""} filters={filters} actors={actorOptions} />
          {page.items.length > 0 ? (
            <AuditTable
              entries={page.items}
              ascending={filters.ordering === "at"}
              sortHref={auditHref({
                ...filters,
                ordering: filters.ordering === "at" ? "-at" : "at",
                page: 1,
              })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Icon name="history" size={28} className="text-ink-muted" />
              <p className="m-0 text-subheading text-ink">Yozuv topilmadi</p>
              <p className="m-0 text-body-sm text-ink-muted">Filtrlarni o‘zgartirib ko‘ring.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => auditHref({ ...filters, page: p })}
            />
          </div>
        </section>
      </ListTransition>
    </>
  );
}
