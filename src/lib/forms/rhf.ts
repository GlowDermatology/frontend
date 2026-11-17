import { useCallback, useEffect, useState, type RefObject } from "react";
import type { FieldErrors, FieldValues } from "react-hook-form";

import { kitCopy } from "@/components/ui/copy";
import { useOptionalToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/i18n/admin-context";

import { findRevealTarget, revealFirstError, type RevealOptions } from "./reveal";

/** One entry of the error summary. */
export interface FormErrorItem {
  /** Field path as React Hook Form names it, e.g. `price` or `variants.0.sku`. */
  name: string;
  /** The field's visible label. */
  label: string;
  message: string;
}

/**
 * Field labels for the summary: exact paths (`variants.0.sku`), wildcard paths for arrays
 * (`variants.*.sku`), or a function. A path without a label falls back to its parent's label
 * (`variants`), then to the path itself.
 */
export type FieldLabels = Readonly<Record<string, string>> | ((name: string) => string | undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** An RHF error leaf (`{ type, message, ref }`) as opposed to a nested object or array. */
function isLeaf(value: Record<string, unknown>): boolean {
  return "type" in value || ("message" in value && typeof value.message === "string");
}

/**
 * Every field error with a message, in the object's order, as `{ name, message }`. Nested
 * objects and field arrays become dotted paths; an array's own error (`items.root`) is reported
 * on the array (`items`); form-level `root`/`form` errors are not field errors and are skipped.
 */
export function flattenFieldErrors(
  errors: FieldErrors<FieldValues> | Record<string, unknown>,
): Array<{ name: string; message: string }> {
  const out: Array<{ name: string; message: string }> = [];
  const walk = (node: unknown, path: string) => {
    if (!isRecord(node)) return;
    if (isLeaf(node)) {
      if (typeof node.message === "string" && node.message)
        out.push({ name: path, message: node.message });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "ref") continue;
      if (key === "root") {
        if (path === "") continue;
        walk(child, path);
        continue;
      }
      if (path === "" && key === "form") continue;
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(errors, "");
  return out;
}

/** The label of a field path (see `FieldLabels`). */
export function labelFor(name: string, labels: FieldLabels | undefined): string {
  const lookup = (path: string): string | undefined =>
    typeof labels === "function" ? labels(path) : labels?.[path];
  const exact = lookup(name);
  if (exact) return exact;
  const wildcard = name.replace(/\.\d+(?=\.|$)/g, ".*");
  if (wildcard !== name) {
    const label = lookup(wildcard);
    if (label) return label;
  }
  const segments = name.split(".");
  for (let end = segments.length - 1; end > 0; end -= 1) {
    const label = lookup(segments.slice(0, end).join("."));
    if (label) return label;
  }
  return name;
}

/** `flattenFieldErrors` + labels: the summary's entries. */
export function summarizeFieldErrors(
  errors: FieldErrors<FieldValues> | Record<string, unknown>,
  labels?: FieldLabels,
): FormErrorItem[] {
  return flattenFieldErrors(errors).map(({ name, message }) => ({
    name,
    message,
    label: labelFor(name, labels),
  }));
}

/** Entries sorted by where their fields sit in `root` (fields not found keep their order, last). */
export function sortByDocumentOrder<I extends { name: string }>(
  items: ReadonlyArray<I>,
  root: HTMLElement | null | undefined,
): I[] {
  if (!root || typeof Node === "undefined") return [...items];
  const located = items.map((item, index) => ({
    item,
    index,
    node: (findRevealTarget(root as never, item.name) ??
      findRevealTarget(root as never, item.name.split(".")[0])) as Node | null,
  }));
  return located
    .sort((a, b) => {
      if (a.node && b.node && a.node !== b.node) {
        return a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      }
      if (a.node && !b.node) return -1;
      if (!a.node && b.node) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * `items` in the order of `reference` (the field order found at submit); entries the reference
 * does not know (a field that became invalid since) follow in their own order.
 */
export function orderLike<I extends { name: string }>(
  items: ReadonlyArray<I>,
  reference: ReadonlyArray<{ name: string }>,
): I[] {
  const rank = new Map(reference.map((entry, index) => [entry.name, index]));
  return items
    .map((item, index) => ({ item, index, rank: rank.get(item.name) ?? reference.length + index }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

export interface RhfRevealOptions {
  /** The `<form>` (or any element around the fields). */
  formRef: RefObject<HTMLElement | null>;
  labels?: FieldLabels;
  /** E.g. switch to the language tab that holds the field (see `RevealOptions`). */
  beforeReveal?: RevealOptions["beforeReveal"];
  /**
   * The live `formState.errors`: the summary then follows the fixes as the user makes them.
   * Without it the summary shows the errors of the last failed submit.
   */
  errors?: FieldErrors<FieldValues>;
  /** Danger toast on a failed submit (default `true`; needs a `ToastProvider`). */
  toast?: boolean;
}

export interface RhfReveal<T extends FieldValues> {
  /** Pass as the second argument: `handleSubmit(onValid, onInvalid)`. */
  onInvalid: (errors: FieldErrors<T>) => void;
  /** The summary's entries in field order; empty until a submit fails, or after `clear()`. */
  summary: FormErrorItem[];
  /** For `FormErrorSummary onSelect`: reveal that field. */
  select: (name: string) => void;
  /** Hide the summary (call on a successful submit or a reset). */
  clear: () => void;
}

/**
 * The failed-submit experience for React Hook Form: on `onInvalid` the errors become a summary
 * (`FormErrorSummary`), a danger toast (announced politely) says how many fields need attention, and the first
 * invalid field in DOM order is scrolled to, focused and marked. Use with
 * `useForm({ shouldFocusError: false })`, so RHF does not focus the first registered field
 * before the reveal does.
 */
export function useRhfReveal<T extends FieldValues = FieldValues>({
  formRef,
  labels,
  beforeReveal,
  errors: liveErrors,
  toast: withToast = true,
}: RhfRevealOptions): RhfReveal<T> {
  const t = useCopy(kitCopy);
  const toast = useOptionalToast();
  const [snapshot, setSnapshot] = useState<FormErrorItem[] | null>(null);
  const [request, setRequest] = useState<{ options: RevealOptions; fallback?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!request) return;
    const root = formRef.current;
    void revealFirstError(root, request.options).then((element) => {
      if (!element && request.fallback) {
        void revealFirstError(root, { ...request.options, name: request.fallback });
      }
    });
  }, [request, formRef]);

  const onInvalid = useCallback(
    (errors: FieldErrors<T>) => {
      const items = sortByDocumentOrder(summarizeFieldErrors(errors, labels), formRef.current);
      setSnapshot(items);
      if (withToast && toast && items.length > 0) {
        toast({
          tone: "danger",
          title: t.formErrors.toastTitle,
          description: t.formErrors.toastDescription(items.length),
          // The summary (`role="alert"`) interrupts already and the focus moves to the field:
          // the toast is announced politely so the three do not compete.
          polite: true,
        });
      }
      setRequest({ options: { beforeReveal }, fallback: items[0]?.name });
    },
    [labels, formRef, withToast, toast, t, beforeReveal],
  );

  const select = useCallback(
    (name: string) => setRequest({ options: { name, beforeReveal } }),
    [beforeReveal],
  );
  const clear = useCallback(() => setSnapshot(null), []);

  const summary =
    snapshot === null
      ? []
      : liveErrors
        ? orderLike(summarizeFieldErrors(liveErrors, labels), snapshot)
        : snapshot;

  return { onInvalid, summary, select, clear };
}
