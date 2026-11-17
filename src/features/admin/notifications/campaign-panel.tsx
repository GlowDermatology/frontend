"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast, type ToastInput } from "@/components/ui/toast";
import { notificationDataCopy } from "@/domain/copy/notifications";
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
  audienceText,
  campaignRecommendedMissing,
  type CampaignTest,
  type NotificationRecord,
  type TestDevice,
} from "@/domain/notification";
import { cn } from "@/lib/cn";
import { formatCountdown, useCountdownTo } from "@/lib/countdown";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import { useRecommendedConfirm } from "@/lib/forms/recommended";

import { afterDialogsClose } from "../products/form-reveal";
import { runAction } from "../shared/action-client";
import {
  actionKeyFor,
  applyCampaignOutcome,
  campaignOutcome,
  settleActionKey,
} from "./campaign-outcomes";
import { InlineError } from "./composer";
import { notificationsCopy, type NotificationsCopy } from "./copy";
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
 * idempotency key per campaign until it succeeds (contract §1.7); while one
 * runs, the other controls explain why they wait.
 */

export const CAMPAIGN_PANEL_ID = "campaign-panel";

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
  const t = useCopy(notificationsCopy);
  const p = t.panel;
  const d = t.dialogs;
  const locale = useAdminLocale();
  const kinds = notificationDataCopy[locale].kind;
  const fmt = useFormat();
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

  const recommended = useRecommendedConfirm();

  /**
   * A promotion without a tap destination opens only the app's home page: asked once per
   * revision before it is tested or approved (not at draft save, where it may be half done).
   * «To‘ldirish» opens the editor when this admin may edit the campaign.
   */
  const openAfterLinkCheck = async (kind: "test" | "approve") => {
    const missing = campaignRecommendedMissing({ kind: record.kind, link: record.link.kind });
    const choice = await recommended.confirm(
      missing.map((name) => ({ name, label: t.composer.link })),
      {
        description: d.noLinkLead,
        remember: { kind: "campaign", id: `${record.id}@${record.revision}` },
      },
    );
    if (choice === "fix") {
      if (actions.has("edit")) {
        await afterDialogsClose();
        onEdit(record);
      }
      return;
    }
    if (missing.length > 0) await afterDialogsClose();
    openDialog(kind);
  };

  const openDialog = (kind: DialogKind) => {
    setDialogError(null);
    setPanelError(null);
    setShownDialog(kind);
    setDialog(kind);
    if (kind === "test") {
      setPickedDevices(new Set((testDevices ?? []).filter((x) => x.isPushable).map((x) => x.id)));
    }
  };
  const closeDialog = (open: boolean) => {
    if (!open && !inFlight.current) setDialog(null);
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
      staleTitle: t.failed,
    });
  };

  const approve = () =>
    perform(
      "approve",
      (key, csrf) => approveNotification(record.id, record.revision, key, csrf),
      (answered) => ({
        tone: "success",
        title: t.toasts.approved,
        description: answered.dispatchAfter
          ? t.toasts.approvedAt(fmt.dateTimeShort(answered.dispatchAfter))
          : t.toasts.approvedNote,
      }),
      "approve",
    );

  const cancel = () =>
    perform(
      "cancel",
      (key, csrf) => cancelNotification(record.id, key, csrf),
      {
        tone: "success",
        title: t.toasts.cancelled,
        description: t.toasts.cancelledNote(record.title),
      },
      "cancel",
    );

  const stop = () =>
    perform(
      "stop",
      (key, csrf) => stopNotification(record.id, key, csrf),
      { tone: "success", title: t.toasts.stopRequested, description: t.toasts.stopNote },
      "stop",
    );

  const returnToDraft = () =>
    perform(
      "returnToDraft",
      (key, csrf) => returnNotificationToDraft(record.id, key, csrf),
      { tone: "success", title: t.toasts.returned, description: t.toasts.returnedNote },
      "returnToDraft",
    );

  const confirm = (test: CampaignTest) =>
    perform(
      "confirm",
      (key, csrf) => confirmCampaignTest(record.id, test.id, key, csrf),
      { tone: "success", title: t.toasts.testConfirmed, description: t.toasts.testConfirmedNote },
      `confirm:${test.id}`,
    );

  const sendTest = () =>
    perform(
      "test",
      (key, csrf) => sendCampaignTest(record.id, [...pickedDevices], key, csrf),
      {
        tone: "success",
        title: t.toasts.testSent,
        description: t.toasts.testSentNote(pickedDevices.size),
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
        result.code === "permission_denied" ||
        result.code === "not_found"
      ) {
        setDialog(null);
        if (result.code === "not_found") onDrop(record.id);
        toast({ tone: "warning", title: t.failed, description: result.error });
      } else {
        setDialogError(result.error);
      }
      return;
    }
    setDialog(null);
    onDrop(record.id);
    toast({ tone: "success", title: t.toasts.deleted, description: `«${record.title}»` });
  };

  const confirmed = record.tests.find(
    (x) => x.confirmedAt && x.revision === (record.testedRevision ?? record.revision),
  );
  const confirmable = new Set(confirmableTests(record).map((x) => x.id));
  const pushableDevices = (testDevices ?? []).filter((x) => x.isPushable);
  const eta =
    dialog === "approve" || shownDialog === "approve"
      ? dispatchEta(new Date(), approvalDelayMinutes, record.scheduledAt)
      : null;
  const busy = pending !== null;
  /** Why a control waits while another operation of this panel runs. */
  const waitReason = busy ? t.busyReason : null;
  const audience = audienceText(record, locale);
  const testLine = confirmed
    ? p.testConfirmed(fmt.dateTimeShort(confirmed.confirmedAt!), confirmed.deviceLabel)
    : null;

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
              {kinds[record.kind]} · {t.revision(record.revision)}
              {record.author ? ` · ${record.author}` : ""}
            </span>
          </span>
          <CardTitle
            id={`${idBase}-title`}
            className="text-heading [overflow-wrap:anywhere] break-words"
          >
            {record.title}
          </CardTitle>
          <p className="m-0 text-body [overflow-wrap:anywhere] break-words text-ink">
            {record.body}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={p.close}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-6 gap-y-2 text-body-sm">
        <Detail label={p.audience}>{audience}</Detail>
        <Detail label={p.estimate}>{p.deviceCount(record.recipientCount)}</Detail>
        {record.linkLabel && <Detail label={p.onTap}>{p.product(record.linkLabel)}</Detail>}
        {record.linkUrl && (
          <Detail label={p.onTap}>
            <span className="break-all">{record.linkUrl}</span>
          </Detail>
        )}
        <Detail label={p.created}>
          {fmt.dateTimeShort(record.createdAt)}
          {record.author ? ` · ${record.author}` : ""}
        </Detail>
        {record.scheduledAt && (
          <Detail label={p.requested}>{fmt.dateTimeShort(record.scheduledAt)}</Detail>
        )}
        <Detail label={p.test}>
          {testLine ?? (record.tests.length > 0 ? p.testUnconfirmed : p.testNone)}
        </Detail>
        {record.approvedAt && (
          <Detail label={p.approved}>
            {fmt.dateTimeShort(record.approvedAt)}
            {record.approvedBy ? ` · ${record.approvedBy}` : ""}
          </Detail>
        )}
        {record.dispatchAfter && record.state === "scheduled" && (
          <Detail label={p.sendTime}>{p.after(fmt.dateTimeShort(record.dispatchAfter))}</Detail>
        )}
        {record.startedAt && (
          <Detail label={p.started}>{fmt.dateTimeShort(record.startedAt)}</Detail>
        )}
        {record.attempted !== null && (
          <Detail label={p.sentFailed}>
            {fmt.number(record.sent ?? 0)} / {fmt.number(record.failed ?? 0)}
            {record.state === "sending" || record.state === "stopping"
              ? ` · ${fmt.number(record.attempted)} / ${fmt.number(record.recipientCount)}`
              : ""}
          </Detail>
        )}
        {record.delivered !== null && (
          <Detail label={p.delivered}>{fmt.number(record.delivered)}</Detail>
        )}
        {record.sentAt && <Detail label={p.finished}>{fmt.dateTimeShort(record.sentAt)}</Detail>}
        {record.stopRequestedAt && (
          <Detail label={p.stopRequested}>{fmt.dateTimeShort(record.stopRequestedAt)}</Detail>
        )}
        {record.stoppedAt && (
          <Detail label={p.stopped}>{fmt.dateTimeShort(record.stoppedAt)}</Detail>
        )}
        {record.cancelledAt && (
          <Detail label={p.cancelled}>{fmt.dateTimeShort(record.cancelledAt)}</Detail>
        )}
        {record.failedAt && (
          <Detail label={p.failedAt}>{fmt.dateTimeShort(record.failedAt)}</Detail>
        )}
        {record.lastError && (
          <Detail label={p.lastError}>
            <span className="text-danger-strong">{record.lastError}</span>
          </Detail>
        )}
      </dl>

      {record.tests.length > 0 && (
        <section aria-labelledby={`${idBase}-tests`} className="flex flex-col gap-2">
          <h3 id={`${idBase}-tests`} className="m-0 text-label text-ink">
            {p.tests}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {record.tests.map((test) => (
              <li
                key={test.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-body-sm"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold break-words text-ink">{test.deviceLabel}</span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {fmt.dateTimeShort(test.sentAt)} · {t.revision(test.revision)}
                    {test.sentBy ? ` · ${test.sentBy}` : ""} ·{" "}
                    {test.fcmOk === null
                      ? p.fcmPending
                      : test.fcmOk
                        ? p.fcmDelivered
                        : `${p.fcmRefused}${test.fcmError ? `: ${test.fcmError}` : ""}`}
                    {test.revision !== record.revision && ` · ${p.oldRevision}`}
                  </span>
                </span>
                {test.confirmedAt ? (
                  <span className="flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                    <Icon name="check" size={16} className="text-success" />
                    {p.confirmedAt(fmt.dateTimeShort(test.confirmedAt))}
                    {test.confirmedBy ? ` · ${test.confirmedBy}` : ""}
                  </span>
                ) : actions.has("confirm") && confirmable.has(test.id) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => confirm(test)}
                    busy={pending === `confirm:${test.id}`}
                    disabledReason={pending !== `confirm:${test.id}` && waitReason}
                  >
                    {p.confirmTest}
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
            <Button variant="secondary" onClick={() => onEdit(record)} disabledReason={waitReason}>
              <Icon name="pencil" size={18} />
              {p.edit}
            </Button>
          )}
          {actions.has("delete") && (
            <Button
              variant="danger"
              onClick={() => openDialog("delete")}
              disabledReason={waitReason}
            >
              <Icon name="trash" size={18} />
              {p.delete}
            </Button>
          )}
          {actions.has("test") && (
            <Button
              variant="secondary"
              onClick={() => void openAfterLinkCheck("test")}
              disabledReason={waitReason}
            >
              <Icon name="smartphone" size={18} />
              {p.sendTest}
            </Button>
          )}
          {actions.has("approve") && (
            <Button onClick={() => void openAfterLinkCheck("approve")} disabledReason={waitReason}>
              <Icon name="shield-check" size={18} />
              {p.approve}
            </Button>
          )}
          {record.state === "tested" && !actions.has("approve") && me.isSuperuser && (
            <span className="text-body-sm text-ink-muted">{p.staleTest}</span>
          )}
          {actions.has("cancel") && (
            <CancelButton
              t={t}
              dispatchAfter={record.dispatchAfter}
              onClick={() => openDialog("cancel")}
              disabledReason={waitReason}
            />
          )}
          {actions.has("returnToDraft") && (
            <Button
              variant="outline"
              onClick={returnToDraft}
              busy={pending === "returnToDraft"}
              disabledReason={pending !== "returnToDraft" && waitReason}
            >
              <Icon name="refresh" size={18} />
              {p.returnToDraft}
            </Button>
          )}
          {actions.has("stop") && (
            <Button
              variant="destructive"
              onClick={() => openDialog("stop")}
              disabledReason={waitReason}
            >
              <Icon name="alert-triangle" size={18} />
              {p.stop}
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={dialog === "approve"}
        onOpenChange={closeDialog}
        title={d.approveTitle}
        description={
          <dl className="m-0 flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
            <Detail label={p.title}>{record.title}</Detail>
            <Detail label={p.body}>{record.body}</Detail>
            <Detail label={p.audience}>{audience}</Detail>
            <Detail label={p.estimateAtSave}>{p.deviceCount(record.recipientCount)}</Detail>
            <Detail label={p.test}>{testLine ?? p.testNotConfirmed}</Detail>
            <Detail label={p.sendTime}>
              {eta ? p.after(fmt.dateTimeShort(eta)) : "—"}
              {record.scheduledAt ? "" : ` (${p.waitMinutes(approvalDelayMinutes)})`}
            </Detail>
            <p className="m-0 mt-1 font-semibold">
              {d.approveNote} {d.irreversible}
            </p>
          </dl>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <DialogButtons back={t.back} waitReason={waitReason}>
          <Button onClick={approve} busy={pending === "approve"}>
            <Icon name="shield-check" size={18} />
            {pending === "approve" ? d.approving : p.approve}
          </Button>
        </DialogButtons>
      </AlertDialog>

      <AlertDialog
        open={dialog === "cancel"}
        onOpenChange={closeDialog}
        title={d.cancelTitle}
        description={
          <div className="flex flex-col gap-1.5 text-[14px] leading-5 text-ink">
            <p className="m-0">
              {d.cancelText(
                record.title,
                record.dispatchAfter ? fmt.dateTimeShort(record.dispatchAfter) : null,
              )}
            </p>
            {record.dispatchAfter && dialog === "cancel" && (
              <CountdownLine t={t} dispatchAfter={record.dispatchAfter} />
            )}
          </div>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <DialogButtons back={t.back} waitReason={waitReason}>
          <Button variant="destructive" onClick={cancel} busy={pending === "cancel"}>
            {pending === "cancel" ? d.cancelling : p.cancelSend}
          </Button>
        </DialogButtons>
      </AlertDialog>

      <AlertDialog
        open={dialog === "stop"}
        onOpenChange={closeDialog}
        title={d.stopTitle}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            {d.stopText(record.title, fmt.number(record.sent ?? 0))}
          </p>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <DialogButtons back={t.back} waitReason={waitReason}>
          <Button variant="destructive" onClick={stop} busy={pending === "stop"}>
            <Icon name="alert-triangle" size={18} />
            {pending === "stop" ? d.stopping : d.stopConfirm}
          </Button>
        </DialogButtons>
      </AlertDialog>

      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        title={d.deleteTitle}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">{d.deleteText(record.title)}</p>
        }
      >
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <DialogButtons back={t.back} waitReason={waitReason}>
          <Button variant="destructive" onClick={remove} busy={pending === "delete"}>
            {pending === "delete" ? d.deleting : p.delete}
          </Button>
        </DialogButtons>
      </AlertDialog>

      <Dialog
        open={dialog === "test"}
        onOpenChange={closeDialog}
        title={d.testTitle}
        description={
          pushableDevices.length > 0
            ? d.testText(record.title, t.revision(record.revision))
            : d.testNoDevices
        }
      >
        {pushableDevices.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">{d.devices}</legend>
            {pushableDevices.map((device) => (
              <label
                key={device.id}
                className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2 text-[14px] leading-5 font-semibold text-ink"
              >
                <input
                  type="checkbox"
                  checked={pickedDevices.has(device.id)}
                  aria-disabled={busy || undefined}
                  onChange={(event) => {
                    // While the test is being sent the choice is frozen (it is what was sent).
                    if (inFlight.current) return;
                    const on = event.target.checked;
                    setPickedDevices((current) => {
                      const next = new Set(current);
                      if (on) next.add(device.id);
                      else next.delete(device.id);
                      return next;
                    });
                  }}
                  className="size-4 shrink-0 accent-gold-ink"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="break-words">{device.label}</span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {fmt.phone(device.phone)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {dialogError && <InlineError>{dialogError}</InlineError>}
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setDialog(null)} disabledReason={waitReason}>
            {t.back}
          </Button>
          {pushableDevices.length > 0 && (
            <Button
              onClick={sendTest}
              busy={pending === "test"}
              disabledReason={pending !== "test" && pickedDevices.size === 0 && d.pickDevice}
            >
              <Icon name="send" size={18} />
              {pending === "test" ? d.sending : p.sendTest}
            </Button>
          )}
        </div>
      </Dialog>
      {recommended.dialog}
    </Card>
  );
}

/** «Orqaga» (Radix starts focus on it: the least destructive choice) and the dialog's action. */
function DialogButtons({
  back,
  waitReason,
  children,
}: {
  back: string;
  waitReason: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-2">
      <AlertDialogCancel asChild>
        <Button variant="outline" disabledReason={waitReason}>
          {back}
        </Button>
      </AlertDialogCancel>
      {children}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-caption font-normal text-ink-muted">{label}</dt>
      <dd className="m-0 font-semibold [overflow-wrap:anywhere] break-words text-ink">
        {children}
      </dd>
    </div>
  );
}

/** «Yuborishni bekor qilish · 4:59»: the time left until the beat may start the send. */
function CancelButton({
  t,
  dispatchAfter,
  onClick,
  disabledReason,
}: {
  t: NotificationsCopy;
  dispatchAfter: string | null;
  onClick: () => void;
  disabledReason: string | null;
}) {
  const left = useCountdownTo(dispatchAfter);
  return (
    <Button variant="danger" onClick={onClick} disabledReason={disabledReason}>
      <Icon name="close" size={18} />
      {t.panel.cancelSend}
      {dispatchAfter && (
        <span className={cn("tabular-nums", left === 0 && "text-ink-muted")} aria-live="off">
          · {left > 0 ? formatCountdown(left) : t.panel.due}
        </span>
      )}
    </Button>
  );
}

function CountdownLine({ t, dispatchAfter }: { t: NotificationsCopy; dispatchAfter: string }) {
  const left = useCountdownTo(dispatchAfter);
  return (
    <p className="m-0 font-semibold tabular-nums" aria-live="off">
      {left > 0 ? t.dialogs.countdown(formatCountdown(left)) : t.dialogs.countdownDue}
    </p>
  );
}
