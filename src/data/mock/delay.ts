/**
 * Simulated latency of the mock mutations, so the UI's pending states are
 * visible in the demo. Tests stub this module.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
