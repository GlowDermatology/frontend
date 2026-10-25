import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";

import { PageHeader } from "./page-header";

interface SectionPlaceholderProps {
  title: string;
  icon: IconName;
  /** What the section will be for, in one sentence. */
  purpose: string;
  /** Header actions, e.g. a link to a built sub-section. */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Sections listed in the sidebar but not drawn yet. They state that plainly
 * instead of showing an invented screen.
 */
export function SectionPlaceholder({
  title,
  icon,
  purpose,
  actions,
  children,
}: SectionPlaceholderProps) {
  return (
    <>
      <PageHeader title={title} actions={actions} />
      <section className="flex flex-col items-center gap-4 rounded-lg bg-surface-raised px-6 py-16 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <Icon name={icon} size={26} />
        </span>
        <h2 className="m-0 text-heading text-ink">Bu bo‘lim hali loyihalanmagan</h2>
        <p className="m-0 max-w-[460px] text-body text-ink-muted">{purpose}</p>
        {children}
      </section>
    </>
  );
}
