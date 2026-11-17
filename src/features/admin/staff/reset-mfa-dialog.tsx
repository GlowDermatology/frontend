"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/dialog";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { RESET_REASON_MAX } from "@/data/mfa.schema";
import type { StaffAccountRow } from "@/domain/staff";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { staffCopy } from "./copy";
import type { ResetStaffMfaAction } from "./mfa-hook";
import { resetMfaCopy } from "./reset-mfa-copy";

/**
 * «MFA ni o‘chirish» (DESIGN §E "MFA", contract §2.16 `POST staff/{id}/reset-mfa/`): a manager
 * removes another member's admin panel MFA when their phone is lost. The confirmation names the
 * member, says their sessions end too, takes an optional reason, and posts once per dialog with
 * its own `Idempotency-Key` (renewed when the reason is edited after a refusal, since the key is
 * bound to the body). The backend refuses one's own account and a member without MFA (409): the
 * message shows in the dialog. Success: a toast and the row without the MFA badge.
 */
export function ResetMfaDialog({
  row,
  action,
  onClose,
  onDone,
}: {
  row: StaffAccountRow;
  action: ResetStaffMfaAction;
  onClose: () => void;
  onDone: (row: StaffAccountRow) => void;
}) {
  const t = useCopy(staffCopy);
  const r = useCopy(resetMfaCopy);
  const toast = useToast();
  const idempotency = useIdempotencyKey();
  const [open, setOpen] = useState(true);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const copy = t.confirm.resetMfa;

  const close = () => {
    if (inFlight.current) return;
    setOpen(false);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setReasonError(null);
    setAttempted(true);
    const key = idempotency.key;
    const result = idempotency.settle(
      await runAction((csrf) => action(row.id, key, csrf, row, reason.trim())),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const onReason = result.fieldErrors?.reason;
      if (onReason) {
        setReasonError(onReason);
        reveal();
      } else {
        setError(result.error);
      }
      toast({ tone: "danger", title: r.failed, description: onReason ?? result.error });
      return;
    }
    setOpen(false);
    onDone(result.data);
    toast({ tone: "success", title: copy.done, description: result.data.displayName });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={copy.title}
      description={
        <span className="flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
          <span className="font-semibold">{`${row.displayName} · ${row.email}`}</span>
          <span>{copy.body}</span>
        </span>
      }
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-3.5">
        <p className="m-0 flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-body-sm text-ink">
          <Icon name="logout" size={16} className="mt-0.5 shrink-0 text-warning" />
          {r.sessions}
        </p>
        <Field label={r.reason} hint={r.reasonHint} name="reason" error={reasonError ?? undefined}>
          {(control) => (
            <TextArea
              {...control}
              name="reason"
              rows={2}
              maxLength={RESET_REASON_MAX}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
                // The key is bound to the request body: an edited reason is a new request.
                if (attempted) {
                  idempotency.renew();
                  setAttempted(false);
                }
              }}
            />
          )}
        </Field>
        {error ? (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            <span>
              <span className="sr-only">{`${t.common.failed}: `}</span>
              {error}
            </span>
          </p>
        ) : null}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabledReason={busy && t.common.busy} onClick={close}>
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="destructive" busy={busy}>
            {busy ? t.common.working : copy.action}
          </Button>
        </div>
      </form>
    </AlertDialog>
  );
}
