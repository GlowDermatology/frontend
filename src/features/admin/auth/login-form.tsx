"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { OAuthProvider } from "@/data/auth/oauth";
import { login } from "@/data/auth.actions";
import { useErrorReveal } from "@/lib/forms/reveal";
import { useCopy } from "@/lib/i18n/admin-context";

import { withoutParam } from "../shared/notice-once";
import { staffAuthCopy } from "./copy";
import { hasLoginErrors, validateLogin, type LoginFieldErrors } from "./login-validation";
import { ProviderMark } from "./provider-mark";

export interface SocialProvider {
  id: OAuthProvider;
  label: string;
  /** `/admin/auth/oauth/{provider}/start?next=…` (a full navigation, not a client route). */
  href: string;
}

interface LoginFormProps {
  /** Validated in-panel path to land on after login. */
  next: string;
  /** Current `gd_csrf` cookie value (double-submit token). */
  csrf: string;
  /** Enabled social sign-in providers; empty = no buttons. */
  providers?: ReadonlyArray<SocialProvider>;
  /** Fake OAuth mode: the buttons say "(sinov)", so they never pass for a real sign-in. */
  providersAreFake?: boolean;
  /** A failed social sign-in's message (verified server-side), shown in the form's alert. */
  notice?: string | null;
  /** A one-off success notice (`?notice=password_set` after the e-mailed link, DESIGN §E). */
  success?: string | null;
}

/**
 * The staff sign-in form inside `AuthLayout`. Texts follow the sign-in page's language
 * (`AdminLocaleProvider` around the page). Empty or malformed fields are caught before the post:
 * the fields get their messages and the first one is revealed (scrolled to, focused, ringed);
 * the server's answer (wrong password, throttling, outage) appears in the alert above the button.
 */
export function LoginForm({
  next,
  csrf,
  providers = [],
  providersAreFake = false,
  notice = null,
  success = null,
}: LoginFormProps) {
  const t = useCopy(staffAuthCopy);
  const [state, formAction, pending] = useActionState(login, { error: notice });
  // Kept from the first render: the effect below drops `?notice=` from the URL, and the page
  // then renders again without it (`success` becomes null), but the notice must stay on screen.
  const [successNotice] = useState(success);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const reveal = useErrorReveal(formRef);

  // The notice is in the URL (`?oauth=`, `?notice=`): drop it through the router (which
  // then forgets it too) so neither a reload nor a refresh repeats it. The
  // notice itself is only the action state's initial value, shown once.
  const router = useRouter();
  useEffect(() => {
    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);
    if (!params.has("oauth") && !params.has("notice")) return;
    const once = withoutParam(pathname, search, "oauth");
    const query = once.indexOf("?");
    const path = withoutParam(pathname, query === -1 ? "" : once.slice(query), "notice");
    router.replace(path as Route, { scroll: false });
  }, [router]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const found = validateLogin(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
      t.errors,
    );
    setErrors(found);
    if (hasLoginErrors(found)) {
      event.preventDefault();
      reveal();
    }
  };

  const clear = (name: keyof LoginFieldErrors) => {
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5"
        aria-busy={pending || undefined}
      >
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="csrf" value={csrf} />

        <Field label={t.form.email} error={errors.email}>
          {(control) => (
            <TextInput
              {...control}
              name="email"
              type="email"
              defaultValue={state.email ?? ""}
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t.form.emailPlaceholder}
              maxLength={254}
              aria-required="true"
              autoFocus
              onChange={() => clear("email")}
            />
          )}
        </Field>
        <Field label={t.form.password} error={errors.password}>
          {(control) => (
            <TextInput
              {...control}
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              aria-required="true"
              onChange={() => clear("password")}
            />
          )}
        </Field>

        {successNotice && !state.error ? (
          <p
            role="status"
            className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-success/35 bg-success-soft px-3.5 py-3 text-body-sm font-semibold text-ink"
          >
            <Icon name="check" size={18} className="mt-px shrink-0 text-success" />
            {successNotice}
          </p>
        ) : null}
        <div role="alert" aria-live="assertive" className="empty:hidden">
          {state.error ? (
            <p className="m-0 flex animate-fade-in items-start gap-2.5 rounded-md border border-danger/35 bg-danger-soft px-3.5 py-3 text-body-sm font-semibold text-ink">
              <Icon name="alert-circle" size={18} className="mt-px shrink-0 text-danger" />
              {state.error}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" busy={pending} className="w-full">
          {pending ? t.form.submitting : t.form.submit}
        </Button>
      </form>

      {providers.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="m-0 flex items-center gap-3 text-caption text-ink-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {t.form.or}
          </p>
          <div className="flex flex-col gap-2.5">
            {providers.map((provider) => (
              <a
                key={provider.id}
                href={provider.href}
                className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}
              >
                <ProviderMark provider={provider.id} />
                {providersAreFake
                  ? t.form.fakeProvider(provider.label)
                  : t.form.continueWith(provider.label)}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
