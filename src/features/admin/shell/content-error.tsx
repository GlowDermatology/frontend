"use client";

import { catchError, type ErrorInfo } from "next/error";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * The content-level error card: a board whose data or rendering fails shows
 * this card inside `<main>` while the sidebar, the header search and the
 * mobile menu stay usable (they are outside the boundary). "Qayta urinish"
 * calls `retry()`, which re-fetches the server content in a transition; a
 * client navigation to another section clears the error by itself, and a
 * new URL of the same section (another query) retries.
 * `redirect()` and `notFound()` pass through (`catchError` re-throws them),
 * so the session redirects and the not-found views still work. A failure of
 * the shell itself still reaches `src/app/admin/error.tsx`.
 */
function ContentErrorCard(_props: object, { error, retry }: ErrorInfo) {
  const heading = useRef<HTMLHeadingElement>(null);
  // `catchError` clears itself only on a navigation to another route. A new
  // URL of the same board (its own sidebar link, the header search's
  // `?q=`, a filter) must leave the error too: retry whenever the address
  // differs from the one the error happened on.
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const address = `${pathname}?${search}`;
  const failedAt = useRef(address);
  useEffect(() => {
    if (failedAt.current === address) return;
    failedAt.current = address;
    retry();
  }, [address, retry]);
  useEffect(() => {
    console.error(error);
  }, [error]);
  // Move focus to the card so keyboard and screen reader users learn about it.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  return (
    <section
      role="alert"
      aria-labelledby="content-error-title"
      className="flex w-full max-w-[640px] flex-col items-start gap-4 rounded-lg bg-surface-raised p-6 shadow-sm sm:p-8"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert-triangle" size={22} />
      </span>
      <h1
        id="content-error-title"
        ref={heading}
        tabIndex={-1}
        className="m-0 font-serif text-display leading-10 tracking-normal text-ink focus:outline-none"
      >
        Bo‘limni yuklab bo‘lmadi
      </h1>
      <p className="m-0 max-w-[52ch] text-body text-ink-muted">
        Ma’lumotlarni olishda xatolik yuz berdi. Qayta urinib ko‘ring yoki chap menyudan boshqa
        bo‘limga o‘ting; muammo takrorlansa, quyidagi kodni administratorga yuboring.
      </p>
      {digest && (
        <p className="m-0 text-body-sm text-ink-muted">
          Xato kodi: <code className="font-mono text-ink select-all">{digest}</code>
        </p>
      )}
      <Button variant="secondary" onClick={() => retry()}>
        <Icon name="refresh" size={18} />
        Qayta urinish
      </Button>
    </section>
  );
}

export const ContentErrorBoundary = catchError(ContentErrorCard);
