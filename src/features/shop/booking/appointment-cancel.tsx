"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { cancelAppointment } from "@/data/shop/commerce.actions";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert } from "../account/controls";
import { failureText, useShopAction } from "../account/use-shop-action";
import { bookingCopy } from "../copy/booking";

/** "Bekor qilish" of one appointment, behind a confirmation (contract §2.11). */
export function AppointmentCancel({
  locale,
  id,
  when,
}: {
  locale: Locale;
  id: number;
  when: string;
}) {
  const copy = bookingCopy[locale].appointments;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useShopAction(locale);
  const key = useIdempotencyKey();

  const cancel = async () => {
    const result = key.settle(
      await run((csrf) => cancelAppointment({ locale, id, idempotencyKey: key.key, csrf })),
    );
    setOpen(false);
    if (result.ok) router.refresh();
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {copy.cancel}
      </Button>
      {error ? <FormAlert className="mt-2">{failureText(error, locale)}</FormAlert> : null}
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.cancelTitle}
        description={<p className="m-0 text-body text-ink-muted">{copy.cancelBody(when)}</p>}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="secondary">{copy.cancelKeep}</Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void cancel()}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {copy.cancelConfirm}
          </Button>
        </div>
      </AlertDialog>
    </>
  );
}
