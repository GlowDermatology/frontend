"use client";

import type { Route } from "next";
import Form from "next/form";
import type { ReactNode } from "react";

/**
 * A GET form (client-side navigation through `next/form`) that submits
 * itself when a select or checkbox changes, so sorting and the in-stock
 * toggle need no extra click. Without JavaScript the `<noscript>` button in
 * `children` submits it.
 */
export function AutoSubmitForm({
  action,
  label,
  children,
  className,
}: {
  action: Route;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Form
      action={action}
      aria-label={label}
      className={className}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
    </Form>
  );
}
