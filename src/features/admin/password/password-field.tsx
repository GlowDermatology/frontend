"use client";

import { useState, type ComponentProps } from "react";

import { IconButton } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { passwordCopy } from "./copy";
import type { PasswordChecks } from "./rules";

/**
 * Current-password fields stay masked and have no reveal control. Other passwords have a
 * show / hide toggle inside the field's box; the input keeps every prop `Field` hands it (`id`,
 * `aria-describedby`, `aria-invalid`), so labels, errors and the error reveal work as usual.
 */
export function PasswordInput({ className, ...rest }: Omit<ComponentProps<"input">, "type">) {
  const t = useCopy(passwordCopy);
  const [shown, setShown] = useState(false);
  const canReveal = rest.autoComplete !== "current-password";
  return (
    <div className="relative">
      <input
        {...rest}
        type={canReveal && shown ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        className={cn(
          controlClass,
          "font-mono tracking-wide",
          canReveal ? "pr-12" : "[&::-ms-reveal]:hidden",
          className,
        )}
      />
      {canReveal ? (
        <IconButton
          size="sm"
          aria-label={shown ? t.field.hide : t.field.show}
          aria-pressed={shown}
          onClick={() => setShown((value) => !value)}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <Icon name={shown ? "eye-off" : "eye"} size={18} />
        </IconButton>
      ) : null}
    </div>
  );
}

/** The rules a new password meets as it is typed: ticks fade in, each read out with its state. */
export function PasswordRules({
  checks,
  min,
  id,
}: {
  checks: PasswordChecks;
  min: number;
  id?: string;
}) {
  const t = useCopy(passwordCopy);
  const items: Array<{ key: keyof PasswordChecks; text: string }> = [
    { key: "length", text: t.rules.length(min) },
    { key: "notNumeric", text: t.rules.notNumeric },
    { key: "matches", text: t.rules.matches },
  ];
  return (
    <ul
      id={id}
      aria-label={t.rules.title}
      className="m-0 grid list-none gap-1.5 rounded-md bg-surface px-3.5 py-3 sm:grid-cols-3 sm:gap-3"
    >
      {items.map(({ key, text }) => {
        const met = checks[key];
        return (
          <li
            key={key}
            data-met={met || undefined}
            className="flex items-start gap-2 text-caption text-ink-muted transition-colors duration-200 data-met:text-ink"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-200",
                met
                  ? "border-success bg-success text-white"
                  : "border-line-strong bg-surface-raised",
              )}
            >
              {met ? <Icon name="check" size={11} /> : null}
            </span>
            <span>
              {text}
              <span className="sr-only">{` — ${met ? t.rules.met : t.rules.unmet}`}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
