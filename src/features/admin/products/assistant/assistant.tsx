"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  applyAssistantJob,
  discardAssistantJob,
  pollAssistantJob,
  startAssistantJob,
} from "@/data/assistant.actions";
import {
  ASSISTANT_MODES,
  candidateKeys,
  IMPROVE_GOALS,
  isAssistantJobActive,
  isAwaitingReview,
  keyLanguage,
  type AssistantJob,
  type AssistantMode,
  type AssistantStatus,
  type ImproveGoal,
} from "@/domain/assistant";
import { CONTENT_LANGUAGES, type ContentLanguage, type Product } from "@/domain/product";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../../shared/action-client";
import { useIdempotencyKey } from "../../shared/idempotency";
import { createImportController, type ImportController } from "../import-controller";
import { LANGUAGE_TAB_LABEL } from "../language-tabs";
import { AssistantReview } from "./assistant-review";
import { assistantCopy } from "./copy";
import {
  applyItems,
  forgetJob,
  initialReview,
  itemErrors,
  rememberedJob,
  rememberJob,
  type IsBlocked,
  type ReviewState,
} from "./review";

type Copy = (typeof assistantCopy)["uz"];

export interface AssistantProps {
  /** The editor's baseline (what the server holds as far as the editor knows). */
  product: Product;
  status: AssistantStatus;
  /** A key whose form field holds an unsaved edit (cannot be applied now). */
  isBlocked: IsBlocked;
  /** The form holds unsaved edits: suggestions are built from the saved data. */
  unsaved: boolean;
  labelOf: (key: string) => string;
  /** After an apply: the server's product and the keys it wrote. */
  onApplied: (product: Product, applied: string[]) => void;
}

export interface ComposeSettings {
  mode: AssistantMode;
  languages: ContentLanguage[];
  keys: string[];
  goal: ImproveGoal;
}

export const DEFAULT_COMPOSE: ComposeSettings = {
  mode: "fill_missing",
  languages: [...CONTENT_LANGUAGES],
  keys: [],
  goal: "professional",
};

/** Why «Takliflar olish» cannot run yet; `undefined` when it can. */
export function composeBlocker(
  t: Copy,
  settings: ComposeSettings,
  product: Pick<Product, "images">,
): string | undefined {
  if (settings.languages.length === 0) return t.needLanguage;
  if (settings.mode === "improve" && settings.keys.length === 0) return t.needFields;
  if (settings.mode === "photos" && product.images.length === 0) return t.needPhotos;
  return undefined;
}

interface Outcome {
  applied: number;
  conflicts: string[];
}

/**
 * «✨ AI yordamchi»: the button in the editor header and its compact dialog. The tracked job is
 * kept per product in sessionStorage and by a controller that survives the hidden route, so the
 * dialog can be closed while the AI works (the editor stays usable) and reopened to review.
 */
