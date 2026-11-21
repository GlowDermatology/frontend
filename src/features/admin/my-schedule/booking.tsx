"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SpecialistAvailability, SpecialistBooking } from "@/data/specialist";
import { formatTime, toLocalIsoDate } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";

import { appointmentsCopy } from "../appointments/copy";
import {
  ClinicSelect,
  Field,
  inputClass,
  MutationMessage,
  tashkentDateTime,
  text,
  useScheduleMutation,
} from "./controls";
import { myScheduleCopy } from "./copy";

export function Booking({
  item,
  clinics,
  now,
  conflict,
}: {
  item: SpecialistBooking;
  clinics: SpecialistAvailability["clinics"];
  now: number;
  conflict: boolean;
}) {
  const t = useCopy(myScheduleCopy);
  const appointment = useCopy(appointmentsCopy);
  const mutation = useScheduleMutation();
  const [form, setForm] = useState<"reschedule" | "cancel" | null>(null);
  const [destination, setDestination] = useState(String(item.location.id));
  const started = new Date(item.start).getTime() <= now;
  const open = item.status === "requested" || item.status === "confirmed";
  const name = item.customer_name || appointment.deletedCustomer;
  const times = formatTime(item.start) + "–" + formatTime(item.end);
  const clinicChanged = destination !== String(item.location.id);
  const action = (action: "confirm" | "reject" | "attend") =>
    mutation.submit({ kind: "booking", id: String(item.id), action });

  return (
    <li className="rounded-md border border-line bg-surface-raised p-3.5">
      <details>
        <summary className="cursor-pointer rounded-sm">
          <span className="ml-1 inline-flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 align-middle">
            <span className="font-semibold tabular-nums">{times}</span>
            <span className="min-w-0 break-words">
              {name} · {item.service}
            </span>
            <Badge tone={item.status === "confirmed" ? "success" : "muted"}>
              {appointment.status[item.status]}
            </Badge>
            {conflict && <Badge tone="muted">{t.conflicts}</Badge>}
          </span>
        </summary>
        <div className="grid gap-3 pt-3">
          <p className="m-0 text-body-sm">
            {item.location.name}
            {item.location.address ? " · " + item.location.address : ""}
          </p>
          {item.customer_phone && (
            <a
              href={"tel:" + item.customer_phone}
              className="w-fit text-body-sm font-semibold text-gold-ink underline"
            >
              {item.customer_phone}
            </a>
          )}
          {item.customer_note && (
            <p className="m-0 text-body-sm break-words whitespace-pre-wrap">{item.customer_note}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {!started && item.status === "requested" && (
              <>
                <Button size="sm" busy={mutation.pending} onClick={() => action("confirm")}>
                  {appointment.panel.confirm}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  busy={mutation.pending}
                  onClick={() => {
                    if (window.confirm(appointment.panel.rejectTitle)) action("reject");
                  }}
                >
                  {appointment.panel.reject}
                </Button>
              </>
            )}
            {!started && open && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDestination(String(item.location.id));
                    setForm(form === "reschedule" ? null : "reschedule");
                  }}
                >
                  {appointment.panel.reschedule}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm(form === "cancel" ? null : "cancel")}
                >
                  {appointment.panel.cancel}
                </Button>
              </>
            )}
            {started && item.status === "confirmed" && (
              <Button
                size="sm"
                busy={mutation.pending}
                onClick={() => {
                  if (window.confirm(appointment.panel.attendTitle)) action("attend");
                }}
              >
                {appointment.panel.attend}
              </Button>
            )}
          </div>
          {!started && open && form === "reschedule" && (
            <form
              className="grid max-w-lg gap-3 rounded-md border border-line p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                mutation.submit(
                  {
                    kind: "booking",
                    id: String(item.id),
                    action: "reschedule",
                    body: {
                      start: tashkentDateTime(text(values, "start")),
                      location_id: Number(text(values, "clinic")),
                      customer_agreed: values.has("agreed"),
                    },
                  },
                  () => setForm(null),
                );
              }}
            >
              <Field label={t.from}>
                <input
                  name="start"
                  type="datetime-local"
                  step={300}
                  required
                  className={inputClass}
                  defaultValue={toLocalIsoDate(item.start) + "T" + formatTime(item.start)}
                />
              </Field>
              <ClinicSelect
                clinics={clinics}
                defaultValue={String(item.location.id)}
                extra={item.location}
                onChange={setDestination}
              />
              {clinicChanged && (
                <label className="flex gap-2 text-body-sm">
                  <input key={destination} name="agreed" type="checkbox" required />
                  {t.customerAgreed}
                </label>
              )}
              <Button
                className="justify-self-start"
                type="submit"
                size="sm"
                busy={mutation.pending}
              >
                {appointment.panel.move}
              </Button>
            </form>
          )}
          {!started && open && form === "cancel" && (
            <form
              className="grid max-w-lg gap-3 rounded-md border border-line p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                if (window.confirm(appointment.panel.cancelTitle)) {
                  mutation.submit(
                    {
                      kind: "booking",
                      id: String(item.id),
                      action: "cancel",
                      body: { reason: text(values, "reason") },
                    },
                    () => setForm(null),
                  );
                }
              }}
            >
              <Field label={t.reason}>
                <input name="reason" className={inputClass} maxLength={300} />
              </Field>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                busy={mutation.pending}
                className="justify-self-start"
              >
                {appointment.panel.cancel}
              </Button>
            </form>
          )}
          <MutationMessage message={mutation.message} />
        </div>
      </details>
    </li>
  );
}
