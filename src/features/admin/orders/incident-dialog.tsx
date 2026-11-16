"use client";

import { useState } from "react";

import { openDeliveryIncident, type OpenedIncident } from "@/data/delivery-issues.actions";

import { runAction } from "../shared/action-client";
import { NoteDialog } from "../issues/note-dialog";

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
  const [urgent, setUrgent] = useState(false);
  return (
    <NoteDialog<OpenedIncident>
      open={open}
      onOpenChange={(next) => {
        if (!next) setUrgent(false);
        onOpenChange(next);
      }}
      title={`Buyurtma №${orderId}: hodisa qayd etish`}
      description="Noto‘g‘ri yoki yetishmayotgan mahsulot, shikastlangan qadoq va boshqalar. Hodisa muammolar ro‘yxatiga tushadi."
      label="Nima bo‘ldi? (majburiy)"
      placeholder="Masalan: mijoz qadoqda bitta krem yo‘qligini aytdi"
      submitLabel="Qayd etish"
      pendingLabel="Saqlanmoqda…"
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
          Shoshilinch
          <span className="text-caption font-normal text-ink-muted">
            Xodimlarga darhol xabar beriladi (panel va Telegram).
          </span>
        </span>
      </label>
    </NoteDialog>
  );
}
