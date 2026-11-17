"use client";

import { useId } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import {
  STAFF_PASSWORD_DELIVERIES,
  deliverySendsEmail,
  type StaffPasswordDelivery,
} from "@/domain/staff";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { staffCopy } from "./copy";

const ICONS: Record<StaffPasswordDelivery, IconName> = {
  temporary_password: "lock",
  email_link: "mail",
  both: "shield-check",
};

/**
 * «Kirish usuli» (DESIGN §E): how a new or reset account gets its first password — a temporary
 * password shown once, an e-mailed single-use link, or both. Three radio cards in a fieldset
 * (arrow keys move between them). Without `capabilities.staff_email_invite` the two e-mail
 * options stay reachable but cannot be chosen: `aria-disabled`, described by the reason, which is
 * also shown on the card. An error marks the group (`data-field="delivery"`) for the reveal.
 */
export function DeliveryChoice({
  value,
  onChange,
  emailInvite,
  error,
}: {
  value: StaffPasswordDelivery;
  onChange: (value: StaffPasswordDelivery) => void;
  emailInvite: boolean;
  error?: string;
}) {
  const t = useCopy(staffCopy).delivery;
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const reasonId = `${id}-reason`;
  return (
    <fieldset
      data-field="delivery"
      data-reveal-box=""
      data-invalid={error ? "true" : undefined}
      aria-describedby={cn(hintId, error && errorId)}
      className="m-0 flex min-w-0 flex-col gap-2.5 rounded-md border-0 p-0"
    >
      <legend className="mb-2.5 p-0 text-label text-ink">{t.legend}</legend>
      <div role="presentation" className="grid gap-2.5 sm:grid-cols-3">
        {STAFF_PASSWORD_DELIVERIES.map((option) => {
          const blocked = !emailInvite && deliverySendsEmail(option);
          const checked = value === option;
          const text = t.options[option];
          return (
            <label
              key={option}
              data-checked={checked || undefined}
              data-blocked={blocked || undefined}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-1.5 rounded-md border-[1.5px] border-line-strong bg-surface-raised p-3.5 transition-[border-color,background-color,box-shadow] duration-150",
                "hover:border-gold-ink/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-ink",
                "data-checked:border-gold-ink data-checked:bg-gold-soft data-checked:shadow-sm",
                "data-blocked:cursor-not-allowed data-blocked:border-line data-blocked:bg-surface data-blocked:hover:border-line",
                error && !checked && "border-danger/60",
              )}
            >
              <input
                type="radio"
                name={`${id}-delivery`}
                value={option}
                checked={checked}
                aria-disabled={blocked || undefined}
                aria-describedby={blocked ? reasonId : undefined}
                onChange={() => {
                  if (!blocked) onChange(option);
                }}
                onClick={(event) => {
                  // A blocked option stays reachable (and explains itself) but is never chosen.
                  if (blocked) event.preventDefault();
                }}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full bg-gold-soft text-gold-ink transition-colors duration-150",
                    "group-data-checked:bg-gold group-data-checked:text-on-gold",
                    "group-data-blocked:bg-line group-data-blocked:text-ink-muted",
                  )}
                >
                  <Icon name={ICONS[option]} size={16} />
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex size-5 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-surface-raised text-on-gold transition-colors duration-150 group-data-checked:border-gold group-data-checked:bg-gold"
                >
                  {checked ? <Icon name="check" size={12} /> : null}
                </span>
              </span>
              <span className={cn("text-label text-ink", blocked && "text-ink-muted")}>
                {text.label}
              </span>
              <span className="text-caption font-normal text-pretty text-ink-muted">
                {text.description}
              </span>
            </label>
          );
        })}
      </div>
      {!emailInvite ? (
        <p id={reasonId} className="m-0 flex items-start gap-1.5 text-caption text-ink-muted">
          <Icon name="info" size={14} className="mt-px shrink-0 text-gold-ink" />
          {t.emailUnavailable}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="m-0 flex items-start gap-1.5 text-body-sm font-semibold text-ink"
        >
          <Icon name="alert-circle" size={16} className="mt-px shrink-0 text-danger" />
          {error}
        </p>
      ) : null}
      <p id={hintId} className="m-0 text-caption text-ink-muted">
        {t.hint}
      </p>
    </fieldset>
  );
}
