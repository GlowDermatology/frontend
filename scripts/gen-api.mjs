#!/usr/bin/env node
/**
 * Generates `src/data/api/schema.d.ts` from the backend's committed OpenAPI
 * document with openapi-typescript.
 *
 *   npm run gen:api                       # HEAD of ../backend
 *   npm run gen:api -- --sha <ref>        # any commit, tag or branch
 *   npm run gen:api -- --backend <path>   # backend checkout elsewhere
 *                                          (or GLOWDERMA_BACKEND_DIR)
 *
 * The schema is read with `git show <sha>:openapi/schema.yaml`, so the
 * generated types always correspond to a commit, never to a dirty tree; the
 * resolved full SHA and the generation date go into the file header.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import openapiTS, { astToString } from "openapi-typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "src/data/api/schema.d.ts");
const SCHEMA_PATH = "openapi/schema.yaml";

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  // A value starting with "-" is another flag, or an argument that git would
  // read as an option (`--output=…`, `-C …`): refuse it rather than pass it on.
  if (value === undefined || value.startsWith("-")) {
    console.error(`${name} needs a value (got ${value === undefined ? "nothing" : `"${value}"`})`);
    process.exit(2);
  }
  return value;
}

const backend = path.resolve(
  ROOT,
  option("--backend") ?? process.env.GLOWDERMA_BACKEND_DIR ?? "../backend",
);
const ref = option("--sha") ?? "HEAD";

function git(...gitArgs) {
  return execFileSync("git", ["-C", backend, ...gitArgs], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const sha = git("rev-parse", "--verify", `${ref}^{commit}`).trim();
const yaml = git("show", `${sha}:${SCHEMA_PATH}`);

const ast = await openapiTS(yaml, {
  // Keep the output plain: no enums, no branded types, readonly off so the
  // mappers can build the objects piecewise.
  alphabetize: true,
  exportType: false,
});
const generatedAt = new Date().toISOString();
const header = `/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand. Regenerate with \`npm run gen:api\`.
 *
 * Source: ${SCHEMA_PATH} of the backend repository
 * Commit: ${sha}
 * Generated: ${generatedAt} (openapi-typescript)
 */

`;

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, header + astToString(ast), "utf8");
console.log(`${path.relative(ROOT, OUTPUT)} ← ${SCHEMA_PATH}@${sha.slice(0, 12)}`);
