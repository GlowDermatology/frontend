"use client";

import { useState } from "react";

import { openDeliveryIncident, type OpenedIncident } from "@/data/delivery-issues.actions";
import { useCopy } from "@/lib/i18n/admin-context";

import { runAction } from "../shared/action-client";
import { NoteDialog } from "../issues/note-dialog";
import { ordersCopy } from "./copy";

interface IncidentDialogProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: (result: OpenedIncident) => void;
  /** 404 / 409 (`conflict`: a pickup order): toasted by the page, which re-reads the order. */
  onStale: (message: string) => void;
}

/**
 * "Hodisa qayd etish" (`POST orders/{id}/issues/`, kind `incident`): staff
 * report a wrong or missing product, a damaged parcel… A second report while
 * the order's incident is open refreshes it (note and urgency, 200). An
 * urgent incident alerts staff (panel toast, Telegram).
 */
export function IncidentDialog({
  orderId,
  open,
  onOpenChange,
  onOpened,
  onStale,
}: IncidentDialogProps) {
  const t = useCopy(ordersCopy).incident;
  const [urgent, setUrgent] = useState(false);
  return (
    <NoteDialog<OpenedIncident>
      open={open}
      onOpenChange={(next) => {
        if (!next) setUrgent(false);
        onOpenChange(next);
      }}
      title={t.title(orderId)}
      description={t.description}
      label={t.label}
      placeholder={t.placeholder}
      submitLabel={t.submit}
      pendingLabel={t.saving}
      submit={(note, key) =>
        runAction((csrf) => openDeliveryIncident(orderId, note, urgent, key, csrf))
      }
      onDone={(result) => {
        setUrgent(false);
        onOpened(result);
      }}
      onStale={onStale}
    >
      <label className="flex items-start gap-2 text-[14px] leading-5 font-semibold text-ink">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(event) => setUrgent(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-gold-ink"
        />
        <span className="flex flex-col gap-0.5">
          {t.urgent}
          <span className="text-caption font-normal text-ink-muted">{t.urgentHint}</span>
        </span>
      </label>
    </NoteDialog>
  );
}
