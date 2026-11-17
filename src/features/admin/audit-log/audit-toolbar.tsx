"use client";

import { useId, useRef, useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import {
  AUDIT_REQUEST_ID_MAX,
  auditActionLabel,
  auditObjectLabel,
  auditRequestIdProblem,
  parseAuditRequestId,
  type AuditFacets,
  type AuditFilters,
} from "@/domain/audit";
import { cn } from "@/lib/cn";
import { revealFirstError } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { useListNavigation } from "../shared/list-transition";
import { MAX_FILTER_YEAR, MIN_FILTER_YEAR } from "../shared/url-state";
import { auditLogCopy } from "./copy";
import {
  auditActionOptions,
  auditActorOptions,
  auditObjectOptions,
  type ActorOption,
} from "./options";
import { auditHref, hasAuditFilters } from "./query";

export type { ActorOption };

const FILTER_MIN = `${MIN_FILTER_YEAR}-01-01`;
const FILTER_MAX = `${MAX_FILTER_YEAR}-12-31`;

const caption = "text-caption text-ink-muted";
/** Every toolbar control is the kit's 44px height, so the two rows line up. */
const smallControl = "h-11 text-[14px]";

/**
 * Filters of the audit log (DESIGN §D). Every change is a URL navigation inside the list
 * transition (rows dim instead of flashing a skeleton). The actor list is the active staff
 * directory; the action and object lists come from the viewer's facets (grouped, searchable);
 * the request id is searched on Enter or with the search button (8–64 of `[A-Za-z0-9-]`, a
 * prefix of the full id is enough).
 */
export function AuditToolbar({
  filters,
  actors,
  facets,
}: {
  filters: AuditFilters;
  actors: ActorOption[];
  facets: AuditFacets;
}) {
  const t = useCopy(auditLogCopy).toolbar;
  const locale = useAdminLocale();
  const { navigate } = useListNavigation();
  const id = useId();
  const requestForm = useRef<HTMLFormElement>(null);
  const [objectId, setObjectId] = useState(filters.objectId ?? "");
  const [requestId, setRequestId] = useState(filters.requestId ?? "");
  const [requestError, setRequestError] = useState<string | null>(null);
  const update = (patch: Partial<AuditFilters>) =>
    navigate(auditHref({ ...filters, ...patch, page: 1 }));

  const actionLabel = filters.action ? auditActionLabel(filters.action, locale) : t.all;
  const objectLabel = filters.objectType ? auditObjectLabel(filters.objectType, locale) : t.all;

  const searchRequest = () => {
    const problem = auditRequestIdProblem(requestId);
    if (problem) {
      setRequestError(problem === "short" ? t.requestIdShort : t.requestIdChars);
      // After React marks the field invalid: scroll to, focus and shake it.
      window.requestAnimationFrame(() => void revealFirstError(requestForm.current));
      return;
    }
    setRequestError(null);
    const next = parseAuditRequestId(requestId);
    if (next !== filters.requestId) update({ requestId: next });
  };

  const errorId = `${id}-request-error`;

  return (
    <div
      role="group"
      aria-label={t.label}
      className="flex flex-col gap-3 border-b border-line p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <Select<string>
          variant="filter"
          className="max-sm:w-full"
          aria-label={t.actor}
          prefix={`${t.actor}:`}
          value={filters.actor ?? ""}
          onValueChange={(value) => update({ actor: value || undefined })}
          options={auditActorOptions(actors, t.all)}
        />
        <Combobox<string>
          label={t.action}
          placeholder={t.actionSearch}
          trigger={
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-ink-muted">{t.action}:</span>
              <span className="truncate">{actionLabel}</span>
            </span>
          }
          triggerClassName="max-w-[320px] justify-between max-sm:w-full max-sm:max-w-none"
          value={filters.action ?? ""}
          onValueChange={(value) => update({ action: value || undefined })}
          options={auditActionOptions(facets, locale, t.all, filters.action)}
        />
        <Combobox<string>
          label={t.objectType}
          placeholder={t.objectSearch}
          trigger={
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-ink-muted">{t.objectType}:</span>
              <span className="truncate">{objectLabel}</span>
            </span>
          }
          triggerClassName="max-w-[280px] justify-between max-sm:w-full max-sm:max-w-none"
          value={filters.objectType ?? ""}
          onValueChange={(value) => update({ objectType: value || undefined })}
          options={auditObjectOptions(facets, locale, t.all, filters.objectType)}
        />
        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onCommit={(patch) => update(patch)}
          min={FILTER_MIN}
          max={FILTER_MAX}
          presets={["today", "yesterday", "last7", "last30", "thisMonth"]}
        />
      </div>

      <div className="flex flex-wrap items-start gap-2.5">
        <form
          className="flex w-[140px] flex-col gap-1 max-sm:w-full"
          onSubmit={(event) => {
            event.preventDefault();
            update({ objectId: objectId.trim() || undefined });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={caption}>{t.objectId}</span>
            <TextInput
              name="object_id"
              className={cn(smallControl, "font-mono")}
              value={objectId}
              maxLength={64}
              autoComplete="off"
              onChange={(event) => setObjectId(event.target.value)}
              onBlur={() => {
                if ((objectId.trim() || undefined) !== filters.objectId) {
                  update({ objectId: objectId.trim() || undefined });
                }
              }}
              enterKeyHint="search"
            />
          </label>
        </form>

        <form
          ref={requestForm}
          role="search"
          noValidate
          className="flex min-w-[240px] flex-[1_1_300px] flex-col gap-1 sm:max-w-[420px]"
          onSubmit={(event) => {
            event.preventDefault();
            searchRequest();
          }}
        >
          <label htmlFor={`${id}-request`} className={caption}>
            {t.requestId}
          </label>
          <span
            data-reveal-box
            className={cn(
              "flex h-11 items-center gap-1 rounded-md border-[1.5px] border-line-strong bg-surface-raised pr-1 pl-3 transition-colors duration-150 focus-within:border-gold-ink",
              requestError && "border-danger focus-within:border-danger",
            )}
          >
            <Icon name="search" size={16} className="shrink-0 text-ink-muted" />
            <input
              id={`${id}-request`}
              name="request_id"
              value={requestId}
              maxLength={AUDIT_REQUEST_ID_MAX}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder={t.requestIdPlaceholder}
              aria-invalid={requestError ? true : undefined}
              aria-describedby={requestError ? errorId : undefined}
              onChange={(event) => {
                setRequestId(event.target.value);
                if (requestError) setRequestError(null);
              }}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-muted focus-visible:outline-none"
            />
            {(requestId || filters.requestId) && (
              <IconButton
                size="sm"
                aria-label={t.requestIdClear}
                onClick={() => {
                  setRequestId("");
                  setRequestError(null);
                  if (filters.requestId) update({ requestId: undefined });
                }}
                className="size-8"
              >
                <Icon name="close" size={16} />
              </IconButton>
            )}
            <IconButton type="submit" size="sm" aria-label={t.requestIdSearch} className="size-8">
              <Icon name="arrow-right" size={16} />
            </IconButton>
          </span>
          {requestError && (
            <span
              id={errorId}
              className="flex items-start gap-1.5 text-body-sm font-semibold text-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {requestError}
            </span>
          )}
        </form>

        {hasAuditFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-5"
            onClick={() => {
              setObjectId("");
              setRequestId("");
              setRequestError(null);
              navigate(auditHref({ ordering: filters.ordering, page: 1 }));
            }}
          >
            <Icon name="close" size={16} />
            {t.clear}
          </Button>
        )}
      </div>
    </div>
  );
}
