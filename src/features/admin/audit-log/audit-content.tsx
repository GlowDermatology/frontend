import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { optionalRead } from "@/data/api/optional-read";
import { getAuditFacets, listAuditLog } from "@/data/audit";
import { getMe, requireStaff } from "@/data/auth";
import { listStaff } from "@/data/staff";
import { fullAuditFacets, type AuditFacets } from "@/domain/audit";
import type { StaffMember } from "@/domain/staff";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination, rangeLabel } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { AuditTable } from "./audit-table";
import { AuditToolbar, type ActorOption } from "./audit-toolbar";
import { auditLogCopy } from "./copy";
import { auditHref, auditQuery, parseAuditFilters } from "./query";

/**
 * Data boundary of /admin/audit-log (filters, ordering and page in the URL). The rows are
 * already limited to the viewer's tier by the backend (DESIGN §D); the facets decide which
 * filters are offered and whether the IP column exists.
 */
export async function AuditContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const filters = parseAuditFilters(await searchParams);
  const [page, facets, me, staff, t, fmt] = await Promise.all([
    listAuditLog(filters),
    facetsOrClosed(),
    getMe(),
    staffOrEmpty(),
    copyFor(auditLogCopy),
    getFormat(),
  ]);

  // The actor filter lists the active staff (`GET staff/`); the signed-in
  // member is marked, and a filtered actor who is no longer active keeps
  // their name from the rows instead of a bare id.
  const actors = new Map<string, string>(staff.map((member) => [member.id, member.name]));
  if (me && me.id > 0 && actors.has(String(me.id))) {
    actors.set(String(me.id), t.you(actors.get(String(me.id)) ?? ""));
  }
  if (staff.length === 0) {
    // Directory unavailable: fall back to the signed-in member and this page's actors.
    if (me && me.id > 0) actors.set(String(me.id), t.you(me.display_name));
    for (const entry of page.items) {
      if (entry.actorId && entry.actor && !actors.has(entry.actorId)) {
        actors.set(entry.actorId, entry.actor);
      }
    }
  }
  if (filters.actor && !actors.has(filters.actor)) {
    const row = page.items.find((entry) => entry.actorId === filters.actor && entry.actor);
    actors.set(filters.actor, row?.actor ?? `#${filters.actor}`);
  }
  const actorOptions: ActorOption[] = [...actors].map(([id, name]) => ({ id, name }));
  const exportQuery = auditQuery({ ...filters, page: 1 });

  return (
    <>
      <PageHeader
        eyebrow={t.entries(page.total)}
        title={t.title}
        actions={<ExportMenu href={`/admin/audit-log/export${exportQuery}`} />}
      />
      <ListTransition className="group">
        <section
          aria-label={t.title}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          {facets.tier !== "superuser" && (
            <p className="m-0 flex items-start gap-2 border-b border-line bg-surface px-4 py-2.5 text-body-sm text-ink-muted sm:px-5">
              <Icon name="shield-check" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
              <span>
                <span className="font-semibold text-ink">{t.tierBadge[facets.tier]}</span>
                {" · "}
                {t.tier[facets.tier]}
              </span>
            </p>
          )}
          <AuditToolbar
            key={`${filters.objectId ?? ""}|${filters.requestId ?? ""}`}
            filters={filters}
            actors={actorOptions}
            facets={facets}
          />
          {filters.requestId && (
            <p
              role="status"
              className="m-0 flex flex-wrap items-center gap-2 border-b border-line bg-gold-soft/40 px-4 py-2.5 text-body-sm text-ink sm:px-5"
            >
              <Icon name="link" size={16} className="shrink-0 text-gold-ink" />
              {t.toolbar.byRequest}
              <code className="font-mono text-[12px] break-all">{filters.requestId}</code>
            </p>
          )}
          {page.items.length > 0 ? (
            <AuditTable
              entries={page.items}
              ascending={filters.ordering === "at"}
              ipVisible={facets.ipVisible}
              filters={filters}
              sortHref={auditHref({
                ...filters,
                ordering: filters.ordering === "at" ? "-at" : "at",
                page: 1,
              })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name="history" size={22} />
              </span>
              <p className="m-0 text-subheading text-ink">{t.empty.title}</p>
              <p className="m-0 text-body-sm text-ink-muted">{t.empty.text}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {rangeLabel(page.page, page.pageSize, page.total, fmt)}
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

/**
 * The viewer's facets; when they cannot be read, every filter is offered (the backend still
 * limits the rows) but the IP column stays hidden — fail closed.
 */
function facetsOrClosed(): Promise<AuditFacets> {
  return optionalRead("audit-log facets", getAuditFacets, {
    ...fullAuditFacets(),
    ipVisible: false,
  });
}
