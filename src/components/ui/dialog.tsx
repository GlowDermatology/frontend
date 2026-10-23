"use client";

import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const overlayClass =
  "fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";

const contentClass =
  "fixed top-[clamp(24px,14vh,160px)] left-1/2 z-50 flex max-h-[calc(100dvh-48px)] w-[calc(100%-48px)] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface-raised p-6 text-ink shadow-lg focus-visible:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

const titleClass = "text-heading text-ink";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Optional sentence announced with the title. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Modal dialog: focus trap, Escape/overlay to close, focus returns on close. */
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass} />
        <DialogPrimitive.Content
          className={cn(contentClass, "max-w-[480px]", className)}
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
}: DialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content className={cn(contentClass, "max-w-[520px] gap-3.5", className)}>
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
