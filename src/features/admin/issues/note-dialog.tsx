"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ActionResult } from "@/data/types";
import { ISSUE_NOTE_MAX } from "@/domain/delivery-issue";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { useIdempotencyKey } from "../shared/idempotency";
import { issuesCopy } from "./copy";
import { issueRefusal, noteError } from "./refusals";

interface NoteDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  label: string;
  placeholder?: string;
  submitLabel: string;
  pendingLabel: string;
  /** Extra controls under the note (the incident's "Shoshilinch" checkbox). */
  children?: ReactNode;
  /** Runs the action with the dialog's key (the caller wraps it in `runAction`). */
  submit: (note: string, key: string) => Promise<ActionResult<T>>;
  onDone: (data: T) => void;
  /** 404 / 409: the row changed; the caller toasts, closes and re-reads. */
  onStale: (message: string) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * A dialog with one required note (3..1000 characters, the backend's rule):
 * resolving an issue and reporting a staff incident. One idempotency key per
 * dialog instance, reused on retries and re-opens, renewed after a success;
 * a ref guards the submit, so a double click or Enter repeat posts once.
 */
export function NoteDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  submitLabel,
  pendingLabel,
  children,
  submit,
  onDone,
  onStale,
  onCloseAutoFocus,
}: NoteDialogProps<T>) {
  const locale = useAdminLocale();
  const t = useCopy(issuesCopy);
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();

  const reset = () => {
    setNote("");
    setFieldError(null);
    setFormError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    const local = noteError(note, locale);
    if (local) {
      setFieldError(local);
      reveal();
      return;
    }
    busy.current = true;
    setPending(true);
    setFieldError(null);
    setFormError(null);
    const result = idempotency.settle(await submit(note.trim(), idempotency.key));
    busy.current = false;
    setPending(false);
    if (result.ok) {
      reset();
      onDone(result.data);
      return;
    }
    const refusal = issueRefusal(result, ["note"]);
    if (refusal.kind === "field") {
      setFieldError(refusal.message);
      reveal();
    } else if (refusal.kind === "stale") {
      reset();
      onStale(refusal.message);
    } else {
      setFormError(refusal.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      title={title}
      description={description}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div data-field="note">
          <Field
            label={label}
            error={fieldError ?? undefined}
            aside={
              <span
                className={
                  note.trim().length > ISSUE_NOTE_MAX
                    ? "text-caption font-bold text-danger tabular-nums"
                    : "text-caption text-ink-muted tabular-nums"
                }
              >
                {note.trim().length}/{ISSUE_NOTE_MAX}
              </span>
            }
          >
            {(control) => (
              <TextArea
                {...control}
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                maxLength={ISSUE_NOTE_MAX + 50}
                required
                aria-required="true"
                placeholder={placeholder}
                className="text-[14px] leading-5"
              />
            )}
          </Field>
        </div>
        {children}
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabledReason={pending && t.busyReason}>
              {t.back}
            </Button>
          </DialogClose>
          <Button type="submit" busy={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
