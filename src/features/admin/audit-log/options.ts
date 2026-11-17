import type { ComboboxItems } from "@/components/ui/combobox";
import type { SelectItems } from "@/components/ui/select";
import {
  auditActionLabel,
  auditObjectLabel,
  visibleAuditActionGroups,
  visibleAuditObjectGroups,
  type AuditFacets,
} from "@/domain/audit";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The audit toolbar's option lists, built from the viewer's facets (DESIGN §D): only actions and
 * object types the viewer can meet are offered, in labelled groups; the code is a searchable
 * second line. A filter from the URL that is not in the list (an older link, a new backend
 * action) stays selectable as its raw code, so the trigger never goes blank. Pure (tests).
 */

export function auditActionOptions(
  facets: AuditFacets,
  locale: Locale,
  allLabel: string,
  current?: string,
): ComboboxItems<string> {
  const groups = visibleAuditActionGroups(facets, locale);
  const listed = new Set(groups.flatMap((group) => group.actions));
  return [
    { value: "", label: allLabel, text: allLabel },
    ...(current && !listed.has(current)
      ? [{ value: current, label: auditActionLabel(current, locale), text: current }]
      : []),
    ...groups.map((group) => ({
      label: group.label,
      options: group.actions.map((action) => {
        const label = auditActionLabel(action, locale);
        return { value: action, label, text: label, description: action };
      }),
    })),
  ];
}

export function auditObjectOptions(
  facets: AuditFacets,
  locale: Locale,
  allLabel: string,
  current?: string,
): ComboboxItems<string> {
  const groups = visibleAuditObjectGroups(facets, locale);
  const listed = new Set(groups.flatMap((group) => group.types));
  return [
    { value: "", label: allLabel, text: allLabel },
    ...(current && !listed.has(current)
      ? [{ value: current, label: auditObjectLabel(current, locale), text: current }]
      : []),
    ...groups.map((group) => ({
      label: group.label,
      options: group.types.map((type) => {
        const label = auditObjectLabel(type, locale);
        return { value: type, label, text: label, description: type };
      }),
    })),
  ];
}

export interface ActorOption {
  id: string;
  name: string;
}

export function auditActorOptions(
  actors: ReadonlyArray<ActorOption>,
  allLabel: string,
): SelectItems {
  return [
    { value: "", label: allLabel },
    ...actors.map((actor) => ({ value: actor.id, label: actor.name })),
  ];
}
