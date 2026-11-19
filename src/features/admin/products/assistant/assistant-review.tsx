"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { AssistantJobNotes, AssistantSuggestion } from "@/domain/assistant";
import type { ContentLanguage } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { LANGUAGE_TAB_LABEL } from "../language-tabs";
import { assistantCopy } from "./copy";
import {
  groupByLanguage,
  hasSelectedProblem,
  isSelected,
  rowProblem,
  type IsBlocked,
  type ReviewState,
} from "./review";

interface AssistantReviewProps {
  suggestions: ReadonlyArray<AssistantSuggestion>;
  notes: AssistantJobNotes;
  state: ReviewState;
  onChange: (key: string, row: { checked: boolean; value: string }) => void;
  isBlocked: IsBlocked;
  /** The row's label in the admin language («Qisqa tavsif · Ruscha»). */
  labelOf: (key: string) => string;
  /** Messages the last apply got back per key (`items.<i>.value`). */
  errors: Record<string, string>;
  onApply: () => void;
  onDiscard: () => void;
  applying: boolean;
  discarding: boolean;
}

/**
 * The review: only the suggested keys, grouped by language; per row the current value (muted),
 * the editable suggestion with its counter, the checkbox and the warning badges. Nothing is
 * written until «Tanlanganlarni qo‘llash».
 */
