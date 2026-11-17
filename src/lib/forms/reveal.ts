import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Bringing an invalid field to the user after a failed submit: scroll it to the middle of the
 * view, focus it, and mark it with `data-shake` for 1.6 s (globals.css: a danger ring with a halo
 * plus a short shake; under reduced motion only the ring). Works for both form patterns: React
 * Hook Form (`useRhfReveal` in ./rhf) and forms that keep errors in local state.
 *
 * What counts as invalid: `[aria-invalid="true"]` (every kit control wires it from `Field`) or
 * `[data-invalid]` (non-inputs, e.g. the product image card: `data-field="images" data-invalid
 * tabIndex={-1}`). A field is found by name through `[data-field="…"]`, else a visible
 * `[name="…"]`. Mark a wrapper `data-reveal-box` when the visible box is not the focused element
 * (an input inside an affix frame).
 */

export const INVALID_SELECTOR = '[aria-invalid="true"], [data-invalid]:not([data-invalid="false"])';

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

/** How long the ring stays (the shake itself takes 0.42 s). */
export const SHAKE_MS = 1600;

/** The subset of `Element` the reveal needs (keeps the logic testable without a DOM). */
export interface RevealElement {
  querySelector(selector: string): RevealElement | null;
  matches(selector: string): boolean;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  closest(selector: string): RevealElement | null;
  focus(options?: FocusOptions): void;
  scrollIntoView(options?: ScrollIntoViewOptions): void;
  readonly isConnected: boolean;
}

export interface RevealOptions {
  /** Reveal this field (`data-field` / `name`) instead of the first invalid one in DOM order. */
  name?: string;
  /**
   * Runs with the target before it is scrolled to and focused, e.g. to switch to the language
   * tab that holds it (`target.closest("[data-lang]")`). May return a promise; the reveal then
   * waits for it and one frame, so React can commit the switch.
   */
  beforeReveal?: (target: HTMLElement) => void | Promise<void>;
  /** Ring + shake (default `true`); `false` only scrolls and focuses. */
  shake?: boolean;
}

/** A selector-safe attribute value. */
export function attributeValue(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

/** The field to reveal inside `root`: by name, else the first invalid element in DOM order. */
export function findRevealTarget<E extends RevealElement>(root: E, name?: string): E | null {
  if (name !== undefined) {
    const value = attributeValue(name);
    return (root.querySelector(`[data-field=${value}]`) ??
      root.querySelector(`[name=${value}]:not([type="hidden"])`)) as E | null;
  }
  return root.querySelector(INVALID_SELECTOR) as E | null;
}

/**
 * The element that receives focus for a target: the target when it is focusable (or has a
 * `tabindex`, like the image card), else its first invalid control, else its first focusable
 * descendant, else the target itself.
 */
export function focusElementFor<E extends RevealElement>(target: E): E {
  if (target.matches(FOCUSABLE_SELECTOR) || target.hasAttribute("tabindex")) return target;
  const invalid = target.querySelector(INVALID_SELECTOR);
  if (invalid && (invalid.matches(FOCUSABLE_SELECTOR) || invalid.hasAttribute("tabindex"))) {
    return invalid as E;
  }
  return (target.querySelector(FOCUSABLE_SELECTOR) as E | null) ?? target;
}

const shakeTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

/** Marks `element` with `data-shake` for `SHAKE_MS`, restarting the animation if it runs. */
export function shake(element: RevealElement): void {
  const previous = shakeTimers.get(element);
  if (previous !== undefined) clearTimeout(previous);
  element.removeAttribute("data-shake");
  /* Reading layout restarts the CSS animation when the attribute is set again. */
  void (element as unknown as { offsetWidth?: number }).offsetWidth;
  element.setAttribute("data-shake", "");
  shakeTimers.set(
    element,
    setTimeout(() => {
      element.removeAttribute("data-shake");
      shakeTimers.delete(element);
    }, SHAKE_MS),
  );
}

/** Whether the system asks for reduced motion (`prefers-reduced-motion: reduce`). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The `behavior` for a script-driven `scrollIntoView` / `scrollTo`: `smooth`, or `auto` under
 * reduced motion (a JS `behavior` wins over the CSS `scroll-behavior: auto` of globals.css).
 */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 16);
    }
  });
}

/**
 * Scrolls to, focuses and marks the first invalid field in `root` (or the field `name`).
 * Resolves with the focused element, or `null` when there is nothing to reveal. Without
 * `beforeReveal` everything happens synchronously, before the promise resolves.
 */
export async function revealFirstError(
  root: HTMLElement | RevealElement | null | undefined,
  options: RevealOptions = {},
): Promise<HTMLElement | null> {
  if (!root) return null;
  const scope = root as RevealElement;
  let target = findRevealTarget(scope, options.name);
  if (!target) return null;
  if (options.beforeReveal) {
    await options.beforeReveal(target as unknown as HTMLElement);
    await nextFrame();
    /* The switch may have re-rendered the field. */
    if (!target.isConnected) target = findRevealTarget(scope, options.name);
    if (!target) return null;
  }
  const focusElement = focusElementFor(target);
  const box = focusElement.closest("[data-reveal-box]") ?? focusElement;
  box.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: scrollBehavior(),
  });
  focusElement.focus({ preventScroll: true });
  if (options.shake !== false) shake(box);
  return focusElement as unknown as HTMLElement;
}

/**
 * `reveal(options?)` for forms that set their errors in state: call it in the submit handler
 * right after setting the errors; the reveal runs once React has committed them (so the fields
 * already carry `aria-invalid`).
 */
export function useErrorReveal(
  formRef: RefObject<HTMLElement | null>,
  options?: RevealOptions,
): (override?: RevealOptions) => void {
  const [request, setRequest] = useState<{ options: RevealOptions } | null>(null);
  useEffect(() => {
    if (request) void revealFirstError(formRef.current, request.options);
  }, [request, formRef]);
  return useCallback(
    (override?: RevealOptions) => setRequest({ options: { ...options, ...override } }),
    [options],
  );
}

/**
 * The previous API (the former `features/admin/shared/focus-invalid.ts`), now with scroll and ring:
 * `focusFirstInvalid(form)` after setting the errors in the same update.
 */
export function useFocusFirstInvalid(): (form: HTMLElement | null | undefined) => void {
  const [request, setRequest] = useState<{ form: HTMLElement } | null>(null);
  useEffect(() => {
    if (request) void revealFirstError(request.form);
  }, [request]);
  return useCallback((form: HTMLElement | null | undefined) => {
    if (form) setRequest({ form });
  }, []);
}
