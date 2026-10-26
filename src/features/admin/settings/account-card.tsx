"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { changePassword, unlinkSocialAccount } from "@/data/settings.actions";
import { PASSWORD_MIN, type ChangePasswordValues } from "@/data/settings.schema";
import type { StaffAccount } from "@/domain/settings";
import { formatDateTimeShort } from "@/lib/format";

import { runAction } from "../shared/action-client";
import { useFocusFirstInvalid } from "../shared/focus-invalid";
import { partitionFieldErrors } from "../shared/field-errors";
import { readCsrfCookie } from "../shared/csrf";
import { claimNotice, withoutParam } from "../shared/notice-once";
import { othersLogoutNotice } from "./others-logout";
import { socialBlock, type SocialProviderOption } from "./social-rows";

/** A link flow's outcome, verified server-side from the signed `?oauth=` token. */
export interface SocialNotice {
  kind: "error" | "linked" | "demo";
  /** Provider label ("Google"). */
  provider: string;
  message: string;
  /** When the callback issued it (epoch ms): identifies the notice so it is toasted once. */
  issuedAt: number;
}

const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_FIELDS = Object.keys(EMPTY);

/**
 * Where focus goes when the «Uzish» confirmation closes: the row's action —
 * «Uzish» after a dismissal or a refusal, «Bog‘lash» after a success in a
 * password session — else the row itself (a session that cannot link shows
 * no action on an unlinked row), else the block's heading (a provider that
 * is no longer enabled leaves no row once unlinked).
 */
function unlinkFocusTarget(id: string | null): HTMLElement | null {
  return (
    (id &&
      (document.getElementById(`social-action-${id}`) ??
        document.getElementById(`social-row-${id}`))) ||
    document.getElementById("social-title")
  );
}

interface AccountCardProps {
  account: StaffAccount | null;
  /** Social sign-in providers enabled on this server (`GLOWDERMA_OAUTH_PROVIDERS`). */
  providers?: SocialProviderOption[];
  notice?: SocialNotice | null;
}

/**
 * The signed-in staff member (contract §2.1): password change through a
 * Server Action (`auth/change-password/`; the other sessions are revoked,
 * this one stays), the social sign-in providers — "Bog‘lash" starts the
 * OAuth link flow (`/admin/auth/oauth/{provider}/start?intent=link`, back
 * here with a signed notice), "Uzish" asks for confirmation and calls
 * `DELETE auth/oauth/{provider}/` through a Server Action — and "sign out
 * other devices" through the logout route with `scope=others`.
 */
