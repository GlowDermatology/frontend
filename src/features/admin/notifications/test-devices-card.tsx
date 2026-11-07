"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { registerTestDevice, removeTestDevice } from "@/data/notifications.actions";
import type { TestDevice } from "@/domain/notification";
import { formatDateTimeShort, formatPhone } from "@/lib/format";
import { maskPhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useFocusFirstInvalid } from "../shared/focus-invalid";
import { useIdempotencyKey } from "../shared/idempotency";
import { actionKeyFor, settleActionKey } from "./campaign-outcomes";

const LABEL_MAX = 60;

/**
 * The test devices a superuser registers by the customer's phone (contract
 * §2.8, campaign approval; `notifications/test-devices/`): the staff
 * member's own customer-app device, found as the phone's latest pushable
 * device. Test pushes go to these; a device that lost its token shows
 * «Push yo‘q» and is not offered for a test. Superusers only (the card is
 * not rendered for an ordinary admin, and the backend refuses them).
 */
export function TestDevicesCard({
  devices: initial,
  onChange,
}: {
  devices: ReadonlyArray<TestDevice>;
  onChange: (devices: ReadonlyArray<TestDevice>) => void;
}) {
  const toast = useToast();
  const idBase = useId();
  const [source, setSource] = useState(initial);
  const [devices, setDevices] = useState(initial);
  if (initial !== source) {
    setSource(initial);
    setDevices(initial);
  }
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; label?: string }>({});
  const [pending, setPending] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusInvalid = useFocusFirstInvalid();
  const idempotency = useIdempotencyKey();
  const keys = useRef(new Map<string, string>());

  const update = (next: ReadonlyArray<TestDevice>) => {
    setDevices(next);
    onChange(next);
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending("add");
    setErrors({});
    const result = idempotency.settle(
      await runAction((csrf) =>
        registerTestDevice(
          { phone: `+${phone.replace(/\D/g, "")}`, label: label.trim() },
          idempotency.key,
          csrf,
        ),
      ),
    );
    setPending(null);
    if (!result.ok) {
      const { fieldErrors, formError } = partitionFieldErrors(result, ["phone", "label"]);
      setErrors(fieldErrors);
      focusInvalid(formRef.current);
      if (formError) toast({ tone: "info", title: "Qo‘shilmadi", description: formError });
      return;
    }
    update([result.data, ...devices.filter((d) => d.id !== result.data.id)]);
    setPhone("");
    setLabel("");
    toast({ title: "Test qurilmasi qo‘shildi", description: result.data.label });
  };

  const remove = async (device: TestDevice) => {
    if (pending) return;
    setPending(device.id);
    const key = actionKeyFor(keys.current, "removeDevice", device.id);
    const result = await runAction((csrf) => removeTestDevice(device.id, key, csrf));
    setPending(null);
    settleActionKey(keys.current, "removeDevice", device.id, result);
    if (!result.ok) {
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      return;
    }
    update(devices.filter((d) => d.id !== device.id));
    toast({ title: "Test qurilmasi olib tashlandi", description: device.label });
  };

  return (
    <Card aria-labelledby={`${idBase}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle id={`${idBase}-title`} className="text-heading">
          Test qurilmalari
        </CardTitle>
        <span className="text-caption font-normal text-ink-muted">
          Xodimning mijoz ilovasi, telefon raqami bo‘yicha · faqat superfoydalanuvchilar
        </span>
      </div>
      {devices.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-body-sm"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{device.label}</span>
                <span className="text-caption font-normal text-ink-muted tabular-nums">
                  {formatPhone(device.phone)}
                  {device.registeredAt ? ` · ${formatDateTimeShort(device.registeredAt)}` : ""}
                  {device.registeredBy ? ` · ${device.registeredBy}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={device.isPushable ? "success" : "warning"}>
                  {device.isPushable ? "Push bor" : "Push yo‘q"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove(device)}
                  disabled={pending !== null}
                  aria-busy={pending === device.id}
                  aria-label={`Olib tashlash: ${device.label}`}
                >
                  <Icon name="trash" size={16} />
                  Olib tashlash
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">
          Hali test qurilmasi yo‘q: xodimning mijoz ilovasidagi telefon raqamini kiriting.
        </p>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={add}
        className="flex flex-wrap items-end gap-3 border-t border-line pt-3"
      >
        <Field label="Mijoz telefoni" error={errors.phone} className="w-[220px] max-w-full">
          {(c) => (
            <TextInput
              {...c}
              name="devicePhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              className="tabular-nums"
            />
          )}
        </Field>
        <Field label="Qurilma nomi" error={errors.label} className="w-[260px] max-w-full">
          {(c) => (
            <TextInput
              {...c}
              name="deviceLabel"
              autoComplete="off"
              maxLength={LABEL_MAX}
              placeholder="Dilnoza iPhone"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending !== null}
          aria-busy={pending === "add"}
        >
          <Icon name="plus" size={18} />
          Qurilma qo‘shish
        </Button>
      </form>
    </Card>
  );
}
