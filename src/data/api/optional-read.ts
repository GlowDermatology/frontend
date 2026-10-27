import { isApiError } from "./errors";
import { PageLimitExceededError } from "./pages";

/**
 * A secondary read that a page can live without (filter options, the staff
 * directory): an API failure or a list over the page cap is logged and turns
 * into `fallback`, so the board's own rows still render instead of the admin
 * error boundary. Anything else (a programming error) still throws.
 */
export async function optionalRead<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isApiError(error) || error instanceof PageLimitExceededError) {
      console.error(`[${label}] unavailable`, error);
      return fallback;
    }
    throw error;
  }
}
