import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Admin i18n guard (DESIGN §G): no new hard-coded user-facing text in the admin code. A TypeScript
 * AST walk over the admin sources reports
 *
 * - JSX text containing letters (`<h1>Buyurtmalar</h1>`),
 * - literal text props: `aria-label`, `title`, `placeholder`, `label`, `alt`, … (`label="Qidirish"`,
 *   `title={"…"}`, `title={`…`}`),
 * - any string or template literal that carries an Uzbek marker (o‘ g‘ with U+2018 / U+02BB, the
 *   tutuq belgisi ’ between letters) or Cyrillic — the signature of a message written inline.
 *
 * Text belongs in a copy module (`copy.ts`, `*-copy.ts`, `src/domain/copy/*`), read with `useCopy`
 * / `copyFor` (see I18N-HOWTO.md). Copy modules, tests, fixtures and mock data are not scanned.
 *
 * Ratchet: `MIGRATED_DIRS` is `"all"` since the final sweep: every scanned file is enforced.
 * `PENDING` names the few files that hold text on purpose, each with its reason; a pending file
 * that becomes clean must leave the list.
 *
 * Storefront modules that happen to live under `src/data` (`shop/`, `api/customer/`,
 * `customer-auth/`) are not admin code: their texts follow the storefront's own uz / ru / en
 * dictionaries (`features/shop`), so they are excluded below rather than listed as pending.
 */

const SCAN_ROOTS = [
  "src/features/admin",
  "src/components/ui",
  "src/app/admin",
  "src/domain",
  "src/data",
  "src/lib",
  "src/components/brand",
] as const;

/** Path prefixes (directories end with "/") that are enforced; `"all"` = every scanned file. */
const MIGRATED_DIRS: ReadonlyArray<string> | "all" = "all";

/** Files that keep literal text on purpose, each with the reason (keep this list minimal). */
const PENDING: ReadonlyArray<string> = [
  // The development-only stand-in for Google / Facebook (GLOWDERMA_OAUTH_MODE=fake), never shown
  // in production; its Uzbek form labels are what e2e/account-social.spec.ts drives.
  "src/app/admin/auth/oauth/[provider]/fake/route.ts",
  // The formatter's own Russian month and weekday tables: locale data, not messages.
  "src/lib/format.ts",
  // Each language's name in that language (the switchers show «O‘zbekcha», «Русский»).
  "src/lib/i18n/locales.ts",
];

/** Words that are the same in every language (brands, providers, codes). Exact match, trimmed. */
const ALLOWED_TEXT = new Set([
  "Glow Derma",
  "Admin",
  "Billz",
  "Google",
  "Facebook",
  "Apple",
  "Click",
  "Payme",
  "BTS",
  "Yandex",
  "SEO",
  "UZ",
  "RU",
  "EN",
  "ID",
  "QR",
  "SMS",
  "CSV",
  "XLSX",
]);

/** JSX props whose literal value is shown or read out. */
const TEXT_PROPS = new Set([
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "title",
  "placeholder",
  "label",
  "alt",
]);

const EXCLUDED = [
  /\.test\.tsx?$/,
  /\.d\.ts$/,
  /\.fixture\.ts$/,
  /(^|\/)copy\.ts$/,
  /-copy\.ts$/,
  /(^|\/)copy\//,
  /(^|\/)__fixtures__\//,
  /^src\/data\/mock\//,
  // Storefront data layer (see the header): localized by the storefront dictionaries.
  /^src\/data\/shop\//,
  /^src\/data\/api\/customer\//,
  /^src\/data\/customer-auth\//,
];

const LETTER = /\p{L}/u;
const UZBEK_MARKER = /[‘ʻ]|\p{L}’\p{L}/u;
const CYRILLIC = /[Ѐ-ӿ]/;
/** `// i18n-ignore` on the line of the text, or on the line above it. */
const IGNORE = "i18n-ignore";

interface Violation {
  file: string;
  line: number;
  rule: "jsx-text" | "text-prop" | "marker-literal";
  text: string;
}

const hasMarker = (text: string) => UZBEK_MARKER.test(text) || CYRILLIC.test(text);
const isAllowed = (text: string) => ALLOWED_TEXT.has(text.trim());

function literalParts(node: ts.Node): string[] | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  }
  return null;
}

