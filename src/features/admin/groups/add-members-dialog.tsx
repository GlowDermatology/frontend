"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { segmentCopy } from "@/domain/copy/segments";
import type { CustomerLookupItem } from "@/domain/customer-lookup";
import { SEGMENT_MEMBERS_MAX, type Segment } from "@/domain/segment";
import { addSegmentMembers } from "@/data/segments.actions";
import { cn } from "@/lib/cn";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import type { IdempotencyKey } from "../shared/idempotency";
import {
  BULK_FIELD,
  bulkLines,
  bulkProblems,
  entryCount,
  initials,
  memberEntries,
  memberErrorSummary,
  NO_MEMBER_ERRORS,
  pickField,
  placeMemberErrors,
  togglePick,
  type MemberErrors,
} from "./add-members";
import { groupsCopy } from "./copy";
import { CustomerSearch } from "./customer-search";

/**
 * Add customers to a group (DESIGN §C, contract §2.8 `POST segments/{id}/members/`). Primary:
 * the async customer search, whose picks collect in a list (already-members cannot be picked).
 * Secondary, collapsed: a pasted list of customer ids or phones (one per line or comma
 * separated, read with the domain's member parser). Picks go first, pasted lines after; an
 * error on any of them lands on that pick or line, with a summary and the first error revealed.
 */
