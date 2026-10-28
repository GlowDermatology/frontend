import type { Locale } from "@/lib/i18n/locales";

/**
 * The type of a copy module's Uzbek object with every literal widened to
 * `string` (functions keep their parameters), so the Russian and English
 * objects must have exactly the same keys. Each private-area island imports
 * only its own module (all three languages, a few kilobytes), so function
 * entries such as `resendIn(n)` work on the client.
 */
export type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type CopySet<T> = Record<Locale, Widen<T>>;