/** The violations of one source text (pure; exercised by the self-test below). */
function scanSource(file: string, source: string): Violation[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const lines = source.split("\n");
  const found: Violation[] = [];
  const report = (node: ts.Node, rule: Violation["rule"], text: string) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
    if (lines[line]?.includes(IGNORE) || lines[line - 1]?.includes(IGNORE)) return;
    found.push({ file, line: line + 1, rule, text: text.trim().slice(0, 80) });
  };
  const flagged = new Set<ts.Node>();

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isExternalModuleReference(node)) return;

    if (ts.isJsxText(node)) {
      const text = node.getText(sf);
      if (LETTER.test(text) && !isAllowed(text)) report(node, "jsx-text", text);
      return;
    }

    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText(sf))) {
      const init = node.initializer;
      const value = init && ts.isJsxExpression(init) ? init.expression : init;
      const parts = value ? literalParts(value) : null;
      if (value && parts) {
        const text = parts.join("");
        if (LETTER.test(text) && !isAllowed(text)) {
          report(node, "text-prop", text);
          flagged.add(value);
        }
      }
    }

    if (!flagged.has(node)) {
      const parts = literalParts(node);
      if (parts) {
        const text = parts.join("…");
        if (hasMarker(text)) report(node, "marker-literal", text);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

const ROOT = process.cwd();

function listFiles(dir: string): string[] {
  const absolute = path.join(ROOT, dir);
  if (!existsSync(absolute)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const relative = `${dir}/${entry}`;
    if (statSync(path.join(ROOT, relative)).isDirectory()) out.push(...listFiles(relative));
    else if (/\.tsx?$/.test(entry)) out.push(relative);
  }
  return out;
}

const scanned = (file: string) => !EXCLUDED.some((pattern) => pattern.test(file));
// Widened on purpose: the literal list narrows to an array, and the ratchet ends at "all".
const ratchet = MIGRATED_DIRS as ReadonlyArray<string> | "all";
const migrated = (file: string) =>
  ratchet === "all" || ratchet.some((prefix) => file.startsWith(prefix));

const ALL_FILES = SCAN_ROOTS.flatMap(listFiles).filter(scanned).sort();

describe("admin i18n guard", () => {
  it("finds no hard-coded text in the migrated admin code", () => {
    const violations = ALL_FILES.filter((file) => migrated(file) && !PENDING.includes(file))
      .flatMap((file) => scanSource(file, readFileSync(path.join(ROOT, file), "utf8")))
      .map((v) => `${v.file}:${v.line} [${v.rule}] ${v.text}`);
    expect(violations, "move these texts to a copy module (I18N-HOWTO.md)").toEqual([]);
  });

  it("keeps the ratchet honest", () => {
    if (ratchet !== "all") {
      const missing = ratchet.filter((prefix) => !existsSync(path.join(ROOT, prefix)));
      expect(missing, "MIGRATED_DIRS entries that do not exist").toEqual([]);
    }
    for (const file of PENDING) {
      expect(existsSync(path.join(ROOT, file)), `${file} no longer exists`).toBe(true);
      expect(migrated(file), `${file} is not inside a migrated prefix`).toBe(true);
      const left = scanSource(file, readFileSync(path.join(ROOT, file), "utf8"));
      expect(left.length, `${file} is clean now: remove it from PENDING`).toBeGreaterThan(0);
    }
  });

  it("recognises the patterns it guards against", () => {
    const source = [
      'import { x } from "./o‘zbek";',
      "export function A({ n }: { n: number }) {",
      '  const ok = cn("flex gap-2", n > 1 && "font-bold");',
      "  const message = `Buyurtma ${n} ta bo‘ldi`;",
      "  return (",
      '    <section aria-label="Bo‘lim" title={"Sarlavha"} data-x="Yozuv">',
      "      <h1>Buyurtmalar</h1>",
      "      <span>{n} — №</span>",
      "      <span>Glow Derma</span>",
      "      <input placeholder={`Qidirish ${n}`} />",
      '      <p>{"Привет"}</p>',
      "      {/* i18n-ignore */}<b>Demo</b>",
      "    </section>",
      "  );",
      "}",
    ].join("\n");
    const found = scanSource("x.tsx", source).map((v) => `${v.line}:${v.rule}:${v.text}`);
    expect(found).toEqual([
      "4:marker-literal:Buyurtma … ta bo‘ldi",
      "6:text-prop:Bo‘lim",
      "6:text-prop:Sarlavha",
      "7:jsx-text:Buyurtmalar",
      "10:text-prop:Qidirish",
      "11:marker-literal:Привет",
    ]);
  });
});
