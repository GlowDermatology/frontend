"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary of the admin segment: shown when a page or its data throws
 * (an API outage in api mode, a bug in either mode). The digest matches the
 * server log line; "Qayta urinish" re-renders the segment.
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
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
          Xatolik yuz berdi
        </h1>
        <p className="m-0 max-w-[52ch] text-body text-ink-muted">
          Sahifani yuklab bo‘lmadi. Qayta urinib ko‘ring; muammo takrorlansa, quyidagi kodni
          administratorga yuboring.
        </p>
        {digest && (
          <p className="m-0 text-body-sm text-ink-muted">
            Xato kodi: <code className="font-mono text-ink select-all">{digest}</code>
          </p>
        )}
        <Button variant="secondary" onClick={() => reset()}>
          <Icon name="refresh" size={18} />
          Qayta urinish
        </Button>
      </section>
    </main>
  );
}
