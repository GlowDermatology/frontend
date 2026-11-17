"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { shellCopy } from "@/features/admin/shell/copy";
import { useDocumentAdminLocale } from "@/lib/i18n/admin-hooks";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary of the admin segment: shown when a page or its data throws
 * (an API outage in api mode, a bug in either mode). The digest matches the
 * server log line; "Qayta urinish" re-renders the segment. It renders outside
 * the panel's locale provider, so the language comes from `<html lang>` (set
 * from the admin language cookie by the root layout's head script).
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  const t = shellCopy[useDocumentAdminLocale()].pageError;
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error ? error.digest : undefined;

  return (
    <main className="flex min-h-dvh justify-center bg-surface p-4 text-ink sm:p-6">
      <section
        role="alert"
        className="mt-10 flex h-fit w-full max-w-[640px] flex-col items-start gap-4 rounded-lg bg-surface-raised p-8 shadow-sm sm:mt-16"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Icon name="alert-triangle" size={22} />
        </span>
        <h1 className="m-0 font-serif text-display leading-10 tracking-normal text-ink">
          {t.title}
        </h1>
        <p className="m-0 max-w-[52ch] text-body text-ink-muted">{t.description}</p>
        {digest && (
          <p className="m-0 text-body-sm text-ink-muted">
            {t.code} <code className="font-mono text-ink select-all">{digest}</code>
          </p>
        )}
        <Button variant="secondary" onClick={() => reset()}>
          <Icon name="refresh" size={18} />
          {t.retry}
        </Button>
      </section>
    </main>
  );
}
