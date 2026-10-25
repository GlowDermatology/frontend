"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/data/settings.actions";
import { PASSWORD_MIN, type ChangePasswordValues } from "@/data/settings.schema";
import type { StaffAccount } from "@/domain/settings";
import { formatDateTimeShort } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { partitionFieldErrors } from "../shared/field-errors";
import { readCsrfCookie } from "../shared/csrf";
import { useNotConnected } from "../shell/not-connected";
import { othersLogoutNotice } from "./others-logout";

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
] as const;

const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_FIELDS = Object.keys(EMPTY);

/**
 * The signed-in staff member (contract §2.1): password change through a
 * Server Action (`auth/change-password/`; the other sessions are revoked,
 * this one stays), the linked social sign-in providers from `auth/me/`, and
 * "sign out other devices" through the logout route with `scope=others`.
 * Linking and unlinking Google/Facebook need the OAuth start route, which is
 * not built yet, so those buttons say so.
 */
export function AccountCard({ account }: { account: StaffAccount | null }) {
  const toast = useToast();
  const notConnected = useNotConnected();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [csrf, setCsrf] = useState("");

  // The logout route's `scope=others` outcome (a full page load back here):
  // confirm only a real success; a failure says the sessions are still open.
  useEffect(() => {
    const notice = othersLogoutNotice(window.location.href);
    if (!notice) return;
    window.history.replaceState(window.history.state, "", notice.cleanUrl);
    toast(notice.toast);
  }, [toast]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFormError(null);
    const result = await runAction((token) => changePassword(values, token));
    inFlight.current = false;
    setBusy(false);
    if (!result.ok) {
      const { fieldErrors, formError: message } = partitionFieldErrors(result, PASSWORD_FIELDS);
      setErrors(fieldErrors);
      setFormError(message);
      return;
    }
    setValues(EMPTY);
    toast({
      title: "Parol o‘zgartirildi",
      description: "Boshqa qurilmalardagi sessiyalar yakunlandi.",
    });
  };

  const field = (key: keyof ChangePasswordValues, label: string, autoComplete: string) => (
    <Field label={label} error={errors[key]}>
      {(c) => (
        <TextInput
          {...c}
          name={key}
          type="password"
          autoComplete={autoComplete}
          value={values[key]}
          onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
        />
      )}
    </Field>
  );

  return (
    <Card aria-labelledby="account-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle id="account-title" className="text-heading">
          Hisob
        </CardTitle>
        <span className="text-body-sm text-ink-muted">
          {account ? `${account.displayName} · ${account.email}` : "Sessiya topilmadi"}
          {account?.sessionExpiresAt &&
            ` · sessiya ${formatDateTimeShort(account.sessionExpiresAt)} gacha`}
        </span>
      </div>

      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3"
        aria-label="Parolni o‘zgartirish"
      >
        <h3 className="m-0 text-label text-ink">Parolni o‘zgartirish</h3>
        {field("currentPassword", "Joriy parol", "current-password")}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("newPassword", "Yangi parol", "new-password")}
          {field("confirmPassword", "Yangi parolni takrorlang", "new-password")}
        </div>
        <p className="m-0 text-caption font-normal text-ink-muted">
          Kamida {PASSWORD_MIN} ta belgi; oddiy yoki faqat raqamli parol qabul qilinmaydi.
        </p>
        {formError && (
          <p
            role="alert"
            className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
          >
            <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
            {formError}
          </p>
        )}
        <Button
          type="submit"
          variant="secondary"
          disabled={busy}
          aria-busy={busy}
          className="self-start"
        >
          <Icon name="lock" size={18} />
          {busy ? "O‘zgartirilmoqda…" : "Parolni o‘zgartirish"}
        </Button>
      </form>

      <span aria-hidden="true" className="h-px bg-line" />

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-label text-ink">Ijtimoiy tarmoq orqali kirish</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {PROVIDERS.map((provider) => {
            const linked = account?.linkedProviders.includes(provider.id) ?? false;
            return (
              <li
                key={provider.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
                  {provider.label}
                  <Badge tone={linked ? "success" : "neutral"}>
                    {linked ? "Bog‘langan" : "Bog‘lanmagan"}
                  </Badge>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    notConnected(
                      `${provider.label} hisobini ${linked ? "uzish" : "bog‘lash"} uchun OAuth oqimi hali qurilmagan.`,
                    )
                  }
                >
                  {linked ? "Uzish" : "Bog‘lash"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <span aria-hidden="true" className="h-px bg-line" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-label text-ink">Boshqa qurilmalardan chiqish</span>
          <span className="text-caption font-normal text-ink-muted">
            Shu brauzerdan boshqa hamma sessiyalar yakunlanadi.
          </span>
        </span>
        <Button
          variant="danger"
          onClick={() => {
            setCsrf(readCsrfCookie());
            setOthersOpen(true);
          }}
        >
          <Icon name="logout" size={18} />
          Boshqa qurilmalardan chiqish
        </Button>
      </div>

      <AlertDialog
        open={othersOpen}
        onOpenChange={setOthersOpen}
        title="Boshqa qurilmalardan chiqasizmi?"
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Boshqa brauzer va qurilmalardagi sessiyalaringiz darhol yakunlanadi. Bu sessiya ochiq
            qoladi.
          </p>
        }
      >
        <form
          method="post"
          action="/admin/auth/logout"
          className="mt-1.5 flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="scope" value="others" />
          <AlertDialogCancel type="button" className={buttonStyles({ variant: "outline" })}>
            Orqaga
          </AlertDialogCancel>
          <Button type="submit" variant="destructive">
            Chiqish
          </Button>
        </form>
      </AlertDialog>
    </Card>
  );
}
