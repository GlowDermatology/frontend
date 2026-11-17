"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { StaffCredentials } from "@/domain/staff";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { staffCopy } from "./copy";

export type CredentialsKind = "invited" | "reset" | "resent";

export interface ShownCredentials {
  kind: CredentialsKind;
  data: StaffCredentials;
}

/** The dialog's title for what happened (pure; the password decides between the reset titles). */
export function credentialsTitle(
  shown: ShownCredentials,
  t: (typeof staffCopy)["uz"]["credentials"],
): string {
  if (shown.kind === "invited") return t.invited;
  if (shown.kind === "resent") return t.resent;
  return shown.data.temporaryPassword ? t.resetPassword : t.resetLink;
}

/**
 * What an invitation, a reset or a resent link produced (contract §7 item 20, DESIGN §E): the
 * temporary password shown once with a copy button and "hand it over in person", the note that the
 * password must be changed at the first sign-in, and where the e-mailed link went and until when.
 * The password lives in this dialog's props only and is dropped on close.
 */
export function CredentialsDialog({
  shown,
  onClose,
}: {
  shown: ShownCredentials | null;
  onClose: () => void;
}) {
  const t = useCopy(staffCopy).credentials;
  const fmt = useFormat();
  const toast = useToast();
  const labelId = useId();
  const [copied, setCopied] = useState(false);
  const password = shown?.data.temporaryPassword ?? null;
  const activation = shown?.data.activation ?? null;
  const staff = shown?.data.staff;

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({ tone: "success", title: t.copiedToast });
    } catch {
      toast({ tone: "warning", title: t.copyFailed, description: t.copyFailedLead });
    }
  };

  const close = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Dialog
      open={shown !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={shown ? credentialsTitle(shown, t) : ""}
      description={staff ? `${staff.displayName} · ${staff.email}` : undefined}
      className="max-w-[540px]"
    >
      {shown && shown.kind !== "resent" && password ? (
        <div className="flex flex-col gap-3">
          <span className="text-label text-ink" id={labelId}>
            {t.password}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <output
              aria-labelledby={labelId}
              data-testid="temporary-password"
              className="flex min-h-12 min-w-[220px] flex-1 animate-fade-in items-center rounded-md border border-gold-ink/30 bg-gold-soft px-4 py-2.5 font-mono text-[17px] font-semibold tracking-[0.08em] break-all text-ink select-all"
            >
              {password}
            </output>
            <Button variant="secondary" onClick={copy}>
              <Icon name={copied ? "check" : "receipt"} size={18} />
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-body-sm text-ink">
            <li className="flex items-start gap-2">
              <Icon name="user" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
              {t.handOver}
            </li>
            <li className="flex items-start gap-2">
              <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
              <span>
                <span className="font-semibold">{t.mustChange}</span> {t.activation}
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      {activation && staff ? (
        <div className="flex animate-fade-in items-start gap-3 rounded-md border border-line bg-surface px-4 py-3.5">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
          >
            <Icon name="send" size={16} />
          </span>
          <div className="flex min-w-0 flex-col gap-1 text-body-sm text-ink" data-activation="">
            <p className="m-0 font-semibold">
              {activation.sent ? t.linkSent(staff.email) : t.linkQueued(staff.email)}
            </p>
            {activation.expiresAt ? (
              <p className="m-0">{t.linkValid(fmt.dateTimeShort(activation.expiresAt))}</p>
            ) : null}
            {!password ? <p className="m-0 text-ink-muted">{t.linkActivation}</p> : null}
            {activation.demo ? <p className="m-0 text-ink-muted">{t.linkDemo}</p> : null}
          </div>
        </div>
      ) : null}

      {shown && !password && !activation ? (
        <p className="m-0 flex items-start gap-2 text-body-sm text-ink">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-danger" />
          {t.noPassword}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={close}>{t.done}</Button>
      </div>
    </Dialog>
  );
}
