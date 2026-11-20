"use client";

import { Button, buttonStyles, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionMenu } from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";
import { fieldMode, fillTargets, type AssistantDraft } from "@/domain/assistant";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { assistantCopy } from "./copy";
import { fieldBlocker, menuBlocker, problemText, warningTexts, type MenuAction } from "./review";
import type { ProductAssistant } from "./use-product-assistant";

/**
 * The assistant's pieces in the product editor: the header menu, the ✨ next to a field, the note
 * under a field the AI wrote (or could not write), and the banner after a menu command. The state
 * lives in `useProductAssistant` (owned by the editor); `draft` is the form's current values, so
 * every label and reason follows what the admin has typed.
 */

const MENU_ACTIONS: ReadonlyArray<MenuAction> = ["fill", "improve", "photos"];

/** «✨ AI yordamchi»: three plain commands with a one-line hint each. */
export function AssistantMenu({ ai, draft }: { ai: ProductAssistant; draft: AssistantDraft }) {
  const t = useCopy(assistantCopy);
  if (!ai.enabled) return null;
  const fillCount = fillTargets(draft).length;
  return (
    <ActionMenu
      label={t.button}
      busy={ai.running}
      triggerClassName={buttonStyles({ variant: "ghost" })}
      trigger={
        <span
          className="flex items-center gap-2"
          data-assistant-state={ai.running ? "running" : "idle"}
        >
          <Icon
            name={ai.running ? "refresh" : "sparkles"}
            size={18}
            className={cn("text-gold-ink", ai.running && "animate-spin motion-reduce:animate-none")}
          />
          {ai.running ? t.buttonRunning : t.button}
        </span>
      }
      items={MENU_ACTIONS.map((action) => ({
        key: action,
        label: t[action].label,
        hint: action === "fill" ? t.fill.hint(fillCount) : t[action].hint,
        disabledReason: menuBlocker(t, action, draft, ai.savedImageIds),
        onSelect: () => ai.runMenu(action),
      }))}
    />
  );
}

interface FieldProps {
  ai: ProductAssistant;
  draft: AssistantDraft;
  /** The assistant key of the field (`texts.ru.description`, `seo.uz.title`, …). */
  aiKey: string;
  /** The field's label (the button is named after it). */
  label: string;
}

/**
 * The ✨ next to a field's label: writes the field when it is empty, rewrites it when filled. A
 * photo the server does not know yet (no key in the draft) has none.
 */
export function AiFieldButton({ ai, draft, aiKey, label }: FieldProps) {
  const t = useCopy(assistantCopy);
  if (!ai.enabled || !(aiKey in draft)) return null;
  const spinning = ai.fieldKeys.includes(aiKey);
  const write = fieldMode(draft, aiKey) === "fill_missing";
  const reason = spinning ? undefined : fieldBlocker(t, draft, aiKey, ai.running);
  const button = (
    <IconButton
      size="sm"
      aria-label={write ? t.field.writeAria(label) : t.field.rewriteAria(label)}
      data-ai-field={aiKey}
      busy={spinning}
      disabledReason={reason}
      onClick={() => ai.runField(aiKey)}
      className="-my-2 size-8 text-gold-ink hover:text-gold-ink"
    >
      <Icon
        name={spinning ? "refresh" : "sparkles"}
        size={16}
        className={cn(spinning && "animate-spin motion-reduce:animate-none")}
      />
    </IconButton>
  );
  if (reason) return button;
  return <Tooltip content={write ? t.field.write : t.field.rewrite}>{button}</Tooltip>;
}

/** The gold ring of a field holding an AI text (not saved yet). */
export function aiFieldClass(ai: ProductAssistant, aiKey: string): string | false {
  return aiKey in ai.changes && "border-gold ring-2 ring-gold-soft";
}

/**
 * Under a field the AI wrote: «✨ AI text — check it and save», its warnings in plain words,
 * «Undo» and «Another version». Under a field whose ✨ produced nothing: why.
 */
