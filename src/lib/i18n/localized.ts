import type { CopySet } from "@/lib/i18n/copy";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

/**
 * Locale-keyed values built from a factory, typically zod schemas whose messages come from a copy
 * module (DESIGN §G): one schema per admin language, built on first use and then reused.
 *
 * ```ts
 * export const changePasswordSchemas = localized(settingsSchemaCopy, (m) =>
 *   z.object({ currentPassword: z.string().min(1, m.currentRequired) }),
 * );
 * export type ChangePasswordValues = z.infer<LocalizedOf<typeof changePasswordSchemas>>;
 *
 * // Server Action:     changePasswordSchemas[await getAdminLocale()].safeParse(values)
 * // Client component:  const schema = useLocalized(changePasswordSchemas)
 * ```
 *
 * Every language's value has the same type (the factory's return type), so `z.infer` of any of
 * them is the form's value type.
 */
export type Localized<T> = Readonly<Record<Locale, T>>;

/** `localized(...)`'s value type: `Localized<T>` → `T`. */
export type LocalizedOf<L> = L extends Localized<infer T> ? T : never;

export function localized<T>(build: (locale: Locale) => T): Localized<T>;
export function localized<C, T>(
  copy: CopySet<C>,
  build: (messages: CopySet<C>[Locale], locale: Locale) => T,
): Localized<T>;
export function localized<C, T>(
  first: CopySet<C> | ((locale: Locale) => T),
  second?: (messages: CopySet<C>[Locale], locale: Locale) => T,
): Localized<T> {
  const build =
    typeof first === "function"
      ? first
      : (locale: Locale) => (second as NonNullable<typeof second>)(first[locale], locale);
  const built = new Map<Locale, T>();
  const result = {} as Record<Locale, T>;
  for (const locale of LOCALES) {
    Object.defineProperty(result, locale, {
      enumerable: true,
      get() {
        if (!built.has(locale)) built.set(locale, build(locale));
        return built.get(locale) as T;
      },
    });
  }
  return Object.freeze(result);
}