export function Assistant({
  product,
  status,
  isBlocked,
  unsaved,
  labelOf,
  onApplied,
}: AssistantProps) {
  const t = useCopy(assistantCopy);
  const toast = useToast();
  const startKey = useIdempotencyKey();
  const applyKey = useIdempotencyKey();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ComposeSettings>(DEFAULT_COMPOSE);
  const [advanced, setAdvanced] = useState(false);
  const [job, setJob] = useState<AssistantJob | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [nothing, setNothing] = useState(false);
  const [review, setReview] = useState<ReviewState>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // What the controller's callbacks read at call time (they outlive renders).
  const latest = useRef({ t, open, isBlocked, productId: product.id });
  useEffect(() => {
    latest.current = { t, open, isBlocked, productId: product.id };
  });

  const controllerRef = useRef<ImportController<AssistantJob> | null>(null);
  useEffect(() => {
    controllerRef.current ??= createImportController<AssistantJob>({
      fetchJob: (id) => runAction((csrf) => pollAssistantJob(id, csrf)),
      timeoutMessage: () => latest.current.t.failedTitle,
      onUpdate: (next) => {
        setRetrying(false);
        setJob(next);
        const { t, open, isBlocked, productId } = latest.current;
        if (next.state === "succeeded" && next.result) {
          setReview(initialReview(next.result.suggestions, isBlocked));
          setErrors({});
        }
        if (isAssistantJobActive(next)) return;
        if (!isAwaitingReview(next)) forgetJob(productId);
        if (open) return;
        if (next.state === "succeeded" && next.outcome === "pending") {
          toast({ tone: "info", title: t.toast.ready, description: t.toast.readyLead });
        } else if (next.state === "failed") {
          toast({ tone: "danger", title: t.toast.failed, description: next.error?.message });
        }
      },
      onRetry: () => setRetrying(true),
      onError: (message) => {
        setRetrying(false);
        setJob(null);
        forgetJob(latest.current.productId);
        setStartError(message);
      },
    });
    const controller = controllerRef.current;
    controller.attach();
    // A job started before a reload (or in a closed dialog): resume it once.
    const remembered = rememberedJob(latest.current.productId);
    if (remembered && !controller.job) {
      void runAction((csrf) => pollAssistantJob(remembered, csrf)).then((result) => {
        if (controller.job) return;
        if (result.ok && (isAssistantJobActive(result.data) || isAwaitingReview(result.data))) {
          controller.start(result.data);
        } else forgetJob(latest.current.productId);
      });
    }
    return () => controller.detach();
  }, [toast]);

  if (!status.enabled) return null;

  const running = job !== null && isAssistantJobActive(job);
  const ready = job !== null && isAwaitingReview(job);

  const reset = () => {
    forgetJob(product.id);
    setJob(null);
    setNothing(false);
    setOutcome(null);
    setErrors({});
    setStartError(null);
  };

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    setNothing(false);
    const result = startKey.settle(
      await runAction((csrf) =>
        startAssistantJob(
          product.id,
          {
            ...settings,
            keys: settings.keys.filter((key) => settings.languages.includes(keyLanguage(key)!)),
            imageIds:
              settings.mode === "photos"
                ? product.images.slice(0, status.maxImages).map((image) => image.id)
                : [],
          },
          startKey.key,
          csrf,
        ),
      ),
    );
    setStarting(false);
    if (!result.ok) {
      setStartError(result.error);
      return;
    }
    if (result.data.nothingToFill) {
      setNothing(true);
      return;
    }
    rememberJob(product.id, result.data.job.id);
    controllerRef.current?.start(result.data.job);
  };

  const apply = async () => {
    if (!job?.result || applying) return;
    const items = applyItems(job.result.suggestions, review, isBlocked);
    if (items.length === 0) return;
    setApplying(true);
    setErrors({});
    const result = applyKey.settle(
      await runAction((csrf) => applyAssistantJob(job.id, items, applyKey.key, csrf)),
    );
    setApplying(false);
    if (!result.ok) {
      const byKey = itemErrors(items, result.fieldErrors);
      if (Object.keys(byKey).length > 0) {
        setErrors(byKey);
        return;
      }
      toast({ tone: "danger", title: t.toast.notApplied, description: result.error });
      if (result.code === "assistant_job_not_ready" || result.code === "not_found") reset();
      return;
    }
    const { applied, conflicts, product: next } = result.data;
    if (applied.length > 0) onApplied(next, applied);
    setJob(result.data.job);
    if (result.data.job.outcome !== "pending") forgetJob(product.id);
    if (conflicts.length > 0) {
      setOutcome({ applied: applied.length, conflicts });
      return;
    }
    toast({
      tone: "success",
      title: t.toast.applied,
      description: t.toast.appliedLead(applied.length),
    });
    reset();
    setOpen(false);
  };

  const discard = async () => {
    if (!job || discarding) return;
    setDiscarding(true);
    const result = await runAction((csrf) => discardAssistantJob(job.id, csrf));
    setDiscarding(false);
    if (!result.ok && result.code !== "assistant_job_not_ready" && result.code !== "not_found") {
      toast({ tone: "danger", title: t.toast.notApplied, description: result.error });
      return;
    }
    if (result.ok && job.result && job.result.suggestions.length > 0) {
      toast({ tone: "info", title: t.toast.discarded });
    }
    reset();
    setOpen(false);
  };

  const view = outcome
    ? "result"
    : running
      ? "processing"
      : job?.state === "failed"
        ? "failed"
        : ready && job.result
          ? "review"
          : nothing
            ? "nothing"
            : "compose";

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-assistant-state={running ? "running" : ready ? "ready" : "idle"}
      >
        <Icon
          name={running ? "refresh" : "sparkles"}
          size={18}
          className={cn("text-gold-ink", running && "animate-spin motion-reduce:animate-none")}
        />
        {running ? t.buttonRunning : ready ? t.buttonReady : t.button}
        {ready && <span aria-hidden="true" className="size-2 rounded-full bg-gold" />}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // A closed result or empty state starts over next time; a job keeps its place.
          if (!next && (outcome || nothing || startError)) {
            setOutcome(null);
            setNothing(false);
            setStartError(null);
            if (outcome) reset();
          }
        }}
        title={
          <span className="flex items-center gap-2">
            <Icon name="sparkles" size={20} className="text-gold-ink" />
            {t.title}
          </span>
        }
        description={view === "compose" ? t.lead : undefined}
        className={view === "review" ? "max-w-[760px]" : "max-w-[520px]"}
      >
        {view === "compose" && (
          <AssistantCompose
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              setStartError(null);
            }}
            product={product}
            advanced={advanced}
            onAdvanced={setAdvanced}
            unsaved={unsaved}
            labelOf={labelOf}
            error={startError}
            starting={starting}
            onStart={start}
          />
        )}
        {view === "nothing" && (
          <StateView icon="check" title={t.nothingTitle} lead={t.nothingLead}>
            <Button variant="outline" onClick={() => setNothing(false)}>
              {t.back}
            </Button>
            <Button
              onClick={() => {
                setNothing(false);
                setSettings({ ...settings, mode: "improve", keys: [] });
              }}
            >
              {t.tryImprove}
            </Button>
          </StateView>
        )}
        {view === "processing" && (
          <StateView
            icon="refresh"
            spin
            title={t.processingTitle}
            lead={retrying ? t.retrying : t.processingLead}
            live
          >
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.close}
            </Button>
          </StateView>
        )}
        {view === "failed" && (
          <StateView
            icon="alert-triangle"
            tone="danger"
            title={t.failedTitle}
            lead={job?.error?.message ?? ""}
            live
          >
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.close}
            </Button>
            <Button
              onClick={() => {
                reset();
                void start();
              }}
            >
              {t.tryAgain}
            </Button>
          </StateView>
        )}
        {view === "review" && job?.result && (
          <AssistantReview
            suggestions={job.result.suggestions}
            notes={job.result.notes}
            state={review}
            onChange={(key, row) => {
              setReview((current) => ({ ...current, [key]: row }));
              setErrors((current) => {
                const rest = { ...current };
                delete rest[key];
                return rest;
              });
            }}
            isBlocked={isBlocked}
            labelOf={labelOf}
            errors={errors}
            onApply={apply}
            onDiscard={discard}
            applying={applying}
            discarding={discarding}
          />
        )}
        {view === "result" && outcome && (
          <StateView
            icon="info"
            title={t.result.title}
            lead={t.result.applied(outcome.applied)}
            live
          >
            <div className="flex w-full flex-col gap-2">
              <p className="m-0 text-body-sm text-ink">{t.result.conflictsLead}</p>
              <ul
                className="m-0 flex list-disc flex-col gap-1 pl-5 text-body-sm text-ink"
                data-conflicts=""
              >
                {outcome.conflicts.map((key) => (
                  <li key={key}>{labelOf(key)}</li>
                ))}
              </ul>
            </div>
            <Button
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              {t.close}
            </Button>
          </StateView>
        )}
      </Dialog>
    </>
  );
}

