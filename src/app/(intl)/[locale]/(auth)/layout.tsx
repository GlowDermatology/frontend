import type { ReactNode } from "react";

/**
 * The Russian and English customer sign-in (`/{ru,en}/sign-in`) outside the store chrome: full
 * screen, like the staff sign-in (DESIGN §F). The card carries the way back to the store and the
 * languages. Static.
 */
export default function IntlAuthLayout({ children }: { children: ReactNode }) {
  return <div className="gd-shop">{children}</div>;
}
