"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { saveAddress } from "@/data/shop/account.actions";
import type { ShopAddress, ShopRegion } from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import type { Locale } from "@/lib/i18n/locales";

import { accountCopy } from "../copy/account";
import { commonCopy } from "../copy/common";
import { FormAlert } from "./controls";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * Add or edit a saved address (contract §2.2.7): a label, the BTS region and
 * city (the reference list of `delivery/regions/`, needed for delivery), the
 * street address and a note for the courier. Used by the account page and
 * by checkout ("Yangi manzil qo‘shish").
 */
export function AddressDialog({
  locale,
  open,
  onOpenChange,
  regions,
  address,
  onSaved,
}: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: ReadonlyArray<ShopRegion>;
  address: ShopAddress | null;
  onSaved: (address: ShopAddress) => void;
}) {
  const copy = accountCopy[locale].addresses;
  const common = commonCopy[locale];
  const { run, pending, error } = useShopAction(locale);
  const key = useIdempotencyKey();
  const [label, setLabel] = useState(address?.label ?? "");
  const [regionCode, setRegionCode] = useState(address?.regionCode ?? "");
  const [cityCode, setCityCode] = useState(address?.cityCode ?? "");
  const [text, setText] = useState(address?.text ?? "");
  const [comment, setComment] = useState(address?.comment ?? "");
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);
  const cities = regions.find((region) => region.code === regionCode)?.cities ?? [];

  const submit = async () => {
    const result = key.settle(
      await run((csrf) =>
        saveAddress({
          locale,
          id: address?.id ?? null,
          address: { label, text, regionCode, cityCode, comment, isDefault },
          idempotencyKey: key.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      onSaved(result.data);
      onOpenChange(false);
    }
  };

  const field = (name: string) => error?.fieldErrors?.[name];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={address ? copy.editTitle : copy.addTitle}
      className="max-w-[560px]"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label={copy.label} hint={copy.labelHint} error={field("label")}>
          {(control) => (
            <TextInput
              {...control}
              value={label}
              maxLength={60}
              placeholder={copy.labelPlaceholder}
              onChange={(event) => setLabel(event.target.value)}
            />
          )}
        </Field>
        {regions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.region} error={field("region_code")}>
              {(control) => (
                <Select
                  {...control}
                  value={regionCode}
                  onChange={(event) => {
                    setRegionCode(event.target.value);
                    setCityCode("");
                  }}
                >
                  <option value="">{copy.choose}</option>
                  {regions.map((region) => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={copy.city} error={field("city_code")}>
              {(control) => (
                <Select
                  {...control}
                  value={cityCode}
                  disabled={cities.length === 0}
                  onChange={(event) => setCityCode(event.target.value)}
                >
                  <option value="">{copy.choose}</option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        ) : null}
        <Field label={copy.text} error={field("text")}>
          {(control) => (
            <TextArea
              {...control}
              rows={2}
              value={text}
              autoComplete="street-address"
              placeholder={copy.textPlaceholder}
              onChange={(event) => setText(event.target.value)}
            />
          )}
        </Field>
        <Field label={copy.comment} error={field("comment")}>
          {(control) => (
            <TextInput
              {...control}
              value={comment}
              maxLength={200}
              placeholder={copy.commentPlaceholder}
              onChange={(event) => setComment(event.target.value)}
            />
          )}
        </Field>
        <label className="flex cursor-pointer items-center gap-3 text-body-sm text-ink">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="size-5 accent-[var(--gd-gold-ink)]"
          />
          {copy.makeDefault}
        </label>
        {error && !error.fieldErrors ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {common.dialog.cancel}
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            {common.dialog.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
