import type { Route } from "next";

import { optionalRead } from "@/data/api/optional-read";
import { listAuditLog } from "@/data/audit";
import { getMe, requireStaff } from "@/data/auth";
import { listStaff } from "@/data/staff";
import type { StaffMember } from "@/domain/staff";
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
  const [page, me, staff] = await Promise.all([listAuditLog(filters), getMe(), staffOrEmpty()]);

  // The actor filter lists the active staff (`GET staff/`); the signed-in
  // member is marked, and a filtered actor who is no longer active keeps
  // their name from the rows instead of a bare id.
  const actors = new Map<string, string>(staff.map((member) => [member.id, member.name]));
  if (me && me.id > 0 && actors.has(String(me.id))) {
    actors.set(String(me.id), `${actors.get(String(me.id))} (siz)`);
  }
  if (staff.length === 0) {
    // Directory unavailable: fall back to the signed-in member and this page's actors.
    if (me && me.id > 0) actors.set(String(me.id), `${me.display_name} (siz)`);
    for (const entry of page.items) {
      if (entry.actorId && entry.actor && !actors.has(entry.actorId)) {
        actors.set(entry.actorId, entry.actor);
      }
    }
  }
  if (filters.actor && !actors.has(filters.actor)) {
    const row = page.items.find((entry) => entry.actorId === filters.actor && entry.actor);
    if (row?.actor) actors.set(filters.actor, row.actor);
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

/** The staff directory, or no options when it cannot be read (the log itself still renders). */
function staffOrEmpty(): Promise<StaffMember[]> {
  return optionalRead("audit-log staff directory", listStaff, []);
}
