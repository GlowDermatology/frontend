import "server-only";

/**
 * Awaits a section's data; a failure is logged and replaced by `fallback`,
 * so one unavailable section (banners, specialists) never takes the home
 * page down with it. Not for pages whose main content is the failing read:
 * those let the error boundary show "try again".
 */
export async function settle<T>(promise: Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[shop] ${what} unavailable`, error);
    return fallback;
  }
}
