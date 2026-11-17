"use client";

import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { LayerHostProvider } from "./layer";

const overlayClass =
  "fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";

/* Centred with `inset-x-0 mx-auto` rather than a translate: a transformed
   ancestor becomes the containing block of `position: fixed` descendants,
   which would offset the popovers portalled into the dialog. The content
   itself does not scroll (its overflow stays visible, so a select list can
   run past the dialog's edge); the body inside it does. The height leaves
   the top offset plus 24px free, so a tall dialog (the banner form on a
   phone) scrolls inside the viewport and its buttons can always be reached. */
const contentClass =
  "fixed inset-x-0 top-[clamp(24px,14vh,160px)] z-50 mx-auto flex max-h-[calc(100dvh_-_clamp(24px,14vh,160px)_-_24px)] w-[calc(100%-48px)] flex-col rounded-lg bg-surface-raised text-ink shadow-lg focus-visible:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

const bodyClass =
  "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain rounded-[inherit] p-6";

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
  /** Classes of the scrolling body (padding, gap); `className` styles the dialog box (width). */
  bodyClassName?: string;
  /** Where focus goes on close when the trigger no longer exists. */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * The scrolling body plus a sibling `div[data-layer-host]`: selects, popovers
 * and menus opened inside the dialog portal into the host, so they stay in the
 * dialog's focus scope and accessible tree and are not clipped by the body.
 */
function DialogLayers({ className, children }: { className?: string; children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <LayerHostProvider host={host}>
      <div data-dialog-body="" className={className}>
        {children}
      </div>
      <div data-layer-host="" ref={setHost} className="contents" />
    </LayerHostProvider>
  );
}

/** Modal dialog: focus trap, Escape/overlay to close, focus returns on close. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  bodyClassName,
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
          <DialogLayers className={cn(bodyClass, bodyClassName)}>
            <DialogPrimitive.Title className={titleClass}>{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-body-sm text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            )}
            {children}
          </DialogLayers>
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
  bodyClassName,
  onCloseAutoFocus,
}: DialogProps) {
  const focus = useReturnFocus(onCloseAutoFocus);
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content className={cn(contentClass, "max-w-[520px]", className)} {...focus}>
          <DialogLayers className={cn(bodyClass, "gap-3.5", bodyClassName)}>
            <AlertPrimitive.Title className={titleClass}>{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description asChild>
              <div>{description}</div>
            </AlertPrimitive.Description>
            {children}
          </DialogLayers>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}

export const AlertDialogCancel = AlertPrimitive.Cancel;
export const DialogClose = DialogPrimitive.Close;