export function AiFieldNote({ ai, aiKey }: { ai: ProductAssistant; aiKey: string }) {
  const t = useCopy(assistantCopy);
  if (!ai.enabled) return null;
  const change = ai.changes[aiKey];
  const problem = ai.problems[aiKey];
  if (change) {
    const warnings = warningTexts(t, change.warnings);
    return (
      <div
        data-ai-note={aiKey}
        className="flex flex-col gap-1.5 rounded-md bg-gold-soft px-3 py-2 text-body-sm text-ink"
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name="sparkles" size={16} className="shrink-0 text-gold-ink" />
          {t.note.title}
        </span>
        {warnings.map((warning) => (
          <span key={warning} className="flex items-start gap-1.5">
            <Icon name="alert-triangle" size={16} className="mt-px shrink-0 text-warning" />
            {warning}
          </span>
        ))}
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => ai.undo(aiKey)}>
            {t.note.undo}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabledReason={ai.running ? t.field.wait : undefined}
            onClick={() => ai.runField(aiKey)}
          >
            <Icon name="refresh" size={16} />
            {t.note.again}
          </Button>
        </span>
      </div>
    );
  }
  if (problem?.kind === "review" && problem.suggested !== undefined) {
    return (
      <div
        role="status"
        data-ai-problem="review"
        className="flex flex-col gap-1.5 rounded-md bg-gold-soft px-3 py-2 text-body-sm text-ink"
      >
        <span className="flex items-start gap-1.5 font-semibold">
          <Icon name="sparkles" size={16} className="mt-px shrink-0 text-gold-ink" />
          {problemText(t, problem)}
        </span>
        <p className="m-0 break-words whitespace-pre-wrap">{problem.suggested}</p>
        {warningTexts(t, problem.warnings ?? []).map((warning) => (
          <span key={warning} className="flex items-start gap-1.5">
            <Icon name="alert-triangle" size={16} className="mt-px shrink-0 text-warning" />
            {warning}
          </span>
        ))}
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => ai.insertSuggestion(aiKey)}>
            {t.note.insert}
          </Button>
        </span>
      </div>
    );
  }
  if (problem) {
    return (
      <p
        role="status"
        data-ai-problem={problem.kind}
        className="m-0 flex items-start gap-1.5 text-body-sm text-ink-muted"
      >
        <Icon
          name={problem.kind === "unchanged" ? "info" : "alert-triangle"}
          size={16}
          className={cn(
            "mt-px shrink-0",
            problem.kind === "unchanged" ? "text-gold-ink" : "text-warning",
          )}
        />
        {problemText(t, problem)}
      </p>
    );
  }
  return null;
}

/** After a menu command: how many fields the AI wrote, and why the others were not changed. */
export function AssistantBannerView({
  ai,
  labelOf,
}: {
  ai: ProductAssistant;
  labelOf: (key: string) => string;
}) {
  const t = useCopy(assistantCopy);
  const banner = ai.banner;
  if (!ai.enabled || !banner) return null;
  const problems = banner.kind === "nothingToFill" ? [] : banner.problems;
  const lead =
    banner.kind === "filled"
      ? t.banner.filled(banner.count)
      : banner.kind === "nothingToFill"
        ? t.nothingToFill
        : problems.length > 0
          ? t.banner.nothing
          : t.reasons.fallback;
  const hasChanges = Object.keys(ai.changes).length > 0;
  const extracted = banner.kind === "nothingToFill" ? null : banner.extracted;
  return (
    <div
      role="status"
      data-assistant-banner={banner.kind}
      className="flex flex-col gap-2 rounded-md bg-gold-soft px-3.5 py-3 text-body-sm text-ink"
    >
      <div className="flex items-start gap-2.5">
        <Icon name="sparkles" size={18} className="mt-px shrink-0 text-gold-ink" />
        <p className="m-0 min-w-0 flex-1 font-semibold">{lead}</p>
        <IconButton
          size="sm"
          aria-label={t.banner.dismiss}
          onClick={ai.dismissBanner}
          className="-my-1.5 size-8"
        >
          <Icon name="close" size={16} />
        </IconButton>
      </div>
      {extracted && <p className="m-0 pl-7">{t.banner.extracted(extracted)}</p>}
      {problems.length > 0 && (
        <div className="flex flex-col gap-1 pl-7">
          {banner.kind === "filled" && <p className="m-0">{t.banner.notChanged}</p>}
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            {problems.map(({ key, problem }) => (
              <li key={key}>
                <span className="font-semibold">{labelOf(key)}</span> — {problemText(t, problem)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {banner.kind === "filled" && hasChanges && (
        <div className="pl-7">
          <Button size="sm" variant="outline" onClick={ai.undoAll}>
            {t.banner.undoAll}
          </Button>
        </div>
      )}
    </div>
  );
}
