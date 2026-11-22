import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Kit-controls guard (specialist workspace): the admin areas a specialist works in are built from
 * the UI kit only — `DatePicker` / `TimePicker` / `DateTimePicker`, `Switch`, `AlertDialog` and
 * Button-driven disclosures — never the browser's native date/time inputs, checkboxes,
 * `window.confirm` prompts or `<details>` sections, which look and behave differently on every
 * device and skip the kit's validation, tooltips and translations.
 *
 * `features/admin/my-schedule` is not scanned: the old specialist page is deleted when the
 * workspace pages replace it.
 */

const SCAN_ROOTS = [
  "src/features/admin/workspace",
  "src/features/admin/appointments",
  "src/features/admin/specialists",
  "src/features/admin/shell",
] as const;

const FORBIDDEN: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'type="date"', pattern: /\btype\s*=\s*\{?\s*["'`]date["'`]/ },
  { label: 'type="time"', pattern: /\btype\s*=\s*\{?\s*["'`]time["'`]/ },
  { label: 'type="datetime-local"', pattern: /["'`]datetime-local["'`]/ },
  { label: 'type="checkbox"', pattern: /\btype\s*=\s*\{?\s*["'`]checkbox["'`]/ },
  { label: "window.confirm", pattern: /\bwindow\s*\.\s*confirm\b|(?<![\w.])confirm\s*\(\s*["'`]/ },
  { label: "<details>", pattern: /<details[\s>]/ },
];

/** The scanned sources: `.ts` / `.tsx` outside tests (a test may name a control to assert it). */
function sources(root: string): string[] {
  const absolute = path.resolve(root);
  let entries: string[];
  try {
    entries = readdirSync(absolute);
  } catch {
    return []; // A root that does not exist yet (the workspace pages come later).
  }
  return entries.flatMap((entry) => {
    const full = path.join(absolute, entry);
    if (statSync(full).isDirectory()) return sources(path.join(root, entry));
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [path.join(root, entry).split(path.sep).join("/")];
  });
}

/** `file:line  control` for every forbidden control in `text` (pure, for the self-test). */
function findNativeControls(file: string, text: string): string[] {
  const hits: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const { label, pattern } of FORBIDDEN) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1}  ${label}`);
    }
  });
  return hits;
}

describe("native-controls guard", () => {
  it("finds each forbidden control", () => {
    const sample = [
      '<input type="date" />',
      "<input type='time' />",
      '<input type={"datetime-local"} />',
      '<input type="checkbox" checked />',
      'if (!window.confirm("Delete?")) return;',
      "<details><summary>More</summary></details>",
    ].join("\n");
    expect(findNativeControls("sample.tsx", sample)).toEqual([
      'sample.tsx:1  type="date"',
      'sample.tsx:2  type="time"',
      'sample.tsx:3  type="datetime-local"',
      'sample.tsx:4  type="checkbox"',
      "sample.tsx:5  window.confirm",
      "sample.tsx:6  <details>",
    ]);
  });

  it("lets the kit controls and unrelated words through", () => {
    const sample = [
      '<DatePicker value={date} onValueChange={setDate} type="button" />',
      '<input type="file" accept="image/*" />',
      "const confirm = async () => {};",
      "recommended.confirm(missing, { remember });",
      "// the details of a visit",
    ].join("\n");
    expect(findNativeControls("sample.tsx", sample)).toEqual([]);
  });

  it("finds none in the specialist-facing admin areas", () => {
    const files = SCAN_ROOTS.flatMap(sources);
    expect(files.length).toBeGreaterThan(0);
    const hits = files.flatMap((file) => findNativeControls(file, readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });
});
