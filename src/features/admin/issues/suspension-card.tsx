"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, Dialog, DialogClose } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Field, TextArea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateDispatchSuspension } from "@/data/delivery-issues.actions";
import { SUSPENSION_NOTE_MAX, type DispatchSuspension } from "@/domain/delivery-issue";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";
import { issuesCopy } from "./copy";
import { issueRefusal } from "./refusals";
import { localInputValue, suspensionLine, untilFromLocal, untilInPast } from "./suspension";

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
  const locale = useAdminLocale();
  const t = useCopy(issuesCopy);
  const s = t.suspension;
  const v = useCopy(validationCopy);
  const fmt = useFormat();
  const [suspension, setSuspension] = useState(initial);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ until?: string; note?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();
  const toast = useToast();

  const send = async (suspended: boolean): Promise<boolean> => {
    if (busy.current) return false;
    const aware = suspended ? untilFromLocal(until) : null;
    if (aware === undefined) {
      setErrors({ until: v.invalid });
      reveal();
      return false;
    }
    if (suspended && untilInPast(aware, new Date())) {
      setErrors({ until: s.untilPast });
      reveal();
      return false;
    }
    if (note.trim().length > SUSPENSION_NOTE_MAX) {
      setErrors({ note: v.maxChars(SUSPENSION_NOTE_MAX) });
      reveal();
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
        tone: "success",
        title: result.data.suspended ? s.stopped : s.resumed,
        description: suspensionLine(result.data, locale),
      });
      return true;
    }
    const refusal = issueRefusal(result, ["until", "note"]);
    if (refusal.kind === "field") {
      setErrors({ [refusal.field]: refusal.message });
      reveal();
    } else {
      setErrors({ form: refusal.message });
    }
    return false;
  };

  const onSuspend = async (event: FormEvent) => {
    event.preventDefault();
    // A half-typed end hands on "" like a native input: never read it as "until lifted by hand".
    const draft = formRef.current?.querySelector('[data-picker] input:not([type="hidden"])');
    if (until === "" && draft instanceof HTMLInputElement && draft.value.trim() !== "") {
      setErrors({ until: v.invalid });
      reveal();
      return;
    }
    if (await send(true)) {
      setSuspendOpen(false);
      setUntil("");
      setNote("");
    }
  };

  const formError = errors.form && (
    <p
      role="alert"
      className="m-0 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm font-semibold text-ink"
    >
      <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
      {errors.form}
    </p>
  );
  const backButton = (
    <Button type="button" variant="outline" disabledReason={pending && t.busyReason}>
      {t.back}
    </Button>
  );

  return (
    <section
      aria-labelledby="suspension-title"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="suspension-title" className="m-0 text-[16px] leading-[22px] font-bold text-ink">
            {s.title}
          </h2>
          <Badge tone={suspension.suspended ? "danger" : "success"}>
            {suspension.suspended ? s.suspended : s.active}
          </Badge>
        </div>
        <p className="m-0 text-body-sm text-ink" aria-live="polite">
          {suspensionLine(suspension, locale)}
        </p>
        {suspension.suspended && suspension.note && (
          <p className="m-0 text-body-sm break-words text-ink-muted">{s.note(suspension.note)}</p>
        )}
        <p className="m-0 text-caption text-ink-muted">
          {s.explain} {s.lastChange}{" "}
          <time dateTime={suspension.updatedAt}>{fmt.dateTimeShort(suspension.updatedAt)}</time>
        </p>
      </div>
      <Switch
        aria-label={s.switchLabel}
        checked={suspension.suspended}
        busy={pending}
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
        title={s.stopTitle}
        description={s.stopDescription}
      >
        <form ref={formRef} noValidate onSubmit={onSuspend} className="flex flex-col gap-3.5">
          <div data-field="until">
            <Field label={s.untilLabel} hint={s.untilHint} error={errors.until}>
              {(control) => (
                <DateTimePicker
                  {...control}
                  name="until"
                  value={until}
                  min={localInputValue(now)}
                  onValueChange={(value) => {
                    setUntil(value);
                    setErrors((e) => ({ ...e, until: undefined }));
                  }}
                />
              )}
            </Field>
          </div>
          <div data-field="note">
            <Field
              label={s.noteLabel}
              error={errors.note}
              aside={
                <span
                  className={
                    note.trim().length > SUSPENSION_NOTE_MAX
                      ? "text-caption font-bold text-danger tabular-nums"
                      : "text-caption text-ink-muted tabular-nums"
                  }
                >
                  {note.trim().length}/{SUSPENSION_NOTE_MAX}
                </span>
              }
            >
              {(control) => (
                <TextArea
                  {...control}
                  name="note"
                  value={note}
                  rows={2}
                  maxLength={SUSPENSION_NOTE_MAX + 20}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={s.notePlaceholder}
                  className="text-[14px] leading-5"
                />
              )}
            </Field>
          </div>
          {formError}
          <div className="mt-1.5 flex flex-wrap justify-end gap-2">
            <DialogClose asChild>{backButton}</DialogClose>
            <Button type="submit" variant="destructive" busy={pending}>
              {pending ? s.saving : s.stop}
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
        title={s.resumeTitle}
        description={<p className="m-0 text-[14px] leading-5 text-ink">{s.resumeDescription}</p>}
      >
        {formError}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>{backButton}</AlertDialogCancel>
          <Button
            busy={pending}
            onClick={async () => {
              if (await send(false)) setResumeOpen(false);
            }}
          >
            {pending ? s.saving : s.resume}
          </Button>
        </div>
      </AlertDialog>
    </section>
  );
}