export function AddMembersDialog({
  segment,
  idempotencyKey,
  onClose,
  onAdded,
}: {
  segment: Segment;
  idempotencyKey: IdempotencyKey;
  onClose: () => void;
  onAdded: (segment: Segment) => void;
}) {
  const t = useCopy(groupsCopy);
  const a = t.add;
  const locale = useAdminLocale();
  const actionsCopy = segmentCopy[locale].actions;
  const fmt = useFormat();
  const toast = useToast();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const [picks, setPicks] = useState<CustomerLookupItem[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [errors, setErrors] = useState<MemberErrors>(NO_MEMBER_ERRORS);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const lines = bulkLines(bulkText);
  const { count, over } = entryCount(picks, lines);
  const summary = memberErrorSummary(errors, picks, a);
  const formErrorId = `${id}-form-error`;
  const bulkId = `${id}-bulk`;
  const bulkHintId = `${id}-bulk-hint`;
  const bulkErrorId = `${id}-bulk-error`;

  const clearPickError = (pickId: string) =>
    setErrors((current) => {
      if (!current.picks[pickId] && !current.form) return current;
      const rest = { ...current.picks };
      delete rest[pickId];
      return { ...current, picks: rest, form: null };
    });

  const close = () => {
    if (!busy) onClose();
  };

  const fail = (next: MemberErrors) => {
    setErrors(next);
    if (next.bulk.length > 0) setBulkOpen(true);
    reveal();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || count === 0) return;
    if (over) {
      return fail({
        ...NO_MEMBER_ERRORS,
        form: a.tooMany(fmt.number(count), fmt.number(SEGMENT_MEMBERS_MAX)),
      });
    }
    const problems = bulkProblems(lines, actionsCopy);
    if (problems.length > 0) return fail({ ...NO_MEMBER_ERRORS, bulk: problems });

    inFlight.current = true;
    setBusy(true);
    setErrors(NO_MEMBER_ERRORS);
    const sent = { picks, lines };
    const entries = memberEntries(sent.picks, sent.lines);
    const result = idempotencyKey.settle(
      await runAction((csrf) => addSegmentMembers(segment.id, entries, idempotencyKey.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const placed = placeMemberErrors(result.fieldErrors ?? {}, sent.picks, sent.lines);
      const rest = partitionFieldErrors(result, placed.placed).formError;
      const form = [placed.members, rest].filter(Boolean).join(" ") || null;
      fail({ picks: placed.picks, bulk: placed.bulk, form });
      toast({ tone: "danger", title: a.failed, description: form ?? result.error });
      return;
    }
    onAdded(result.data);
    onClose();
  };

  const bulkInvalid = errors.bulk.length > 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={a.title(segment.name)}
      description={a.description}
      className="max-w-[600px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormErrorSummary
          errors={summary}
          onSelect={(name) => {
            if (name === BULK_FIELD) setBulkOpen(true);
            window.requestAnimationFrame(() => void revealFirstError(formRef.current, { name }));
          }}
        />

        <CustomerSearch
          segmentId={segment.id}
          picks={picks}
          onToggle={(item) => {
            setPicks((current) => togglePick(current, item));
            clearPickError(item.id);
          }}
          errorId={errors.form ? formErrorId : undefined}
        />
        {errors.form && (
          <p
            id={formErrorId}
            role="alert"
            className="-mt-3 mb-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {errors.form}
          </p>
        )}

        <section aria-labelledby={`${id}-picks`} className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${id}-picks`} className="m-0 text-label font-bold text-ink">
              {a.pickedTitle}
            </h3>
            {picks.length > 0 && (
              <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-bold text-gold-ink tabular-nums">
                {a.pickedCount(picks.length)}
              </span>
            )}
          </div>
          {picks.length === 0 ? (
            <p className="m-0 flex items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-line-strong px-4 py-3.5 text-body-sm text-ink-muted">
              <Icon name="users" size={18} className="shrink-0 text-gold-ink" />
              {a.pickedEmpty}
            </p>
          ) : (
            <ul className="scroll-slim m-0 grid max-h-[232px] list-none grid-cols-1 gap-2 overflow-y-auto p-0.5 sm:grid-cols-2">
              {picks.map((pick) => {
                const message = errors.picks[pick.id];
                const name = pick.name || a.deletedCustomer;
                const errorId = `${id}-pick-${pick.id}-error`;
                return (
                  <li
                    key={pick.id}
                    data-field={pickField(pick.id)}
                    data-invalid={message ? "true" : undefined}
                    tabIndex={message ? -1 : undefined}
                    aria-describedby={message ? errorId : undefined}
                    className={cn(
                      "shadow-xs flex animate-fade-in flex-col gap-1 rounded-md border bg-surface-raised px-3 py-2.5 motion-reduce:animate-none",
                      message ? "border-danger" : "border-line",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[12px] font-bold text-gold-ink"
                      >
                        {initials(name) || <Icon name="user" size={14} />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[14px] leading-5 font-semibold text-ink">
                          {name}
                        </span>
                        <span className="truncate text-[12px] leading-4 text-ink-muted tabular-nums">
                          {pick.phone ? fmt.phone(pick.phone) : (pick.email ?? `#${pick.id}`)}
                        </span>
                      </span>
                      <IconButton
                        size="sm"
                        aria-label={a.unpick(name)}
                        className="size-8 hover:bg-danger-soft hover:text-danger"
                        onClick={() => {
                          setPicks((current) => current.filter((p) => p.id !== pick.id));
                          clearPickError(pick.id);
                        }}
                      >
                        <Icon name="close" size={16} />
                      </IconButton>
                    </span>
                    {message && (
                      <span
                        id={errorId}
                        className="flex items-start gap-1.5 text-[12px] leading-4 font-semibold text-ink"
                      >
                        <Icon name="alert-circle" size={14} className="shrink-0 text-danger" />
                        {message}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-2.5 rounded-md bg-surface px-3.5 py-3">
          <button
            type="button"
            aria-expanded={bulkOpen}
            aria-controls={bulkId}
            onClick={() => setBulkOpen((value) => !value)}
            className="-mx-1.5 flex items-center justify-between gap-3 rounded-sm px-1.5 py-1 text-left text-label font-bold text-ink transition-colors duration-150 hover:text-gold-ink motion-reduce:transition-none"
          >
            <span className="flex items-center gap-2">
              <Icon name="sliders" size={18} className="shrink-0 text-gold-ink" />
              {a.bulkToggle}
            </span>
            <span className="flex items-center gap-2">
              {!bulkOpen && lines.length > 0 && (
                <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[12px] text-gold-ink tabular-nums">
                  {lines.length}
                </span>
              )}
              <Icon
                name="chevron-down"
                size={18}
                className={cn(
                  "shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                  bulkOpen && "rotate-180",
                )}
              />
            </span>
          </button>
          <div id={bulkId} hidden={!bulkOpen} className="flex flex-col gap-2">
            <label htmlFor={`${bulkId}-input`} className="sr-only">
              {a.bulkLabel}
            </label>
            <TextArea
              id={`${bulkId}-input`}
              name={BULK_FIELD}
              rows={5}
              value={bulkText}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={bulkInvalid ? true : undefined}
              aria-describedby={cn(bulkInvalid && bulkErrorId, bulkHintId)}
              onChange={(event) => {
                setBulkText(event.target.value);
                if (errors.bulk.length > 0 || errors.form) {
                  setErrors((current) => ({ ...current, bulk: [], form: null }));
                }
              }}
              className="font-mono text-[14px] leading-6"
            />
            <p id={bulkHintId} className="m-0 text-caption font-normal text-ink-muted">
              {a.bulkHint(fmt.number(SEGMENT_MEMBERS_MAX))}
              {lines.length > 0 && (
                <span className="font-semibold text-ink"> · {a.bulkRead(lines.length)}</span>
              )}
            </p>
            {bulkInvalid && (
              <ul
                id={bulkErrorId}
                className="m-0 flex list-none flex-col gap-1 rounded-md border border-danger/35 bg-danger-soft p-3"
              >
                {errors.bulk.map((problem) => (
                  <li key={problem.line} className="flex items-start gap-1.5 text-body-sm text-ink">
                    <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
                    <span>
                      <span className="font-semibold">
                        {a.bulkLine(problem.line, problem.entry)}
                      </span>
                      {" — "}
                      {problem.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={close} disabledReason={busy && t.busyReason}>
            {t.cancel}
          </Button>
          <Button type="submit" busy={busy} disabledReason={count === 0 && a.nothingReason}>
            <Icon name="plus" size={18} />
            {busy ? a.submitting : count > 0 ? a.submitCount(count) : a.submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
