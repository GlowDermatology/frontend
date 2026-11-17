"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { recoveryCodesLow, type MfaStatus } from "@/domain/settings";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { DisableMfaDialog, EnableMfaDialog, RegenerateCodesDialog } from "./mfa-dialogs";
import { mfaSettingsCopy } from "./mfa-copy";

type Open = "enable" | "disable" | "regenerate" | null;

/**
 * Settings → «Ikki bosqichli himoya» (DESIGN §E "MFA"), next to the password form: whether the
 * admin panel MFA is on, how many recovery codes are left (a warning at 3 or fewer), and the three
 * flows — turn on (password → QR code / manual key → first code → recovery codes shown once), turn
 * off and new recovery codes (password + code). Optional and personal: only the member decides.
 * `status` is `null` when `auth/mfa/` could not be read: no actions then. After a dialog the page
 * is refreshed, so the card shows the server's state.
 */
export function MfaCard({ status, account }: { status: MfaStatus | null; account: string | null }) {
  const t = useCopy(mfaSettingsCopy);
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  // Each opening mounts a fresh dialog: the secret and the codes never outlive it.
  const [instance, setInstance] = useState(0);
  const show = (which: Exclude<Open, null>) => {
    setInstance((n) => n + 1);
    setOpen(which);
  };
  const dialog = {
    onOpenChange: (next: boolean) => {
      if (!next) setOpen(null);
    },
    onChanged: () => router.refresh(),
    account,
  };
  const low = status ? recoveryCodesLow(status) : false;

  return (
    <Card aria-labelledby="mfa-title" className="flex flex-col gap-5 p-6" data-mfa-card="">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            status?.enabled ? "bg-success-soft text-success" : "bg-gold-soft text-gold-ink",
          )}
        >
          <Icon name={status?.enabled ? "shield-check" : "shield"} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle id="mfa-title">{t.title}</CardTitle>
            {status ? (
              <Badge tone={status.enabled ? "success" : "neutral"}>
                {status.enabled ? t.on : t.off}
              </Badge>
            ) : null}
          </div>
          <p className="m-0 text-body-sm [text-wrap:pretty] text-ink-muted">{t.lead}</p>
        </div>
      </div>

      {status === null ? (
        <p role="status" className="m-0 flex items-start gap-2 text-body-sm text-ink">
          <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0 text-danger" />
          {t.unknown}
        </p>
      ) : status.enabled ? (
        <div className="flex flex-col gap-4">
          <p
            className={cn(
              "m-0 flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-body-sm",
              low
                ? "border-warning/45 bg-warning-soft text-ink"
                : "border-line bg-surface text-ink",
            )}
            data-codes-left={status.recoveryCodesLeft}
          >
            <Icon
              name={low ? "alert-triangle" : "lock"}
              size={18}
              className={cn("mt-px shrink-0", low ? "text-warning" : "text-gold-ink")}
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t.codesLeft(status.recoveryCodesLeft)}</span>
              {low ? (
                <span>{status.recoveryCodesLeft === 0 ? t.codesNone : t.codesLow}</span>
              ) : null}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant={low ? "primary" : "secondary"} onClick={() => show("regenerate")}>
              <Icon name="refresh" size={18} />
              {t.regenerate}
            </Button>
            <Button variant="danger" onClick={() => show("disable")}>
              {t.disable}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-start gap-1.5 text-caption text-ink-muted">
            <Icon name="user" size={14} className="mt-px shrink-0" />
            {t.personal}
          </p>
          <Button onClick={() => show("enable")}>
            <Icon name="shield-check" size={18} />
            {t.enable}
          </Button>
        </div>
      )}

      {open === "enable" ? <EnableMfaDialog key={`enable-${instance}`} open {...dialog} /> : null}
      {open === "disable" ? (
        <DisableMfaDialog key={`disable-${instance}`} open {...dialog} />
      ) : null}
      {open === "regenerate" ? (
        <RegenerateCodesDialog key={`regenerate-${instance}`} open {...dialog} />
      ) : null}
    </Card>
  );
}
