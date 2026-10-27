"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { attachPhone, sendPhoneCode, type Reauth } from "@/data/shop/account.actions";
import type { CodeSent } from "@/data/shop/auth.actions";
import type { ShopMe } from "@/domain/shop-account";
import type { Locale } from "@/lib/i18n/locales";

import { commonCopy } from "../copy/common";
import { shopHref } from "../routing/routes";
import { CodeField, FormAlert, PhoneField } from "./controls";
import { ReauthStep } from "./reauth";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * The phone gate (hybrid identity, B-W2): checkout, payment, booking and
 * the QR answer 409 `phone_required` for an account without a phone. This
 * dialog attaches one — `me/phone/code/` then `me/phone/` — and hands the
 * caller back to its retry. A number held by another account
 * (`phone_taken`) is never merged: the customer may sign in with it instead.
 * When the API asks for re-authentication (`reauth_required`, B-W2: an
 * account with a password, phone or e-mail) the password is asked — or a
 * code to the account's own e-mail for "I have no password"; a number held
 * by a deleted account (`details.deleted`) offers to register with it.
 */
export function PhoneGate({
  locale,
  open,
  onOpenChange,
  onAttached,
  next,
  hasPassword = true,
}: {
  locale: Locale;
  /** Whether the account has a password (unknown at checkout: the password is offered first). */
  hasPassword?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: (me: ShopMe) => void;
  /** Where "sign in with this number" returns to. */
  next: string;
}) {
  const copy = commonCopy[locale];
  const { run, pending, error, setError } = useShopAction(locale);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<(CodeSent & { at: number }) | null>(null);
  const [code, setCode] = useState("");
  const [reauth, setReauth] = useState<Reauth | null>(null);

  const reset = () => {
    setSent(null);
    setCode("");
    setReauth(null);
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
        reauth: reauth ?? undefined,
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
    if (
      result.code === "reauth_required" ||
      result.fieldErrors?.password ||
      result.fieldErrors?.verification_token
    ) {
      // B-W2: a password (or a reset code to the account's own phone/e-mail) is needed.
      setReauth((current) => current ?? {});
    }
  };

  const taken = error?.code === "phone_taken";
  const takenByDeleted =
    taken &&
    typeof error?.details === "object" &&
    error.details !== null &&
    (error.details as { deleted?: unknown }).deleted === true;
  const signInAgain =
    error?.code === "reauth_required" &&
    reauth !== null &&
    Boolean(reauth.password || reauth.verificationToken);
  const message =
    error && !(error.code === "reauth_required" && !signInAgain) ? failureText(error, locale) : "";

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
            {reauth ? (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-body-sm text-ink-muted">{copy.phoneGate.passwordHint}</p>
                <ReauthStep
                  locale={locale}
                  hasPassword={hasPassword}
                  value={reauth}
                  onChange={setReauth}
                  passwordError={error?.fieldErrors?.password}
                />
              </div>
            ) : null}
          </>
        )}
        {message && !error?.fieldErrors ? (
          <FormAlert>{message}</FormAlert>
        ) : null}
        {taken || signInAgain ? (
          <Link
            href={shopHref(
              locale,
              { kind: "signIn" },
              { next, switch: 1, mode: takenByDeleted ? "signup" : undefined },
            )}
            className={buttonStyles({ variant: "secondary", className: "self-start" })}
          >
            {takenByDeleted ? copy.phoneGate.registerWithIt : copy.phoneGate.signInWithIt}
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
