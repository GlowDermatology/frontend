"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { Button } from "./button";
import { kitCopy } from "./copy";
import { AlertDialog, AlertDialogCancel } from "./dialog";
import { Icon } from "./icon";

export interface FormErrorSummaryItem {
  /** Field name (`data-field` / `name`), passed to `onSelect`. */
  name: string;
  label: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: ReadonlyArray<FormErrorSummaryItem>;
  /** Reveal the field, e.g. `useRhfReveal().select` or `(name) => revealFirstError(form, { name })`. */
  onSelect: (name: string) => void;
  /** Replaces the default heading («N ta maydonni tekshiring»). */
  title?: string;
  className?: string;
}

/**
 * The list of what blocks a save, at the top (or next to the actions) of a long form: a
 * `role="alert"` box announced when it appears, with one link per field that scrolls to,
 * focuses and marks the field. Renders nothing without errors.
 */
export function FormErrorSummary({ errors, onSelect, title, className }: FormErrorSummaryProps) {
  const t = useCopy(kitCopy);
  const titleId = useId();
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "flex animate-fade-in gap-3 rounded-md border border-danger/35 bg-danger-soft px-4 py-3.5 text-ink",
        className,
      )}
    >
      <Icon name="alert-circle" size={20} className="mt-px shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p id={titleId} className="m-0 text-[14px] leading-5 font-bold">
          {title ?? t.formErrors.summaryTitle(errors.length)}
        </p>
        <p className="m-0 text-body-sm text-ink-muted">{t.formErrors.summaryLead}</p>
        <ul className="m-0 mt-0.5 flex list-none flex-col gap-1 p-0">
          {errors.map((error) => (
            <li key={error.name} className="text-body-sm">
              <a
                href={`#${error.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(error.name);
                }}
                className="rounded-sm text-ink underline decoration-danger/50 underline-offset-4 transition-colors duration-150 hover:decoration-danger"
              >
                <span className="font-bold">{error.label}</span>
                <span className="text-ink-muted"> — {error.message}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export interface RecommendedField {
  /** Field name (`data-field` / `name`) to reveal on «To‘ldirish». */
  name: string;
  label: string;
}

export type RecommendedChoice = "save" | "fix";

interface RecommendedFieldsDialogProps {
  open: boolean;
  missing: ReadonlyArray<RecommendedField>;
  /** The form's own lead, when the generic one («…ma’lumot to‘liqroq bo‘ladi») does not fit. */
  description?: string;
  /** `save` = save as is; `fix` = go back and fill the fields (also on Escape). */
  onChoose: (choice: RecommendedChoice) => void;
}

/**
 * "Save anyway?" for optional fields that matter (an English name, an SEO description): lists
 * what is empty; focus starts on «To‘ldirish», the safe choice. Usually driven by
 * `useRecommendedConfirm()` from `src/lib/forms/recommended.ts`.
 */
export function RecommendedFieldsDialog({
  open,
  missing,
  description,
  onChoose,
}: RecommendedFieldsDialogProps) {
  const t = useCopy(kitCopy);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onChoose("fix");
      }}
      title={t.recommended.title}
      description={
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] leading-5 text-ink-muted">
            {description ?? t.recommended.description}
          </p>
          <ul className="m-0 flex flex-col gap-1.5 rounded-md bg-surface px-4 py-3 text-[14px] leading-5 font-semibold text-ink">
            {missing.map((field) => (
              <li key={field.name} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />
                {field.label}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <div className="mt-1 flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" onClick={() => onChoose("save")}>
          {t.recommended.save}
        </Button>
        {/* The cancel slot: focus starts here, and closing the dialog means "fix". */}
        <AlertDialogCancel asChild>
          <Button variant="primary">{t.recommended.fix}</Button>
        </AlertDialogCancel>
      </div>
    </AlertDialog>
  );
}
