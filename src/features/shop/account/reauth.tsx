"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { sendReauthCode, verifyReauthCode, type Reauth } from "@/data/shop/account.actions";
import type { CodeSent } from "@/data/shop/auth.actions";
import type { Locale } from "@/lib/i18n/locales";

import { authCopy } from "../copy/auth";
import { commonCopy } from "../copy/common";
import { CodeField, FormAlert, PasswordField } from "./controls";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * The proof a sign-in-method change needs (contract §2.2.8–§2.2.10, B-W2
 * fix pass): the current password, or — "I have no password" — a
 * `reset_password` code sent to the account's own phone or e-mail. The parent receives the
 * proof (`Reauth`) and sends it with its action.
 */
export function ReauthStep({
  locale,
  hasPassword,
  value,
  onChange,
  passwordError,
}: {
  locale: Locale;
  hasPassword: boolean;
  value: Reauth;
  onChange: (value: Reauth) => void;
  passwordError?: string;
}) {
  const copy = commonCopy[locale].reauth;
  const fields = authCopy[locale].fields;
  const { run, pending, error } = useShopAction(locale);
  const [sent, setSent] = useState<(CodeSent & { at: number }) | null>(null);
  const [code, setCode] = useState("");
  const [byCode, setByCode] = useState(!hasPassword);
  const switchLink =
    "self-start text-body-sm font-semibold text-ink underline decoration-gold underline-offset-4 hover:text-ink";

  if (!byCode) {
    return (
      <div className="flex flex-col gap-2">
        <PasswordField
          label={copy.passwordLabel}
          showLabel={fields.showPassword}
          hideLabel={fields.hidePassword}
          autoComplete="current-password"
          value={value.password ?? ""}
          onChange={(event) => onChange({ password: event.target.value })}
          // The API's "required" for the first, password-less attempt is the
          // reason this step opened, not a mistake (U17): an error shows only
          // once a password was entered.
          error={value.password ? passwordError : undefined}
        />
        <button
          type="button"
          className={switchLink}
          onClick={() => {
            setByCode(true);
            onChange({});
          }}
        >
          {copy.noPassword}
        </button>
      </div>
    );
  }

  if (value.verificationToken) {
    return <p className="m-0 text-body-sm font-semibold text-success">✓ {copy.verified}</p>;
  }

  const send = async () => {
    const result = await run((csrf) => sendReauthCode({ locale, csrf }));
    if (result.ok) {
      setSent({ ...result.data, at: Date.now() });
      setCode("");
    }
  };
  const verify = async () => {
    const result = await run((csrf) => verifyReauthCode({ locale, code, csrf }));
    if (result.ok) onChange({ verificationToken: result.data.token });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-4">
      <p className="m-0 text-label">{copy.title}</p>
      {!sent ? (
        <>
          <p className="m-0 text-body-sm text-ink-muted">{copy.codeIntro}</p>
          <Button
            variant="secondary"
            onClick={() => void send()}
            disabled={pending}
            className="self-start"
          >
            {copy.sendCode}
          </Button>
        </>
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
            autoFocus={false}
          />
          <Button
            onClick={() => void verify()}
            disabled={pending || code.length < sent.length}
            className="self-start"
          >
            {copy.verify}
          </Button>
        </>
      )}
      {hasPassword ? (
        <button
          type="button"
          className={switchLink}
          onClick={() => {
            setByCode(false);
            setSent(null);
          }}
        >
          {copy.usePassword}
        </button>
      ) : null}
      {error && !error.fieldErrors?.code ? (
        <FormAlert>
          {error.code === "reauth_required" ? copy.signInAgain : failureText(error, locale)}
        </FormAlert>
      ) : null}
    </div>
  );
}