function StateView({
  icon,
  title,
  lead,
  children,
  spin,
  tone,
  live,
}: {
  icon: "check" | "refresh" | "alert-triangle" | "info";
  title: string;
  lead: string;
  children: ReactNode;
  spin?: boolean;
  tone?: "danger";
  live?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4" data-assistant-view={icon}>
      <div className="flex items-start gap-3" role={live ? "status" : undefined}>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-gold-soft text-gold-ink",
          )}
        >
          <Icon
            name={icon}
            size={20}
            className={cn(spin && "animate-spin motion-reduce:animate-none")}
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 text-body font-semibold text-ink">{title}</p>
          {lead && <p className="m-0 text-body-sm break-words text-ink-muted">{lead}</p>}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

interface ComposeProps {
  settings: ComposeSettings;
  onChange: (settings: ComposeSettings) => void;
  product: Product;
  advanced: boolean;
  onAdvanced: (open: boolean) => void;
  unsaved: boolean;
  labelOf: (key: string) => string;
  error: string | null;
  starting: boolean;
  onStart: () => void;
}

/** The first view: mode, languages, (fields), one button. */
export function AssistantCompose({
  settings,
  onChange,
  product,
  advanced,
  onAdvanced,
  unsaved,
  labelOf,
  error,
  starting,
  onStart,
}: ComposeProps) {
  const t = useCopy(assistantCopy);
  const improve = settings.mode === "improve";
  const candidates = candidateKeys(product, settings.mode, settings.languages);
  const showFields = improve || advanced;
  const toggleLanguage = (language: ContentLanguage, on: boolean) =>
    onChange({
      ...settings,
      languages: CONTENT_LANGUAGES.filter((l) =>
        l === language ? on : settings.languages.includes(l),
      ),
    });
  const toggleKey = (key: string, on: boolean) =>
    onChange({
      ...settings,
      keys: on ? [...settings.keys, key] : settings.keys.filter((k) => k !== key),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SegmentedControl
          label={t.mode.label}
          layout="fill"
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode, keys: [] })}
          options={ASSISTANT_MODES.map((mode) => ({ value: mode, label: t.mode[mode] }))}
          className="max-sm:grid-flow-row max-sm:grid-cols-2"
        />
        <p className="m-0 text-caption font-normal text-ink-muted">{t.modeHint[settings.mode]}</p>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-label font-semibold text-ink">{t.languages}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {CONTENT_LANGUAGES.map((language) => (
            <label
              key={language}
              className="flex min-h-9 cursor-pointer items-center gap-2 text-body-sm text-ink"
            >
              <input
                type="checkbox"
                checked={settings.languages.includes(language)}
                onChange={(event) => toggleLanguage(language, event.target.checked)}
                className="size-4 shrink-0 accent-gold-ink"
              />
              {LANGUAGE_TAB_LABEL[language]}
            </label>
          ))}
        </div>
      </fieldset>

      {improve && (
        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold text-ink">{t.goal}</span>
          <Select
            aria-label={t.goal}
            value={settings.goal}
            onValueChange={(goal) => onChange({ ...settings, goal: goal as ImproveGoal })}
            options={IMPROVE_GOALS.map((goal) => ({ value: goal, label: t.goals[goal] }))}
          />
        </div>
      )}

      {!improve && (
        <button
          type="button"
          aria-expanded={advanced}
          onClick={() => onAdvanced(!advanced)}
          className="flex items-center gap-1.5 self-start rounded-sm text-body-sm font-semibold text-gold-ink hover:underline"
        >
          <Icon
            name="chevron-down"
            size={16}
            className={cn("transition-transform duration-150", advanced && "rotate-180")}
          />
          {advanced ? t.advancedHide : t.advanced}
        </button>
      )}

      {showFields && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" data-assistant-fields="">
          <legend className="mb-1 p-0 text-label font-semibold text-ink">{t.fieldsLabel}</legend>
          <p className="m-0 text-caption font-normal text-ink-muted">
            {improve ? t.fieldsImprove : t.fieldsAuto}
          </p>
          {candidates.length === 0 ? (
            <p className="m-0 text-body-sm text-ink-muted">{t.noFields}</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto overscroll-contain rounded-md p-1 ring-1 ring-line">
              {candidates.map((key) => (
                <label
                  key={key}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-body-sm text-ink hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={settings.keys.includes(key)}
                    onChange={(event) => toggleKey(key, event.target.checked)}
                    className="size-4 shrink-0 accent-gold-ink"
                  />
                  <span className="min-w-0 break-words">{labelOf(key)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {unsaved && (
        <p className="m-0 flex items-start gap-2 text-caption font-normal text-ink-muted">
          <Icon name="info" size={16} className="shrink-0" />
          {t.unsaved}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink"
        >
          <Icon name="alert-triangle" size={18} className="shrink-0 text-danger" />
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onStart}
          busy={starting}
          disabledReason={composeBlocker(t, settings, product)}
        >
          <Icon name="sparkles" size={18} />
          {starting ? t.generating : t.generate}
        </Button>
      </div>
    </div>
  );
}
