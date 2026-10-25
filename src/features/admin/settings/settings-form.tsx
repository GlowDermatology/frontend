"use client";

import { useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AffixInput, Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/data/settings.actions";
import { settingsFormSchema, type SettingsFormValues } from "@/data/settings.schema";
import {
  PICKUP_ADDRESS_MAX,
  RESERVATION_MAX,
  RESERVATION_MIN,
  type SiteSettings,
} from "@/domain/settings";
import { formatDateTimeShort, formatPhone } from "@/lib/format";
import { maskPhone, normalizePhone } from "@/lib/phone";

import { runAction } from "../shared/action-client";
import { useIdempotencyKey } from "../shared/idempotency";

const LANGUAGE_LABEL = { uz: "o‘zbekcha", ru: "ruscha", en: "inglizcha" } as const;

function toValues(settings: SiteSettings): SettingsFormValues {
  return {
    reservationMinutes: settings.reservationMinutes,
    supportPhone: settings.supportPhone ?? "",
    pickupAddress: { ...settings.pickupAddress },
  };
}

/**
 * Do‘kon sozlamalari (contract §2.11): reservation length, support phone
 * (empty = none, sent as `null`), the pickup address per language, and the
 * read-only integrations mode. Saving sends only the fields that differ from
 * the values the form loaded (`PATCH settings/`).
 */
export function SettingsForm({ settings: initial }: { settings: SiteSettings }) {
  const toast = useToast();
  const [source, setSource] = useState(initial);
  const [settings, setSettings] = useState(initial);
  const [minutes, setMinutes] = useState(String(initial.reservationMinutes));
  const [phone, setPhone] = useState(initial.supportPhone ? formatPhone(initial.supportPhone) : "");
  const [address, setAddress] = useState(initial.pickupAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const idempotency = useIdempotencyKey();

  const load = (next: SiteSettings) => {
    setSettings(next);
    setMinutes(String(next.reservationMinutes));
    setPhone(next.supportPhone ? formatPhone(next.supportPhone) : "");
    setAddress(next.pickupAddress);
  };
  if (initial !== source) {
    setSource(initial);
    load(initial);
  }

  const values: SettingsFormValues = {
    reservationMinutes: minutes.trim() === "" ? Number.NaN : Number(minutes),
    supportPhone: phone.trim() === "" ? "" : normalizePhone(phone),
    pickupAddress: address,
  };
  const baseline = toValues(settings);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const local = settingsFormSchema.safeParse(values);
    if (!local.success) {
      const next: Record<string, string> = {};
      for (const issue of local.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = idempotency.settle(
      await runAction((csrf) => updateSettings(local.data, baseline, idempotency.key, csrf)),
    );
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) setFormError(result.error);
      return;
    }
    load(result.data);
    toast({ title: "Sozlamalar saqlandi" });
  };

  return (
    <Card aria-labelledby="store-settings-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle id="store-settings-title" className="text-heading">
          Do‘kon sozlamalari
        </CardTitle>
        <Badge tone={settings.integrationsMode === "live" ? "success" : "warning"}>
          Integratsiyalar: {settings.integrationsMode === "live" ? "jonli" : "sinov (fake)"}
        </Badge>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Band qilish muddati"
            error={errors.reservationMinutes}
            hint={`To‘lanmagan buyurtma mahsulotlarni shuncha vaqt ushlab turadi (${RESERVATION_MIN}–${RESERVATION_MAX}).`}
          >
            {(c) => (
              <AffixInput
                {...c}
                name="reservationMinutes"
                suffix="daqiqa"
                inputMode="numeric"
                autoComplete="off"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            )}
          </Field>
          <Field
            label="Qo‘llab-quvvatlash telefoni"
            error={errors.supportPhone}
            hint="Ilovada ko‘rsatiladi. Bo‘sh qoldirilsa, ko‘rsatilmaydi."
          >
            {(c) => (
              <TextInput
                {...c}
                name="supportPhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+998 71 200 00 00"
                className="tabular-nums"
                value={phone}
                onChange={(event) => setPhone(maskPhone(event.target.value))}
              />
            )}
          </Field>
        </div>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-label text-ink">Olib ketish manzili</legend>
          {(["uz", "ru", "en"] as const).map((language) => (
            <Field
              key={language}
              label={
                <span className="text-body-sm text-ink-muted">{LANGUAGE_LABEL[language]}</span>
              }
              error={errors[`pickupAddress.${language}`]}
            >
              {(c) => (
                <TextInput
                  {...c}
                  name={`pickupAddress.${language}`}
                  maxLength={PICKUP_ADDRESS_MAX}
                  autoComplete="off"
                  value={address[language]}
                  onChange={(event) =>
                    setAddress((current) => ({ ...current, [language]: event.target.value }))
                  }
                />
              )}
            </Field>
          ))}
        </fieldset>
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption font-normal text-ink-muted" data-testid="settings-updated">
            Oxirgi o‘zgarish: {formatDateTimeShort(settings.updatedAt)} ·{" "}
            {settings.updatedBy ?? "Tizim"}
          </span>
          <Button type="submit" disabled={busy || !dirty} aria-busy={busy}>
            <Icon name="check" size={18} />
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
