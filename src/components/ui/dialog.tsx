"use client";

import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const overlayClass =
  "fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";

const contentClass =
  "fixed top-[clamp(24px,14vh,160px)] left-1/2 z-50 flex max-h-[calc(100dvh_-_clamp(24px,14vh,160px)_-_24px)] w-[calc(100%-48px)] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface-raised p-6 text-ink shadow-lg focus-visible:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/* The height leaves the top offset plus 24px free, so a tall dialog (the
   banner form on a phone) scrolls inside the viewport and its buttons can
   always be reached; `100dvh − 48px` let it run off the bottom edge. */
const titleClass = "text-heading text-ink";

/**
 * Radix returns focus to its own `Trigger` on close. These dialogs are opened
 * from state (buttons elsewhere on the page), so remember what had focus when
 * the dialog opened and return there, unless the caller moved focus itself.
 */
function useReturnFocus(onCloseAutoFocus?: (event: Event) => void) {
  const previous = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      previous.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (previous.current?.isConnected) previous.current.focus();
    },
  };
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Optional sentence announced with the title. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Where focus goes on close when the trigger no longer exists. */
  onCloseAutoFocus?: (event: Event) => void;
}

/** Modal dialog: focus trap, Escape/overlay to close, focus returns on close. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  onCloseAutoFocus,
}: DialogProps) {
  const focus = useReturnFocus(onCloseAutoFocus);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass} />
        <DialogPrimitive.Content
          className={cn(contentClass, "max-w-[480px]", className)}
          {...focus}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogPrimitive.Title className={titleClass}>{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-body-sm text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Confirmation for destructive actions (`role="alertdialog"`): it does not
 * close on overlay click and focus starts on the least destructive control.
 */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  onCloseAutoFocus,
}: DialogProps) {
  const focus = useReturnFocus(onCloseAutoFocus);
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content
          className={cn(contentClass, "max-w-[520px] gap-3.5", className)}
          {...focus}
        >
          <AlertPrimitive.Title className={titleClass}>{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description asChild>
            <div>{description}</div>
          </AlertPrimitive.Description>
          {children}
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}

export const AlertDialogCancel = AlertPrimitive.Cancel;
export const DialogClose = DialogPrimitive.Close;
