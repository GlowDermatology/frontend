import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const homeActionAccent = "shrink-0 text-[var(--gd-home-action-accent)]";

/** Homepage calls to action use the reference's obsidian and porcelain pills. */
export function homeActionStyles({
  secondary = false,
  compact = false,
  className,
}: {
  secondary?: boolean;
  compact?: boolean;
  className?: string;
} = {}) {
  return buttonStyles({
    variant: secondary ? "secondary" : "primary",
    size: compact ? "md" : "lg",
    className: cn(
      "h-auto min-h-11 max-w-full rounded-full py-2.5 text-center whitespace-normal",
      !compact && "min-h-[52px] px-6",
      secondary
        ? "border border-line bg-surface-raised shadow-sm hover:border-gold hover:bg-surface"
        : "border border-transparent bg-[var(--gd-home-action)] text-[var(--gd-home-action-ink)] shadow-sm hover:border-gold hover:shadow-lg",
      className,
    ),
  });
}
