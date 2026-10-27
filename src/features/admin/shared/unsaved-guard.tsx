"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";

/**
 * The in-app link a click would follow, or `null` when the click is not a
 * plain same-tab navigation to another page of this origin (modifier keys,
 * `target`, `download`, another origin, or the same path and query).
 */
export function guardedHref(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "target">,
  location: Pick<Location, "origin" | "pathname" | "search">,
): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, location.origin);
  } catch {
    return null;
  }
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Keeps unsaved edits from being lost (gap X-SET-LEGAL): while `dirty`, a
 * reload or tab close asks the browser's own question, and a click on any
 * in-app link (the sidebar, the breadcrumbs) opens «O‘zgarishlar saqlanmagan»
 * first; «Chiqish» follows the link, «Tahrirlashda qolish» stays.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need a returnValue to show the prompt.
      event.returnValue = "";
    };
    // Capture phase on the document runs before Next's <Link> handler on the
    // React root, so the navigation never starts.
    const onClick = (event: MouseEvent) => {
      const href = guardedHref(event, window.location);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title="O‘zgarishlar saqlanmagan"
      description={
        <p className="m-0 text-[14px] leading-5 text-ink">
          Sahifadan chiqsangiz, kiritilgan o‘zgarishlar yo‘qoladi.
        </p>
      }
    >
      <div className="mt-1.5 flex flex-wrap justify-end gap-2">
        <AlertDialogCancel className={buttonStyles({ variant: "outline" })}>
          Tahrirlashda qolish
        </AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={() => {
            const href = pending;
            setPending(null);
            if (href) router.push(href as Route);
          }}
        >
          Chiqish
        </Button>
      </div>
    </AlertDialog>
  );
}
