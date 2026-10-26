"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { Rings } from "@/components/brand/rings";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
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
  type CashbackPolicy,
  type CashbackTier,
  type PolicyVersion,
  type RateBasis,
} from "@/domain/cashback";
import { cn } from "@/lib/cn";
import {
  formatDateLong,
  formatDateTimeLong,
  formatDayMonth,
  formatMillions,
  formatNumber,
  formatSom,
  tashkentParts,
} from "@/lib/format";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";

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

const toDraft = (tiers: ReadonlyArray<CashbackTier>): TierDraft[] =>
  tiers.map((t) => ({ ...t, percent: formatPercent(t.percent) }));

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

const mln = (value: number) => formatMillions(value);

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
  const toast = useToast();
  const idBase = useId();
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
  const [tiers, setTiers] = useState(() => toDraft(baseline.tiers));
  const [basis, setBasis] = useState<RateBasis>(baseline.basis);
  const [earnOnCashbackPaid, setEarnOnCashbackPaid] = useState(baseline.earnOnCashbackPaid);
  const [effectiveFrom, setEffectiveFrom] = useState(nextEffectiveFrom);
  const [saving, setSaving] = useState(false);
  // One key per editor instance: reused on retries, renewed after each saved version.
  const idempotency = useIdempotencyKey();

  const parsed: CashbackTier[] = tiers.map((t) => ({ ...t, percent: parsePercent(t.percent) }));
  const analysis = analyzeTiers(parsed);
  const badPercent = new Set(
    parsed.filter((t) => !(t.percent > 0 && t.percent <= 100)).map((t) => t.id),
  );
  const hasError = analysis.overlaps.length > 0 || badPercent.size > 0 || tiers.length === 0;

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
        percent: formatPercent(percent),
      },
    ]);
  };

  const resetDraft = () => {
    clearServerErrors();
    setTiers(toDraft(baseline.tiers));
    setBasis(baseline.basis);
    setEarnOnCashbackPaid(baseline.earnOnCashbackPaid);
    setEffectiveFrom(nextEffectiveFrom);
  };

  const focusFirstInvalid = () =>
    window.requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-tiers="${idBase}"] [aria-invalid="true"]`)
        ?.focus(),
    );

  const save = async () => {
    if (inFlight.current) return;
    if (hasError) {
      focusFirstInvalid();
      return;
    }
    inFlight.current = true;
    setSaving(true);
    clearServerErrors();
    const draft = { ...baseline, ...rules, effectiveFrom };
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
      toast({ tone: "info", title: "Saqlanmadi", description: result.error });
      return;
    }
    const saved = result.data;
    setBaseline(saved.policy);
    setScheduledPolicy(saved.policy);
    setVersions((current) => [
      saved.version,
      ...current.map((v) =>
        v.version === saved.supersededVersion
          ? {
              ...v,
              scheduled: false,
              state: "superseded" as const,
              period: v.period.endsWith("almashtirildi") ? v.period : `${v.period} · almashtirildi`,
            }
          : v,
      ),
    ]);
    toast({
      title: `Siyosat v${saved.version.version} saqlandi`,
      description: `${formatDayMonth(saved.policy.effectiveFrom)}dan boshlab yangi xaridlarga qo‘llanadi${
        saved.supersededVersion ? ` · v${saved.supersededVersion} almashtirildi` : ""
      }`,
    });
    if (saved.warnings?.length) {
      toast({ tone: "info", title: "Eslatma", description: tierWarningsText(saved.warnings) });
    }
  };

  const scheduled = scheduledPolicy;
  const effectiveOptions = [0, 1, 2].map((offset) => monthStart(nextEffectiveFrom, offset));

  const overlapNotes = analysis.overlaps.map((o) =>
    o.kind === "empty-range"
      ? `${mln(o.tier.from)} dan katta “gacha” kerak`
      : `${mln(o.previous.from)}–${o.previous.to === null ? "∞" : mln(o.previous.to)} va ${mln(o.next.from)} dan boshlanuvchi daraja`,
  );
  const gapNote = [
    analysis.gaps.length > 0
      ? `${analysis.gaps.map((g) => `${mln(g.from)} – ${mln(g.to)} so‘m`).join(", ")} oralig‘i uchun foiz yo‘q.`
      : "",
    analysis.uncoveredAbove !== null
      ? `${mln(analysis.uncoveredAbove)} so‘mdan yuqori xaridlar uchun foiz belgilanmagan — bunday mijozlarga qaysi foiz qo‘llanadi? “Gacha” maydonini bo‘sh qoldirsangiz, oxirgi daraja cheksiz bo‘ladi.`
      : "",
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
            Faol siyosat: v{policy.version} · {formatDateLong(policy.effectiveFrom)} dan
            {scheduled && ` · v${scheduled.version} rejalashtirilgan`}
            {` · Tahrir v${baseline.version} asosida`}
          </span>
          <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
            Cashback sozlamalari
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={resetDraft} disabled={saving}>
            O‘zgarishlarni bekor qilish
          </Button>
          <Button className="px-5" onClick={save} disabled={saving} aria-busy={saving}>
            <Icon name="check" size={18} />
            {saving ? "Saqlanmoqda…" : "Yangi versiyani saqlash"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_600px] flex-col gap-4">
          <Card aria-labelledby={`${idBase}-tiers`} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle id={`${idBase}-tiers`} className="text-heading">
                Darajalar
              </CardTitle>
              <span className="text-caption font-normal text-ink-muted">
                Mijozning jami xaridlari (do‘kon + onlayn) bo‘yicha
              </span>
            </div>

            {analysis.overlaps.length > 0 && (
              <Notice tone="danger" role="alert">
                <b>Darajalar ustma-ust tushmoqda.</b> {overlapNotes.join("; ")}. Saqlashdan oldin
                chegaralarni to‘g‘rilang.
              </Notice>
            )}
            {badPercent.size > 0 && (
              <Notice tone="danger" role="alert">
                <b>Foiz noto‘g‘ri.</b> Har bir daraja foizi 0 dan katta va 100 dan oshmasligi kerak
                (ko‘pi bilan 2 ta kasr raqam, masalan 0,57).
              </Notice>
            )}
            {formError && (
              <Notice tone="danger" role="alert">
                {formError}
              </Notice>
            )}
            {scheduled && (
              <Notice tone="warning" role="status">
                <b>
                  v{scheduled.version} {formatDateLong(scheduled.effectiveFrom)} dan kuchga kirishi
                  rejalashtirilgan.
                </b>{" "}
                Yangi versiya saqlansa, u almashtiriladi.
              </Notice>
            )}
            {gapNote && (
              <Notice tone="warning" role="status">
                <b>Qoplanmagan oraliq:</b> {gapNote}
              </Notice>
            )}

            <div data-tiers={idBase} className="flex flex-col gap-3.5">
              <div
                aria-hidden="true"
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_112px_44px] gap-2.5 px-0.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink-muted"
              >
                <span>DAN, SO‘M</span>
                <span>GACHA, SO‘M</span>
                <span>FOIZ</span>
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
                      aria-label={`${n}-daraja`}
                      aria-describedby={rowErrors.length > 0 ? errorId : undefined}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_112px_44px] items-center gap-2.5"
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`${n}-daraja: dan, so‘m`}
                        aria-invalid={invalid || Boolean(fromError) || undefined}
                        value={formatNumber(tier.from)}
                        onChange={(e) =>
                          update(tier.id, { from: Number(digits(e.target.value) || 0) })
                        }
                        className={tierInput}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`${n}-daraja: gacha, so‘m (bo‘sh — cheksiz)`}
                        aria-invalid={invalid || Boolean(toError) || undefined}
                        placeholder="Cheksiz"
                        value={tier.to === null ? "" : formatNumber(tier.to)}
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
                          aria-label={`${n}-daraja: foiz`}
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
                      <button
                        type="button"
                        onClick={() => {
                          clearServerErrors();
                          setTiers((current) => current.filter((t) => t.id !== tier.id));
                        }}
                        aria-label={`${n}-darajani o‘chirish`}
                        className="flex size-11 items-center justify-center rounded-md text-danger transition-colors duration-150 hover:bg-danger-soft"
                      >
                        <Icon name="trash" size={18} />
                      </button>
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
            <button
              type="button"
              onClick={addTier}
              className="inline-flex h-11 items-center gap-2 self-start rounded-md border-[1.5px] border-dashed border-line-strong px-3.5 text-label font-bold text-ink transition-colors duration-150 hover:bg-surface"
            >
              <Icon name="plus" size={18} />
              Daraja qo‘shish
            </button>
          </Card>

          <Card aria-labelledby={`${idBase}-rules`} className="flex flex-col">
            <CardTitle id={`${idBase}-rules`} className="mb-1.5 text-heading">
              Hisoblash qoidalari
            </CardTitle>
            <RuleRow
              title="Foizni qaysi summa belgilaydi"
              description="Mijoz chegarani kesib o‘tgan xaridning o‘ziga qaysi foiz qo‘llanadi"
            >
              <SegmentedControl<RateBasis>
                label="Foiz asosi"
                size="sm"
                value={basis}
                onChange={setBasis}
                options={[
                  { value: "before_purchase", label: "Xariddan oldingi jami" },
                  { value: "with_purchase", label: "Xarid bilan birga" },
                ]}
              />
            </RuleRow>
            <RuleRow
              title="Cashback bilan to‘langan qismga cashback"
              description={
                earnOnCashbackPaid
                  ? "Yoqilgan: balansdan to‘langan summa ham cashback oladi"
                  : "O‘chirilgan: faqat pul bilan to‘langan qismdan hisoblanadi"
              }
            >
              <Switch
                checked={earnOnCashbackPaid}
                onCheckedChange={setEarnOnCashbackPaid}
                aria-label="Cashback bilan to‘langan qismga cashback"
              />
            </RuleRow>
            <RuleRow
              title="Aksiyadagi mahsulotlar"
              description="Mahsulot kartasidagi “Aksiya” belgisi bo‘yicha"
            >
              <Locked>Cashback hisoblanmaydi</Locked>
            </RuleRow>
            <RuleRow title="Balans muddati" description="Do‘konda ham, ilovada ham ishlatiladi">
              <Locked>Muddatsiz</Locked>
            </RuleRow>
            <RuleRow
              title="Kuchga kirish sanasi"
              description="Shu sanadan keyingi xaridlarga qo‘llanadi; avvalgilari o‘zgarmaydi"
              error={serverErrors.effectiveFrom}
              last
            >
              <SelectMenu<string>
                label="Kuchga kirish sanasi"
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
                    <Icon name="calendar" size={18} className="text-gold-ink" />
                    {formatDateTimeLong(effectiveFrom)}
                  </>
                }
                options={effectiveOptions.map((iso) => ({
                  value: iso,
                  label: formatDateTimeLong(iso),
                }))}
              />
            </RuleRow>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <section
            aria-labelledby={`${idBase}-sim`}
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-lg bg-banner p-5"
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
              TEKSHIRISH
            </span>
            <h2 id={`${idBase}-sim`} className="relative m-0 text-heading text-banner-ink-soft">
              Namuna: 19,5 mln so‘m xaridi bor mijoz
            </h2>
            <p className="relative m-0 text-[14px] leading-[22px] text-banner-ink-soft tabular-nums">
              Yangi xarid {formatNumber(SAMPLE.amount)} so‘m, shundan{" "}
              {formatNumber(SAMPLE.promoAmount)} aksiyada, {formatNumber(SAMPLE.paidWithCashback)}{" "}
              cashback bilan to‘lanadi.
            </p>
            <dl
              aria-live="polite"
              className="relative m-0 flex flex-col gap-2 rounded-md bg-white/6 p-3.5 tabular-nums"
            >
              <div className="flex justify-between text-body-sm text-banner-ink-soft">
                <dt>Hisoblanadigan summa</dt>
                <dd className="m-0 font-bold">{formatSom(sample.eligible)}</dd>
              </div>
              <div className="flex justify-between text-body-sm text-banner-ink-soft">
                <dt>Qo‘llanadigan foiz</dt>
                <dd className="m-0 font-bold">
                  {sample.percent === null ? "daraja yo‘q" : `${formatPercent(sample.percent)}%`}
                </dd>
              </div>
              <span aria-hidden="true" className="h-px bg-banner-ink-soft/20" />
              <div className="flex justify-between text-[15px] leading-5 text-banner-ink">
                <dt>Cashback</dt>
                <dd className="m-0 font-bold">
                  {sample.percent === null ? "—" : `+${formatSom(sample.amount)}`}
                </dd>
              </div>
            </dl>
            <p className="relative m-0 text-caption font-normal text-banner-ink-soft">
              Qoidalarni o‘zgartiring — natija shu yerda yangilanadi.
            </p>
          </section>

          <Card aria-labelledby={`${idBase}-versions`} className="flex flex-col gap-3">
            <CardTitle id={`${idBase}-versions`} className="text-heading">
              Versiyalar tarixi
            </CardTitle>
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
                    v{version.version}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-body-sm font-bold text-ink">{version.summary}</span>
                    <span className="text-caption font-normal text-ink-muted tabular-nums">
                      {version.author} · {version.period}
                      {version.active ? " · faol" : version.scheduled ? " · rejalashtirilgan" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-caption font-normal text-ink-muted">
              Har bir cashback yozuvi qaysi versiya bo‘yicha hisoblanganini saqlaydi.
            </p>
          </Card>
        </div>
      </div>
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

function Locked({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-body-sm font-bold text-ink">
      <Icon name="lock" size={16} className="text-ink-muted" />
      {children}
      <span className="sr-only">(o‘zgartirib bo‘lmaydi)</span>
    </span>
  );
}