export function AssistantReview({
  suggestions,
  notes,
  state,
  onChange,
  isBlocked,
  labelOf,
  errors,
  onApply,
  onDiscard,
  applying,
  discarding,
}: AssistantReviewProps) {
  const t = useCopy(assistantCopy);
  const fmt = useFormat();
  const idBase = useId();
  const groups = groupByLanguage(suggestions);
  const [picked, setPicked] = useState<ContentLanguage | null>(null);
  const language =
    groups.find((group) => group.language === picked)?.language ?? groups[0]?.language ?? "uz";
  const shown = groups.find((group) => group.language === language)?.suggestions ?? [];
  const selected = suggestions.filter((s) => isSelected(state, s.key, isBlocked)).length;
  const problem = hasSelectedProblem(suggestions, state, isBlocked);
  // One toggle for the language shown: tick every row it can apply, or clear them all.
  const selectable = shown.filter((s) => !isBlocked(s.key));
  const allShownChecked =
    selectable.length > 0 && selectable.every((s) => isSelected(state, s.key, isBlocked));
  const toggleShown = () => {
    for (const s of selectable) {
      const row = state[s.key] ?? { checked: false, value: s.suggested };
      if (row.checked !== !allShownChecked) onChange(s.key, { ...row, checked: !allShownChecked });
    }
  };
  const extracted = notes.extracted
    ? [notes.extracted.brand, notes.extracted.volume].filter(Boolean).join(" · ")
    : "";

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-body-sm text-ink">{t.review.noSuggestions}</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onDiscard} busy={discarding}>
            {t.close}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-assistant-review="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body-sm font-semibold text-ink">
            {t.review.count(suggestions.length)}
          </span>
          {selectable.length > 1 && (
            <Button variant="ghost" size="sm" onClick={toggleShown}>
              {allShownChecked ? t.review.selectNone : t.review.selectAll}
            </Button>
          )}
        </div>
        {groups.length > 1 && (
          <SegmentedControl
            label={t.review.languagesLabel}
            size="sm"
            value={language}
            onChange={setPicked}
            options={groups.map((group) => ({
              value: group.language,
              // Phones show the language code, so three languages fit on one line.
              label: (
                <>
                  <span className="max-sm:hidden">{LANGUAGE_TAB_LABEL[group.language]}</span>
                  <span className="sm:hidden">{group.language.toUpperCase()}</span>
                  {`· ${group.suggestions.length}`}
                </>
              ),
            }))}
          />
        )}
      </div>
      {(notes.rejected > 0 || extracted) && (
        <div className="flex flex-col gap-1 text-caption font-normal text-ink-muted">
          {notes.rejected > 0 && <p className="m-0">{t.review.rejected(notes.rejected)}</p>}
          {extracted && <p className="m-0">{t.review.extracted(extracted)}</p>}
        </div>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0" lang={language}>
        {shown.map((suggestion) => {
          const row = state[suggestion.key] ?? { checked: false, value: suggestion.suggested };
          const blocked = isBlocked(suggestion.key);
          const checked = row.checked && !blocked;
          const rowError = errors[suggestion.key];
          const issue = checked ? rowProblem(row, suggestion) : null;
          const message =
            rowError ??
            (issue === "blank"
              ? t.review.blank
              : issue === "too_long"
                ? t.review.tooLong(fmt.number(suggestion.maxLength))
                : undefined);
          const label = labelOf(suggestion.key);
          const id = `${idBase}-${suggestion.key}`;
          return (
            <li
              key={suggestion.key}
              data-key={suggestion.key}
              className={cn(
                "flex flex-col gap-3 rounded-md border p-3.5 transition-colors duration-150",
                checked ? "border-gold/60 bg-surface" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <input
                  id={`${id}-check`}
                  type="checkbox"
                  checked={checked}
                  aria-disabled={blocked || undefined}
                  aria-describedby={blocked ? `${id}-blocked` : undefined}
                  aria-label={t.review.accept(label)}
                  onChange={(event) => {
                    if (blocked) return;
                    onChange(suggestion.key, { ...row, checked: event.target.checked });
                  }}
                  className="mt-0.5 size-4 shrink-0 accent-gold-ink"
                />
                <label
                  htmlFor={`${id}-check`}
                  className="min-w-0 flex-[1_1_10rem] text-body-sm font-semibold break-words text-ink"
                >
                  {label}
                </label>
                {suggestion.warnings.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {suggestion.warnings.map((warning) => (
                      <Badge key={warning} tone="warning">
                        {t.warnings[warning]}
                      </Badge>
                    ))}
                  </span>
                )}
              </div>
              {blocked && (
                <p
                  id={`${id}-blocked`}
                  className="m-0 rounded-sm bg-warning-soft px-3 py-2 text-caption font-normal text-ink"
                >
                  {t.review.dirty}
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-caption font-semibold text-ink-muted">
                    {t.review.current}
                  </span>
                  <p
                    id={`${id}-current`}
                    className="m-0 rounded-md border border-dashed border-line-strong px-3 py-2 text-body-sm break-words whitespace-pre-wrap text-ink-muted"
                  >
                    {suggestion.current || <em>{t.review.empty}</em>}
                  </p>
                </div>
                <Field
                  label={<span className="text-caption font-semibold">{t.review.suggested}</span>}
                  error={message}
                  aside={
                    <span
                      className={cn(
                        "text-caption font-normal text-ink-muted tabular-nums",
                        row.value.length > suggestion.maxLength && "text-danger-strong",
                      )}
                    >
                      {t.review.counter(
                        fmt.number(row.value.length),
                        fmt.number(suggestion.maxLength),
                      )}
                    </span>
                  }
                >
                  {(c) => (
                    <TextArea
                      {...c}
                      // Every row has a «Taklif» label: name the field it belongs to, and link the current value.
                      aria-label={`${t.review.suggested}: ${label}`}
                      aria-describedby={
                        [c["aria-describedby"], `${id}-current`].filter(Boolean).join(" ") ||
                        undefined
                      }
                      value={row.value}
                      rows={suggestion.maxLength > 300 ? 5 : suggestion.maxLength === 300 ? 3 : 2}
                      onChange={(event) =>
                        onChange(suggestion.key, {
                          value: event.target.value,
                          checked: blocked ? row.checked : true,
                        })
                      }
                    />
                  )}
                </Field>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap justify-end gap-2 border-t border-line bg-surface-raised px-6 py-4 max-sm:[&>*]:flex-1">
        <Button variant="outline" onClick={onDiscard} busy={discarding}>
          {t.review.discard}
        </Button>
        <Button
          onClick={onApply}
          busy={applying}
          disabledReason={
            selected === 0 ? t.review.needChecked : problem ? t.review.fixFirst : undefined
          }
        >
          {applying ? t.review.applying : t.review.apply(selected)}
        </Button>
      </div>
    </div>
  );
}
