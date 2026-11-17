"use client";

import { Slot, Tooltip as TooltipPrimitive } from "radix-ui";
import {
  createContext,
  use,
  useState,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

import { usePortalContainer } from "./layer";

/** Set by `TooltipProvider`; a `Tooltip` without one brings its own provider. */
const HasProvider = createContext(false);

/**
 * Shares the hover delay between tooltips (moving from one trigger to the next opens the next one
 * at once). Mount once per shell; a `Tooltip` rendered outside one still works on its own.
 */
export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: ReactNode;
  /** Hover delay in milliseconds before a tooltip opens. */
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={300}>
      <HasProvider value={true}>{children}</HasProvider>
    </TooltipPrimitive.Provider>
  );
}

export const tooltipContentClass =
  "z-[70] max-w-[min(280px,calc(100vw-16px))] rounded-sm border border-nav-line bg-nav px-3 py-2 text-body-sm font-medium text-white shadow-lg [text-wrap:pretty] data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-fade-in";

export interface TooltipProps {
  /** The tooltip text. Keep it short; it must not hold anything interactive. */
  content: ReactNode;
  /** One focusable element (a button, a link, an input) that accepts a ref and event props. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Controlled open state (e.g. a disabled button opens it on tap). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The trigger carries its own permanent description of the same text (a disabled reason): the
   * open bubble does not describe it again.
   */
  ownDescription?: boolean;
  className?: string;
}

/**
 * The tooltip's state without a trigger of its own, for controls whose focusable element is
 * already another primitive's trigger (a Select trigger, a popover anchor): render
 * `<TooltipTrigger asChild>` inside that primitive's `asChild` trigger, so its `data-state` and
 * `aria-describedby` win, and a `TooltipBubble` anywhere inside. Brings its own provider when no
 * `TooltipProvider` is mounted.
 */
export function TooltipRoot({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const hasProvider = use(HasProvider);
  const root = (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </TooltipPrimitive.Root>
  );
  return hasProvider ? (
    root
  ) : (
    <TooltipPrimitive.Provider delayDuration={200}>{root}</TooltipPrimitive.Provider>
  );
}

/**
 * Between Radix's trigger and the element: drops the `aria-describedby` the open trigger adds (the
 * bubble's id), so the element keeps only its own description.
 */
function OwnDescriptionOnly(props: ComponentPropsWithRef<typeof Slot.Root>) {
  const own = { ...props };
  delete own["aria-describedby"];
  return <Slot.Root {...own} />;
}

/**
 * Radix's tooltip trigger for the disabled-reason controls (`useDisabledReason`), always
 * `asChild` inside a `TooltipRoot`. The element keeps its own `aria-describedby` (the permanent
 * hidden reason) and is not described by the open bubble too: it holds the same text, and screen
 * readers would read the reason twice.
 */
export function TooltipTrigger({
  children,
  ...props
}: ComponentPropsWithRef<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger {...props} asChild>
      <OwnDescriptionOnly>{children}</OwnDescriptionOnly>
    </TooltipPrimitive.Trigger>
  );
}

/** The bubble of a `TooltipRoot` (portalled into the nearest layer host). */
export function TooltipBubble({
  content,
  side = "top",
  align = "center",
  className,
}: {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const container = usePortalContainer();
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={8}
        className={cn(tooltipContentClass, className)}
      >
        {content}
        <TooltipPrimitive.Arrow width={12} height={6} className="fill-nav" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/**
 * A short description shown on hover and keyboard focus (Radix Tooltip: opens after the
 * provider's delay, closes on Escape, blur, click or scroll, never traps focus). While open the
 * trigger is described by the tooltip (`aria-describedby`, added to the trigger's own); with
 * `ownDescription` only by its own (the disabled-reason buttons point at a permanent hidden text).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  open,
  onOpenChange,
  ownDescription,
  className,
}: TooltipProps) {
  return (
    <TooltipRoot open={open} onOpenChange={onOpenChange}>
      {ownDescription ? (
        <TooltipTrigger>{children}</TooltipTrigger>
      ) : (
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      )}
      <TooltipBubble content={content} side={side} align={align} className={className} />
    </TooltipRoot>
  );
}

/**
 * Open state for a tooltip on a control that cannot act (a disabled-reason button): hover and
 * focus open it as usual, and a tap or click opens it too (touch screens have no hover, and the
 * click itself is swallowed), so the reason is reachable with every input.
 */
export function useTapTooltip(): {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Call from the swallowed click. */
  reveal: () => void;
} {
  const [open, setOpen] = useState(false);
  return { open, onOpenChange: setOpen, reveal: () => setOpen(true) };
}
