import type { Locale } from "@/lib/i18n/locales";

/**
 * Typing of a copy module: `{ uz, ru, en } satisfies CopySet<typeof uz>`. The type of the Uzbek object with
 * every literal widened to `string` (functions keep their parameters), so the Russian and English objects must
 * have exactly the same keys. Shared by the storefront islands and the admin panel; each client island imports
 * only its own module (all three languages, a few kilobytes), so function entries work on the client.
 */
export type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type CopySet<T> = Record<Locale, Widen<T>>;
