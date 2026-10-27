"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateContacts } from "@/data/settings.actions";
import { contactsFormSchema, type ContactsFormValues } from "@/data/settings.schema";
import type { SiteSettings } from "@/domain/settings";
import { formatPhone } from "@/lib/format";
import { CONTACT_URL_MAX } from "@/lib/link-url";
import { maskPhone, normalizePhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { useFocusFirstInvalid } from "../shared/focus-invalid";
import { useIdempotencyKey } from "../shared/idempotency";

const FIELDS = [
  "storePhone",
  "cosmetologistPhone",
  "telegramUrl",
  "instagramUrl",
  "websiteUrl",
] as const;
type ContactField = (typeof FIELDS)[number];

/** The inputs as typed: phones masked ("+998 71 200 00 01"), links as is. */
type Inputs = Record<ContactField, string>;

function toInputs(settings: SiteSettings): Inputs {
  return {
    storePhone: settings.storePhone ? formatPhone(settings.storePhone) : "",
    cosmetologistPhone: settings.cosmetologistPhone ? formatPhone(settings.cosmetologistPhone) : "",
    telegramUrl: settings.telegramUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    websiteUrl: settings.websiteUrl ?? "",
  };
}

function toValues(inputs: Inputs): ContactsFormValues {
  const phone = (value: string) => (value.trim() === "" ? "" : normalizePhone(value));
  return {
    storePhone: phone(inputs.storePhone),
    cosmetologistPhone: phone(inputs.cosmetologistPhone),
    telegramUrl: inputs.telegramUrl.trim(),
    instagramUrl: inputs.instagramUrl.trim(),
    websiteUrl: inputs.websiteUrl.trim(),
  };
}

const LINKS: ReadonlyArray<{
  field: "telegramUrl" | "instagramUrl" | "websiteUrl";
  label: string;
  placeholder: string;
}> = [
  { field: "telegramUrl", label: "Telegram", placeholder: "https://t.me/glowderma" },
  { field: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/glowderma" },
  { field: "websiteUrl", label: "Veb-sayt", placeholder: "https://glowderma.uz" },
];

/**
 * Aloqa ma’lumotlari (gap X-SET-CONTACTS, contract §2.11): the store and
 * cosmetologist phones and the Telegram, Instagram and website links the app
 * shows. An empty field clears the value; saving sends only what changed.
 */
export function ContactsCard({ settings: initial }: { settings: SiteSettings }) {
  const toast = useToast();
  const [source, setSource] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [inputs, setInputs] = useState(() => toInputs(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();
  const focusFirstInvalid = useFocusFirstInvalid();

  const values = toValues(inputs);
  const baseline = toValues(toInputs(saved));
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  // A newer server copy (the refresh after another card saved) replaces the
  // fields only while nothing is being edited here.
  if (initial !== source) {
    setSource(initial);
    setSaved(initial);
    if (!dirty) setInputs(toInputs(initial));
  }

  const set = (field: ContactField, value: string) =>
    setInputs((current) => ({ ...current, [field]: value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const local = contactsFormSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      setFormError(null);
      focusFirstInvalid(form);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => updateContacts(local.data, baseline, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const { fieldErrors, formError: message } = partitionFieldErrors(result, FIELDS);
      setErrors(fieldErrors);
      setFormError(message);
      focusFirstInvalid(form);
      return;
    }
    setSaved(result.data);
    setInputs(toInputs(result.data));
    toast({ title: "Aloqa ma’lumotlari saqlandi" });
  };

  return (
    <Card aria-labelledby="contacts-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="contacts-title" className="text-heading">
          Aloqa ma’lumotlari
        </CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">
          Ilovaning «Sozlamalar» bo‘limida ko‘rinadi. Bo‘sh qoldirilgan maydon ko‘rsatilmaydi.
        </p>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Do‘kon telefoni" error={errors.storePhone}>
            {(c) => (
              <TextInput
                {...c}
                name="storePhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+998 71 200 00 01"
                className="tabular-nums"
                value={inputs.storePhone}
                onChange={(event) => set("storePhone", maskPhone(event.target.value))}
              />
            )}
          </Field>
          <Field
            label="Kosmetolog telefoni"
            error={errors.cosmetologistPhone}
            hint="Ilovaning AI bo‘limida (2-bosqich) ko‘rsatiladi."
          >
            {(c) => (
              <TextInput
                {...c}
                name="cosmetologistPhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+998 71 200 00 02"
                className="tabular-nums"
                value={inputs.cosmetologistPhone}
                onChange={(event) => set("cosmetologistPhone", maskPhone(event.target.value))}
              />
            )}
          </Field>
        </div>
        {LINKS.map(({ field, label, placeholder }) => (
          <Field key={field} label={label} error={errors[field]}>
            {(c) => (
              <TextInput
                {...c}
                name={field}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                maxLength={CONTACT_URL_MAX}
                placeholder={placeholder}
                value={inputs[field]}
                onChange={(event) => set(field, event.target.value)}
              />
            )}
          </Field>
        ))}
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !dirty} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
