"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { mfaSettingsCopy } from "./mfa-copy";
import { recoveryCodesClipboard, recoveryCodesFile } from "./mfa-model";

interface RecoveryCodesProps {
  codes: ReadonlyArray<string>;
  /** The account the codes belong to (written into the file). */
  account: string | null;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  /** The dialog tried to close before «I saved them»: the checkbox is marked invalid. */
  needsConfirm: boolean;
}

/**
 * The ten recovery codes, shown once (DESIGN §E "MFA"): a numbered grid in large mono figures,
 * «copy all», «download (.txt)» (a local Blob, nothing is uploaded) and the «I saved them»
 * confirmation that the dialog requires before it closes. The codes live in the dialog's state only.
 */
export function RecoveryCodes({
  codes,
  account,
  saved,
  onSavedChange,
  needsConfirm,
}: RecoveryCodesProps) {
  const t = useCopy(mfaSettingsCopy).codes;
  const fmt = useFormat();
  const toast = useToast();
  const listId = useId();
  const checkId = useId();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodesClipboard(codes));
      setCopied(true);
      toast({ tone: "success", title: t.copied });
    } catch {
      toast({ tone: "warning", title: t.copyFailed, description: t.copyFailedLead });
    }
  };

  const download = () => {
    const text = recoveryCodesFile(codes, t, account, fmt.dateTimeLong(new Date().toISOString()));
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t.fileName;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    // Give the download a moment to start before the object URL goes.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ tone: "success", title: t.downloaded });
  };

  return (
    <div className="flex flex-col gap-4" data-recovery-codes="">
      <p className="m-0 flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning-soft px-3.5 py-3 text-body-sm text-pretty text-ink">
        <Icon name="alert-triangle" size={18} className="mt-px shrink-0 text-warning" />
        {t.lead}
      </p>
      <span id={listId} className="sr-only">
        {t.listLabel}
      </span>
      <ol
        aria-labelledby={listId}
        className="m-0 grid list-none grid-cols-1 gap-2 rounded-lg border border-gold-ink/25 bg-gold-soft/40 p-3.5 min-[380px]:grid-cols-2"
      >
        {codes.map((code, index) => (
          <li
            key={code}
            className="flex animate-fade-in items-center gap-2.5 rounded-md bg-surface-raised px-3 py-2 shadow-sm"
          >
            <span
              aria-hidden="true"
              className="w-5 text-right text-caption text-ink-muted tabular-nums"
            >
              {index + 1}
            </span>
            <code className="font-mono text-[15px] font-semibold tracking-[0.06em] text-ink select-all">
              {code}
            </code>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copy}>
          <Icon name={copied ? "check" : "receipt"} size={18} />
          {t.copyAll}
        </Button>
        <Button variant="outline" onClick={download}>
          <Icon name="download" size={18} />
          {t.download}
        </Button>
      </div>
      <label
        htmlFor={checkId}
        data-field="saved"
        data-invalid={needsConfirm && !saved ? "true" : undefined}
        data-reveal-box=""
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-md border-[1.5px] px-3.5 py-3 transition-colors duration-150",
          saved ? "border-success/50 bg-success-soft" : "border-line-strong bg-surface-raised",
          needsConfirm && !saved && "border-danger",
        )}
      >
        <input
          id={checkId}
          type="checkbox"
          checked={saved}
          onChange={(event) => onSavedChange(event.target.checked)}
          aria-invalid={needsConfirm && !saved ? true : undefined}
          aria-describedby={`${checkId}-hint`}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-gold-ink)]"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-label text-ink">{t.saved}</span>
          <span id={`${checkId}-hint`} className="text-caption text-ink-muted">
            {needsConfirm && !saved ? t.mustConfirm : t.savedHint}
          </span>
        </span>
      </label>
    </div>
  );
}
