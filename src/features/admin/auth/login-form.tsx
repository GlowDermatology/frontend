"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { login, type LoginState } from "@/data/auth.actions";

const INITIAL: LoginState = { error: null };

interface LoginFormProps {
  /** Validated in-panel path to land on after login. */
  next: string;
  /** Current `gd_csrf` cookie value (double-submit token). */
  csrf: string;
}

export function LoginForm({ next, csrf }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5" aria-busy={pending || undefined}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="csrf" value={csrf} />

      <Field label="Email">
        {(control) => (
          <TextInput
            {...control}
            name="email"
            type="email"
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
  );
}
