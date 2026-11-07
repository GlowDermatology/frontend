"use client";

import { useRef, useState } from "react";

import type { NotificationsMe } from "@/data/notifications";
import type { Page } from "@/data/types";
import type {
  AudienceSegment,
  NotificationDraft,
  NotificationHistoryQuery,
  NotificationLink,
  NotificationRecord,
  TestDevice,
} from "@/domain/notification";

import { CAMPAIGN_PANEL_ID, CampaignPanel } from "./campaign-panel";
import { Composer } from "./composer";
import { detailsButtonId, HistoryTable } from "./history-table";
import { TestDevicesCard } from "./test-devices-card";

/**
 * `/admin/notifications` (contract §2.8, campaign approval): the composer
 * writes drafts, the history lists every campaign with «Batafsil», and the
 * campaign panel carries the workflow (test, confirm, approve, cancel, stop,
 * return to draft; edit and delete for the author). Superusers also see the
 * test devices card. The board keeps the history locally: a saved draft is
 * prepended, an answered operation replaces its row, a gone campaign is
 * dropped; a newer server history (the refresh after an api-mode operation,
 * a navigation back) replaces the local one.
 */

/** Whether a new campaign belongs on the history page the URL shows (page 1, matching filters). */
function showsNewRecord(query: NotificationHistoryQuery, record: NotificationRecord): boolean {
  return (
    query.page === 1 &&
    (!query.state || query.state === record.state) &&
    (!query.kind || query.kind === record.kind)
  );
}

interface NotificationsViewProps {
  /** The history page the URL names (gap X-NOTIF-HISTORY). */
  history: Page<NotificationRecord>;
  query: NotificationHistoryQuery;
  /** The composer's `?customer=` prefill, kept by the history links. */
  customerParam?: string;
  segments: ReadonlyArray<AudienceSegment>;
  totalDevices: number;
  linkOptions: ReadonlyArray<NotificationLink>;
  defaultSchedule: string;
  draft: NotificationDraft | null;
  /** Pre-selected single recipient (from a customer card). */
  recipient: { name: string; phone: string } | null;
  /** Server render time (ISO); the earliest allowed schedule. */
  now: string;
  me: NotificationsMe;
  approvalDelayMinutes: number;
  /** The registered test devices; `null` for an ordinary admin. */
  testDevices: ReadonlyArray<TestDevice> | null;
}

export function NotificationsView({
  history: historyPage,
  query,
  customerParam,
  segments,
  totalDevices,
  linkOptions,
  defaultSchedule,
  draft,
  recipient,
  now,
  me,
  approvalDelayMinutes,
  testDevices: initialDevices,
}: NotificationsViewProps) {
  const [historySource, setHistorySource] = useState(historyPage);
  const [history, setHistory] = useState<ReadonlyArray<NotificationRecord>>(historyPage.items);
  if (historyPage !== historySource) {
    setHistorySource(historyPage);
    setHistory(historyPage.items);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<NotificationRecord | null>(null);
  const [testDevices, setTestDevices] = useState(initialDevices);
  const historyRegion = useRef<HTMLDivElement>(null);
  const selected = selectedId ? (history.find((r) => r.id === selectedId) ?? null) : null;

  const replaceRecord = (record: NotificationRecord) => {
    setHistory((current) => current.map((r) => (r.id === record.id ? record : r)));
    if (editing?.id === record.id) setEditing(null);
  };
  const dropRecord = (id: string) => {
    setHistory((current) => current.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editing?.id === id) setEditing(null);
  };
  const closePanel = () => {
    const id = selectedId;
    setSelectedId(null);
    (id ? document.getElementById(detailsButtonId(id)) : null)?.focus();
  };
  const select = (record: NotificationRecord) => {
    if (record.id === selectedId) {
      closePanel();
      return;
    }
    setSelectedId(record.id);
    // The panel sits above the history: bring it into view and give it focus.
    requestAnimationFrame(() => {
      const panel = document.getElementById(CAMPAIGN_PANEL_ID);
      panel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      panel?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-body-sm text-ink-muted">Push bildirishnomalar · Firebase</span>
        <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
          Bildirishnomalar
        </h1>
      </div>

      <Composer
        key={editing ? `${editing.id}:${editing.revision}` : "new"}
        segments={segments}
        totalDevices={totalDevices}
        linkOptions={linkOptions}
        defaultSchedule={defaultSchedule}
        draft={draft}
        recipient={recipient}
        now={now}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSaved={(record, mode) => {
          if (mode === "updated") {
            replaceRecord(record);
            setSelectedId(record.id);
            return;
          }
          if (showsNewRecord(query, record)) {
            setHistory((current) => [record, ...current].slice(0, query.pageSize));
            setSelectedId(record.id);
          }
        }}
      />

      {selected && (
        <CampaignPanel
          key={selected.id}
          record={selected}
          me={me}
          approvalDelayMinutes={approvalDelayMinutes}
          testDevices={testDevices}
          onReplace={replaceRecord}
          onDrop={dropRecord}
          onEdit={(record) => {
            setEditing(record);
            document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" });
          }}
          onClose={closePanel}
        />
      )}

      {me.isSuperuser && testDevices && (
        <TestDevicesCard devices={testDevices} onChange={setTestDevices} />
      )}

      <HistoryTable
        history={history}
        page={historyPage}
        query={query}
        customerParam={customerParam}
        selectedId={selectedId}
        onSelect={select}
        regionRef={historyRegion}
      />
    </>
  );
}
