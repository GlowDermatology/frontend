// Container entrypoint of the Next.js standalone server (copied next to server.js as /app/entrypoint.mjs).
//
// The deployed stack's Vault Agent renders this environment's frontend secrets into one JSON file
// (FRONTEND_SECRETS_FILE, /run/secrets/frontend.json, memory-only, read-only here). This loads it into
// process.env and only THEN starts server.js: a static `import "./server.js"` would be hoisted and run before
// the secrets are set. Without FRONTEND_SECRETS_FILE (development, CI) it starts server.js unchanged.
//
// The file is a JSON object of environment variable names to strings. Errors name the file and the key, never
// a value. After a reboot the file may not exist yet (Vault sealed): wait for it instead of crash-looping.
import { existsSync, readFileSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const KEY = /^[A-Z_][A-Z0-9_]*$/;
const path = process.env.FRONTEND_SECRETS_FILE;
const timeoutSeconds = Number(process.env.WAIT_TIMEOUT ?? 300);

function fail(message) {
  console.error(`entrypoint: ${message}`);
  process.exit(1);
}

if (path) {
  for (let waited = 0; !(existsSync(path) && statSync(path).size > 0); waited += 2) {
    if (waited >= timeoutSeconds)
      fail(`no secrets at ${path} after ${timeoutSeconds}s (Vault sealed?)`);
    if (waited % 30 === 0) console.error(`entrypoint: waiting for Vault secrets (${path})`);
    await sleep(2000);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(
      `${path} is not valid JSON (${error instanceof SyntaxError ? "syntax error" : error.code})`,
    );
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    fail(`${path} must contain a JSON object of environment variables`);
  }
  for (const [key, value] of Object.entries(data)) {
    if (!KEY.test(key)) fail(`${path}: "${key}" is not a valid environment variable name`);
    if (typeof value !== "string") fail(`${path}: ${key} must be a string`);
    process.env[key] = value;
  }
}

await import("./server.js");
