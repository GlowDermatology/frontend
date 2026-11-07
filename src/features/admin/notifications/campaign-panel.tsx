"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast, type ToastInput } from "@/components/ui/toast";
import {
  approveNotification,
  cancelNotification,
  confirmCampaignTest,
  deleteNotificationDraft,
  returnNotificationToDraft,
  sendCampaignTest,
  stopNotification,
} from "@/data/notifications.actions";
import type { NotificationsMe } from "@/data/notifications";
import type { ActionResult } from "@/data/types";
import {
  allowedActions,
  confirmableTests,
  dispatchEta,
  type CampaignAction,
} from "@/domain/campaign-actions";
import {
  NOTIFICATION_KIND_LABEL,
  type CampaignTest,
  type NotificationRecord,
  type TestDevice,
} from "@/domain/notification";
import { cn } from "@/lib/cn";
import { formatCountdown, useCountdownTo } from "@/lib/countdown";
import { formatDateTimeShort, formatNumber, formatPhone } from "@/lib/format";

import { runAction } from "../shared/action-client";
import {
  actionKeyFor,
  applyCampaignOutcome,
  campaignOutcome,
  settleActionKey,
} from "./campaign-outcomes";
import { InlineError } from "./composer";
import { StateBadge } from "./history-table";

/**
 * The campaign panel («Batafsil» in the history): the record's content,
 * audience, counters and timeline, its tests, and the controls the
 * signed-in staff member may use (`allowedActions`; the backend decides the
 * role, the client only hides). The author edits or deletes a draft; a
 * superuser sends a test push to registered devices, confirms a delivered
 * test, approves the send (it starts after the approval delay, cancellable
 * until then with a live countdown), returns a waiting or cancelled campaign
 * to draft, or stops a send in progress. Every operation keeps one
 * idempotency key per campaign until it succeeds (contract §1.7).
 */

export const CAMPAIGN_PANEL_ID = "campaign-panel";

export const IRREVERSIBLE_MESSAGE = "Yuborilgan push xabarni qaytarib bo‘lmaydi.";

type DialogKind = "approve" | "cancel" | "stop" | "delete" | "test";

export interface CampaignPanelProps {
  record: NotificationRecord;
  me: NotificationsMe;
  approvalDelayMinutes: number;
  /** The registered test devices; `null` for an ordinary admin. */
  testDevices: ReadonlyArray<TestDevice> | null;
  onReplace: (record: NotificationRecord) => void;
  /** The campaign is gone (deleted, or 404): drop it from the history and close the panel. */
  onDrop: (campaignId: string) => void;
  onEdit: (record: NotificationRecord) => void;
  onClose: () => void;
}

