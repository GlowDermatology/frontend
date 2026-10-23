"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { createContext, use, useTransition, type ReactNode } from "react";

const ListTransitionContext = createContext<{
  navigate: (href: Route) => void;
  pending: boolean;
} | null>(null);

/**
 * Wraps a URL-driven list. Filter controls navigate inside a transition, so
 * the current rows stay visible (dimmed) until the new ones stream in.
 */
export function ListTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: Route) =>
    startTransition(() => {
      router.replace(href, { scroll: false });
    });

  return (
    <ListTransitionContext value={{ navigate, pending }}>
      <div
        data-pending={pending || undefined}
        aria-busy={pending || undefined}
        className={className}
      >
        {children}
      </div>
    </ListTransitionContext>
  );
}

export function useListNavigation() {
  const context = use(ListTransitionContext);
  if (!context) throw new Error("useListNavigation must be used inside <ListTransition>.");
  return context;
}
