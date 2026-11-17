"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AffixInput, Field, TextInput } from "@/components/ui/field";
import { FormErrorSummary } from "@/components/ui/form-errors";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createSegment, updateSegment } from "@/data/segments.actions";
import { EMPTY_SEGMENT, segmentFormSchemas, type SegmentFormValues } from "@/data/segments.schema";
import { SEGMENT_NAME_MAX, segmentRulesSummary, type Segment } from "@/domain/segment";
import { parseAmount } from "@/lib/format";
import { revealFirstError, useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat, useLocalized } from "@/lib/i18n/admin-hooks";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import type { IdempotencyKey } from "../shared/idempotency";
import { groupsCopy, type GroupsCopy } from "./copy";

/** Fields with an error slot; `rules` is the rules box as a whole. */
export const SEGMENT_FIELDS = ["name", "rules", "rules.minOnlineOrders", "rules.minLifetimeAmount"];

interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a group. */
  segment: Segment | null;
  /** Owned by the list so it survives re-opens until a success (contract §1.7). */
  idempotency: IdempotencyKey;
  onSaved: (segment: Segment, mode: "create" | "edit") => void;
}

export function segmentValues(segment: Segment | null): SegmentFormValues {
  if (!segment) return structuredClone(EMPTY_SEGMENT);
  return { name: segment.name, rules: { ...segment.rules } };
}

/** The error summary rows of the dialog, in its order (pure, for tests). */
export function segmentErrorSummary(
  errors: Readonly<Record<string, string>>,
  t: GroupsCopy["dialog"],
): Array<{ name: string; label: string; message: string }> {
  const labels: Record<string, string> = {
    name: t.name,
    rules: t.rules,
    "rules.minOnlineOrders": t.orders,
    "rules.minLifetimeAmount": t.amount,
  };
  return SEGMENT_FIELDS.flatMap((name) =>
    errors[name] ? [{ name, label: labels[name]!, message: errors[name]! }] : [],
  );
}

interface RuleDraft {
  on: boolean;
  text: string;
}

/**
 * Create / edit dialog of a customer group (contract §2.8): the name (2..60, unique) and two
 * optional rules, each with an on/off switch (off = `null`; set rules are ANDed). An update
 * sends only what changed against the group the dialog opened with. Errors show next to their
 * field and in a summary; the first one is revealed (scrolled to, focused, marked).
 */
export function SegmentDialog({
  open,
  onOpenChange,
  segment,
  idempotency,
  onSaved,
}: SegmentDialogProps) {
  const copy = useCopy(groupsCopy);
  const t = copy.dialog;
  const locale = useAdminLocale();
  const fmt = useFormat();
  const schema = useLocalized(segmentFormSchemas);
  const toast = useToast();
  const baseline = segmentValues(segment);
  const ruleDraft = (value: number | null): RuleDraft => ({
    on: value !== null,
    text: value === null ? "" : fmt.number(value),
  });
  const [name, setName] = useState(baseline.name);
  const [orders, setOrders] = useState(() => ruleDraft(baseline.rules.minOnlineOrders));
  const [amount, setAmount] = useState(() => ruleDraft(baseline.rules.minLifetimeAmount));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);

  const numberOf = (draft: RuleDraft): number | null =>
    draft.on ? (parseAmount(draft.text) ?? Number.NaN) : null;
  const values: SegmentFormValues = {
    name,
    rules: { minOnlineOrders: numberOf(orders), minLifetimeAmount: numberOf(amount) },
  };
  const preview =
    Number.isNaN(values.rules.minOnlineOrders) || Number.isNaN(values.rules.minLifetimeAmount)
      ? null
      : segmentRulesSummary(values.rules, locale);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = schema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      // A server message from the previous attempt no longer applies.
      setFormError(null);
      reveal();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) =>
        segment
          ? updateSegment(segment.id, local.data, baseline, idempotency.key, csrf)
          : createSegment(local.data, idempotency.key, csrf),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const { fieldErrors, formError: message } = partitionFieldErrors(result, SEGMENT_FIELDS);
      setErrors(fieldErrors);
      setFormError(message);
      toast({ tone: "danger", title: t.saveFailed, description: message ?? result.error });
      reveal();
      return;
    }
    onSaved(result.data, segment ? "edit" : "create");
    onOpenChange(false);
  };

  const ruleRow = (
    key: "minOnlineOrders" | "minLifetimeAmount",
    draft: RuleDraft,
    setDraft: (draft: RuleDraft) => void,
  ) => {
    const isOrders = key === "minOnlineOrders";
    const label = isOrders ? t.orders : t.amount;
    return (
      <div className="flex flex-col gap-2 rounded-md bg-surface px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-label text-ink">{label}</span>
            <span className="text-caption font-normal text-ink-muted">
              {isOrders ? t.ordersHint : t.amountHint}
            </span>
          </span>
          <Switch
            checked={draft.on}
            onCheckedChange={(on) => setDraft({ ...draft, on })}
            aria-label={t.ruleSwitch(label)}
          />
        </div>
        {draft.on && (
          <Field label={<span className="sr-only">{label}</span>} error={errors[`rules.${key}`]}>
            {(c) => (
              <AffixInput
                {...c}
                name={`rules.${key}`}
                suffix={isOrders ? t.ordersSuffix : t.amountSuffix}
                inputMode="numeric"
                autoComplete="off"
                value={draft.text}
                onChange={(event) => {
                  const parsed = parseAmount(event.target.value);
                  setDraft({ ...draft, text: parsed === null ? "" : fmt.number(parsed) });
                }}
              />
            )}
          </Field>
        )}
      </div>
    );
  };

  const summary = segmentErrorSummary(errors, t);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title={segment ? t.editTitle : t.createTitle}
      description={t.description}
      className="max-w-[520px]"
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {summary.length > 1 && (
          <FormErrorSummary
            errors={summary}
            onSelect={(field) => void revealFirstError(formRef.current, { name: field })}
          />
        )}
        <Field label={t.name} error={errors.name}>
          {(c) => (
            <TextInput
              {...c}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              maxLength={SEGMENT_NAME_MAX}
            />
          )}
        </Field>
        <div
          data-field="rules"
          data-invalid={errors.rules ? "true" : undefined}
          tabIndex={errors.rules ? -1 : undefined}
          className="flex flex-col gap-4 rounded-md"
        >
          {ruleRow("minOnlineOrders", orders, setOrders)}
          {ruleRow("minLifetimeAmount", amount, setAmount)}
        </div>
        {preview && (
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <Icon name="users" size={16} className="mt-px shrink-0" />
            {preview}
          </p>
        )}
        {(errors.rules || formError) && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {[errors.rules, formError].filter(Boolean).join(" ")}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabledReason={busy && copy.busyReason}
          >
            {copy.cancel}
          </Button>
          <Button type="submit" busy={busy}>
            <Icon name="check" size={18} />
            {busy ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
