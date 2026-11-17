"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
  type RefCallback,
} from "react";

import { fieldLabelId } from "./field";

/**
 * The typed half of the date, time and date-time pickers: a text field that
 * shows a friendly format (`DD.MM.YYYY`, `HH:MM`, `DD.MM.YYYY HH:MM`), masks
 * digits while they are typed at the end, and also accepts typed or pasted
 * ISO, so `locator.fill("2026-11-17")` works as it did on the native input.
 *
 * - `commit: "change"` (forms): every keystroke that leaves a whole, valid
 *   value hands it on; a partial or unreadable draft hands on "" (the native
 *   input's behaviour), and on blur it stays visible, marked invalid, with an
 *   announcement saying what shape is expected.
 * - `commit: "settle"` (URL filters): a valid draft is handed on after the
 *   typing settled (`SETTLE_MS`), or at once on Enter or blur; an unreadable
 *   draft is reverted on blur. Nothing navigates while a year is half typed.
 *
 * Values outside `min`/`max` (or disabled days) that are typed are handed on
 * like on a native input, so the form's validation can name the problem;
 * `strict` refuses them instead. A new value from the parent replaces the
 * draft, unless the draft already stands for it.
 */

export type PickerCommit = "change" | "settle";

/** How long a complete draft waits for more typing in `settle` mode. */
export const SETTLE_MS = 500;

interface PickerFieldOptions {
  value: string | undefined;
  defaultValue: string | undefined;
  onValueChange: ((value: string) => void) | undefined;
  /** Typed text → canonical value, or `null`. */
  parse: (text: string) => string | null;
  /** Canonical value → shown text ("" for ""). */
  format: (value: string) => string;
  mask: (previous: string, next: string) => string;
  commit: PickerCommit;
  /** Whether a canonical value may be chosen (min/max/disabled days). */
  isAllowed: (value: string) => boolean;
  strict: boolean;
  messages: { invalid: string; outOfRange: string; selected: (shown: string) => string };
  onBlur: ((event: FocusEvent<HTMLInputElement>) => void) | undefined;
}

interface DraftRules {
  parse: (text: string) => string | null;
  isAllowed: (value: string) => boolean;
  strict: boolean;
}

/**
 * What a keystroke does with the draft `text`: `emit` hands a value on now, `schedule` hands it
 * on once the typing settled. `change` hands on every whole value, and "" for an empty, partial
 * or unreadable draft (only when a value was set, as a native input empties its value); `settle`
 * schedules a whole value and waits for Enter or blur otherwise.
 */
export function typedDraft(
  text: string,
  {
    commit,
    current,
    parse,
    isAllowed,
    strict,
  }: DraftRules & { commit: PickerCommit; current: string },
): { emit?: string; schedule?: string } {
  const parsed = parse(text);
  const usable = parsed !== null && (isAllowed(parsed) || !strict);
  if (commit === "change") {
    if (text.trim() === "") return { emit: "" };
    if (usable) return { emit: parsed };
    return current !== "" ? { emit: "" } : {};
  }
  return usable && parsed !== current ? { schedule: parsed } : {};
}

/**
 * The draft on Enter or blur: a value (also "" for an empty field), or why it cannot be used
 * (`invalid`: not a whole value; `outOfRange`: a `strict` picker refusing min/max/disabled).
 */
export function settleDraft(
  text: string,
  { parse, isAllowed, strict }: DraftRules,
): { kind: "value"; value: string } | { kind: "invalid" | "outOfRange" } {
  if (text.trim() === "") return { kind: "value", value: "" };
  const parsed = parse(text);
  if (parsed === null) return { kind: "invalid" };
  if (!isAllowed(parsed) && strict) return { kind: "outOfRange" };
  return { kind: "value", value: parsed };
}

