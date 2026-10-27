import "server-only";

import { connection } from "next/server";

import { serverEnv, type DataSource } from "@/lib/env.server";

export type { DataSource };

/**
 * Which backend the data layer talks to for this request: `mock` serves the
 * in-memory fixtures, `api` calls Django.
 *
 * The value comes from `GLOWDERMA_DATA_SOURCE` and is read after
 * `await connection()`, so every dispatcher that consults it leaves the static
 * shell and runs at request time. Call it only inside a Suspense boundary (or
 * a Route Handler / Server Action), never in a layout.
 */
export async function dataSource(): Promise<DataSource> {
  await connection();
  return serverEnv.dataSource();
}

const warned = new Set<string>();

/**
 * Placeholder for API-mode reads whose Django endpoints are not wired yet
 * (everything except auth, until F2 lands). Returns the documented empty
 * shape for the resource and warns once per resource per server process, so
 * a misconfigured deployment is visible in the logs without flooding them.
 */
export function notWiredYet<T>(resource: string, empty: T): T {
  if (!warned.has(resource)) {
    warned.add(resource);
    console.warn(
      `[data] ${resource}: GLOWDERMA_DATA_SOURCE=api but this resource is not wired to Django yet; serving the empty shape.`,
    );
  }
  return empty;
}