export function CampaignPanel({
  record,
  me,
  approvalDelayMinutes,
  testDevices,
  onReplace,
  onDrop,
  onEdit,
  onClose,
}: CampaignPanelProps) {
  const toast = useToast();
  const idBase = useId();
  const actions = new Set<CampaignAction>(allowedActions(record, me));
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  // The dialog kind kept while it closes, so its text does not empty out mid-animation.
  const [shownDialog, setShownDialog] = useState<DialogKind | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const keys = useRef(new Map<string, string>());
  const [pickedDevices, setPickedDevices] = useState<ReadonlySet<string>>(new Set());

  const openDialog = (kind: DialogKind) => {
    setDialogError(null);
    setPanelError(null);
    setShownDialog(kind);
    setDialog(kind);
    if (kind === "test") {
      setPickedDevices(new Set((testDevices ?? []).filter((d) => d.isPushable).map((d) => d.id)));
    }
  };

  /** Runs one operation with its own key and applies the shared outcome rules. */
  const perform = async (
    action: CampaignAction | "delete",
    invoke: (key: string, csrf: string) => Promise<ActionResult<NotificationRecord>>,
    success: ToastInput | ((answered: NotificationRecord) => ToastInput),
    label: string,
  ) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(label);
    setDialogError(null);
    setPanelError(null);
    const key = actionKeyFor(keys.current, action, record.id);
    const result = await runAction((csrf) => invoke(key, csrf));
    inFlight.current = false;
    setPending(null);
    settleActionKey(keys.current, action, record.id, result);
    const outcome = campaignOutcome(result);
    const toastInput =
      typeof success === "function"
        ? success(outcome.type === "done" ? outcome.record : record)
        : success;
    applyCampaignOutcome(outcome, record, toastInput, {
      showError: dialog ? setDialogError : setPanelError,
      close: () => setDialog(null),
      replaceRecord: onReplace,
      dropRecord: onDrop,
      toast,
    });
  };

  const approve = () =>
    perform(
      "approve",
      (key, csrf) => approveNotification(record.id, record.revision, key, csrf),
      (answered) => ({
        title: "Yuborish tasdiqlandi",
        description: answered.dispatchAfter
          ? `${formatDateTimeShort(answered.dispatchAfter)} dan keyin yuboriladi; ungacha bekor qilish mumkin`
          : "Ungacha bekor qilish mumkin",
      }),
      "approve",
    );

  const cancel = () =>
    perform(
      "cancel",
      (key, csrf) => cancelNotification(record.id, key, csrf),
      { title: "Xabar bekor qilindi", description: `«${record.title}» yuborilmaydi` },
      "cancel",
    );

  const stop = () =>
    perform(
      "stop",
      (key, csrf) => stopNotification(record.id, key, csrf),
      {
        title: "To‘xtatish so‘raldi",
        description: "Yuborish keyingi partiyadan oldin to‘xtaydi",
      },
      "stop",
    );

  const returnToDraft = () =>
    perform(
      "returnToDraft",
      (key, csrf) => returnNotificationToDraft(record.id, key, csrf),
      { title: "Qoralamaga qaytarildi", description: "Yuborishdan oldin qayta test kerak" },
      "returnToDraft",
    );

  const confirm = (test: CampaignTest) =>
    perform(
      "confirm",
      (key, csrf) => confirmCampaignTest(record.id, test.id, key, csrf),
      { title: "Test tasdiqlandi", description: "Endi yuborishni tasdiqlash mumkin" },
      `confirm:${test.id}`,
    );

  const sendTest = () =>
    perform(
      "test",
      (key, csrf) => sendCampaignTest(record.id, [...pickedDevices], key, csrf),
      {
        title: "Test yuborildi",
        description: `${pickedDevices.size} ta qurilmaga; ilovada ko‘rib, tasdiqlang`,
      },
      "test",
    );

  const remove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending("delete");
    setDialogError(null);
    const key = actionKeyFor(keys.current, "delete", record.id);
    const result = await runAction((csrf) => deleteNotificationDraft(record.id, key, csrf));
    inFlight.current = false;
    setPending(null);
    settleActionKey(keys.current, "delete", record.id, result);
    if (!result.ok) {
      if (
        result.code === "conflict" ||
        result.code === "invalid_transition" ||
        result.code === "permission_denied"
      ) {
        setDialog(null);
        toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      } else if (result.code === "not_found") {
        setDialog(null);
        onDrop(record.id);
        toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      } else {
        setDialogError(result.error);
      }
      return;
    }
    setDialog(null);
    onDrop(record.id);
    toast({ title: "Qoralama o‘chirildi", description: `«${record.title}»` });
  };

  const confirmed = record.tests.find(
    (t) => t.confirmedAt && t.revision === (record.testedRevision ?? record.revision),
  );
  const confirmable = new Set(confirmableTests(record).map((t) => t.id));
  const pushableDevices = (testDevices ?? []).filter((d) => d.isPushable);
  const eta =
    dialog === "approve" || shownDialog === "approve"
      ? dispatchEta(new Date(), approvalDelayMinutes, record.scheduledAt)
      : null;
  const busy = pending !== null;

  return (
    <Card
      id={CAMPAIGN_PANEL_ID}
      aria-labelledby={`${idBase}-title`}
      tabIndex={-1}
      className="flex flex-col gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <StateBadge state={record.state} />
            <span className="text-caption font-normal text-ink-muted">
              {NOTIFICATION_KIND_LABEL[record.kind]} · {record.revision}-tahrir
              {record.author ? ` · ${record.author}` : ""}
            </span>
          </span>
          <CardTitle id={`${idBase}-title`} className="text-heading break-words">
            {record.title}
          </CardTitle>
          <p className="m-0 text-body text-ink">{record.body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Panelni yopish"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-6 gap-y-2 text-body-sm">
        <Detail label="Kimga">{record.audienceLabel}</Detail>
        <Detail label="Taxminiy qurilmalar">{formatNumber(record.recipientCount)} ta</Detail>
        {record.linkLabel && <Detail label="Bosilganda">Mahsulot: {record.linkLabel}</Detail>}
        {record.linkUrl && (
          <Detail label="Bosilganda">
            <span className="break-all">{record.linkUrl}</span>
          </Detail>
        )}
        <Detail label="Yaratildi">
          {formatDateTimeShort(record.createdAt)}
          {record.author ? ` · ${record.author}` : ""}
        </Detail>
        {record.scheduledAt && (
          <Detail label="So‘ralgan vaqt">{formatDateTimeShort(record.scheduledAt)}</Detail>
        )}
        <Detail label="Test">
          {confirmed
            ? `Tasdiqlangan · ${formatDateTimeShort(confirmed.confirmedAt!)} · ${confirmed.deviceLabel}`
            : record.tests.length > 0
              ? "Yuborilgan, tasdiqlanmagan"
              : "Yuborilmagan"}
        </Detail>
        {record.approvedAt && (
          <Detail label="Tasdiqlandi">
            {formatDateTimeShort(record.approvedAt)}
            {record.approvedBy ? ` · ${record.approvedBy}` : ""}
          </Detail>
        )}
        {record.dispatchAfter && record.state === "scheduled" && (
          <Detail label="Yuborish vaqti">
            {formatDateTimeShort(record.dispatchAfter)} dan keyin
          </Detail>
        )}
        {record.startedAt && (
          <Detail label="Yuborish boshlandi">{formatDateTimeShort(record.startedAt)}</Detail>
        )}
        {record.attempted !== null && (
          <Detail label="Yuborildi / xato">
            {formatNumber(record.sent ?? 0)} / {formatNumber(record.failed ?? 0)}
            {record.state === "sending" || record.state === "stopping"
              ? ` · ${formatNumber(record.attempted)} / ${formatNumber(record.recipientCount)}`
              : ""}
          </Detail>
        )}
        {record.delivered !== null && (
          <Detail label="Yetkazildi">{formatNumber(record.delivered)}</Detail>
        )}
        {record.sentAt && <Detail label="Yakunlandi">{formatDateTimeShort(record.sentAt)}</Detail>}
        {record.stopRequestedAt && (
          <Detail label="To‘xtatish so‘raldi">{formatDateTimeShort(record.stopRequestedAt)}</Detail>
        )}
        {record.stoppedAt && (
          <Detail label="To‘xtatildi">{formatDateTimeShort(record.stoppedAt)}</Detail>
        )}
        {record.cancelledAt && (
          <Detail label="Bekor qilindi">{formatDateTimeShort(record.cancelledAt)}</Detail>
        )}
        {record.failedAt && (
          <Detail label="Yuborilmadi">{formatDateTimeShort(record.failedAt)}</Detail>
        )}
        {record.lastError && (
          <Detail label="Oxirgi xato">
            <span className="text-danger-strong">{record.lastError}</span>
          </Detail>
        )}
      </dl>

      {record.tests.length > 0 && (
        <section aria-labelledby={`${idBase}-tests`} className="flex flex-col gap-2">
          <h3 id={`${idBase}-tests`} className="m-0 text-label text-ink">
            Test yuborishlar
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {record.tests.map((test) => (
              <li
                key={test.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-body-sm"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink">
                    {test.deviceLabel} · {formatPhone(test.phone)}
                  </span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {formatDateTimeShort(test.sentAt)} · {test.revision}-tahrir
                    {test.sentBy ? ` · ${test.sentBy}` : ""} ·{" "}
                    {test.fcmOk === null
                      ? "FCM javobi kutilmoqda"
                      : test.fcmOk
                        ? "Qurilmaga yetkazildi"
                        : `Yetkazilmadi${test.fcmError ? `: ${test.fcmError}` : ""}`}
                    {test.revision !== record.revision && " · eski tahrir"}
                  </span>
                </span>
                {test.confirmedAt ? (
                  <span className="flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                    <Icon name="check" size={16} className="text-success" />
                    Tasdiqlangan · {formatDateTimeShort(test.confirmedAt)}
                    {test.confirmedBy ? ` · ${test.confirmedBy}` : ""}
                  </span>
                ) : actions.has("confirm") && confirmable.has(test.id) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => confirm(test)}
                    disabled={busy}
                    aria-busy={pending === `confirm:${test.id}`}
                  >
                    Testni tasdiqlash
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {panelError && <InlineError>{panelError}</InlineError>}

      {actions.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {actions.has("edit") && (
            <Button variant="secondary" onClick={() => onEdit(record)} disabled={busy}>
              <Icon name="pencil" size={18} />
              Tahrirlash
            </Button>
          )}
          {actions.has("delete") && (
            <Button variant="danger" onClick={() => openDialog("delete")} disabled={busy}>
              <Icon name="trash" size={18} />
              O‘chirish
            </Button>
          )}
          {actions.has("test") && (
            <Button variant="secondary" onClick={() => openDialog("test")} disabled={busy}>
              <Icon name="smartphone" size={18} />
              Test yuborish
            </Button>
          )}
          {actions.has("approve") && (
            <Button onClick={() => openDialog("approve")} disabled={busy}>
              <Icon name="shield-check" size={18} />
              Yuborishni tasdiqlash
            </Button>
          )}
          {record.state === "tested" && !actions.has("approve") && me.isSuperuser && (
            <span className="text-body-sm text-ink-muted">
              Test eski tahrir uchun: tasdiqlashdan oldin qayta test yuboring.
            </span>
          )}
          {actions.has("cancel") && (
            <CancelButton
              dispatchAfter={record.dispatchAfter}
              onClick={() => openDialog("cancel")}
              disabled={busy}
            />
          )}
          {actions.has("returnToDraft") && (
            <Button
              variant="outline"
              onClick={returnToDraft}
              disabled={busy}
              aria-busy={pending === "returnToDraft"}
            >
              <Icon name="refresh" size={18} />
              Qoralamaga qaytarish
            </Button>
          )}
          {actions.has("stop") && (
            <Button variant="destructive" onClick={() => openDialog("stop")} disabled={busy}>
              <Icon name="alert-triangle" size={18} />
              Favqulodda to‘xtatish
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && !inFlight.current && setDialog(null)}
        title="Yuborish tasdiqlansinmi?"
        description={
          <dl className="m-0 flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
            <Detail label="Sarlavha">{record.title}</Detail>
            <Detail label="Matn">{record.body}</Detail>
            <Detail label="Kimga">{record.audienceLabel}</Detail>
            <Detail label="Taxminiy qurilmalar">{formatNumber(record.recipientCount)} ta</Detail>
            <Detail label="Test">
              {confirmed
                ? `Tasdiqlangan · ${formatDateTimeShort(confirmed.confirmedAt!)} · ${confirmed.deviceLabel}`
                : "Tasdiqlanmagan"}
            </Detail>
            <Detail label="Yuborish vaqti">
              {eta ? `${formatDateTimeShort(eta)} dan keyin` : "—"}
              {record.scheduledAt ? "" : ` (${approvalDelayMinutes} daqiqa kutish)`}
            </Detail>
            <p className="m-0 mt-1 font-semibold">
              Ungacha yuborishni bekor qilish mumkin. {IRREVERSIBLE_MESSAGE}
            </p>
          </dl>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button onClick={approve} disabled={busy} aria-busy={pending === "approve"}>
            <Icon name="shield-check" size={18} />
            {pending === "approve" ? "Tasdiqlanmoqda…" : "Yuborishni tasdiqlash"}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => !open && !inFlight.current && setDialog(null)}
        title="Yuborish bekor qilinsinmi?"
        description={
          <div className="flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
            <p className="m-0">
              «{record.title}» yuborilmaydi
              {record.dispatchAfter
                ? ` (${formatDateTimeShort(record.dispatchAfter)} ga rejalashtirilgan)`
                : ""}
              . Bekor qilingan xabarni qoralamaga qaytarib, qayta test va tasdiqdan o‘tkazish
              mumkin.
            </p>
            {record.dispatchAfter && dialog === "cancel" && (
              <CountdownLine dispatchAfter={record.dispatchAfter} />
            )}
          </div>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={cancel}
            disabled={busy}
            aria-busy={pending === "cancel"}
          >
            {pending === "cancel" ? "Bekor qilinmoqda…" : "Yuborishni bekor qilish"}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={dialog === "stop"}
        onOpenChange={(open) => !open && !inFlight.current && setDialog(null)}
        title="Yuborish favqulodda to‘xtatilsinmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            «{record.title}» yuborilishi keyingi partiyadan oldin to‘xtaydi; qolgan qurilmalarga
            xabar bormaydi. Allaqachon yuborilgan {formatNumber(record.sent ?? 0)} ta xabarni
            qaytarib bo‘lmaydi.
          </p>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={stop}
            disabled={busy}
            aria-busy={pending === "stop"}
          >
            <Icon name="alert-triangle" size={18} />
            {pending === "stop" ? "To‘xtatilmoqda…" : "To‘xtatish"}
          </Button>
        </div>
      </AlertDialog>

      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && !inFlight.current && setDialog(null)}
        title="Qoralama o‘chirilsinmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            «{record.title}» va uning test yuborishlari o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
          </p>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel disabled={busy} className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={remove}
            disabled={busy}
            aria-busy={pending === "delete"}
          >
            {pending === "delete" ? "O‘chirilmoqda…" : "O‘chirish"}
          </Button>
        </div>
      </AlertDialog>

      <Dialog
        open={dialog === "test"}
        onOpenChange={(open) => !open && !inFlight.current && setDialog(null)}
        title="Test yuborish"
        description={
          pushableDevices.length > 0
            ? `«${record.title}» tanlangan qurilmalarga haqiqiy push sifatida yuboriladi (${record.revision}-tahrir). Ilovada ko‘rib, tasdiqlang.`
            : "Avval test qurilmasini ro‘yxatga oling (quyidagi «Test qurilmalari» kartasi)."
        }
      >
        {pushableDevices.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">Qurilmalar</legend>
            {pushableDevices.map((device) => (
              <label
                key={device.id}
                className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2 text-[14px] leading-5 font-semibold text-ink"
              >
                <input
                  type="checkbox"
                  checked={pickedDevices.has(device.id)}
                  onChange={(event) =>
                    setPickedDevices((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(device.id);
                      else next.delete(device.id);
                      return next;
                    })
                  }
                  disabled={busy}
                  className="size-4 shrink-0 accent-gold-ink"
                />
                <span className="flex min-w-0 flex-col">
                  {device.label}
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {formatPhone(device.phone)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>
            Orqaga
          </Button>
          {pushableDevices.length > 0 && (
            <Button
              onClick={sendTest}
              disabled={busy || pickedDevices.size === 0}
              aria-busy={pending === "test"}
            >
              <Icon name="send" size={18} />
              {pending === "test" ? "Yuborilmoqda…" : "Test yuborish"}
            </Button>
          )}
        </div>
      </Dialog>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption font-normal text-ink-muted">{label}</dt>
      <dd className="m-0 font-semibold break-words text-ink">{children}</dd>
    </div>
  );
}

/** «Yuborishni bekor qilish · 4:59»: the time left until the beat may start the send. */
function CancelButton({
  dispatchAfter,
  onClick,
  disabled,
}: {
  dispatchAfter: string | null;
  onClick: () => void;
  disabled: boolean;
}) {
  const left = useCountdownTo(dispatchAfter);
  return (
    <Button variant="danger" onClick={onClick} disabled={disabled}>
      <Icon name="close" size={18} />
      Yuborishni bekor qilish
      {dispatchAfter && (
        <span className={cn("tabular-nums", left === 0 && "text-ink-muted")} aria-live="off">
          · {left > 0 ? formatCountdown(left) : "vaqti keldi"}
        </span>
      )}
    </Button>
  );
}

function CountdownLine({ dispatchAfter }: { dispatchAfter: string }) {
  const left = useCountdownTo(dispatchAfter);
  return (
    <p className="m-0 font-semibold tabular-nums" aria-live="off">
      {left > 0
        ? `Yuborishgacha ${formatCountdown(left)}`
        : "Yuborish vaqti keldi: beat uni istalgan daqiqada boshlashi mumkin."}
    </p>
  );
}
