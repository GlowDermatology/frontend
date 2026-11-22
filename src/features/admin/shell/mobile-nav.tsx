"use client";

import { Dialog } from "radix-ui";
import { useState, type MouseEvent, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { LayerHostProvider } from "@/components/ui/layer";
import { useCopy } from "@/lib/i18n/admin-context";

import { shellCopy } from "./copy";

/**
 * Below 1024px the sidebar becomes a drawer. The canvas could only stack the
 * menu above the page on small screens; a drawer keeps the content first.
 * Menus opened in the drawer (the profile menu and its «Til» submenu, tooltips) portal into the
 * drawer's own `div[data-layer-host]`, so they stay inside the dialog (focus scope, accessible
 * tree) instead of `<main>`, which the open dialog hides. `label` names the drawer (the
 * workspace's «… bo‘limlari»).
 */
export function MobileNav({ label, children }: { label: string; children: ReactNode }) {
  const t = useCopy(shellCopy);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  // Close when a navigation link inside the drawer is followed.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a[href]")) setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t.openMenu}
        className="flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface lg:hidden"
      >
        <Icon name="menu" size={20} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={onClick}
          className="fixed inset-y-0 left-0 z-50 w-[min(300px,calc(100%-48px))] overflow-y-auto bg-surface-raised shadow-lg focus-visible:outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in lg:hidden"
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <Dialog.Close
            aria-label={t.closeMenu}
            className="absolute top-4 right-3 flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-gold-soft hover:text-ink"
          >
            <Icon name="close" size={20} />
          </Dialog.Close>
          <LayerHostProvider host={host}>{children}</LayerHostProvider>
          <div data-layer-host="" ref={setHost} className="contents" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
