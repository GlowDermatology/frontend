import type { ComponentProps, ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

type CardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "className">;

/** Raised surface used for every admin panel block (20px radius, soft shadow). */
export function Card<T extends ElementType = "section">({ as, className, children, ...rest }: CardProps<T>) {
  const Component: ElementType = as ?? "section";
  return (
    <Component className={cn("rounded-lg bg-surface-raised p-5 shadow-sm", className)} {...rest}>
      {children}
    </Component>
  );
}

export function CardTitle({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("m-0 text-[16px] leading-[22px] font-bold text-ink", className)}>
      {children}
    </h2>
  );
}

/** Label/value row used in detail cards ("Usul — Click"). */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 text-body-sm", className)}>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="m-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}
