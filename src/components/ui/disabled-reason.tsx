"use client";

import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/cn";

import { Tooltip, TooltipBubble, useTapTooltip } from "./tooltip";

/** Why a control cannot be used and what to do about it; falsy = the control works. */
export type DisabledReason = string | false | null | undefined;

/**
 * Props that make any focusable element a disabled-reason control: `aria-disabled` (it stays in
 * the tab order, unlike `disabled`), `data-disabled` for the muted look, and a description that
 * points at a `hidden` element holding the reason (read on focus, before any tooltip opens).
 */
export function disabledReasonProps(
  reasonId: string,
  describedBy?: string,
): {
  "aria-disabled": true;
  "data-disabled": "";
  "aria-describedby": string;
} {
  return {
    "aria-disabled": true,
    "data-disabled": "",
    "aria-describedby": cn(describedBy, reasonId),
  };
}

/**
 * Wraps one focusable element in the reason tooltip and gives it the tap behaviour: the element's
 * click must call `reveal()` (and swallow the action). Used by `DisabledReasonButton`, the
 * segmented control and anything else with a `disabledReason`.
 */
export function ReasonTooltip({
  reason,
  children,
  open,
  onOpenChange,
  side,
}: {
  reason: string;
  children: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip content={reason} open={open} onOpenChange={onOpenChange} side={side} ownDescription>
      {children}
    </Tooltip>
  );
}

interface DisabledReasonButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "onClick"
> {
  reason: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A button that explains why it cannot act. It stays focusable (`aria-disabled`) and never acts:
 * its click is cancelled, which also cancels a form's implicit submission (Enter in a text field
 * clicks the default submit button, so a disabled-reason submit button keeps its `type` and the
 * form still cannot be sent through it). The reason shows on hover, focus and tap.
 */
export function DisabledReasonButton({
  reason,
  children,
  type = "button",
  "aria-describedby": describedBy,
  ...rest
}: DisabledReasonButtonProps) {
  const reasonId = useId();
  const tip = useTapTooltip();
  return (
    <ReasonTooltip reason={reason} open={tip.open} onOpenChange={tip.onOpenChange}>
      <button
        {...rest}
        type={type}
        {...disabledReasonProps(reasonId, describedBy)}
        onClick={(event) => {
          event.preventDefault();
          tip.reveal();
        }}
      >
        {children}
        {/* `hidden` keeps the reason out of the button's name, `aria-describedby` still reads it. */}
        <span id={reasonId} hidden>
          {reason}
        </span>
      </button>
    </ReasonTooltip>
  );
}

/** What `useDisabledReason` hands a control. */
export interface DisabledReasonState {
  /** The reason, or `null` when the control works. */
  reason: string | null;
  /**
   * For the focusable element: `aria-disabled`, `data-disabled` and the description pointing at
   * the hidden reason while there is one; otherwise only the caller's `aria-describedby`.
   */
  props: { "aria-disabled"?: true; "data-disabled"?: ""; "aria-describedby"?: string };
  /** For `TooltipRoot`: never open without a reason. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the tooltip; call it from the swallowed click, tap or key. */
  reveal: () => void;
  /** The hidden reason text the description points at: render it inside the control. */
  text: ReactNode;
  /**
   * The tooltip bubble: render it inside the `TooltipRoot` but outside the focusable element (it
   * is portalled, and React events from a portal bubble through its parents).
   */
  bubble: ReactNode;
}

/**
 * The disabled-reason behaviour for controls that are not a plain button (Select, Combobox, the
 * pickers, the phone field, Switch): the element stays focusable, is described by a hidden reason
 * and shows it in a tooltip on hover, focus and tap. The control wraps its tree in
 * `<TooltipRoot open onOpenChange>` and its focusable element (or the box around it) in
 * `<TooltipTrigger asChild>` always, so a reason that comes and goes never remounts the element
 * (focus and caret stay); it renders `text` and `bubble` and refuses to act while `reason` is set.
 */
export function useDisabledReason(
  reason: DisabledReason,
  describedBy?: string,
): DisabledReasonState {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const active = reason || null;
  /* A reason that went away must not leave the tooltip armed for the next one. */
  if (!active && open) setOpen(false);
  return {
    reason: active,
    props: active
      ? disabledReasonProps(reasonId, describedBy)
      : { "aria-describedby": describedBy },
    open: active ? open : false,
    onOpenChange: (next) => setOpen(active ? next : false),
    reveal: () => {
      if (active) setOpen(true);
    },
    text: active ? (
      <span id={reasonId} hidden>
        {active}
      </span>
    ) : null,
    bubble: active ? <TooltipBubble content={active} /> : null,
  };
}

/**
 * Keys that would act on a control (open it, choose, type into it): a disabled-reason control
 * swallows them and shows its reason instead. Tab, Escape and modifier shortcuts pass.
 */
export function isReasonKey(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (event.ctrlKey || event.metaKey) return false;
  if (["Enter", " ", "ArrowDown", "ArrowUp", "Backspace", "Delete"].includes(event.key))
    return true;
  return event.key.length === 1 && !event.altKey;
}
