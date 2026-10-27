"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_OBJECT_LABELS,
  auditActionsByGroup,
  type AuditFilters,
} from "@/domain/audit";

import { useListNavigation } from "../shared/list-transition";
import { auditHref } from "./query";

export interface ActorOption {
  id: string;
  name: string;
}

const ACTIONS = Object.keys(AUDIT_ACTION_LABELS);
const ACTION_GROUPS = auditActionsByGroup(ACTIONS);
const OBJECT_TYPES = Object.keys(AUDIT_OBJECT_LABELS).sort((a, b) =>
  (AUDIT_OBJECT_LABELS[a] ?? a).localeCompare(AUDIT_OBJECT_LABELS[b] ?? b),
);

const smallControl = "h-10 text-[14px]";

/**
 * Filters of the audit log; every change is a URL navigation inside the
 * list transition (rows dim instead of flashing a skeleton). The actor list
 * is the active staff directory (`GET staff/`, contract §2.16).
 */
export function AuditToolbar({
  filters,
  actors,
}: {
  filters: AuditFilters;
  actors: ActorOption[];
}) {
  const { navigate } = useListNavigation();
  const [objectId, setObjectId] = useState(filters.objectId ?? "");
  const update = (patch: Partial<AuditFilters>) =>
    navigate(auditHref({ ...filters, ...patch, page: 1 }));
  const actorName = actors.find((a) => a.id === filters.actor)?.name;
  const active =
    filters.actor ||
    filters.action ||
    filters.objectType ||
    filters.objectId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="flex flex-wrap items-end gap-2.5 border-b border-line p-4">
      <SelectMenu<string>
        label="Xodim"
        trigger={`Xodim: ${filters.actor ? (actorName ?? `#${filters.actor}`) : "Hammasi"}`}
        value={filters.actor ?? "all"}
        onValueChange={(value) => update({ actor: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...actors.map((actor) => ({ value: actor.id, label: actor.name })),
        ]}
      />
      <label className="flex min-w-[220px] flex-[1_1_220px] flex-col gap-1">
        <span className="text-caption text-ink-muted">Amal</span>
        <Select
          aria-label="Amal"
          className={smallControl}
          value={filters.action ?? ""}
          onChange={(event) => update({ action: event.target.value || undefined })}
        >
          <option value="">Hammasi</option>
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.actions.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action]}
                </option>
              ))}
            </optgroup>
          ))}
          {filters.action && !ACTIONS.includes(filters.action) && (
            <option value={filters.action}>{filters.action}</option>
          )}
        </Select>
      </label>
      <label className="flex min-w-[180px] flex-[1_1_180px] flex-col gap-1">
        <span className="text-caption text-ink-muted">Obyekt</span>
        <Select
          aria-label="Obyekt turi"
          className={smallControl}
          value={filters.objectType ?? ""}
          onChange={(event) => update({ objectType: event.target.value || undefined })}
        >
          <option value="">Hammasi</option>
          {OBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {AUDIT_OBJECT_LABELS[type]} ({type})
            </option>
          ))}
          {filters.objectType && !OBJECT_TYPES.includes(filters.objectType) && (
            <option value={filters.objectType}>{filters.objectType}</option>
          )}
        </Select>
      </label>
      <form
        className="flex w-[140px] flex-col gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          update({ objectId: objectId.trim() || undefined });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Obyekt ID</span>
          <TextInput
            name="object_id"
            className={smallControl}
            value={objectId}
            maxLength={64}
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
      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Sanadan</span>
        <TextInput
          type="date"
          name="date_from"
          className={`${smallControl} tabular-nums`}
          value={filters.dateFrom ?? ""}
          max={filters.dateTo}
          onChange={(event) => update({ dateFrom: event.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Sanagacha</span>
        <TextInput
          type="date"
          name="date_to"
          className={`${smallControl} tabular-nums`}
          value={filters.dateTo ?? ""}
          min={filters.dateFrom}
          onChange={(event) => update({ dateTo: event.target.value || undefined })}
        />
      </label>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setObjectId("");
            navigate(auditHref({ ordering: filters.ordering, page: 1 }));
          }}
        >
          <Icon name="close" size={16} />
          Filtrlarni tozalash
        </Button>
      )}
    </div>
  );
}