export function usePickerField({
  value,
  defaultValue,
  onValueChange,
  parse,
  format,
  mask,
  commit,
  isAllowed,
  strict,
  messages,
  onBlur,
}: PickerFieldOptions) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = controlled ? value : inner;
  const [draft, setDraft] = useState(() => format(current));
  const [seen, setSeen] = useState(current);
  const [invalid, setInvalid] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<number | undefined>(undefined);
  /** The value last handed on, until the parent catches up (no double navigation). */
  const handed = useRef<string | null>(null);

  if (seen !== current) {
    setSeen(current);
    if ((parse(draft) ?? "") !== current) {
      setDraft(format(current));
      setInvalid(false);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    handed.current = null;
  }, [current]);

  const emit = (next: string) => {
    window.clearTimeout(timer.current);
    if (next === current || next === handed.current) return;
    handed.current = next;
    if (!controlled) setInner(next);
    onValueChange?.(next);
  };

  /** Applies a draft now (Enter, blur). */
  const settle = (text: string, revert: boolean) => {
    const outcome = settleDraft(text, { parse, isAllowed, strict });
    if (outcome.kind === "value") {
      emit(outcome.value);
      setDraft(format(outcome.value));
      setInvalid(false);
      return;
    }
    window.clearTimeout(timer.current);
    setAnnouncement(outcome.kind === "outOfRange" ? messages.outOfRange : messages.invalid);
    if (revert) setDraft(format(current));
    setInvalid(!revert);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const atEnd = event.target.selectionStart === null || event.target.selectionStart >= raw.length;
    const next = atEnd ? mask(draft, raw) : raw;
    setDraft(next);
    setInvalid(false);
    setAnnouncement("");
    const step = typedDraft(next, { commit, current, parse, isAllowed, strict });
    window.clearTimeout(timer.current);
    if (step.emit !== undefined) emit(step.emit);
    const scheduled = step.schedule;
    if (scheduled !== undefined) {
      timer.current = window.setTimeout(() => emit(scheduled), SETTLE_MS);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    // In a filter Enter only applies the value; in a form it also submits.
    if (commit === "settle") event.preventDefault();
    settle(event.currentTarget.value, commit === "settle");
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    settle(event.currentTarget.value, commit === "settle");
    onBlur?.(event);
  };

  /** A value chosen in the popover: applied at once and announced. */
  const choose = (next: string) => {
    setDraft(format(next));
    setInvalid(false);
    emit(next);
    setAnnouncement(next ? messages.selected(format(next)) : "");
  };

  return {
    current,
    draft,
    invalid,
    announcement,
    choose,
    inputProps: { value: draft, onChange, onKeyDown, onBlur: handleBlur },
  };
}

/** One callback ref feeding several refs (the caller's and the picker's own). */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

/**
 * The outlined box around a picker's text field and its buttons: the same
 * 44px height, 12px radius, 1.5px outline and type as `controlClass`. The
 * focus ring follows the text field only (the buttons draw their own), and an
 * invalid field (`aria-invalid` from the `Field`, or an unreadable draft)
 * turns the outline red; a disabled or disabled-reason field is muted.
 */
export const pickerShellClass =
  "relative flex h-11 w-full min-w-0 items-center rounded-md border-[1.5px] border-line-strong bg-surface-raised text-body text-ink transition-[border-color,box-shadow] duration-150 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-gold-ink has-[[aria-invalid=true]]:border-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60 has-[input[data-disabled]]:cursor-not-allowed has-[input[data-disabled]]:opacity-60";

/** The text field inside the shell. */
export const pickerInputClass =
  "h-full min-w-0 flex-1 rounded-md bg-transparent pl-3.5 text-body text-ink tabular-nums outline-none placeholder:text-ink-muted disabled:cursor-not-allowed data-disabled:cursor-not-allowed";

/** The square icon buttons at the shell's right edge (open, clear). */
export const pickerIconButtonClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink disabled:pointer-events-none data-[state=open]:bg-gold-soft data-[state=open]:text-gold-ink";

/** The floating panel of every picker. */
export const pickerPopoverClass =
  "z-50 max-h-(--radix-popover-content-available-height) max-w-[calc(100vw-16px)] origin-(--radix-popover-content-transform-origin) overflow-auto overscroll-contain rounded-lg border border-line bg-surface-raised p-4 text-ink shadow-lg scroll-slim focus-visible:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";

/** The quiet text buttons of a popover footer ("Bugun", "Tozalash", "Tayyor"). */
export const pickerFooterButtonClass =
  "inline-flex h-9 items-center justify-center rounded-sm px-3 text-label text-ink transition-colors duration-150 hover:bg-gold-soft";

/**
 * Names a picker's icon button after its field ("Kalendarni ochish: Dan"), so a screen reader's
 * list of buttons tells the fields apart. With the picker's `aria-label` (toolbars) the name is
 * known while rendering; otherwise the button starts with the plain action and, once mounted,
 * reads the field's visible name from its `aria-labelledby` elements or the `Field` label
 * (`fieldLabelId(id)`). It is never labelled *by* the field's label element, so
 * `getByLabel(field, { exact: true })` still finds the text box alone.
 */
export function pickerButtonName(options: {
  /** The plain action ("Kalendarni ochish"). */
  action: string;
  /** The action with the field ("Kalendarni ochish: Dan"). */
  named: (field: string) => string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  id?: string;
}): { "aria-label": string; ref?: RefCallback<HTMLButtonElement> } {
  if (options.ariaLabel) return { "aria-label": options.named(options.ariaLabel) };
  const labelIds = options.ariaLabelledby ?? (options.id ? fieldLabelId(options.id) : undefined);
  if (!labelIds) return { "aria-label": options.action };
  return {
    "aria-label": options.action,
    ref: (button) => {
      if (!button) return;
      const field = labelIds
        .split(/\s+/)
        .map((labelId) => button.ownerDocument.getElementById(labelId)?.textContent?.trim())
        .filter(Boolean)
        .join(" ");
      button.setAttribute("aria-label", field ? options.named(field) : options.action);
    },
  };
}

/** The polite live region a picker announces through. */
export function PickerAnnouncer({ message }: { message: string }) {
  return (
    <span aria-live="polite" className="sr-only">
      {message}
    </span>
  );
}
