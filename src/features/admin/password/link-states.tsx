import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import type { PasswordLinkCheck } from "@/data/password";
import { copyFor } from "@/lib/i18n/admin-locale";

import { passwordCopy } from "./copy";
import { StaffAuthHeading } from "../auth/staff-auth-frame";

type Problem = Extract<PasswordLinkCheck, { ok: false }>["reason"];

/** Whose link it is (masked e-mail) and until when it works. */
export function LinkAccount({
  label,
  email,
  note,
}: {
  label: string;
  email: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface px-3.5 py-3">
      <p className="m-0 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
        >
          <Icon name="mail" size={18} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-caption text-ink-muted">{label}</span>
          <span className="truncate text-label text-ink">{email}</span>
        </span>
      </p>
      <p className="m-0 flex items-start gap-2 text-caption text-ink-muted">
        <Icon name="clock" size={14} className="mt-px shrink-0" />
        {note}
      </p>
    </div>
  );
}

/**
 * A link that cannot be used: never opened in this browser, used / revoked / expired (one uniform
 * answer from the server), throttled, or the server did not answer. Says what to do next.
 */
export async function LinkProblem({ reason }: { reason: Problem }) {
  const s = (await copyFor(passwordCopy)).set;
  const view: Record<Problem, { icon: IconName; title: string; lead: string; retry: boolean }> = {
    missing: { icon: "link", title: s.missingTitle, lead: s.missingLead, retry: false },
    invalid: { icon: "alert-triangle", title: s.invalidTitle, lead: s.invalidLead, retry: false },
    throttled: { icon: "clock", title: s.throttledTitle, lead: s.throttledLead, retry: true },
    unreachable: {
      icon: "alert-circle",
      title: s.unreachableTitle,
      lead: s.unreachableLead,
      retry: true,
    },
  };
  const v = view[reason];
  return (
    <div className="flex flex-col gap-6" data-link-state={reason}>
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink"
      >
        <Icon name={v.icon} size={24} />
      </span>
      <StaffAuthHeading title={v.title} lead={v.lead} />
      <div className="flex flex-wrap gap-2.5">
        {v.retry ? (
          <Link
            href="/admin/set-password"
            prefetch={false}
            className={buttonStyles({ size: "lg" })}
          >
            <Icon name="refresh" size={18} />
            {s.retry}
          </Link>
        ) : null}
        <Link
          href="/admin/login"
          className={buttonStyles({ variant: v.retry ? "secondary" : "primary", size: "lg" })}
        >
          {s.toLogin}
          <Icon name="arrow-right" size={18} />
        </Link>
      </div>
    </div>
  );
}
