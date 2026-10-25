import "server-only";

import { DEMO_NOW } from "./config";
import { dataSource } from "./source";

/**
 * "Now" for server-side data code. In mock mode it is the fixed demo instant
 * (`DEMO_NOW`) so the fixtures stay coherent; in api mode it is the wall clock,
 * read only after `await connection()` (inside `dataSource()`), which keeps
 * `new Date()` out of the static shell under Cache Components.
 *
 * Mock internals keep using `referenceNow()` from `./config`; this function is
 * for the dispatchers and the Server Actions.
 */
export async function requestNow(): Promise<Date> {
  if ((await dataSource()) === "api") return new Date();
  return new Date(DEMO_NOW);
}
