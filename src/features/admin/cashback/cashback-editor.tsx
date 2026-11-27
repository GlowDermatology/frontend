"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { Rings } from "@/components/brand/rings";
import { Button, buttonStyles, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SelectMenu } from "@/components/ui/menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveCashbackPolicy } from "@/data/cashback.actions";
import {
  analyzeTiers,
  basisPoints,
  calculateCashback,
  editorBaseline,
  formatPercent,
  tierWarningsText,
  versionAuthorText,
  versionPeriodText,
  versionSummaryText,
  type CashbackPolicy,
  type CashbackTier,
  type PolicyVersion,
  type RateBasis,
} from "@/domain/cashback";
import { cn } from "@/lib/cn";
import { fromLocalInput, tashkentNow } from "@/lib/datetime";
import { revealFirstError } from "@/lib/forms/reveal";
import { tashkentParts } from "@/lib/format";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { cashbackCopy } from "./copy";

/** The policy allows at most 20 tiers (contract §2.7). */
const MAX_TIERS = 20;

/** The sample customer from the design: 19.5 mln lifetime, 1 mln purchase. */
const SAMPLE = {
  lifetimeBefore: 19_500_000,
  amount: 1_000_000,
  promoAmount: 200_000,
  paidWithCashback: 100_000,
} as const;

interface TierDraft {
  id: string;
  from: number;
  to: number | null;
  /** Kept as typed so "1," can be entered on the way to "1,5". */
  percent: string;
}

/** The start menu's special values (the others are month starts, aware ISO). */
const START_NOW = "now";
const START_CUSTOM = "custom";

/** Whether an aware ISO moment is not in the future any more (read in event handlers only). */
function hasPassed(iso: string): boolean {
  return Date.parse(iso) <= Date.now();
}

const toDraft = (tiers: ReadonlyArray<CashbackTier>, locale: Locale): TierDraft[] =>
  tiers.map((t) => ({ ...t, percent: formatPercent(t.percent, locale) }));

/** What the draft would save, for "has anything changed?" (percents as basis points). */
function draftSignature(
  tiers: ReadonlyArray<Pick<TierDraft, "from" | "to" | "percent">>,
  basis: RateBasis,
  earn: boolean,
  effectiveFrom: string,
): string {
  return JSON.stringify([
    tiers.map((t) => [t.from, t.to, basisPoints(t.percent.trim().replace(/[.,]$/, ""))]),
    basis,
    earn,
    effectiveFrom,
  ]);
}

/**
 * The typed percent as a number with at most two decimals (read as integer
 * basis points, so "0,57" is exactly 57 bp); a trailing separator while
 * typing ("1,") counts as the whole number. `NaN` when it is not a percent
 * in (0, 100] with ≤ 2 decimals.
 */
const parsePercent = (text: string) => {
  const bp = basisPoints(text.trim().replace(/[.,]$/, ""));
  return bp === null ? Number.NaN : bp / 100;
};

/** Server field paths the editor shows next to a control (contract §2.7). */
const tierField = (index: number, key: "from" | "to" | "percent") => `tiers.${index}.${key}`;

const digits = (text: string) => text.replace(/\D/g, "").slice(0, 12);

/** ISO start of the month `offset` months after the month containing `iso` (Tashkent). */
function monthStart(iso: string, offset: number): string {
  const p = tashkentParts(iso);
  const index = p.year * 12 + p.month + offset;
  const year = Math.floor(index / 12);
  const month = String((index % 12) + 1).padStart(2, "0");
  return `${year}-${month}-01T00:00:00+05:00`;
}

interface CashbackEditorProps {
  /** The version in force. */
  policy: CashbackPolicy;
  /** A saved version that has not started yet; a new save supersedes it. */
  scheduled: CashbackPolicy | null;
  versions: ReadonlyArray<PolicyVersion>;
  /** Start of the next Tashkent month: the default `effective_from`. */
  nextEffectiveFrom: string;
}