export function AccountCard({ account, providers = [], notice = null }: AccountCardProps) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [csrf, setCsrf] = useState("");
  // Linked providers as last loaded, or as the last unlink left them (mock
  // mode keeps the local change; api mode re-renders with `auth/me/`).
  const [source, setSource] = useState(account);
  // `null`: the account could not be loaded, so the link state is unknown.
  const [linked, setLinked] = useState<string[] | null>(account?.linkedProviders ?? null);
  if (source !== account) {
    setSource(account);
    setLinked(account?.linkedProviders ?? null);
  }
  const [unlinkTarget, setUnlinkTarget] = useState<SocialProviderOption | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const unlinkInFlight = useRef(false);
  /** The row that takes focus back once the confirmation closes (see `unlinkFocusTarget`). */
  const focusRow = useRef<string | null>(null);
  // A session that did not sign in with the password cannot link (M3 `auth_method`).
  const social = socialBlock(providers, linked, account?.authMethod);

  // A link flow's outcome (the callback lands here with `?oauth=`): drop the
  // token through the router (so a later `refresh()` does not render it
  // again) and toast it once per notice (`claimNotice`; StrictMode's second
  // effect run and re-renders with the old props are no-ops).
  const search = searchParams.toString();
  useEffect(() => {
    if (!notice) return;
    if (new URLSearchParams(search).has("oauth")) {
      router.replace(withoutParam(pathname, search, "oauth") as Route, { scroll: false });
    }
    if (!claimNotice(`oauth:${notice.issuedAt}:${notice.kind}:${notice.provider}`)) return;
    toast(
      notice.kind === "linked"
        ? { tone: "success", title: notice.message }
        : notice.kind === "demo"
          ? {
              tone: "info",
              title: `${notice.provider} hisobi bog‘lanmadi`,
              description: notice.message,
            }
          : {
              tone: "info",
              title: `${notice.provider} hisobini bog‘lab bo‘lmadi`,
              description: notice.message,
            },
    );
  }, [notice, toast, router, pathname, search]);

  const confirmUnlink = async () => {
    if (!unlinkTarget || unlinkInFlight.current) return;
    unlinkInFlight.current = true;
    setUnlinking(true);
    const target = unlinkTarget;
    const result = await runAction((token) => unlinkSocialAccount(target.id, token));
    unlinkInFlight.current = false;
    setUnlinking(false);
    focusRow.current = target.id;
    setUnlinkTarget(null);
    if (!result.ok) {
      toast({ tone: "info", title: "Amal bajarilmadi", description: result.error });
      // 404: the identity is already gone (another tab, another admin) — re-read the card.
      if (result.code === "not_found") router.refresh();
      return;
    }
    setLinked((current) => current?.filter((id) => id !== target.id) ?? null);
    toast({ title: `${target.label} hisobi uzildi` });
  };
  // The logout route's `scope=others` outcome (a full page load back here):
  // confirm only a real success; a failure says the sessions are still open.
  useEffect(() => {
    const notice = othersLogoutNotice(window.location.href);
    if (!notice) return;
    window.history.replaceState(window.history.state, "", notice.cleanUrl);
    toast(notice.toast);
  }, [toast]);

  const focusFirstInvalid = useFocusFirstInvalid();
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
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
      focusFirstInvalid(form);
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
        <h3 id="social-title" tabIndex={-1} className="m-0 text-label text-ink">
          Ijtimoiy tarmoq orqali kirish
        </h3>
        {social.kind === "off" ? (
          <p className="m-0 text-body-sm text-ink-muted">
            Google yoki Facebook orqali kirish bu serverda yoqilmagan.
          </p>
        ) : social.kind === "unknown" ? (
          <p className="m-0 text-body-sm text-ink-muted">
            Ijtimoiy tarmoq holatini yuklab bo‘lmadi.
          </p>
        ) : (
          <ul aria-labelledby="social-title" className="m-0 flex list-none flex-col gap-2 p-0">
            {social.rows.map((row) => (
              <li
                key={row.id}
                id={`social-row-${row.id}`}
                tabIndex={-1}
                className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
                  {row.label}
                  <Badge tone={row.linked ? "success" : "neutral"}>
                    {row.linked ? "Bog‘langan" : "Bog‘lanmagan"}
                  </Badge>
                </span>
                {row.linked ? (
                  <Button
                    id={`social-action-${row.id}`}
                    variant="outline"
                    size="sm"
                    aria-label={`${row.label} hisobini uzish`}
                    onClick={() => setUnlinkTarget(row)}
                  >
                    Uzish
                  </Button>
                ) : row.linkHref ? (
                  <a
                    id={`social-action-${row.id}`}
                    href={row.linkHref}
                    aria-label={`${row.label} hisobini bog‘lash`}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    Bog‘lash
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {social.kind === "rows" && social.linkHint && (
          <p className="m-0 flex items-start gap-1.5 text-body-sm text-ink">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
            {social.linkHint}
          </p>
        )}
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
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open && !unlinkInFlight.current) {
            focusRow.current = unlinkTarget?.id ?? null;
            setUnlinkTarget(null);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Never Radix's default: after a success the «Uzish» that opened the
          // dialog is gone, and focus would fall to <body>.
          event.preventDefault();
          const id = focusRow.current;
          focusRow.current = null;
          unlinkFocusTarget(id)?.focus();
        }}
        title={`${unlinkTarget?.label ?? ""} hisobini uzasizmi?`}
        description={
          <p className="m-0 text-[14px] leading-5 text-ink">
            Bu hisob orqali endi kirib bo‘lmaydi. Keyin qayta bog‘lash mumkin; email va parol bilan
            kirish o‘zgarmaydi.
          </p>
        }
      >
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel className={buttonStyles({ variant: "outline" })} disabled={unlinking}>
            Orqaga
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirmUnlink}
            disabled={unlinking}
            aria-busy={unlinking}
          >
            {unlinking ? "Uzilmoqda…" : "Uzish"}
          </Button>
        </div>
      </AlertDialog>

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
