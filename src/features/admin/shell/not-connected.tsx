"use client";

import type { ReactNode } from "react";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

/**
 * Notice for controls whose behaviour is not designed or needs the backend.
 * It says so plainly instead of pretending the action happened.
 */
export function useNotConnected() {
  const toast = useToast();
  return (description: string) =>
    toast({ title: "Bu amal hali ulanmagan", description, tone: "info" });
}

interface NotConnectedButtonProps {
  /** Accessible name (icon-only) or visible text when `children` is text. */
  label: string;
  description: string;
  children: ReactNode;
  className?: string;
  iconOnly?: boolean;
}

export function NotConnectedButton({
  label,
  description,
  children,
  className,
  iconOnly = true,
}: NotConnectedButtonProps) {
  const notConnected = useNotConnected();
  return (
    <button
      type="button"
      aria-label={iconOnly ? label : undefined}
      onClick={() => notConnected(description)}
      className={cn(
        iconOnly &&
          "flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
