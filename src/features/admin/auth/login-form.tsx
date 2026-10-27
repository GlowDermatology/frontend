"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { login } from "@/data/auth.actions";

import { withoutParam } from "../shared/notice-once";

interface SocialProvider {
  id: string;
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
  providers?: SocialProvider[];
  /** Fake OAuth mode: the buttons say "(sinov)", so they never pass for a real sign-in. */
  providersAreFake?: boolean;
  /** A failed social sign-in's message (verified server-side), shown in the form's alert. */
  notice?: string | null;
}

export function LoginForm({
  next,
  csrf,
  providers = [],
  providersAreFake = false,
  notice = null,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, { error: notice });

  // The notice is in the URL (`?oauth=`): drop it through the router (which
  // then forgets it too) so neither a reload nor a refresh repeats it. The
  // notice itself is only the action state's initial value, shown once.
  const router = useRouter();
  useEffect(() => {
    const { pathname, search } = window.location;
    if (!new URLSearchParams(search).has("oauth")) return;
    router.replace(withoutParam(pathname, search, "oauth") as Route, { scroll: false });
  }, [router]);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5" aria-busy={pending || undefined}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="csrf" value={csrf} />

        <Field label="Email">
          {(control) => (
            <TextInput
              {...control}
              name="email"
              type="email"
              defaultValue={state.email ?? ""}
              autoComplete="username"
              inputMode="email"
              required
              maxLength={254}
              autoFocus
            />
          )}
        </Field>
        <Field label="Parol">
          {(control) => (
            <TextInput
              {...control}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          )}
        </Field>

        <p
          role="alert"
          aria-live="assertive"
          className="m-0 flex min-h-5 items-start gap-1.5 text-body-sm font-semibold text-ink"
        >
          {state.error && (
            <>
              <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
              {state.error}
            </>
          )}
        </p>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Kirilmoqda…" : "Kirish"}
        </Button>
      </form>
      {providers.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="m-0 flex items-center gap-3 text-caption font-normal text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            yoki
          </p>
          {providers.map((provider) => (
            <a
              key={provider.id}
              href={provider.href}
              className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}
            >
              {provider.label} orqali kirish{providersAreFake ? " (sinov)" : ""}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
