"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { attachPhone, sendPhoneCode } from "@/data/shop/account.actions";
import type { CodeSent } from "@/data/shop/auth.actions";
import type { ShopMe } from "@/domain/shop-account";
import type { Locale } from "@/lib/i18n/locales";

import { commonCopy } from "../copy/common";
import { authCopy } from "../copy/auth";
import { shopHref } from "../routing/routes";
import { CodeField, FormAlert, PasswordField, PhoneField } from "./controls";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * The phone gate (hybrid identity, B-W2): checkout, payment, booking and
 * the QR answer 409 `phone_required` for an account without a phone. This
 * dialog attaches one — `me/phone/code/` then `me/phone/` — and hands the
 * caller back to its retry. A number held by another account
 * (`phone_taken`) is never merged: the customer may sign in with it instead.
 * The password is asked only when the API asks for it (a session older than
 * ten minutes on an account that has one).
 */
export function PhoneGate({
  locale,
  open,
  onOpenChange,
  onAttached,
  next,
}: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: (me: ShopMe) => void;
  /** Where "sign in with this number" returns to. */
  next: string;
}) {
  const copy = commonCopy[locale];
  const fieldCopy = authCopy[locale].fields;
  const { run, pending, error, setError } = useShopAction(locale);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<(CodeSent & { at: number }) | null>(null);
  const [code, setCode] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");

  const reset = () => {
    setSent(null);
    setCode("");
    setAskPassword(false);
    setPassword("");
    setError(null);
  };

  const send = async () => {
    const result = await run((csrf) => sendPhoneCode({ locale, phone, csrf }));
    if (result.ok) {
      setSent({ ...result.data, at: Date.now() });
      setCode("");
    }
  };

  const confirm = async () => {
    const result = await run((csrf) =>
      attachPhone({
        locale,
        phone,
        code,
        reauth: askPassword ? { password } : undefined,
        csrf,
      }),
    );
    if (result.ok) {
      onAttached(result.data);
      onOpenChange(false);
      reset();
      setPhone("");
      return;
    }
    if (result.fieldErrors?.password) setAskPassword(true);
  };

  const taken = error?.code === "phone_taken";
  const reauth = error?.code === "reauth_required";
  const message = error ? failureText(error, locale) : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) reset();
      }}
      title={copy.phoneGate.title}
      description={copy.phoneGate.body}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void (sent ? confirm() : send());
        }}
      >
        {!sent ? (
          <PhoneField
            label={copy.phoneGate.phoneLabel}
            value={phone}
            onValueChange={setPhone}
            error={error?.fieldErrors?.phone}
            autoFocus
          />
        ) : (
          <>
            <CodeField
              locale={locale}
              value={code}
              onValueChange={setCode}
              mask={sent.mask}
              channel={sent.channel}
              length={sent.length}
              sentAt={sent.at}
              resendIn={sent.resendIn}
              onResend={() => void send()}
              resendPending={pending}
              error={error?.fieldErrors?.code}
            />
            {askPassword ? (
              <PasswordField
                label={copy.phoneGate.passwordLabel}
                hint={copy.phoneGate.passwordHint}
                showLabel={fieldCopy.showPassword}
                hideLabel={fieldCopy.hidePassword}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={error?.fieldErrors?.password}
              />
            ) : null}
          </>
        )}
        {message && !error?.fieldErrors?.phone && !error?.fieldErrors?.code ? (
          <FormAlert>{message}</FormAlert>
        ) : null}
        {taken || reauth ? (
          <Link
            href={shopHref(locale, { kind: "signIn" }, { next })}
            className={buttonStyles({ variant: "secondary", className: "self-start" })}
          >
            {copy.phoneGate.signInWithIt}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {sent ? (
            <Button variant="ghost" onClick={reset}>
              {copy.phoneGate.changePhone}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {copy.phoneGate.cancel}
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending || (sent ? code.length < (sent.length || 6) : phone.length < 17)}
            aria-busy={pending || undefined}
          >
            {sent ? copy.phoneGate.confirm : copy.phoneGate.sendCode}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
