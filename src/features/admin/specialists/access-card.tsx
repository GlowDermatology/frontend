"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { convertSpecialist } from "@/data/specialist.actions";
import type { ClinicSpecialist } from "@/domain/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { myScheduleCopy } from "../my-schedule/copy";
import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { CredentialsDialog, type ShownCredentials } from "../staff/credentials-dialog";
import { InviteDialog } from "../staff/staff-dialogs";

export function SpecialistAccessCard({
  specialist,
  emailInvite,
}: {
  specialist: ClinicSpecialist;
  emailInvite: boolean;
}) {
  const t = useCopy(myScheduleCopy);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [conversion, setConversion] = useState(false);
  const [shown, setShown] = useState<ShownCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const inviteKey = useIdempotencyKey();
  const convertKey = useIdempotencyKey();
  const linked = specialist.staffUser;
  return (
    <Card className="grid gap-3">
      <CardTitle>{t.access}</CardTitle>
      {linked && <p className="m-0 text-body-sm">{linked.name}</p>}
      {!linked && (
        <Button className="justify-self-start" onClick={() => setOpen(true)}>
          {t.invite}
        </Button>
      )}
      {linked && linked.role !== "specialist" && (
        <Button
          className="justify-self-start"
          variant="outline"
          onClick={() => {
            setError(null);
            setConversion(true);
          }}
        >
          {t.convert}
        </Button>
      )}
      {open && (
        <InviteDialog
          open={open}
          onOpenChange={setOpen}
          idempotency={inviteKey}
          emailInvite={emailInvite}
          specialist={{
            id: specialist.id,
            name: specialist.name,
            title: t.invite,
            description: t.inviteDescription,
          }}
          onInvited={(data) => setShown({ kind: "invited", data })}
        />
      )}
      <CredentialsDialog shown={shown} onClose={() => setShown(null)} />
      <AlertDialog
        open={conversion}
        onOpenChange={(next) => {
          if (!busy) setConversion(next);
        }}
        title={t.convert}
        description={t.convertDescription}
      >
        {error && (
          <p role="alert" className="m-0 text-body-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">{t.close}</Button>
          </AlertDialogCancel>
          <Button
            busy={busy}
            onClick={() => {
              if (!linked || busy) return;
              startTransition(async () => {
                const result = convertKey.settle(
                  await runAction((csrf) =>
                    convertSpecialist(specialist.id, linked.id, convertKey.key, csrf),
                  ),
                );
                if (result.ok) {
                  setConversion(false);
                  toast({ tone: "success", title: t.converted });
                } else {
                  setError(result.error);
                }
              });
            }}
          >
            {t.convert}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}
