import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import type { DashboardData } from "@/domain/dashboard";
import { cn } from "@/lib/cn";
import { createFormatter, type AdminFormatter } from "@/lib/format";

import { attentionItems } from "./attention-items";
import { dashboardCopy, type DashboardCopy } from "./copy";

const SURFACE = {
  danger: "bg-danger-soft",
  warning: "bg-warning-soft",
  neutral: "bg-surface",
} as const;
const ICON = { danger: "text-danger", warning: "text-warning", neutral: "text-gold-ink" } as const;

export function AttentionList({
  attention,
  t = dashboardCopy.uz.attention,
  fmt = createFormatter("uz"),
}: {
  attention: DashboardData["attention"];
  /** `dashboardCopy[locale].attention`. */
  t?: DashboardCopy["attention"];
  fmt?: AdminFormatter;
}) {
  const items = attentionItems(attention, t, fmt);

  return (
    <section
      aria-labelledby="attn-title"
      className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-sm"
    >
      <h2 id="attn-title" className="m-0 mb-1 text-[16px] leading-[22px] font-bold text-ink">
        {t.title}
      </h2>
      {items.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-body-sm text-ink-muted">
          <Icon name="check" size={18} className="shrink-0 text-success" />
          {t.empty}
        </p>
      ) : (
        items.map((item) => {
          const className = cn(
            "flex items-start gap-3 rounded-md p-3 text-ink no-underline",
            SURFACE[item.tone],
          );
          const content = (
            <>
              <Icon name={item.icon} size={20} className={cn("mt-px shrink-0", ICON[item.tone])} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14px] leading-5 font-bold break-words">{item.title}</span>
                {item.body && (
                  <span
                    className={cn(
                      "text-caption font-normal",
                      item.tone === "neutral" && "text-ink-muted",
                    )}
                  >
                    {item.body}
                  </span>
                )}
              </span>
              {item.href && (
                <Icon name="chevron-right" size={16} className="mt-0.5 shrink-0 text-ink-muted" />
              )}
            </>
          );
          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              className={cn(className, "transition-[filter] duration-150 hover:brightness-[0.98]")}
            >
              {content}
            </Link>
          ) : (
            <p key={item.key} className={cn(className, "m-0")}>
              {content}
            </p>
          );
        })
      )}
    </section>
  );
}
