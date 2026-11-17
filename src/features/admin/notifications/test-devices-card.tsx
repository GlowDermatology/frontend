"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/components/ui/toast";
import { registerTestDevice, removeTestDevice } from "@/data/notifications.actions";
import { notificationDataCopy } from "@/domain/copy/notifications";
import { TEST_DEVICE_LABEL_MAX, type TestDevice } from "@/domain/notification";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";
import type { Locale } from "@/lib/i18n/locales";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useIdempotencyKey } from "../shared/idempotency";
import { actionKeyFor, settleActionKey } from "./campaign-outcomes";
import { notificationsCopy } from "./copy";

/**
 * The register form's rules (the Server Action's, in the admin language): a whole `+998` number
 * and a name of 2–60 characters. `{}` when the device can be sent.
 */
export function testDeviceErrors(
  input: { phone: string; label: string },
  locale: Locale,
): { phone?: string; label?: string } {
  const m = notificationDataCopy[locale].schema;
  const errors: { phone?: string; label?: string } = {};
  if (!/^\+998\d{9}$/.test(input.phone)) errors.phone = m.phone;
  const label = input.label.trim();
  if (label.length < 2) errors.label = m.deviceLabelMin;
  else if (label.length > TEST_DEVICE_LABEL_MAX) {
    errors.label = validationCopy[locale].maxChars(TEST_DEVICE_LABEL_MAX);
  }
  return errors;
}

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
  const all = useCopy(notificationsCopy);
  const t = all.devices;
  const locale = useAdminLocale();
  const fmt = useFormat();
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
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);
  const idempotency = useIdempotencyKey();
  const keys = useRef(new Map<string, string>());

  const update = (next: ReadonlyArray<TestDevice>) => {
    setDevices(next);
    onChange(next);
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const input = { phone, label: label.trim() };
    const found = testDeviceErrors(input, locale);
    setErrors(found);
    if (found.phone || found.label) {
      reveal();
      return;
    }
    inFlight.current = true;
    setPending("add");
    const result = idempotency.settle(
      await runAction((csrf) => registerTestDevice(input, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setPending(null);
    if (!result.ok) {
      const { fieldErrors, formError } = partitionFieldErrors(result, ["phone", "label"]);
      setErrors(fieldErrors);
      if (fieldErrors.phone || fieldErrors.label) reveal();
      if (formError) toast({ tone: "danger", title: t.notAdded, description: formError });
      return;
    }
    update([result.data, ...devices.filter((d) => d.id !== result.data.id)]);
    setPhone("");
    setLabel("");
    toast({ tone: "success", title: t.added, description: result.data.label });
  };

  const remove = async (device: TestDevice) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(device.id);
    const key = actionKeyFor(keys.current, "removeDevice", device.id);
    const result = await runAction((csrf) => removeTestDevice(device.id, key, csrf));
    inFlight.current = false;
    setPending(null);
    settleActionKey(keys.current, "removeDevice", device.id, result);
    if (!result.ok) {
      toast({ tone: "danger", title: all.failed, description: result.error });
      return;
    }
    update(devices.filter((d) => d.id !== device.id));
    toast({ tone: "success", title: t.removed, description: device.label });
  };

  const waitReason = pending ? all.busyReason : null;

  return (
    <Card aria-labelledby={`${idBase}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle id={`${idBase}-title`} className="text-heading">
          {t.title}
        </CardTitle>
        <span className="text-caption font-normal text-ink-muted">{t.note}</span>
      </div>
      {devices.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-body-sm"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold [overflow-wrap:anywhere] break-words text-ink">
                  {device.label}
                </span>
                <span className="text-caption font-normal text-ink-muted tabular-nums">
                  {fmt.phone(device.phone)}
                  {device.registeredAt ? ` · ${fmt.dateTimeShort(device.registeredAt)}` : ""}
                  {device.registeredBy ? ` · ${device.registeredBy}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={device.isPushable ? "success" : "warning"}>
                  {device.isPushable ? t.pushOn : t.pushOff}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove(device)}
                  busy={pending === device.id}
                  disabledReason={pending !== device.id && waitReason}
                  aria-label={t.removeOf(device.label)}
                >
                  <Icon name="trash" size={16} />
                  {t.remove}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">{t.empty}</p>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={add}
        className="flex flex-wrap items-start gap-3 border-t border-line pt-3"
      >
        <Field label={t.phone} name="phone" error={errors.phone} className="w-[240px] max-w-full">
          {(props) => (
            <PhoneInput {...props} name="devicePhone" value={phone} onValueChange={setPhone} />
          )}
        </Field>
        <Field label={t.label} name="label" error={errors.label} className="w-[260px] max-w-full">
          {(props) => (
            <TextInput
              {...props}
              name="deviceLabel"
              autoComplete="off"
              maxLength={TEST_DEVICE_LABEL_MAX}
              placeholder={t.labelPlaceholder}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          )}
        </Field>
        {/* Aligned with the fields' controls (their labels sit above). */}
        <div className="flex flex-col gap-2">
          <span aria-hidden="true" className="h-5" />
          <Button
            type="submit"
            variant="secondary"
            busy={pending === "add"}
            disabledReason={pending !== null && pending !== "add" && waitReason}
          >
            <Icon name="plus" size={18} />
            {t.add}
          </Button>
        </div>
      </form>
    </Card>
  );
}
