"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { sectionFromSegments, type AdminSection } from "./nav-items";

const itemClass =
  "group flex h-10 items-center gap-3 rounded-md px-3 text-label text-ink no-underline transition-colors duration-150 hover:bg-gold-soft";

/**
 * A sidebar link that knows whether it is the current section. The shell lives in
 * `(panel)/layout.tsx`, which persists across navigations, so the active item comes from the
 * segments below that layout (`useSelectedLayoutSegments`) instead of a prop each page passed.
 * Its children (icon, label, the streamed count pill) are rendered on the server; the icon picks
 * up the active colour through `group-aria-[current=page]:`.
 */
export function NavLink({
  section,
  href,
  children,
}: {
  section: AdminSection;
  href: Route;
  children: ReactNode;
}) {
  const active = sectionFromSegments(useSelectedLayoutSegments()) === section;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(itemClass, active ? "bg-gold-soft font-bold" : "font-semibold")}
    >
      {children}
    </Link>
  );
}
