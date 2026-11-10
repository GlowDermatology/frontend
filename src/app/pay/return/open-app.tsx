"use client";

import { useEffect } from "react";

import { buttonStyles } from "@/components/ui/button";

/**
 * Tries the app's custom scheme once (when the universal / App Link did not
 * open the app directly), and offers a button: browsers only allow opening
 * another app reliably from a tap.
 */
export function OpenApp({ href, label }: { href: string; label: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <a
      href={href}
      className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
    >
      {label}
    </a>
  );
}
