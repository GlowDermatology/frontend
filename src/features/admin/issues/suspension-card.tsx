"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, Dialog, DialogClose } from "@/components/ui/dialog";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateDispatchSuspension } from "@/data/delivery-issues.actions";
import { SUSPENSION_NOTE_MAX, type DispatchSuspension } from "@/domain/delivery-issue";
import { formatDateTimeShort } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { issueRefusal } from "./refusals";
import { localInputValue, suspensionLine, untilFromLocal } from "./suspension";

const INVALID_UNTIL = "Noto‘g‘ri qiymat.";

/**
 * The courier-dispatch switch (`GET/POST delivery/suspension/`, plan
 * decision 13): while it is on, no courier is called (checkout stops
 * offering Yandex and the queue reminds staff). Turning it on asks for an
 * optional end (Tashkent time; empty = until lifted by hand) and a note;
 * turning it off is confirmed. The card shows the server's answer.
 */
export function SuspensionCard({
  initial,
  now,
}: {
  initial: DispatchSuspension;
  /** Render time (ISO), the earliest `until` the picker offers. */
  now: string;
}) {
  const [suspension, setSuspension] = useState(initial);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ until?: string; note?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const idempotency = useIdempotencyKey();
  const toast = useToast();

  const send = async (suspended: boolean): Promise<boolean> => {
    if (busy.current) return false;
    const aware = suspended ? untilFromLocal(until) : null;
    if (aware === undefined) {
      setErrors({ until: INVALID_UNTIL });
      return false;
    }
    if (note.trim().length > SUSPENSION_NOTE_MAX) {
      setErrors({ note: `${SUSPENSION_NOTE_MAX} belgidan oshmasin.` });
      return false;
    }
    busy.current = true;
    setPending(true);
    setErrors({});
    const result = idempotency.settle(
      await runAction((csrf) =>
        updateDispatchSuspension(
          { suspended, until: aware, note: suspended ? note : "" },
          idempotency.key,
          csrf,
        ),
      ),
    );
    busy.current = false;
    setPending(false);
    if (result.ok) {
      setSuspension(result.data);
      toast({
        title: result.data.suspended ? "Kuryer chaqirish to‘xtatildi" : "Kuryer chaqirish yoqildi",
        description: suspensionLine(result.data),
      });
      return true;
    }
    const refusal = issueRefusal(result, ["until", "note"]);
    if (refusal.kind === "field") setErrors({ [refusal.field]: refusal.message });
    else setErrors({ form: refusal.message });
    return false;
  };

  const onSuspend = async (event: FormEvent) => {
    event.preventDefault();
    if (await send(true)) {
      setSuspendOpen(false);
      setUntil("");
      setNote("");
    }
  };

  const formError = errors.form && (
    <p role="alert" className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink">
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {errors.form}
    </p>
  );

  return (
    <section
      aria-labelledby="suspension-title"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="suspension-title" className="m-0 text-[16px] leading-[22px] font-bold text-ink">
            Kuryer chaqirish
          </h2>
          <Badge tone={suspension.suspended ? "danger" : "success"}>
            {suspension.suspended ? "To‘xtatilgan" : "Faol"}
          </Badge>
        </div>
        <p className="m-0 text-body-sm text-ink" aria-live="polite">
          {suspensionLine(suspension)}
        </p>
        {suspension.suspended && suspension.note && (
          <p className="m-0 text-body-sm text-ink-muted">Izoh: {suspension.note}</p>
        )}
        <p className="m-0 text-caption text-ink-muted">
          To‘xtatilganda yangi kuryer chaqirilmaydi va saytda Yandex yetkazish taklif qilinmaydi.
          Oxirgi o‘zgarish:{" "}
          <time dateTime={suspension.updatedAt}>{formatDateTimeShort(suspension.updatedAt)}</time>
        </p>
      </div>
      <Switch
        aria-label="Kuryer chaqirishni to‘xtatish"
        checked={suspension.suspended}
        disabled={pending}
        onCheckedChange={(checked) => {
          setErrors({});
          if (checked) setSuspendOpen(true);
          else setResumeOpen(true);
        }}
      />

      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          if (pending) return;
          if (!open) setErrors({});
          setSuspendOpen(open);
        }}
        title="Kuryer chaqirishni to‘xtatasizmi?"
        description="Masalan, ombor yopilganda yoki inventarizatsiya paytida. Ochiq buyurtmalar o‘z holicha qoladi."
      >
        <form noValidate onSubmit={onSuspend} className="flex flex-col gap-3.5">
          <Field
            label="Qachongacha (ixtiyoriy)"
            hint="Bo‘sh qoldirilsa, qo‘lda yoqilguncha to‘xtab turadi. Toshkent vaqti."
            error={errors.until}
          >
            {(control) => (
              <TextInput
                {...control}
                type="datetime-local"
                value={until}
                min={localInputValue(now)}
                onChange={(event) => setUntil(event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Izoh (ixtiyoriy)"
            error={errors.note}
            aside={
              <span className="text-caption text-ink-muted tabular-nums">
                {note.trim().length}/{SUSPENSION_NOTE_MAX}
              </span>
            }
          >
            {(control) => (
              <TextArea
                {...control}
                value={note}
                rows={2}
                maxLength={SUSPENSION_NOTE_MAX + 20}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Masalan: ombor inventarizatsiyada"
                className="text-[14px] leading-5"
              />
            )}
          </Field>
          {formError}
          <div className="mt-1.5 flex flex-wrap justify-end gap-2">
            <DialogClose disabled={pending} className={buttonStyles({ variant: "outline" })}>
              Orqaga
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending} aria-busy={pending}>
              {pending ? "Saqlanmoqda…" : "To‘xtatish"}
            </Button>
          </div>
        </form>
      </Dialog>

      <AlertDialog
        open={resumeOpen}
        onOpenChange={(open) => {
          if (pending) return;
          if (!open) setErrors({});
          setResumeOpen(open);
        }}
        title="Kuryer chaqirishni qayta yoqasizmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Xodimlar yana Yandex kuryerini chaqira oladi, saytda Yandex yetkazish qayta taklif
            qilinadi.
          </p>
        }
      >
        {formError}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={pending} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            disabled={pending}
            aria-busy={pending}
            onClick={async () => {
              if (await send(false)) setResumeOpen(false);
            }}
          >
            {pending ? "Saqlanmoqda…" : "Qayta yoqish"}
          </Button>
        </div>
      </AlertDialog>
    </section>
  );
}