export function CashbackEditor({
  policy,
  scheduled: initialScheduled,
  versions: initialVersions,
  nextEffectiveFrom,
}: CashbackEditorProps) {
  const t = useCopy(cashbackCopy);
  const locale = useAdminLocale();
  const fmt = useFormat();
  const mln = fmt.millions;
  const pct = (value: number | string) => formatPercent(value, locale);
  const toast = useToast();
  const idBase = useId();
  const tiersRef = useRef<HTMLDivElement>(null);
  // The draft starts from, and Reset restores, the latest saved version: the
  // scheduled one when there is one (`editorBaseline`). After a save that is
  // the new version, both locally and in the refreshed props.
  const [baseline, setBaseline] = useState(() => editorBaseline(policy, initialScheduled));
  // The history and the scheduled version follow the server after a save
  // (api mode re-renders the route); the draft itself stays as edited.
  const [source, setSource] = useState({ policy, initialVersions, initialScheduled });
  const [versions, setVersions] = useState(initialVersions);
  const [scheduledPolicy, setScheduledPolicy] = useState(initialScheduled);
  if (
    source.policy !== policy ||
    source.initialVersions !== initialVersions ||
    source.initialScheduled !== initialScheduled
  ) {
    setSource({ policy, initialVersions, initialScheduled });
    setVersions(initialVersions);
    setScheduledPolicy(initialScheduled);
    setBaseline(editorBaseline(policy, initialScheduled));
  }
  // Field errors from the last save (`tiers.{i}.from`, `effectiveFrom`, …), cleared on edit.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [tiers, setTiers] = useState(() => toDraft(baseline.tiers, locale));
  const [basis, setBasis] = useState<RateBasis>(baseline.basis);
  const [earnOnCashbackPaid, setEarnOnCashbackPaid] = useState(baseline.earnOnCashbackPaid);
  /** The start choice: `now`, a month start (ISO), or `custom` (the picker's moment below). */
  const [effectiveFrom, setEffectiveFrom] = useState(nextEffectiveFrom);
  /** The custom moment, `YYYY-MM-DDTHH:MM` Tashkent wall clock ("" = not picked yet). */
  const [customStart, setCustomStart] = useState("");
  const custom = effectiveFrom === START_CUSTOM;
  const immediately = effectiveFrom === START_NOW;
  /** What is saved: `now`, an aware ISO moment, or "" (a custom moment not picked yet). */
  const startValue = custom ? (fromLocalInput(customStart) ?? "") : effectiveFrom;
  /** The picked moment was already past when picked (or when saving): judged in handlers. */
  const [customPast, setCustomPast] = useState(false);
  const customProblem = custom && (!startValue || customPast) ? t.customFuture : null;
  /** At save time: a custom moment that has passed since it was picked. */
  const startPassed = () => custom && Boolean(startValue) && hasPassed(startValue);
  const [saving, setSaving] = useState(false);
  // One key per editor instance: reused on retries, renewed after each saved version.
  const idempotency = useIdempotencyKey();

  const parsed: CashbackTier[] = tiers.map((t) => ({ ...t, percent: parsePercent(t.percent) }));
  const analysis = analyzeTiers(parsed);
  const badPercent = new Set(
    parsed.filter((t) => !(t.percent > 0 && t.percent <= 100)).map((t) => t.id),
  );
  const hasError = analysis.overlaps.length > 0 || badPercent.size > 0 || tiers.length === 0;
  const dirty =
    draftSignature(tiers, basis, earnOnCashbackPaid, startValue) !==
    draftSignature(
      toDraft(baseline.tiers, "en"),
      baseline.basis,
      baseline.earnOnCashbackPaid,
      nextEffectiveFrom,
    );

  const rules = { basis, earnOnCashbackPaid, tiers: parsed };
  const sample = calculateCashback(SAMPLE, rules);

  const clearServerErrors = () => {
    setServerErrors({});
    setFormError(null);
  };

  const update = (id: string, patch: Partial<TierDraft>) => {
    clearServerErrors();
    setTiers((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addTier = () => {
    const sorted = [...parsed].sort((a, b) => a.from - b.from);
    const top = sorted[sorted.length - 1];
    const from = top ? (top.to ?? top.from + 10_000_000) : 0;
    const percent = top && Number.isFinite(top.percent) ? Math.min(100, top.percent + 1) : 1;
    clearServerErrors();
    setTiers((current) => [
      ...current,
      {
        id: `tier-${crypto.randomUUID()}`,
        from,
        to: null,
        percent: pct(percent),
      },
    ]);
  };

  const resetDraft = () => {
    clearServerErrors();
    setTiers(toDraft(baseline.tiers, locale));
    setBasis(baseline.basis);
    setEarnOnCashbackPaid(baseline.earnOnCashbackPaid);
    setEffectiveFrom(nextEffectiveFrom);
    setCustomStart("");
    setCustomPast(false);
  };

  /** Scroll to, focus and mark the first invalid tier field (or the tiers card itself). */
  const focusFirstInvalid = () =>
    window.requestAnimationFrame(() => {
      void revealFirstError(tiersRef.current?.closest<HTMLElement>("section") ?? tiersRef.current);
    });
  const errorCount = analysis.invalid.size + badPercent.size + (tiers.length === 0 ? 1 : 0);
  const refuse = () => {
    toast({
      tone: "danger",
      title: t.fixFirst,
      description: t.fixFirstText(Math.max(1, errorCount)),
    });
    focusFirstInvalid();
  };

  // ADM-14.1: a policy version is never edited afterwards; confirm before it is created.
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** A custom start not picked, or no longer in the future: the picker says so and takes focus. */
  const refuseStart = () => {
    toast({ tone: "danger", title: t.fixFirst, description: t.customFuture });
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>("[data-effective-start] input")?.focus(),
    );
  };
  const askSave = () => {
    if (hasError) {
      refuse();
      return;
    }
    const passed = startPassed();
    if (customProblem || passed) {
      if (passed) setCustomPast(true);
      refuseStart();
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setConfirmOpen(false);
    if (inFlight.current) return;
    if (hasError) {
      refuse();
      return;
    }
    const passed = startPassed();
    if (customProblem || passed) {
      if (passed) setCustomPast(true);
      refuseStart();
      return;
    }
    inFlight.current = true;
    setSaving(true);
    clearServerErrors();
    const draft = { ...baseline, ...rules, effectiveFrom: startValue };
    const result = idempotency.settle(
      await runAction((csrf) => saveCashbackPolicy(draft, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setSaving(false);
    if (!result.ok) {
      // Row and date errors go next to their control; the rest is the notice.
      const rendered = [
        "effectiveFrom",
        ...tiers.flatMap((_, i) => [
          tierField(i, "from"),
          tierField(i, "to"),
          tierField(i, "percent"),
        ]),
      ];
      const { fieldErrors, formError: message } = partitionFieldErrors(result, rendered);
      setServerErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length > 0 ? message : null);
      if (Object.keys(fieldErrors).length > 0) focusFirstInvalid();
      toast({ tone: "danger", title: t.failed, description: result.error });
      return;
    }
    const saved = result.data;
    const startedNow = saved.version.state === "active";
    setBaseline(saved.policy);
    // «Darhol» is in force at once: nothing is scheduled any more (the page refresh brings the rest).
    setScheduledPolicy(startedNow ? null : saved.policy);
    setEffectiveFrom(nextEffectiveFrom);
    setCustomStart("");
    setVersions((current) => [
      saved.version,
      ...current.map((v) =>
        v.version === saved.supersededVersion
          ? {
              ...v,
              scheduled: false,
              state: "superseded" as const,
              // Rows without structured detail keep their Uzbek period with the mark.
              period: v.period.endsWith("almashtirildi") ? v.period : `${v.period} · almashtirildi`, // i18n-ignore
            }
          : v,
      ),
    ]);
    toast({
      tone: "success",
      title: t.saved(saved.version.version),
      description: [
        startedNow ? t.savedNowText : t.savedText(fmt.dateTimeLong(saved.policy.effectiveFrom)),
        saved.supersededVersion ? t.replaced(saved.supersededVersion) : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
    if (saved.warnings?.length) {
      toast({
        tone: "warning",
        title: t.warnings,
        description: tierWarningsText(saved.warnings, locale),
      });
    }
  };

  const scheduled = scheduledPolicy;
  const monthStarts = [0, 1, 2].map((offset) => monthStart(nextEffectiveFrom, offset));
  const effectiveOptions = [
    { value: START_NOW, label: t.startNow },
    ...monthStarts.map((iso) => ({ value: iso, label: fmt.dateTimeLong(iso) })),
    { value: START_CUSTOM, label: t.startCustom },
  ];
  const startNote = immediately
    ? t.startsNowNote
    : startValue && !customProblem
      ? t.startsAtNote(fmt.dateTimeLong(startValue))
      : null;

  const overlapNotes = analysis.overlaps.map((o) =>
    o.kind === "empty-range"
      ? t.overlapEmpty(mln(o.tier.from))
      : t.overlapPair(
          `${mln(o.previous.from)}–${o.previous.to === null ? "∞" : mln(o.previous.to)}`,
          mln(o.next.from),
        ),
  );
  const gapNote = [
    analysis.gaps.length > 0
      ? t.gapText(analysis.gaps.map((g) => t.gapRange(mln(g.from), mln(g.to))).join(", "))
      : "",
    analysis.uncoveredAbove !== null ? t.aboveText(mln(analysis.uncoveredAbove)) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tierInput =
    "h-11 w-full min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface-raised px-3 text-[14px] leading-5 font-semibold text-ink tabular-nums transition-colors duration-150 aria-invalid:border-danger";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-muted tabular-nums">
            {t.activeLine(policy.version, fmt.dateLong(policy.effectiveFrom))}
            {scheduled && ` · ${t.scheduledLine(scheduled.version)}`}
            {` · ${t.baseLine(baseline.version)}`}
          </span>
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
            {t.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={resetDraft}
            disabledReason={saving ? t.savingReason : !dirty && t.nothingToReset}
          >
            {t.reset}
          </Button>
          <Button className="px-5" onClick={askSave} busy={saving}>
            <Icon name="check" size={18} />
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_600px] flex-col gap-4">
          <Card aria-labelledby={`${idBase}-tiers`} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle id={`${idBase}-tiers`} className="text-heading">
                {t.tiers}
              </CardTitle>
              <span className="text-caption font-normal text-ink-muted">{t.tiersHint}</span>
            </div>

            {analysis.overlaps.length > 0 && (
              <Notice tone="danger" role="alert">
                <b>{t.overlapTitle}</b> {overlapNotes.join("; ")}. {t.overlapFix}
              </Notice>
            )}
            {badPercent.size > 0 && (
              <Notice tone="danger" role="alert">
                <b>{t.percentTitle}</b> {t.percentText}
              </Notice>
            )}
            {tiers.length === 0 && (
              <Notice tone="danger" role="alert">
                <b>{t.noTiersTitle}</b> {t.noTiersText}
              </Notice>
            )}
            {formError && (
              <Notice tone="danger" role="alert">
                {formError}
              </Notice>
            )}
            {scheduled && (
              <Notice tone="warning" role="status">
                <b>{t.scheduledTitle(scheduled.version, fmt.dateLong(scheduled.effectiveFrom))}</b>{" "}
                {t.scheduledText}
              </Notice>
            )}
            {gapNote && (
              <Notice tone="warning" role="status">
                <b>{t.gapTitle}</b> {gapNote}
              </Notice>
            )}

            <div
              ref={tiersRef}
              data-tiers={idBase}
              data-field="tiers"
              data-invalid={tiers.length === 0 ? "true" : undefined}
              tabIndex={tiers.length === 0 ? -1 : undefined}
              className="flex flex-col gap-3.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-ink"
            >
              <div
                aria-hidden="true"
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_112px_44px] gap-2.5 px-0.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink-muted uppercase"
              >
                <span>{t.columnFrom}</span>
                <span>{t.columnTo}</span>
                <span>{t.columnPercent}</span>
              </div>
              {tiers.map((tier, index) => {
                const invalid = analysis.invalid.has(tier.id);
                const n = index + 1;
                const fromError = serverErrors[tierField(index, "from")];
                const toError = serverErrors[tierField(index, "to")];
                const percentError = serverErrors[tierField(index, "percent")];
                const rowErrors = [...new Set([fromError, toError, percentError])].filter(Boolean);
                const errorId = `${idBase}-tier-${index}-error`;
                return (
                  <div key={tier.id} className="flex flex-col gap-1.5">
                    <div
                      role="group"
                      aria-label={t.tier(n)}
                      aria-describedby={rowErrors.length > 0 ? errorId : undefined}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_112px_44px] items-center gap-2.5"
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={t.tierFrom(n)}
                        aria-invalid={invalid || Boolean(fromError) || undefined}
                        value={fmt.number(tier.from)}
                        onChange={(e) =>
                          update(tier.id, { from: Number(digits(e.target.value) || 0) })
                        }
                        className={tierInput}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={t.tierTo(n)}
                        aria-invalid={invalid || Boolean(toError) || undefined}
                        placeholder={t.unbounded}
                        value={tier.to === null ? "" : fmt.number(tier.to)}
                        onChange={(e) => {
                          const value = digits(e.target.value);
                          update(tier.id, { to: value ? Number(value) : null });
                        }}
                        className={tierInput}
                      />
                      <span
                        className={cn(
                          "flex h-11 items-center overflow-hidden rounded-md border-[1.5px] border-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-ink",
                          (badPercent.has(tier.id) || percentError) && "border-danger",
                        )}
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={t.tierPercent(n)}
                          aria-invalid={
                            badPercent.has(tier.id) || Boolean(percentError) || undefined
                          }
                          value={tier.percent}
                          onChange={(e) =>
                            update(tier.id, {
                              percent: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5),
                            })
                          }
                          className="h-full w-full min-w-0 bg-transparent pl-3 text-[15px] leading-5 font-bold text-ink tabular-nums focus-visible:outline-none"
                        />
                        <span aria-hidden="true" className="px-3 font-semibold text-ink-muted">
                          %
                        </span>
                      </span>
                      <IconButton
                        onClick={() => {
                          clearServerErrors();
                          setTiers((current) => current.filter((row) => row.id !== tier.id));
                        }}
                        aria-label={t.removeTier(n)}
                        disabledReason={tiers.length === 1 && t.lastTierReason}
                        className="text-danger hover:bg-danger-soft hover:text-danger"
                      >
                        <Icon name="trash" size={18} />
                      </IconButton>
                    </div>
                    {rowErrors.length > 0 && (
                      <p
                        id={errorId}
                        role="alert"
                        className="m-0 text-body-sm font-semibold text-danger"
                      >
                        {rowErrors.join(" ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              variant="dashed"
              onClick={addTier}
              disabledReason={tiers.length >= MAX_TIERS && t.maxTiersReason}
              className="self-start"
            >
              <Icon name="plus" size={18} />
              {t.addTier}
            </Button>
          </Card>

          <Card aria-labelledby={`${idBase}-rules`} className="flex flex-col">
            <CardTitle id={`${idBase}-rules`} className="mb-1.5 text-heading">
              {t.rules}
            </CardTitle>
            <RuleRow title={t.basisTitle} description={t.basisText}>
              <SegmentedControl<RateBasis>
                label={t.basisLabel}
                size="sm"
                value={basis}
                onChange={setBasis}
                options={[
                  { value: "before_purchase", label: t.basisBefore },
                  { value: "with_purchase", label: t.basisWith },
                ]}
              />
            </RuleRow>
            <RuleRow title={t.paidTitle} description={earnOnCashbackPaid ? t.paidOn : t.paidOff}>
              <Switch
                checked={earnOnCashbackPaid}
                onCheckedChange={setEarnOnCashbackPaid}
                aria-label={t.paidTitle}
              />
            </RuleRow>
            <RuleRow title={t.promoTitle} description={t.promoText}>
              <Locked note={t.locked}>{t.promoValue}</Locked>
            </RuleRow>
            <RuleRow title={t.expiryTitle} description={t.expiryText}>
              <Locked note={t.locked}>{t.expiryValue}</Locked>
            </RuleRow>
            <RuleRow
              title={t.effectiveTitle}
              description={t.effectiveText}
              error={serverErrors.effectiveFrom}
              last
            >
              <div className="flex flex-col items-end gap-2" data-effective-start="">
                <SelectMenu<string>
                  label={t.effectiveTitle}
                  align="end"
                  value={effectiveFrom}
                  onValueChange={(value) => {
                    clearServerErrors();
                    setEffectiveFrom(value);
                  }}
                  triggerClassName={cn(
                    "border-[1.5px] px-3 text-[14px] font-semibold tabular-nums",
                    serverErrors.effectiveFrom && "border-danger",
                  )}
                  trigger={
                    <>
                      <Icon
                        name={immediately ? "clock" : "calendar"}
                        size={18}
                        className="text-gold-ink"
                      />
                      {immediately
                        ? t.startNow
                        : custom
                          ? t.startCustom
                          : fmt.dateTimeLong(effectiveFrom)}
                    </>
                  }
                  options={effectiveOptions}
                />
                {custom && (
                  <DateTimePicker
                    value={customStart}
                    onValueChange={(value) => {
                      clearServerErrors();
                      setCustomStart(value);
                      const iso = fromLocalInput(value);
                      setCustomPast(Boolean(iso) && hasPassed(iso!));
                    }}
                    min={tashkentNow()}
                    aria-label={t.customLabel}
                    aria-invalid={customProblem && customStart ? true : undefined}
                    placeholder={t.customLabel}
                    className="w-[240px]"
                  />
                )}
                {custom && customStart && customProblem ? (
                  <p role="alert" className="m-0 text-caption font-semibold text-danger">
                    {customProblem}
                  </p>
                ) : startNote ? (
                  <p
                    className="m-0 max-w-[320px] text-right text-caption text-ink-muted"
                    data-start-note=""
                  >
                    <Icon
                      name="info"
                      size={14}
                      className="mr-1 inline-block align-[-2px] text-gold-ink"
                    />
                    {startNote}
                  </p>
                ) : null}
              </div>
            </RuleRow>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <section
            aria-labelledby={`${idBase}-sim`}
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-lg border border-nav-line bg-banner p-5"
          >
            <Rings
              viewBox={300}
              rings={[
                [50, 0.5],
                [80, 0.3],
                [110, 0.16],
              ]}
              className="absolute -top-[120px] -right-[120px] size-[300px]"
            />
            <span className="relative text-[11px] leading-[14px] font-bold tracking-[0.08em] text-banner-ink">
              {t.simOverline}
            </span>
            <h2 id={`${idBase}-sim`} className="relative m-0 text-heading text-banner-ink-soft">
              {t.simTitle(fmt.som(SAMPLE.lifetimeBefore))}
            </h2>
            <p className="relative m-0 text-[14px] leading-[22px] text-banner-ink-soft tabular-nums">
              {t.simText(
                fmt.som(SAMPLE.amount),
                fmt.som(SAMPLE.promoAmount),
                fmt.som(SAMPLE.paidWithCashback),
              )}
            </p>
            <dl
              aria-live="polite"
              className="relative m-0 flex flex-col gap-2 rounded-md bg-white/6 p-3.5 tabular-nums"
            >
              <div className="flex justify-between text-body-sm text-banner-ink-soft">
                <dt>{t.simEligible}</dt>
                <dd className="m-0 font-bold">{fmt.som(sample.eligible)}</dd>
              </div>
              <div className="flex justify-between text-body-sm text-banner-ink-soft">
                <dt>{t.simPercent}</dt>
                <dd className="m-0 font-bold">
                  {sample.percent === null ? t.simNoTier : `${pct(sample.percent)}%`}
                </dd>
              </div>
              <span aria-hidden="true" className="h-px bg-banner-ink-soft/20" />
              <div className="flex justify-between text-[15px] leading-5 text-banner-ink">
                <dt>{t.simCashback}</dt>
                <dd className="m-0 font-bold">
                  {sample.percent === null ? "—" : `+${fmt.som(sample.amount)}`}
                </dd>
              </div>
            </dl>
            <p className="relative m-0 text-caption font-normal text-banner-ink-soft">
              {t.simHint}
            </p>
          </section>

          <Card aria-labelledby={`${idBase}-versions`} className="flex flex-col gap-3">
            <CardTitle id={`${idBase}-versions`} className="text-heading">
              {t.versions}
            </CardTitle>
            {versions.length === 0 && (
              <p className="m-0 text-body-sm text-ink-muted">{t.noVersions}</p>
            )}
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {versions.map((version) => (
                <li key={version.version} className="flex gap-3">
                  <span
                    className={cn(
                      "h-6 shrink-0 rounded-sm px-2 text-[11px] leading-6 font-extrabold tabular-nums",
                      version.active
                        ? "bg-gold text-on-gold"
                        : version.scheduled
                          ? "bg-gold-soft text-ink"
                          : "bg-line text-ink",
                    )}
                  >
                    {`v${version.version}`}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-sm font-bold break-words text-ink">
                      {versionSummaryText(version, locale)}
                    </span>
                    <span className="text-caption font-normal text-ink-muted tabular-nums">
                      {versionAuthorText(version, locale)} · {versionPeriodText(version, locale)}
                      {version.active
                        ? ` · ${t.versionActive}`
                        : version.scheduled
                          ? ` · ${t.versionScheduled}`
                          : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-caption font-normal text-ink-muted">{t.versionsNote}</p>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.confirmTitle}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            {immediately ? t.confirmNowText : t.confirmText(fmt.dateTimeLong(startValue))}
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel className={buttonStyles({ variant: "outline" })}>
            {t.cancel}
          </AlertDialogCancel>
          <Button onClick={save}>{t.confirm}</Button>
        </div>
      </AlertDialog>
    </>
  );
}

function Notice({
  tone,
  role,
  children,
}: {
  tone: "danger" | "warning";
  role: "alert" | "status";
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-2.5 rounded-md px-3.5 py-3 text-body-sm text-ink",
        tone === "danger" ? "bg-danger-soft" : "bg-warning-soft",
      )}
    >
      <Icon
        name={tone === "danger" ? "alert-circle" : "alert-triangle"}
        size={18}
        className={cn("shrink-0", tone === "danger" ? "text-danger" : "text-warning")}
      />
      <span>{children}</span>
    </div>
  );
}

function RuleRow({
  title,
  description,
  children,
  error,
  last,
}: {
  title: string;
  description: string;
  children: ReactNode;
  /** A server error for this rule (e.g. `effective_from_in_past`). */
  error?: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        last ? "pt-3.5" : "border-b border-line py-3.5",
      )}
    >
      <span className="flex flex-[1_1_300px] flex-col gap-0.5">
        <span className="text-[14px] leading-5 font-bold text-ink">{title}</span>
        <span className="text-caption font-normal text-ink-muted">{description}</span>
        {error && (
          <span role="alert" className="text-body-sm font-semibold text-danger">
            {error}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

function Locked({ children, note }: { children: ReactNode; note: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-body-sm font-bold text-ink">
      <Icon name="lock" size={16} className="text-ink-muted" />
      {children}
      <span className="sr-only">{note}</span>
    </span>
  );
}
