"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import type { IssueListQuery } from "@/data/delivery-issues";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { DELIVERY_ISSUE_KINDS, type DeliveryIssueKind } from "@/domain/order";
import { useCopy } from "@/lib/i18n/admin-context";

import { useListNavigation } from "../shared/list-transition";
import { issuesCopy } from "./copy";
import { hasIssueFilters, issueListHref } from "./query";

type All = "all";
type Urgency = "urgent" | "normal";

/** Filters of the queue (urgency, kind, order); every change is a URL navigation. */
export function IssuesToolbar({ query }: { query: IssueListQuery }) {
  const t = useCopy(issuesCopy);
  const tb = t.toolbar;
  const kinds = useCopy(orderLabelsCopy).issueKind;
  const { navigate } = useListNavigation();
  const update = (patch: Partial<IssueListQuery>) =>
    navigate(issueListHref({ ...query, ...patch, page: 1 }));
  const urgency: Urgency | All =
    query.urgent === undefined ? "all" : query.urgent ? "urgent" : "normal";
  const urgencyLabel: Record<Urgency, string> = { urgent: tb.urgent, normal: tb.normal };

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SelectMenu<Urgency | All>
        label={tb.urgency}
        trigger={`${tb.urgencyPrefix} ${urgency === "all" ? t.all : urgencyLabel[urgency]}`}
        value={urgency}
        onValueChange={(value) =>
          update({ urgent: value === "all" ? undefined : value === "urgent" })
        }
        options={[
          { value: "all", label: t.all },
          { value: "urgent", label: urgencyLabel.urgent },
          { value: "normal", label: urgencyLabel.normal },
        ]}
      />
      <SelectMenu<DeliveryIssueKind | All>
        label={tb.kind}
        trigger={`${tb.kindPrefix} ${query.kind ? kinds[query.kind] : t.all}`}
        value={query.kind ?? "all"}
        onValueChange={(value) => update({ kind: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: t.all },
          ...DELIVERY_ISSUE_KINDS.map((value) => ({ value, label: kinds[value] })),
        ]}
      />
      {query.order !== undefined && (
        <button
          type="button"
          onClick={() => update({ order: undefined })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-label text-ink hover:bg-gold-soft"
        >
          {tb.order(query.order)}
          <Icon name="close" size={14} />
          <span className="sr-only">{tb.removeFilter}</span>
        </button>
      )}
      <span className="flex-1" />
      <Button
        variant="ghost"
        disabledReason={!hasIssueFilters(query) && tb.clearReason}
        onClick={() => navigate(issueListHref({ state: query.state, pageSize: query.pageSize }))}
      >
        <Icon name="close" size={18} />
        {tb.clear}
      </Button>
    </div>
  );
}
