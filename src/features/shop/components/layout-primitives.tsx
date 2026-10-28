import type { ReactNode } from "react";

import { Eyebrow, gutter } from "@/features/landing/components/primitives";
import { cn } from "@/lib/cn";

/**
 * Storefront layout primitives, in the landing's visual language (its
 * gutter, eyebrow and serif display) so the shop reads as the same brand.
 */

export { Eyebrow, gutter };

/** Text links: no underline at rest, a gold underline on hover (design `.gd-link`). */
export const textLink =
  "no-underline decoration-gold decoration-1 underline-offset-[5px] hover:underline focus-visible:underline";

/** Hover lift for cards; motion is cut under prefers-reduced-motion (globals.css). */
export const liftCard =
  "transition-[transform,box-shadow] duration-[350ms] ease-soft hover:-translate-y-1 hover:shadow-lg";

/** Centred page-width column with the landing's fluid gutter. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-page", gutter, className)}>{children}</div>;
}

interface PageHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  children?: ReactNode;
}

/** The serif page title block that opens every storefront page (one `<h1>`). */
export function PageHeading({
  eyebrow,
  title,
  lead,
  id = "page-title",
  children,
}: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-5 pt-[clamp(32px,5vw,72px)] pb-[clamp(24px,3vw,40px)]">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1 id={id} className="m-0 font-serif text-headline font-semibold text-balance text-ink">
        {title}
      </h1>
      {lead ? (
        <p className="m-0 max-w-[620px] text-lead text-pretty text-ink-muted">{lead}</p>
      ) : null}
      {children}
    </div>
  );
}

interface SectionHeadingProps {
  id: string;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

/** Section title row: eyebrow + serif `<h2>` on the left, an optional link on the right. */
export function SectionHeading({ id, eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
      <div className="flex flex-col gap-4">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 id={id} className="m-0 font-serif text-headline font-semibold text-balance text-ink">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Vertical rhythm of storefront sections. */
export const sectionSpacing = "py-[clamp(56px,7vw,112px)]";
