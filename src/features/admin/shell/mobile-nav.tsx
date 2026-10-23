"use client";

import { Dialog } from "radix-ui";
import { useState, type MouseEvent, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * Below 1024px the sidebar becomes a drawer. The canvas could only stack the
 * menu above the page on small screens; a drawer keeps the content first.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Close when a navigation link inside the drawer is followed.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a[href]")) setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Menyuni ochish"
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
          <Dialog.Title className="sr-only">Admin bo‘limlari</Dialog.Title>
          <Dialog.Close
            aria-label="Menyuni yopish"
            className="absolute top-4 right-3 flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-gold-soft hover:text-ink"
          >
            <Icon name="close" size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
