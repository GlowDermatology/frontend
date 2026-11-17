import { describe, expect, it } from "vitest";

declare global {
  interface ImportMeta {
    /** Vite's static glob import (vitest runs through Vite). */
    glob<T = unknown>(patterns: string | string[], options: { eager: true }): Record<string, T>;
  }
}

/**
 * Copy parity (DESIGN §G): every admin copy module has the same keys in uz / ru / en, no empty
 * text, Russian in Cyrillic, English and Uzbek without Cyrillic, English without Uzbek markers,
 * and the same arity for function entries (whose sample results obey the same rules).
 *
 * A copy module is any `copy.ts` / `*-copy.ts` under the admin code, `src/domain/copy/*.ts`,
 * `src/data/copy.ts`, `src/components/brand/copy.ts` and `src/lib/i18n/*-copy.ts`; each must export at least one `{ uz, ru, en }`
 * object (`satisfies CopySet<typeof uz>`).
 */
const MODULES = import.meta.glob<Record<string, unknown>>(
  [
    "/src/features/admin/**/copy.ts",
    "/src/features/admin/**/*-copy.ts",
    "/src/components/ui/copy.ts",
    "/src/components/ui/*-copy.ts",
    "/src/components/brand/copy.ts",
    "/src/domain/copy/*.ts",
    "/src/data/copy.ts",
    "/src/lib/i18n/*-copy.ts",
    "!**/*.test.ts",
  ],
  { eager: true },
);

const LANGS = ["uz", "ru", "en"] as const;
const CYRILLIC = /[Ѐ-ӿ]/;
const UZBEK_MARKER = /[‘ʻ]/;
const LETTER = /\p{L}/u;
/**
 * Keys whose Russian value is Latin on purpose: names of files the panel saves for the user
 * (`glow-derma-rezervnye-kody.txt`). A file name stays ASCII so it survives every OS, mail
 * client and archive tool; it is still translated (transliterated), so it must not be empty.
 */
const LATIN_BY_DESIGN = /(^|\.)fileName$/;

type Leaf =
  { kind: "text"; value: string } | { kind: "function"; value: (...a: never[]) => unknown };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCopySet(value: unknown): value is Record<(typeof LANGS)[number], unknown> {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 3 &&
    LANGS.every((lang) => isPlainObject(value[lang]))
  );
}

function leaves(value: unknown, prefix = ""): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  const walk = (node: unknown, at: string) => {
    if (typeof node === "string") out.set(at, { kind: "text", value: node });
    else if (typeof node === "function") {
      out.set(at, { kind: "function", value: node as (...a: never[]) => unknown });
    } else if (Array.isArray(node)) node.forEach((item, index) => walk(item, `${at}[${index}]`));
    else if (isPlainObject(node)) {
      for (const [key, child] of Object.entries(node)) walk(child, at ? `${at}.${key}` : key);
    } else out.set(at, { kind: "text", value: String(node) });
  };
  walk(value, prefix);
  return out;
}

/**
 * Sample results of a function entry, keyed by sample: every parameter a number, then every
 * parameter a word.
 */
function samples(fn: (...a: never[]) => unknown): Map<string, string> {
  const results = new Map<string, string>();
  for (const sample of [1, 2, 5, 21, "x"]) {
    try {
      const result = (fn as (...a: unknown[]) => unknown)(
        ...Array.from({ length: fn.length }, () => sample),
      );
      // A result that reads a value the sample does not have ("undefined") says nothing.
      if (typeof result === "string" && !/undefined|NaN|\[object /.test(result)) {
        results.set(String(sample), result);
      }
    } catch {
      // Entries taking objects cannot be sampled with plain values; arity is still compared.
    }
  }
  return results;
}

function textProblems(lang: (typeof LANGS)[number], text: string, neutral: boolean): string[] {
  const problems: string[] = [];
  if (text.trim() === "") problems.push("empty");
  if (lang === "ru" && LETTER.test(text) && !CYRILLIC.test(text) && !neutral) {
    problems.push("no Cyrillic");
  }
  if (lang !== "ru" && CYRILLIC.test(text)) problems.push("Cyrillic");
  if (lang === "en" && UZBEK_MARKER.test(text)) problems.push("Uzbek marker");
  return problems;
}

const sets = Object.entries(MODULES).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([, value]) => isCopySet(value))
    .map(([name, value]) => ({ file, name, set: value as Record<string, unknown> })),
);

describe("admin copy parity", () => {
  it("finds the copy modules", () => {
    expect(Object.keys(MODULES).length).toBeGreaterThan(0);
    const withoutSet = Object.entries(MODULES)
      .filter(([, exports]) => !Object.values(exports).some(isCopySet))
      .map(([file]) => file);
    expect(withoutSet, "copy modules without a { uz, ru, en } export").toEqual([]);
  });

  it.each(sets.map((entry) => [`${entry.file} › ${entry.name}`, entry] as const))(
    "%s",
    (_label, { set }) => {
      const uz = leaves(set.uz);
      const problems: string[] = [];
      for (const lang of LANGS) {
        const own = leaves(set[lang]);
        if (lang !== "uz") {
          const missing = [...uz.keys()].filter((key) => !own.has(key));
          const extra = [...own.keys()].filter((key) => !uz.has(key));
          for (const key of missing) problems.push(`${lang}.${key}: missing`);
          for (const key of extra) problems.push(`${lang}.${key}: not in uz`);
        }
        for (const [key, leaf] of own) {
          const source = uz.get(key);
          if (!source) continue;
          if (leaf.kind !== source.kind) {
            problems.push(`${lang}.${key}: ${leaf.kind} where uz has a ${source.kind}`);
            continue;
          }
          if (leaf.kind === "text") {
            // Words that are the same in all three languages (brands, codes) need no Cyrillic.
            const ru = leaves(set.ru).get(key);
            const en = leaves(set.en).get(key);
            const neutral =
              (ru?.value === source.value && en?.value === source.value) ||
              LATIN_BY_DESIGN.test(key);
            for (const problem of textProblems(lang, leaf.value, neutral)) {
              problems.push(`${lang}.${key}: ${problem} (${JSON.stringify(leaf.value)})`);
            }
          } else {
            const fn = leaf.value;
            const sourceFn = source.value as (...a: never[]) => unknown;
            if (fn.length !== sourceFn.length) {
              problems.push(`${lang}.${key}: arity ${fn.length}, uz has ${sourceFn.length}`);
            }
            const results = samples(fn);
            const sourceResults = samples(sourceFn);
            results.forEach((result, sample) => {
              const neutral = result === sourceResults.get(sample);
              for (const problem of textProblems(lang, result, neutral)) {
                problems.push(`${lang}.${key}(…): ${problem} (${JSON.stringify(result)})`);
              }
            });
          }
        }
      }
      expect(problems).toEqual([]);
    },
  );
});
