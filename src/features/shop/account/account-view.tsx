"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, Dialog } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  acceptTerms,
  attachEmail,
  changePassword,
  deleteAccount,
  deleteAddress,
  linkSocial,
  makeDefaultAddress,
  sendEmailCode,
  unlinkSocial,
  updateProfile,
  type Reauth,
} from "@/data/shop/account.actions";
import type { CodeSent } from "@/data/shop/auth.actions";
import { socialNonce } from "@/data/shop/auth.actions";
import type {
  ShopAddress,
  ShopLanguage,
  ShopMe,
  ShopRegion,
  SocialProvider,
} from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import { formatLongDate, formatPhone } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { SocialButtons, type SocialToken } from "../auth/social-buttons";
import type { SocialConfig } from "../auth/social-config";
import { authCopy } from "../copy/auth";
import { accountCopy } from "../copy/account";
import { commonCopy } from "../copy/common";
import { shopPath } from "../routing/routes";
import { runShopAction } from "../shared/action-client";
import { AddressDialog } from "./address-form";
import { CodeField, FormAlert, FormNote, PasswordField } from "./controls";
import { PhoneGate } from "./phone-gate";
import { ReauthStep } from "./reauth";
import { useShopSession } from "./session-context";
import { failureText, useShopAction } from "./use-shop-action";

/**
 * The account page (contract §2.2; hybrid identity B-W2): profile and
 * language, phone (attach once; it is never replaced) and e-mail (attach or
 * change, by code), password (change, or set with a code for a social-only
 * account), Google/Facebook/Apple (link and unlink after re-authentication),
 * saved addresses, new terms, and account deletion.
 */

interface AccountViewProps {
  locale: Locale;
  initialMe: ShopMe;
  addresses: ShopAddress[];
  regions: ShopRegion[];
  social: SocialConfig;
  termsHref: string;
}

