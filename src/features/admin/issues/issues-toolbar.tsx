"use client";

import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import type { IssueListQuery } from "@/data/delivery-issues";
import {
  DELIVERY_ISSUE_KIND_LABEL,
  DELIVERY_ISSUE_KINDS,
  type DeliveryIssueKind,
} from "@/domain/order";

import { useListNavigation } from "../shared/list-transition";
import { hasIssueFilters, issueListHref } from "./query";

type All = "all";
type Urgency = "urgent" | "normal";

const URGENCY_LABEL: Record<Urgency, string> = { urgent: "Shoshilinch", normal: "Oddiy" };

/** Filters of the queue (urgency, kind, order); every change is a URL navigation. */
export function IssuesToolbar({ query }: { query: IssueListQuery }) {
  const { navigate } = useListNavigation();
  const update = (patch: Partial<IssueListQuery>) =>
    navigate(issueListHref({ ...query, ...patch, page: 1 }));
  const urgency: Urgency | All =
    query.urgent === undefined ? "all" : query.urgent ? "urgent" : "normal";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
      <SelectMenu<Urgency | All>
        label="Muhimlik"
        trigger={`Muhimlik: ${urgency === "all" ? "Hammasi" : URGENCY_LABEL[urgency]}`}
        value={urgency}
        onValueChange={(value) =>
          update({ urgent: value === "all" ? undefined : value === "urgent" })
        }
        options={[
          { value: "all", label: "Hammasi" },
          { value: "urgent", label: URGENCY_LABEL.urgent },
          { value: "normal", label: URGENCY_LABEL.normal },
        ]}
      />
      <SelectMenu<DeliveryIssueKind | All>
        label="Muammo turi"
        trigger={`Turi: ${query.kind ? DELIVERY_ISSUE_KIND_LABEL[query.kind] : "Hammasi"}`}
        value={query.kind ?? "all"}
        onValueChange={(value) => update({ kind: value === "all" ? undefined : value })}
        options={[
          { value: "all", label: "Hammasi" },
          ...DELIVERY_ISSUE_KINDS.map((value) => ({
            value,
            label: DELIVERY_ISSUE_KIND_LABEL[value],
          })),
        ]}
      />
      {query.order !== undefined && (
        <button
          type="button"
          onClick={() => update({ order: undefined })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-label text-ink hover:bg-gold-soft"
        >
          Buyurtma №{query.order}
          <Icon name="close" size={14} />
          <span className="sr-only">— filtrni olib tashlash</span>
        </button>
      )}
      <span className="flex-1" />
      <button
        type="button"
        disabled={!hasIssueFilters(query)}
        onClick={() => navigate(issueListHref({ state: query.state, pageSize: query.pageSize }))}
        className="inline-flex h-11 items-center gap-2 rounded-md px-[18px] text-label font-bold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-soft disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-transparent"
      >
        <Icon name="close" size={18} />
        Filtrlarni tozalash
      </button>
    </div>
  );
}