function Card({
  id,
  title,
  children,
  aside,
}: {
  id: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-lg border border-line bg-surface-raised p-[clamp(18px,2.4vw,28px)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="m-0 font-serif text-[26px] leading-8 font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, action }: { label: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-sm text-ink-muted">{label}</span>
        <span className="text-label break-words text-ink">{value}</span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --- profile ----------------------------------------------------------------- */

function ProfileCard({
  locale,
  me,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = accountCopy[locale].profile;
  const [name, setName] = useState(me.name);
  const [language, setLanguage] = useState<ShopLanguage>(me.language);
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useShopAction(locale);
  const save = async () => {
    setSaved(false);
    const result = await run((csrf) => updateProfile({ locale, name, language, csrf }));
    if (result.ok) {
      onSaved(result.data);
      setSaved(true);
    }
  };
  return (
    <Card
      id="profile-title"
      title={copy.title}
      aside={
        <span className="text-body-sm text-ink-muted">
          {copy.since(formatLongDate(me.registeredAt, locale))}
        </span>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label={copy.name} error={error?.fieldErrors?.name}>
          {(control) => (
            <TextInput
              {...control}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Field label={copy.language}>
          {(control) => (
            <Select
              {...control}
              value={language}
              onChange={(event) => setLanguage(event.target.value as ShopLanguage)}
            >
              {(["uz", "ru", "en"] as const).map((value) => (
                <option key={value} value={value} lang={value}>
                  {copy.languages[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            {copy.save}
          </Button>
          {saved ? (
            <span role="status" className="text-body-sm text-success">
              {copy.saved}
            </span>
          ) : null}
          {error && !error.fieldErrors ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
        </div>
      </form>
    </Card>
  );
}

/* --- phone and e-mail -------------------------------------------------------- */

function EmailDialog({
  locale,
  me,
  open,
  onOpenChange,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = accountCopy[locale].contact;
  const common = commonCopy[locale];
  const { run, pending, error, setError } = useShopAction(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<(CodeSent & { at: number }) | null>(null);
  const [code, setCode] = useState("");
  const [reauth, setReauth] = useState<Reauth | null>(null);

  const send = async () => {
    const result = await run((csrf) => sendEmailCode({ locale, email, csrf }));
    if (result.ok) {
      setSent({ ...result.data, at: Date.now() });
      setCode("");
    }
  };
  const confirm = async () => {
    const result = await run((csrf) =>
      attachEmail({ locale, email, code, reauth: reauth ?? undefined, csrf }),
    );
    if (result.ok) {
      onSaved(result.data);
      onOpenChange(false);
    } else if (
      result.code === "reauth_required" ||
      result.fieldErrors?.password ||
      result.fieldErrors?.verification_token
    ) {
      setReauth((current) => current ?? {});
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setSent(null);
          setError(null);
          setReauth(null);
        }
      }}
      title={copy.emailTitle}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void (sent ? confirm() : send());
        }}
      >
        {!sent ? (
          <Field label={copy.emailLabel} error={error?.fieldErrors?.email}>
            {(control) => (
              <TextInput
                {...control}
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>
        ) : (
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
        )}
        {reauth ? (
          <ReauthStep
            locale={locale}
            hasPassword={me.hasPassword}
            value={reauth}
            onChange={setReauth}
            passwordError={error?.fieldErrors?.password}
          />
        ) : null}
        {error && !error.fieldErrors ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {common.dialog.cancel}
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            {sent ? copy.confirm : copy.sendCode}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ContactCard({
  locale,
  me,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = accountCopy[locale].contact;
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <Card id="contact-title" title={copy.title}>
      <Row
        label={copy.phone}
        value={
          me.phone ? (
            formatPhone(me.phone)
          ) : (
            <span className="font-normal text-ink-muted">{copy.phoneMissing}</span>
          )
        }
        action={
          me.phone ? (
            <span className="text-caption text-ink-muted">{copy.phoneFixed}</span>
          ) : (
            <Button size="sm" onClick={() => setPhoneOpen(true)}>
              {copy.phoneAdd}
            </Button>
          )
        }
      />
      <Row
        label={copy.email}
        value={
          me.email ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {me.email}
              <Badge tone="success">{copy.verified}</Badge>
            </span>
          ) : (
            <span className="font-normal text-ink-muted">{copy.emailMissing}</span>
          )
        }
        action={
          <Button size="sm" variant="secondary" onClick={() => setEmailOpen(true)}>
            {me.email ? copy.emailChange : copy.emailAdd}
          </Button>
        }
      />
      {notice ? <FormNote>{notice}</FormNote> : null}
      <PhoneGate
        locale={locale}
        hasPassword={me.hasPassword}
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        next={shopPath(locale, { kind: "account" })}
        onAttached={(next) => {
          onSaved(next);
          setNotice(commonCopy[locale].phoneGate.attached);
        }}
      />
      {emailOpen ? (
        <EmailDialog
          locale={locale}
          me={me}
          open={emailOpen}
          onOpenChange={setEmailOpen}
          onSaved={(next) => {
            onSaved(next);
            setNotice(copy.emailSaved);
          }}
        />
      ) : null}
    </Card>
  );
}

/* --- password ---------------------------------------------------------------- */

function PasswordCard({
  locale,
  me,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = accountCopy[locale].password;
  const fields = authCopy[locale].fields;
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Reauth>({});
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useShopAction(locale);
  const key = useIdempotencyKey();
  const save = async () => {
    const result = key.settle(
      await run((csrf) =>
        changePassword({
          locale,
          currentPassword: current.password ?? null,
          verificationToken: current.verificationToken ?? null,
          password,
          idempotencyKey: key.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      onSaved(result.data);
      setSaved(true);
      setOpen(false);
      setPassword("");
      setCurrent({});
    }
  };
  return (
    <Card id="password-title" title={copy.title}>
      <Row
        label={copy.title}
        value={me.hasPassword ? copy.hasPassword : copy.noPassword}
        action={
          !open ? (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              {me.hasPassword ? copy.change : copy.set}
            </Button>
          ) : null
        }
      />
      {saved ? <FormNote>{copy.saved}</FormNote> : null}
      {open ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <ReauthStep
            locale={locale}
            hasPassword={me.hasPassword}
            value={current}
            onChange={setCurrent}
            passwordError={error?.fieldErrors?.current_password}
          />
          <PasswordField
            label={copy.next}
            hint={copy.rules}
            showLabel={fields.showPassword}
            hideLabel={fields.hidePassword}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error?.fieldErrors?.password}
          />
          {error && !error.fieldErrors ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {copy.save}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {commonCopy[locale].dialog.cancel}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

/* --- social identities ------------------------------------------------------- */

function SocialCard({
  locale,
  me,
  config,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  config: SocialConfig;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = accountCopy[locale].social;
  const [dialog, setDialog] = useState<{
    provider: SocialProvider;
    mode: "link" | "unlink";
  } | null>(null);
  const [reauth, setReauth] = useState<Reauth>({});
  const [notice, setNotice] = useState<string | null>(null);
  const { run, pending, error, setError } = useShopAction(locale);
  const key = useIdempotencyKey();

  const close = () => {
    setDialog(null);
    setReauth({});
    setError(null);
  };
  const proven = Boolean(reauth.password || reauth.verificationToken);

  const unlink = async () => {
    if (!dialog) return;
    const result = await run((csrf) =>
      unlinkSocial({ locale, provider: dialog.provider, reauth, csrf }),
    );
    if (result.ok) {
      onSaved(result.data);
      setNotice(copy.unlinkedNotice(copy.names[dialog.provider]));
      close();
    }
  };
  const link = async (token: SocialToken) => {
    if (!dialog) return;
    const result = key.settle(
      await run((csrf) =>
        linkSocial({
          locale,
          provider: token.provider,
          token: token.token,
          tokenType: token.tokenType,
          nonce: token.nonce,
          authorizationCode: token.authorizationCode,
          reauth,
          idempotencyKey: key.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      onSaved(result.data);
      setNotice(copy.linkedNotice(copy.names[token.provider]));
      close();
    }
  };
  const getNonce = async () => {
    const result = await runShopAction(locale, (csrf) => socialNonce({ locale, csrf }));
    return result.ok ? result.data.nonce : null;
  };

  const only = (provider: SocialProvider): SocialConfig => ({
    google: provider === "google" ? config.google : null,
    facebook: provider === "facebook" ? config.facebook : null,
    apple: provider === "apple" ? config.apple : null,
  });

  return (
    <Card id="social-title" title={copy.title}>
      <p className="m-0 -mt-2 text-body-sm text-ink-muted">{copy.lead}</p>
      {(["google", "facebook", "apple"] as const).map((provider) => {
        const linked = me.linkedProviders.includes(provider);
        const available = config[provider] !== null;
        return (
          <Row
            key={provider}
            label={copy.names[provider]}
            value={linked ? copy.linked : available ? copy.notLinked : copy.unavailable}
            action={
              linked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDialog({ provider, mode: "unlink" })}
                >
                  {copy.unlink}
                </Button>
              ) : available ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialog({ provider, mode: "link" })}
                >
                  {copy.link}
                </Button>
              ) : null
            }
          />
        );
      })}
      {notice ? <FormNote>{notice}</FormNote> : null}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && close()}
        title={
          dialog
            ? dialog.mode === "link"
              ? copy.linkTitle(copy.names[dialog.provider])
              : copy.unlinkTitle(copy.names[dialog.provider])
            : ""
        }
        description={dialog?.mode === "link" ? copy.linkBody : copy.unlinkBody}
      >
        {dialog ? (
          <div className="flex flex-col gap-4">
            <ReauthStep
              locale={locale}
              hasPassword={me.hasPassword}
              value={reauth}
              onChange={setReauth}
              passwordError={error?.fieldErrors?.password}
            />
            {dialog.mode === "link" && proven ? (
              <SocialButtons
                locale={locale}
                config={only(dialog.provider)}
                getNonce={getNonce}
                onToken={(token) => void link(token)}
                onError={() => undefined}
                pending={pending}
              />
            ) : null}
            {error && !error.fieldErrors ? (
              <FormAlert>{failureText(error, locale)}</FormAlert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                {commonCopy[locale].dialog.cancel}
              </Button>
              {dialog.mode === "unlink" ? (
                <Button
                  variant="destructive"
                  onClick={() => void unlink()}
                  disabled={pending || !proven}
                  aria-busy={pending || undefined}
                >
                  {copy.unlink}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Dialog>
    </Card>
  );
}

/* --- addresses --------------------------------------------------------------- */

function AddressesCard({
  locale,
  initial,
  regions,
}: {
  locale: Locale;
  initial: ShopAddress[];
  regions: ShopRegion[];
}) {
  const copy = accountCopy[locale].addresses;
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<ShopAddress | "new" | null>(null);
  const [removing, setRemoving] = useState<ShopAddress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { run, pending, error } = useShopAction(locale);

  const saved = (address: ShopAddress) => {
    setAddresses((current) => {
      const others = current
        .filter((item) => item.id !== address.id)
        .map((item) => (address.isDefault ? { ...item, isDefault: false } : item));
      return address.isDefault ? [address, ...others] : [...others, address];
    });
    setNotice(copy.saved);
  };
  const remove = async () => {
    if (!removing) return;
    const id = removing.id;
    const result = await run((csrf) => deleteAddress({ locale, id, csrf }));
    setRemoving(null);
    if (result.ok) {
      setAddresses((current) => current.filter((item) => item.id !== id));
      setNotice(copy.deleted);
    }
  };
  const makeDefault = async (address: ShopAddress) => {
    const result = await run((csrf) => makeDefaultAddress({ locale, id: address.id, csrf }));
    if (result.ok) saved(result.data);
  };
  const regionName = (address: ShopAddress) => {
    const region = regions.find((item) => item.code === address.regionCode);
    const city = region?.cities.find((item) => item.code === address.cityCode);
    return [city?.name, region?.name].filter(Boolean).join(", ");
  };

  return (
    <Card
      id="addresses-title"
      title={copy.title}
      aside={
        <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={16} />
          {copy.add}
        </Button>
      }
    >
      {addresses.length === 0 ? <p className="m-0 text-body text-ink-muted">{copy.empty}</p> : null}
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id} className="flex flex-col gap-2 rounded-md border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label">{address.label || copy.title}</span>
              {address.isDefault ? <Badge tone="gold">{copy.default}</Badge> : null}
            </div>
            <span className="text-body-sm text-ink">{address.text}</span>
            {regionName(address) ? (
              <span className="text-caption text-ink-muted">{regionName(address)}</span>
            ) : null}
            {address.comment ? (
              <span className="text-caption text-ink-muted">{address.comment}</span>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(address)}>
                {copy.edit}
              </Button>
              {!address.isDefault ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void makeDefault(address)}
                  disabled={pending}
                >
                  {copy.makeDefault}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setRemoving(address)}>
                {copy.delete}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {notice ? <FormNote>{notice}</FormNote> : null}
      {error ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
      {editing ? (
        <AddressDialog
          key={editing === "new" ? "new" : editing.id}
          locale={locale}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          regions={regions}
          address={editing === "new" ? null : editing}
          onSaved={saved}
        />
      ) : null}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={copy.deleteTitle}
        description={<p className="m-0 text-body text-ink-muted">{removing?.text}</p>}
      >
        <div className="flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="secondary">{commonCopy[locale].dialog.cancel}</Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={() => void remove()} disabled={pending}>
            {copy.deleteConfirm}
          </Button>
        </div>
      </AlertDialog>
    </Card>
  );
}

/* --- consent and deletion ------------------------------------------------------ */

function ConsentBanner({
  locale,
  me,
  termsHref,
  onSaved,
}: {
  locale: Locale;
  me: ShopMe;
  termsHref: string;
  onSaved: (me: ShopMe) => void;
}) {
  const copy = commonCopy[locale].consent;
  const { run, pending, error } = useShopAction(locale);
  if (!me.consent.updateRequired || !me.consent.currentVersion) return null;
  const version = me.consent.currentVersion;
  const accept = async () => {
    const result = await run((csrf) => acceptTerms({ locale, termsVersion: version, csrf }));
    if (result.ok) onSaved(result.data);
  };
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-lg border-[1.5px] border-gold-ink bg-gold-soft p-5"
    >
      <h2 className="m-0 text-subheading">{copy.title}</h2>
      <p className="m-0 text-body text-ink">{copy.body}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={termsHref}
          target="_blank"
          rel="noopener"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          {copy.read}
        </a>
        <Button
          size="sm"
          onClick={() => void accept()}
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {copy.accept}
        </Button>
      </div>
      {error ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
    </section>
  );
}

function DangerCard({ locale, me }: { locale: Locale; me: ShopMe }) {
  const copy = accountCopy[locale].danger;
  const [open, setOpen] = useState(false);
  const [reauth, setReauth] = useState<Reauth>({});
  const { run, pending, error } = useShopAction(locale);
  const proven =
    Boolean(reauth.password || reauth.verificationToken) ||
    (!me.hasPassword && !me.phone && !me.email);
  const remove = async () => {
    const result = await run((csrf) => deleteAccount({ locale, reauth, csrf }));
    if (result.ok) window.location.assign(shopPath(locale, { kind: "home" }));
  };
  return (
    <section
      aria-labelledby="danger-title"
      className="flex flex-col gap-3 rounded-lg border border-danger/40 p-[clamp(18px,2.4vw,28px)]"
    >
      <h2 id="danger-title" className="m-0 text-subheading">
        {copy.title}
      </h2>
      <p className="m-0 max-w-[640px] text-body-sm text-ink-muted">{copy.body}</p>
      <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>
        {copy.action}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.confirmTitle}
        description={<p className="m-0 text-body text-ink-muted">{copy.confirmBody}</p>}
      >
        <div className="flex flex-col gap-4">
          <ReauthStep
            locale={locale}
            hasPassword={me.hasPassword}
            value={reauth}
            onChange={setReauth}
            passwordError={error?.fieldErrors?.password}
          />
          {error && !error.fieldErrors ? <FormAlert>{failureText(error, locale)}</FormAlert> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="secondary">{commonCopy[locale].dialog.cancel}</Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void remove()}
              disabled={pending || !proven}
              aria-busy={pending || undefined}
            >
              {copy.confirm}
            </Button>
          </div>
        </div>
      </AlertDialog>
    </section>
  );
}

export function AccountView({
  locale,
  initialMe,
  addresses,
  regions,
  social,
  termsHref,
}: AccountViewProps) {
  const [me, setMe] = useState(initialMe);
  const { reload } = useShopSession();
  const onSaved = (next: ShopMe) => {
    setMe(next);
    reload();
  };
  return (
    <>
      <ConsentBanner locale={locale} me={me} termsHref={termsHref} onSaved={onSaved} />
      <ProfileCard locale={locale} me={me} onSaved={onSaved} />
      <ContactCard locale={locale} me={me} onSaved={onSaved} />
      <PasswordCard locale={locale} me={me} onSaved={onSaved} />
      <SocialCard locale={locale} me={me} config={social} onSaved={onSaved} />
      <AddressesCard locale={locale} initial={addresses} regions={regions} />
      <DangerCard locale={locale} me={me} />
    </>
  );
}
